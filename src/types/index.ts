export interface ApiOptions {
    selfListen?: boolean;
    listenEvents?: boolean;
    updatePresence?: boolean;
    autoMarkDelivery?: boolean;
    autoMarkRead?: boolean;
    autoReconnect?: boolean;
    online?: boolean;
    userAgent?: string;
    proxy?: string;
    [key: string]: any;
}

export interface AppState {
    key: string;
    value: string;
    domain: string;
    path: string;
    [key: string]: any;
}

export interface Credentials {
    email?: string;
    password?: string;
    appState?: AppState[] | string;
}

export interface ApiCtx {
    userID: string;
    jar: any; // ToughCookie jar
    clientID: string;
    appID: string;
    mqttAppID: string;
    userAppID: string;
    globalOptions: ApiOptions;
    loggedIn: boolean;
    access_token: string;
    clientMutationId: number;
    mqttClient?: any;
    lastSeqId: string;
    syncToken?: string;
    mqttEndpoint?: string;
    wsReqNumber: number;
    wsTaskNumber: number;
    reqCallbacks: Record<string, any>;
    callback_Task: Record<string, any>;
    region?: string;
    firstListen: boolean;
    fb_dtsg?: string;
    jazoest?: string;
    [key: string]: any;
}

export interface UserInfo {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    vanity: string | null;
    profilePicUrl: string;
    profileUrl: string;
    gender: string;
    type: string;
    isFriend: boolean;
    isBirthday: boolean;
    searchTokens?: any[];
    alternateName?: string;
    isVerified?: boolean;
    bio?: string | null;
    live_city?: string | null;
    headline?: string | null;
    followers?: string | null;
    following?: string | null;
    coverPhoto?: string | null;
}

export type ApiCallback<T = any> = (err: any, data?: T) => void;

export interface Api {
    setOptions(options: ApiOptions): void;
    getAppState(): AppState[];
    getCurrentUserID(): string;
    getOptions(key?: string): any;
    getDebugStats(): any;
    printDebugStats(): void;
    resetDebugStats(): void;

    // Users
    getUserInfo(
        id: string | string[],
        usePayload?: boolean | ApiCallback<UserInfo | Record<string, UserInfo>>,
        callback?: ApiCallback<UserInfo | Record<string, UserInfo>>,
    ): Promise<UserInfo | Record<string, UserInfo>>;

    // Messaging
    sendMessage(
        msg: any,
        threadID: string | number,
        callback?: ApiCallback,
        replyToMessage?: string,
    ): Promise<any>;
    markAsRead(threadID: string, callback?: ApiCallback): Promise<any>;
    // ... add other methods as we refactor
    [key: string]: any;
}
