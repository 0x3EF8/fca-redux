import { randomUserAgent } from "./user-agents";

/**
 * Viewport width options for anti-detection
 */
const VIEWPORT_VARIANTS = [
    "1920",
    "1536",
    "1440",
    "1366",
    "2560",
    "1280",
    "1680",
    "1600",
    "3840",
    "2048",
];

/**
 * Accept-Language header variants
 */
const LANGUAGE_VARIANTS = [
    "en-US,en;q=0.9",
    "en-US,en;q=0.9,es;q=0.8",
    "en-GB,en;q=0.9",
    "en-US,en;q=0.9,fr;q=0.8",
    "en-US,en;q=0.9,de;q=0.8",
];

/**
 * Generates a comprehensive and realistic set of headers for requests to Facebook.
 * @param url - The target URL
 * @param _options - Global options from context
 * @param ctx - The application context
 * @param customHeader - Extra headers to merge
 * @returns Complete headers object
 */
export function getHeaders(
    url: string,
    options: any,
    ctx: any,
    customHeader?: Record<string, string>,
): Record<string, string> {
    const uaData = randomUserAgent();
    const userAgent = (options && options.userAgent) || uaData.userAgent;

    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const referer = `https://${host}/`;

    // Determine fetch metadata
    const isApi = url.includes("/ajax/") || url.includes("/api/") || url.includes("/messaging/");
    const fetchDest = isApi ? "empty" : "document";
    const fetchMode = isApi ? "cors" : "navigate";
    const fetchSite = "same-origin";

    // Anti-detection: Random viewport and language
    const randomViewport = VIEWPORT_VARIANTS[Math.floor(Math.random() * VIEWPORT_VARIANTS.length)];
    const acceptLanguage = LANGUAGE_VARIANTS[Math.floor(Math.random() * LANGUAGE_VARIANTS.length)];

    // Anti-detection: Occasionally omit optional headers
    const includeColorScheme = Math.random() > 0.1;
    const includeDpr = Math.random() > 0.1;
    const includeViewportWidth = Math.random() > 0.15;

    const headers: Record<string, string> = {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": acceptLanguage,
        Connection: "keep-alive",
        Host: host,
        Origin: `https://${host}`,
        Referer: referer,
        "Sec-Fetch-Dest": fetchDest,
        "Sec-Fetch-Mode": fetchMode,
        "Sec-Fetch-Site": fetchSite,
        "User-Agent": userAgent,
    };

    // Add Sec-Ch headers only if using the modern user agent
    if (userAgent.includes("Chrome")) {
        headers["Sec-Ch-Ua"] = uaData.secChUa;
        headers["Sec-Ch-Ua-Mobile"] = "?0";
        headers["Sec-Ch-Ua-Platform"] = uaData.secChUaPlatform;
    }

    if (!isApi) {
        headers["Upgrade-Insecure-Requests"] = "1";
        headers["Cache-Control"] = "max-age=0";
    }

    if (includeViewportWidth) headers["Viewport-Width"] = randomViewport;
    if (includeDpr) headers["Dpr"] = "1";
    if (includeColorScheme) headers["Sec-Ch-Prefers-Color-Scheme"] = "light";

    // Add context-specific headers
    if (ctx) {
        if (ctx.fb_dtsg) {
            headers["X-Fb-Lsd"] = ctx.lsd || "null";
        }
        if (ctx.region) {
            headers["X-MSGR-Region"] = ctx.region;
        }
        if (ctx.spinR) headers["X-Fb-Spin-R"] = String(ctx.spinR);
        if (ctx.spinB) headers["X-Fb-Spin-B"] = String(ctx.spinB);
        if (ctx.spinT) headers["X-Fb-Spin-T"] = String(ctx.spinT);
    }

    // Merge custom headers
    if (customHeader) {
        Object.assign(headers, customHeader);
        if (customHeader.noRef) {
            delete headers.Referer;
        }
    }

    return headers;
}

export const meta = (prop: string): RegExp =>
    new RegExp(`<meta property="${prop}" content="([^"]*)"`);
