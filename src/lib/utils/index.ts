import * as network from "./network";
import * as headers from "./headers";
import * as clients from "./clients";
import * as constants from "./constants";
import * as formatters from "./formatters";
import * as userAgents from "./user-agents";
import * as debug from "./debug";
import * as cheerio from "cheerio";
import util from "util";

/**
 * Fetches a URL, scrapes all <script type="application/json"> tags, and returns parsed content.
 */
async function json(
    url: string,
    jar: any,
    qs: any,
    options: any,
    ctx: any,
    customHeader: any,
): Promise<any[]> {
    try {
        const res = await network.get(url, jar, qs, options, ctx, customHeader);
        const body = res.body;
        const $ = cheerio.load(body);
        const scripts = $('script[type="application/json"]');

        if (scripts.length === 0) {
            debug.warn("JSON", `No <script type="application/json"> tags found on ${url}`);
            return [];
        }

        const allJsonData: any[] = [];
        scripts.each((index, element) => {
            try {
                const jsonContent = $(element).html();
                if (jsonContent) {
                    allJsonData.push(JSON.parse(jsonContent));
                }
            } catch {
                debug.warn("JSON", `Could not parse JSON from script #${index + 1} on ${url}`);
            }
        });

        return allJsonData;
    } catch {
        debug.error("JSON", `Error in utils.json fetching from ${url}`);
        throw new Error(`JSON fetch failed for ${url}`);
    }
}

/**
 * Creates an object with pre-filled request defaults.
 */
function makeDefaults(html: string, userID: string, ctx: any) {
    let reqCounter = 1;
    const revision = constants.getFrom(html, 'revision":', ",");

    function mergeWithDefaults(obj: any) {
        const newObj: any = {
            av: userID,
            __user: userID,
            __req: (reqCounter++).toString(36),
            __rev: revision,
            __a: 1,
            ...(ctx && {
                fb_dtsg: ctx.fb_dtsg,
                lsd: ctx.lsd,
                __spin_r: ctx.spinR,
                __spin_b: ctx.spinB,
                __spin_t: ctx.spinT,
                jazoest: ctx.jazoest,
            }),
        };

        if (!obj) return newObj;

        for (const prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop) && !newObj[prop]) {
                newObj[prop] = obj[prop];
            }
        }

        return newObj;
    }

    return {
        get: (url: string, jar: any, qs: any, ctxx: any, customHeader: any = {}) =>
            network.get(
                url,
                jar,
                mergeWithDefaults(qs),
                ctx.globalOptions,
                ctxx || ctx,
                customHeader,
            ),

        post: (url: string, jar: any, form: any, ctxx: any, customHeader: any = {}) =>
            network.post(
                url,
                jar,
                mergeWithDefaults(form),
                ctx.globalOptions,
                ctxx || ctx,
                customHeader,
            ),

        postFormData: (url: string, jar: any, form: any, qs: any, ctxx: any) =>
            network.postFormData(
                url,
                jar,
                mergeWithDefaults(form),
                mergeWithDefaults(qs),
                ctx.globalOptions,
                ctxx || ctx,
            ),
    };
}

const utils = {
    ...network,
    ...headers,
    ...clients,
    ...constants,
    ...formatters,
    ...userAgents,
    ...debug,
    json,
    makeDefaults,
    promisify: (func: (...args: any[]) => any) => util.promisify(func),
    delay: (ms: number) => new Promise((r) => setTimeout(r, ms)),
};

export default utils;
export { network, headers, clients, constants, formatters, userAgents, debug, json, makeDefaults };
