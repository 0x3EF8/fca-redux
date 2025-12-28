/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         NERO - User Agents                                   ║
 * ║                    Browser Fingerprint Generation                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module lib/utils/user-agents
 * @author 0x3EF8
 * @version 2.0.0
 */

export interface BrowserData {
    platform: string;
    chromeVersions: string[];
    platformVersion: string;
}

export interface UserAgentData {
    userAgent: string;
    secChUa: string;
    secChUaFullVersionList: string;
    secChUaPlatform: string;
    secChUaPlatformVersion: string;
}

/**
 * Browser data for realistic user agent generation
 */
const BROWSER_DATA: Record<string, BrowserData> = {
    windows: {
        platform: "Windows NT 10.0; Win64; x64",
        chromeVersions: ["126.0.0.0", "125.0.0.0", "124.0.0.0"],
        platformVersion: '"15.0.0"',
    },
    mac: {
        platform: "Macintosh; Intel Mac OS X 10_15_7",
        chromeVersions: ["126.0.0.0", "125.0.0.0", "124.0.0.0"],
        platformVersion: '"15.7.9"',
    },
};

export const DEFAULT_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Get random element from array
 */
function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a realistic, randomized User-Agent string and related Sec-CH headers.
 */
export function randomUserAgent(): UserAgentData {
    const osKey = getRandom(Object.keys(BROWSER_DATA));
    const data = BROWSER_DATA[osKey];
    const version = getRandom(data.chromeVersions);
    const majorVersion = version.split(".")[0];

    const userAgent = `Mozilla/5.0 (${data.platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;

    // Construct the Sec-CH-UA header
    const brands = [
        `"Not/A)Brand";v="8"`,
        `"Chromium";v="${majorVersion}"`,
        `"Google Chrome";v="${majorVersion}"`,
    ];
    const secChUa = brands.join(", ");
    const secChUaFullVersionList = brands.map((b) => b.replace(/"$/, `.0.0.0"`)).join(", ");

    return {
        userAgent,
        secChUa,
        secChUaFullVersionList,
        secChUaPlatform: `"${osKey === "windows" ? "Windows" : "macOS"}"`,
        secChUaPlatformVersion: data.platformVersion,
    };
}

export const windowsUserAgent = DEFAULT_USER_AGENT;
