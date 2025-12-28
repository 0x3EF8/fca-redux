import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import FormData from "form-data";
import { getHeaders } from "./headers";
import * as debug from "./debug";
import path from "path";

// Store proxy configuration globally within this module
let proxyConfig: any = {};

export interface RequestOptions {
    method: string;
    uri: URL;
    headers: any;
    form?: any;
    formData?: any;
}

export interface AdaptedResponse {
    body: any;
    statusCode: number;
    request: RequestOptions;
    headers?: any;
    redirect?: string;
    error?: any;
    jsmods?: any;
}

/**
 * Creates an axios client with the specified cookie jar
 */
function createClientWithJar(jar: CookieJar) {
    return wrapper(axios.create({ jar }));
}

/**
 * A utility to introduce a delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adapts the axios response/error to match the structure expected by the rest of the application.
 */
function adaptResponse(res: any): AdaptedResponse {
    // If it's an error, axios nests the response object.
    const response = res.response || res;
    return {
        ...response,
        body: response.data,
        statusCode: response.status,
        request: {
            uri: new URL(response.config.url),
            headers: response.config.headers,
            method: response.config.method?.toUpperCase() || "GET",
            form: response.config.data,
            formData: response.config.data,
        },
        headers: response.headers,
    };
}

/**
 * Performs a request with retry logic and exponential backoff.
 */
async function requestWithRetry(
    requestFunction: () => Promise<any>,
    retries = 3,
    method = "GET",
    url = "",
): Promise<AdaptedResponse> {
    const startTime = Date.now();
    debug.incrementStat("httpRequests");

    for (let i = 0; i < retries; i++) {
        try {
            const res = await requestFunction();
            const duration = Date.now() - startTime;
            debug.logHttpResponse(method, url, res.status, duration);
            return adaptResponse(res);
        } catch (error: any) {
            if (error.response && error.response.data) {
                debug.error("HTTP-BODY", JSON.stringify(error.response.data).substring(0, 500));
            }
            if (i === retries - 1) {
                debug.incrementStat("httpErrors");
                debug.logHttpError(method, url, error);
                debug.error("HTTP", `Request failed after ${retries} attempts: ${error.message}`);

                if (error.response) {
                    return adaptResponse(error.response);
                }
                throw error;
            }
            // Exponential backoff with jitter
            const backoffTime = Math.pow(2, i) * 1000;
            const jitter = Math.floor(Math.random() * 500);
            const totalDelay = backoffTime + jitter;
            debug.warn("HTTP", `Attempt ${i + 1} failed, retrying in ${totalDelay}ms...`);
            await delay(totalDelay);
        }
    }
    throw new Error("Request failed");
}

/**
 * Sets a proxy for all subsequent requests.
 */
export function setProxy(proxyUrl?: string) {
    if (proxyUrl) {
        try {
            const parsedProxy = new URL(proxyUrl);
            proxyConfig = {
                proxy: {
                    host: parsedProxy.hostname,
                    port: parseInt(parsedProxy.port),
                    protocol: parsedProxy.protocol.replace(":", ""),
                    auth:
                        parsedProxy.username && parsedProxy.password
                            ? {
                                  username: parsedProxy.username,
                                  password: parsedProxy.password,
                              }
                            : undefined,
                },
            };
        } catch {
            debug.error(
                "PROXY",
                "Invalid proxy URL. Please use a full URL format (e.g., http://user:pass@host:port).",
            );
            proxyConfig = {};
        }
    } else {
        proxyConfig = {};
    }
}

/**
 * A simple GET request without extra options
 */
export function cleanGet(url: string) {
    debug.logHttpRequest("GET", url);
    const client = createClientWithJar(new CookieJar());
    const fn = () => client.get(url, { timeout: 60000, ...proxyConfig });
    return requestWithRetry(fn, 3, "GET", url);
}

/**
 * Performs a GET request with query parameters and custom options.
 */
export async function get(
    url: string,
    reqJar: CookieJar,
    qs: any,
    options: any,
    ctx: any,
    customHeader?: any,
) {
    debug.logHttpRequest("GET", url, { params: qs });
    const client = createClientWithJar(reqJar);
    const config = {
        headers: getHeaders(url, options, ctx, customHeader),
        timeout: 60000,
        params: qs,
        ...proxyConfig,
        validateStatus: (status: number) => status >= 200 && status < 600,
    };
    return requestWithRetry(async () => await client.get(url, config), 3, "GET", url);
}

function getType(obj: any): string {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

/**
 * Performs a POST request, automatically handling JSON or URL-encoded form data.
 */
export async function post(
    url: string,
    reqJar: CookieJar,
    form: any,
    options: any,
    ctx: any,
    customHeader?: any,
) {
    debug.logHttpRequest("POST", url, { formData: form });
    const client = createClientWithJar(reqJar);
    const headers = getHeaders(url, options, ctx, customHeader);
    let data = form;
    const contentType = headers["Content-Type"] || "application/x-www-form-urlencoded";

    if (contentType.includes("json")) {
        data = JSON.stringify(form);
    } else {
        const transformedForm = new URLSearchParams();
        for (const key in form) {
            if (Object.prototype.hasOwnProperty.call(form, key)) {
                let value = form[key];
                if (getType(value) === "Object") {
                    value = JSON.stringify(value);
                }
                transformedForm.append(key, value);
            }
        }
        data = transformedForm.toString();
    }

    headers["Content-Type"] = contentType;

    const config = {
        headers,
        timeout: 60000,
        ...proxyConfig,
        validateStatus: (status: number) => status >= 200 && status < 600,
    };
    return requestWithRetry(async () => await client.post(url, data, config), 3, "POST", url);
}

/**
 * Performs a POST request with multipart/form-data.
 */
export async function postFormData(
    url: string,
    reqJar: CookieJar,
    form: any,
    qs: any,
    options: any,
    ctx: any,
) {
    debug.logHttpRequest("POST", url, { formData: form, params: qs });
    const client = createClientWithJar(reqJar);
    const formData = new FormData();

    for (const key in form) {
        if (Object.prototype.hasOwnProperty.call(form, key)) {
            const value = form[key];
            // Check for stream-like objects
            if (value && typeof value === "object" && typeof value.pipe === "function") {
                const streamPath = value.path || value._tempPath;
                if (streamPath) {
                    const filename = path.basename(streamPath);
                    const ext = path.extname(filename).toLowerCase();
                    const mimeTypes: Record<string, string> = {
                        ".mp4": "video/mp4",
                        ".mp3": "audio/mpeg",
                        ".m4a": "audio/mp4",
                        ".aac": "audio/aac",
                        ".wav": "audio/wav",
                        ".ogg": "audio/ogg",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".png": "image/png",
                        ".gif": "image/gif",
                        ".webp": "image/webp",
                    };
                    const contentType = mimeTypes[ext] || "application/octet-stream";
                    formData.append(key, value, { filename, contentType });
                } else {
                    formData.append(key, value, {
                        filename: "upload",
                        contentType: "application/octet-stream",
                    });
                }
            } else {
                formData.append(key, value);
            }
        }
    }

    const customHeader = {
        "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
    };

    const config = {
        headers: getHeaders(url, options, ctx, customHeader),
        timeout: 60000,
        params: qs,
        ...proxyConfig,
        validateStatus: (status: number) => status >= 200 && status < 600,
    };
    return requestWithRetry(async () => await client.post(url, formData, config), 3, "POST", url);
}

export const getJar = () => new CookieJar();
