import utils from "../../lib/utils";
import axios from "axios";
import qs from "querystring";
import path from "path";
import fs from "fs";
import { CookieJar } from "tough-cookie";

/**
 * Loads all API modules from the api directory
 * Automatically detects factory functions (default export or named *Factory)
 */
function loadApiModules(api: any, defaultFuncs: any, ctx: any) {
    const apiPath = path.resolve(__dirname, "..", "..", "api");

    if (!fs.existsSync(apiPath)) {
        utils.warn("API path not found:", apiPath);
        return;
    }

    const apiFolders = fs
        .readdirSync(apiPath)
        .filter((name) => fs.lstatSync(path.join(apiPath, name)).isDirectory());

    apiFolders.forEach((folder) => {
        const modulePath = path.join(apiPath, folder);

        fs.readdirSync(modulePath)
            .filter(
                (file) => (file.endsWith(".js") || file.endsWith(".ts")) && !file.endsWith(".d.ts"),
            )
            .forEach((file) => {
                const moduleName = path.basename(file, path.extname(file));
                // Skip internal or utility files
                if (moduleName.startsWith("_") || moduleName === "index") return;

                const fullPath = path.join(modulePath, file);

                try {
                    // Clear cache for hot-reloading support if needed
                    delete require.cache[require.resolve(fullPath)];
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const moduleExports = require(fullPath);

                    let factoryFunc = moduleExports.default || moduleExports;

                    // If it's a named export ending in 'Factory' (e.g., getUserInfoFactory)
                    if (
                        typeof factoryFunc !== "function" ||
                        Object.keys(moduleExports).some((k) => k.endsWith("Factory"))
                    ) {
                        const factoryKey = Object.keys(moduleExports).find((k) =>
                            k.endsWith("Factory"),
                        );
                        if (factoryKey) factoryFunc = moduleExports[factoryKey];
                    }

                    if (typeof factoryFunc === "function") {
                        // Check if we need to alias the function (e.g. listenMqtt -> listen)
                        api[moduleName] = factoryFunc(defaultFuncs, api, ctx);

                        // Special alias handling
                        if (moduleName === "listenMqtt") {
                            api.listen = api.listenMqtt;
                        }
                    } else {
                        // utils.warn("LOADER", `Module ${moduleName} does not export a factory function.`);
                    }
                } catch (e) {
                    utils.error(`Failed to load module ${moduleName} from ${folder}:`, e);
                }
            });
    });
}

/**
 * Processes appState and loads cookies into the jar
 */
function loadAppState(appState: any, jar: CookieJar) {
    let cookieStrings: string[] = [];

    if (Array.isArray(appState)) {
        cookieStrings = appState.map((c) => [c.name || c.key, c.value].join("="));
    } else if (typeof appState === "string") {
        cookieStrings = appState
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);
    } else {
        throw new Error(
            "Invalid appState format. Please provide an array of cookie objects or a cookie string.",
        );
    }

    utils.debug("AUTH", `INJECTING ${cookieStrings.length} SESSION TOKENS INTO COOKIE JAR...`);
    utils.logAuth(`Injecting ${cookieStrings.length} session tokens`);

    for (const cookieString of cookieStrings) {
        const domain = ".facebook.com";
        const expires = new Date().getTime() + 1000 * 60 * 60 * 24 * 365;
        const str = `${cookieString}; expires=${expires}; domain=${domain}; path=/;`;
        jar.setCookie(str, `https://${domain}`);
    }

    utils.success("SESSION AUTHENTICATION TOKENS INJECTED SUCCESSFULLY");
    utils.logAuth("Session tokens loaded", true);
}

/**
 * Handles email/password login via API
 */
async function loginWithCredentials(credentials: any, jar: CookieJar) {
    const url = "https://api.facebook.com/method/auth.login";
    const params = {
        access_token: "350685531728|62f8ce9f74b12f84c123cc23437a4a32",
        format: "json",
        sdk_version: 2,
        email: credentials.email,
        locale: "en_US",
        password: credentials.password,
        generate_session_cookies: 1,
        sig: "c1c640010993db92e5afd11634ced864",
    };

    const query = qs.stringify(params);
    const xurl = `${url}?${query}`;

    try {
        const resp = await axios.get(xurl);
        if (resp.status !== 200) {
            throw new Error("Wrong password / email");
        }

        const cstrs = resp.data["session_cookies"].map((c: any) => `${c.name}=${c.value}`);
        cstrs.forEach((cstr: string) => {
            const domain = ".facebook.com";
            const expires = new Date().getTime() + 1000 * 60 * 60 * 24 * 365;
            const str = `${cstr}; expires=${expires}; domain=${domain}; path=/;`;
            jar.setCookie(str, `https://${domain}`);
        });
    } catch {
        throw new Error("Wrong password / email");
    }
}

