/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                          NERO - Core Client                                  ║
 * ║                    Authentication & Session Management                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module core/client
 * @author 0x3EF8
 * @version 2.0.0
 */

import utils from "../lib/utils";
import setOptionsModel from "./auth/setOptions";
import buildAPIModel from "./auth/buildAPI";
import loginHelperModel from "./auth/loginHelper";

const FB_BASE_URL = "https://www.facebook.com";
const fbLink = (ext?: string) => FB_BASE_URL + (ext ? "/" + ext : "");

const ERROR_RETRIEVING =
    "Error retrieving userID. This can be caused by many factors, including " +
    "being blocked by Facebook for logging in from an unknown location. " +
    "Try logging in with a browser to verify.";

/**
 * Default configuration options
 */
const DEFAULT_OPTIONS = {
    selfListen: false,
    listenEvents: true,
    updatePresence: false,
    autoMarkDelivery: false,
    autoMarkRead: true,
    autoReconnect: true,
    online: true,
    userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

/**
 * Initiates the login process for a Facebook account.
 */
async function login(
    credentials: any,
    options: any | ((err: any, api: any) => void),
    callback?: (err: any, api: any) => void,
) {
    // Handle optional options parameter
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    if (!callback) {
        throw new Error("Callback function is required for login.");
    }

    // Initialize logging if specified
    if (options && "logging" in options) {
        utils.logOptions(options.logging);
    }

    // Create fresh instances for each login (prevents state sharing between accounts)
    const globalOptions = { ...DEFAULT_OPTIONS, ...options };
    const api = {};

    // Apply options
    await setOptionsModel(globalOptions, options || {});

    // Execute login flow
    loginHelperModel(
        credentials,
        globalOptions,
        (loginError: any, loginApi: any) => {
            if (loginError) {
                return callback!(loginError, null);
            }
            return callback!(null, loginApi);
        },
        setOptionsModel,
        buildAPIModel,
        api,
        fbLink,
        ERROR_RETRIEVING,
    );
}

export { login };
export default login;
