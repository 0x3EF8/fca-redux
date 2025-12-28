import { makeParsable } from "./constants";
import { CookieJar } from "tough-cookie";

export interface FacebookResponse {
    statusCode: number;
    body: any;
    request: any;
}

/**
 * Formats a cookie array into a string for use in a cookie jar.
 */
function formatCookie(arr: string[], url: string) {
    return arr[0] + "=" + arr[1] + "; Path=" + arr[3] + "; Domain=" + url + ".com";
}

/**
 * Parses a response from Facebook, checks for login status, and handles retries.
 */
export function parseAndCheckLogin(ctx: any, http: any, retryCount = 0) {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    return async function (data: FacebookResponse): Promise<any> {
        if (data.statusCode >= 500 && data.statusCode < 600) {
            if (retryCount >= 5) {
                const err: any = new Error(
                    "Request retry failed. Check the `res` and `statusCode` property on this error.",
                );
                err.statusCode = data.statusCode;
                err.res = data.body;
                err.error =
                    "Request retry failed. Check the `res` and `statusCode` property on this error.";
                throw err;
            }

            retryCount++;
            const retryTime = Math.floor(Math.random() * 5000);
            const url =
                data.request.uri.protocol +
                "//" +
                data.request.uri.hostname +
                data.request.uri.pathname;

            await delay(retryTime);

            // Safe content-type check with null/undefined handling
            const contentType =
                data.request.headers && data.request.headers["content-type"]
                    ? data.request.headers["content-type"].split(";")[0]
                    : "";

            if (contentType === "multipart/form-data") {
                const newData = await http.postFormData(
                    url,
                    ctx.jar,
                    data.request.formData,
                    data.request.qs,
                    ctx.globalOptions,
                    ctx,
                );
                return await parseAndCheckLogin(ctx, http, retryCount)(newData);
            } else {
                const newData = await http.post(
                    url,
                    ctx.jar,
                    data.request.form,
                    ctx.globalOptions,
                    ctx,
                );
                return await parseAndCheckLogin(ctx, http, retryCount)(newData);
            }
        }

        if (data.statusCode === 404) return;

        if (data.statusCode !== 200) {
            throw new Error(
                "parseAndCheckLogin got status code: " +
                    data.statusCode +
                    ". Bailing out of trying to parse response.",
            );
        }

        let res: any = null;

        if (typeof data.body === "object" && data.body !== null) {
            res = data.body;
        } else if (typeof data.body === "string") {
            try {
                res = JSON.parse(makeParsable(data.body));
            } catch (e) {
                const err: any = new Error(
                    "JSON.parse error. Check the `detail` property on this error.",
                );
                err.error = "JSON.parse error. Check the `detail` property on this error.";
                err.detail = e;
                err.res = data.body;
                throw err;
            }
        } else {
            throw new Error("Unknown response body type: " + typeof data.body);
        }

        if (res.redirect && data.request.method === "GET") {
            const redirectRes = await http.get(res.redirect, ctx.jar);
            return await parseAndCheckLogin(ctx, http)(redirectRes);
        }

        if (
            res.jsmods &&
            res.jsmods.require &&
            Array.isArray(res.jsmods.require[0]) &&
            res.jsmods.require[0][0] === "Cookie"
        ) {
            res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace("_js_", "");
            const requireCookie = res.jsmods.require[0][3];
            ctx.jar.setCookie(formatCookie(requireCookie, "facebook"), "https://www.facebook.com");
            ctx.jar.setCookie(
                formatCookie(requireCookie, "messenger"),
                "https://www.messenger.com",
            );
        }

        if (res.jsmods && Array.isArray(res.jsmods.require)) {
            const arr = res.jsmods.require;
            for (const i in arr) {
                if (arr[i][0] === "DTSG" && arr[i][1] === "setToken") {
                    ctx.fb_dtsg = arr[i][3][0];
                    ctx.ttstamp = "2";
                    for (let j = 0; j < ctx.fb_dtsg.length; j++) {
                        ctx.ttstamp += ctx.fb_dtsg.charCodeAt(j);
                    }
                }
            }
        }

        if (res.error === 1357001) {
            const err: any = new Error("Facebook blocked the login");
            err.error = "Not logged in.";
            throw err;
        }

        return res;
    };
}

/**
 * Saves cookies from a response to the cookie jar.
 */
export function saveCookies(jar: CookieJar) {
    return function (res: any) {
        const cookies = res.headers["set-cookie"] || [];
        cookies.forEach(function (c: string) {
            if (c.indexOf(".facebook.com") > -1) {
                jar.setCookie(c, "https://www.facebook.com");
            }
            const c2 = c.replace(/domain=\.facebook\.com/, "domain=.messenger.com");
            jar.setCookie(c2, "https://www.messenger.com");
        });
        return res;
    };
}

/**
 * Retrieves all cookies from the jar for both Facebook and Messenger domains.
 */
export function getAppState(jar: CookieJar) {
    return jar
        .getCookiesSync("https://www.facebook.com")
        .concat(jar.getCookiesSync("https://www.messenger.com"));
}
