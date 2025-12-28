/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                         NERO - Options Manager                               ║
 * ║                      Runtime Configuration Handler                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module core/auth/setOptions
 * @author 0x3EF8
 * @version 2.0.0
 */

import utils from "../../lib/utils";

interface GlobalOptions {
    online?: boolean;
    selfListen?: boolean;
    listenEvents?: boolean;
    updatePresence?: boolean;
    userAgent?: string;
    autoMarkDelivery?: boolean;
    autoMarkRead?: boolean;
    proxy?: string;
    autoReconnect?: boolean;
    randomUserAgent?: boolean;
    bypassRegion?: string;
    debugLevel?: string;
    logging?: boolean;
    debugTimestamps?: boolean;
    pageID?: string;
    [key: string]: any;
}

type OptionHandler = (globalOptions: GlobalOptions, value: any) => void;

/**
 * Option handlers for each configurable property
 */
const OPTION_HANDLERS: Record<string, OptionHandler> = {
    online: (globalOptions, value) => {
        globalOptions.online = Boolean(value);
    },

    selfListen: (globalOptions, value) => {
        globalOptions.selfListen = Boolean(value);
    },

    listenEvents: (globalOptions, value) => {
        globalOptions.listenEvents = Boolean(value);
    },

    updatePresence: (globalOptions, value) => {
        globalOptions.updatePresence = Boolean(value);
    },

    userAgent: (globalOptions, value) => {
        globalOptions.userAgent = value;
    },

    autoMarkDelivery: (globalOptions, value) => {
        globalOptions.autoMarkDelivery = Boolean(value);
    },

    autoMarkRead: (globalOptions, value) => {
        globalOptions.autoMarkRead = Boolean(value);
    },

    proxy: (globalOptions, value) => {
        if (typeof value !== "string") {
            delete globalOptions.proxy;
            utils.setProxy();
        } else {
            globalOptions.proxy = value;
            utils.setProxy(value);
        }
    },

    autoReconnect: (globalOptions, value) => {
        globalOptions.autoReconnect = Boolean(value);
    },

    randomUserAgent: (globalOptions, value) => {
        globalOptions.randomUserAgent = Boolean(value);
        if (value) {
            const uaData = utils.randomUserAgent();
            globalOptions.userAgent = uaData.userAgent;
        }
    },

    bypassRegion: (globalOptions, value) => {
        globalOptions.bypassRegion = value ? value.toUpperCase() : value;
    },

    debugLevel: (globalOptions, value) => {
        const validLevels = ["silent", "minimal", "normal", "verbose"];
        if (validLevels.includes(value)) {
            globalOptions.debugLevel = value;
            // Set debug level for both debug.js and constants.js logging systems
            if (utils.setDebugLevel) utils.setDebugLevel(value);
        }
    },

    logging: (globalOptions, value) => {
        globalOptions.logging = Boolean(value);
        // For backwards compatibility with logOptions
        if (utils.logOptions) utils.logOptions(Boolean(value));
    },

    debugTimestamps: (globalOptions, value) => {
        globalOptions.debugTimestamps = Boolean(value);
        utils.setTimestamps(Boolean(value));
    },
};

/**
 * Sets global options for the API.
 */
async function setOptions(
    globalOptions: GlobalOptions,
    options: Partial<GlobalOptions> = {},
): Promise<void> {
    Object.entries(options).forEach(([key, value]) => {
        const handler = OPTION_HANDLERS[key];
        if (handler) {
            handler(globalOptions, value);
        }
    });
}

export default setOptions;
