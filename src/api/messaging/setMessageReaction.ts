import utils from "../../lib/utils";
import { ApiCtx, ApiCallback } from "../../types";

export const setMessageReactionFactory = (defaultFuncs: any, _api: any, ctx: ApiCtx) => {
    return async (reaction: string, messageID: string, callback?: ApiCallback) => {
        // reaction can be empty string to remove reaction
        if (reaction === undefined || reaction === null) {
            const err = new Error("Reaction cannot be null or undefined.");
            if (callback) callback(err);
            throw err;
        }

        try {
            const defData = await defaultFuncs.postFormData(
                "https://www.facebook.com/webgraphql/mutation/",
                ctx.jar,
                {},
                {
                    doc_id: "1491398900900362",
                    variables: JSON.stringify({
                        data: {
                            client_mutation_id: ctx.clientMutationId++,
                            actor_id: ctx.userID,
                            action: reaction == "" ? "REMOVE_REACTION" : "ADD_REACTION",
                            message_id: messageID,
                            reaction,
                        },
                    }),
                    dpr: 1,
                },
            );
            const resData = await utils.parseAndCheckLogin(ctx, defaultFuncs)(defData);
            if (!resData) {
                throw new Error("setMessageReaction returned empty object.");
            }
            if (callback) callback(null, resData);
            return resData;
        } catch (e) {
            if (callback) callback(e);
            throw e;
        }
    };
};
