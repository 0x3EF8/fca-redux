import utils from "../../lib/utils";
import { ApiCtx } from "../../types";

export const unsendMessageFactory = (defaultFuncs: any, _api: any, ctx: ApiCtx) => {
    return async (messageID: string, callback?: (err?: any, data?: any) => void) => {
        try {
            const defData = await defaultFuncs.post(
                "https://www.facebook.com/messaging/unsend_message/",
                ctx.jar,
                {
                    message_id: messageID,
                },
            );
            const resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(defData);

            if (resData.error) {
                const errorMsg =
                    typeof resData.error === "string"
                        ? resData.error
                        : JSON.stringify(resData.error);
                throw new Error(`Failed to unsend message: ${errorMsg}`);
            }

            if (callback) callback(null, resData);
            return resData;
        } catch (error: any) {
            // Properly format error message
            const errorMsg = error.message || error.toString();
            const err = new Error(`Unsend message failed: ${errorMsg}`);
            if (callback) callback(err);
            throw err;
        }
    };
};