/**
 * Extracts JSON data from script tags in HTML
 */
function extractNetData(html: string): any[] {
    const allScriptsData: any[] = [];
    const scriptRegex = /<script type="application\/json"[^>]*>(.*?)<\/script>/g;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
        try {
            allScriptsData.push(JSON.parse(match[1]));
        } catch (e: any) {
            utils.error("SCRIPT PARSE ERROR IN HTML EXTRACTION", e.message);
        }
    }

    return allScriptsData;
}

/**
 * Main login helper function - orchestrates the login process
 */
async function loginHelper(
    credentials: any,
    globalOptions: any,
    callback: (err: any, api?: any) => void,
    setOptionsFunc: (globalOptions: any, options: any) => Promise<void>,
    buildAPIFunc: (
        html: string,
        jar: CookieJar,
        netData: any[],
        globalOptions: any,
        fbLinkFunc: (ext?: string) => string,
        errorRetrievingMsg: string,
    ) => Promise<[any, any, any]>,
    initialApi: any,
    fbLinkFunc: (ext?: string) => string,
    errorRetrievingMsg: string,
) {
    let ctx: any = null;
    let defaultFuncs: any = null;
    const api = initialApi;

    try {
        const jar = utils.getJar();

        utils.log("INITIATING NEURAL AUTH PROTOCOL...");
        utils.logAuth("Starting login process");

        // Handle authentication
        if (credentials.appState) {
            utils.info("LOADING SESSION CREDENTIALS FROM APPSTATE BUFFER...");
            loadAppState(credentials.appState, jar);
        } else if (credentials.email && credentials.password) {
            await loginWithCredentials(credentials, jar);
        } else {
            throw new Error(
                "No cookie or credentials found. Please provide cookies or credentials.",
            );
        }

        // Setup base API methods
        api.setOptions = setOptionsFunc.bind(null, globalOptions);
        api.getAppState = function () {
            const appState = utils.getAppState(jar);
            if (!Array.isArray(appState)) return [];
            const uniqueAppState = appState.filter(
                (item, index, self) => self.findIndex((t) => t.key === item.key) === index,
            );
            return uniqueAppState.length > 0 ? uniqueAppState : appState;
        };

        // Connect to Facebook
        utils.log("ESTABLISHING SECURE CONNECTION TO FACEBOOK SERVERS...");
        const resp = await utils
            .get(fbLinkFunc(), jar, null, globalOptions, { noRef: true }, {})
            .then(utils.saveCookies(jar));

        utils.success("SECURE CONNECTION ESTABLISHED → facebook.com");

        // Parse page data
        utils.debug("PARSING PAGE METADATA & EXTRACTING SCRIPT BLOCKS...");
        const netData = extractNetData(resp.body);
        utils.debug(`DATA EXTRACTION COMPLETE → ${netData.length} BLOCKS CAPTURED`);

        // Build API context
        utils.log("COMPILING API CONTEXT & BUILDING FUNCTION REGISTRY...");
        const [newCtx, newDefaultFuncs] = await buildAPIFunc(
            resp.body,
            jar,
            netData,
            globalOptions,
            fbLinkFunc,
            errorRetrievingMsg,
        );

        utils.success("API CONTEXT INITIALIZED → READY FOR OPERATIONS", true);

        ctx = newCtx;
        defaultFuncs = newDefaultFuncs;
        api.message = new Map();
        api.timestamp = {};

        // Core API methods
        api.getCurrentUserID = () => ctx.userID;
        api.getOptions = (key?: string) => (key ? globalOptions[key] : globalOptions);

        // Debug API methods
        api.getDebugStats = () => utils.getStats();
        api.printDebugStats = () => utils.printStats();
        api.resetDebugStats = () => utils.resetStats();

        // Anti-Unsend: Get stored message by ID
        // Note: messageStore is excluded from this refactor, but if it existed in utils:
        // api.getStoredMessage = (messageID: string) => utils.messageStore?.get(messageID);

        // Dynamically load all API modules
        loadApiModules(api, defaultFuncs, ctx);

        // Expose internals for advanced usage
        api.ctx = ctx;
        api.defaultFuncs = defaultFuncs;
        api.globalOptions = globalOptions;

        return callback(null, api);
    } catch (error: any) {
        utils.error("loginHelper", error.error || error);
        return callback(error);
    }
}

export default loginHelper;
