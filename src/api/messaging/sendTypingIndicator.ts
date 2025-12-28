import { ApiCtx, ApiCallback } from "../../types";

export const sendTypingIndicatorFactory = (_defaultFuncs: any, _api: any, ctx: ApiCtx) => {
    /**
     * Sends a typing indicator to a specific thread.
     * @param sendTyping - True to show typing indicator, false to hide.
     * @param threadID - The ID of the thread to send the typing indicator to.
     * @param callback - An optional callback function.
     */
    return async function sendTypingIndicator(
        sendTyping: boolean,
        threadID: string | number,
        callback?: ApiCallback,
    ) {
        if (!ctx.mqttClient) {
            const err = new Error("Not connected to MQTT");
            if (callback) callback(err);
            throw err;
        }

        let count_req = 0;

        const wsContent = {
            app_id: 2220391788200892,
            payload: JSON.stringify({
                label: 3,
                payload: JSON.stringify({
                    thread_key: threadID.toString(),
                    is_group_thread: +(threadID.toString().length >= 16),
                    is_typing: +sendTyping,
                    attribution: 0,
                }),
                version: 5849951561777440,
            }),
            request_id: ++count_req,
            type: 4,
        };

        try {
            await new Promise<void>((resolve, reject) =>
                ctx.mqttClient.publish(
                    "/ls_req",
                    JSON.stringify(wsContent),
                    {},
                    (err: any, _packet: any) => (err ? reject(err) : resolve()),
                ),
            );
            if (callback) {
                callback(null);
            }
        } catch (e) {
            if (callback) callback(e);
            throw e;
        }
    };
};
