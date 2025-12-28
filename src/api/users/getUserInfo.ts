import utils from "../../lib/utils";
import { ApiCtx, UserInfo, ApiCallback } from "../../types";
import _ from "lodash";
import deepdash from "deepdash";

// Initialize deepdash
const _d = deepdash(_);

/**
 * @param data
 * @param userID
 * @returns
 */
function findMainUserObject(data: any, userID: string) {
    let mainUserObject: any = null;
    if (!Array.isArray(data)) return null;
    function deepFind(obj: any) {
        if (mainUserObject || typeof obj !== "object" || obj === null) return;
        if (obj.id === userID && obj.__typename === "User" && obj.profile_tabs) {
            mainUserObject = obj;
            return;
        }
        for (const k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                deepFind(obj[k]);
            }
        }
    }
    deepFind({ all: data });
    return mainUserObject;
}

/**
 * @param socialContext
 * @param keyword
 * @returns
 */
function findSocialContextText(socialContext: any, keyword: string) {
    if (socialContext && Array.isArray(socialContext.content)) {
        for (const item of socialContext.content) {
            const text = item?.text?.text;
            if (text && text.toLowerCase().includes(keyword.toLowerCase())) {
                return text;
            }
        }
    }
    return null;
}

/**
 * @param dataArray
 * @param key
 * @returns
 */
function findFirstValueByKey(dataArray: any[], key: string) {
    if (!Array.isArray(dataArray)) return null;
    let found: any = null;
    function deepSearch(obj: any) {
        if (found !== null || typeof obj !== "object" || obj === null) return;
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            found = obj[key];
            return;
        }
        for (const k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                deepSearch(obj[k]);
            }
        }
    }
    for (const obj of dataArray) {
        deepSearch(obj);
    }
    return found;
}

/**
 * @param allJsonData
 * @returns
 */
function findBioFromProfileTiles(allJsonData: any[]) {
    try {
        const bio = findFirstValueByKey(allJsonData, "profile_status_text");
        return bio?.text || null;
    } catch {
        return null;
    }
}

/**
 * @param allJsonData
 * @returns
 */
function findLiveCityFromProfileTiles(allJsonData: any[]) {
    try {
        // @ts-expect-error - deepdash findDeep types
        const result = _d.findDeep(allJsonData, (value: any, key: any, parent: any) => {
            return (
                key === "text" &&
                typeof value === "string" &&
                value.includes("Lives in") &&
                parent?.ranges?.[0]?.entity?.category_type === "CITY_WITH_ID"
            );
        });

        if (result) {
            return result.value;
        }

        return null;
    } catch {
        return null;
    }
}

function createDefaultUser(id: string): UserInfo {
    return {
        id,
        name: "Facebook User",
        firstName: "Facebook",
        lastName: null,
        vanity: id,
        profilePicUrl: `https://graph.facebook.com/${id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
        profileUrl: `https://www.facebook.com/profile.php?id=${id}`,
        gender: "no specific gender",
        type: "user",
        isFriend: false,
        isBirthday: false,
    };
}

export const getUserInfoFactory = (defaultFuncs: any, api: any, ctx: ApiCtx) => {
    return function getUserInfo(
        id: string | string[],
        usePayload?: boolean | ApiCallback<UserInfo | Record<string, UserInfo>>,
        callback?: ApiCallback<UserInfo | Record<string, UserInfo>>,
        _groupFields: any[] = [],
    ): Promise<UserInfo | Record<string, UserInfo>> {
        let resolveFunc: (data: UserInfo | Record<string, UserInfo>) => void = () => {};
        let rejectFunc: (err: any) => void = () => {};
        const returnPromise = new Promise<UserInfo | Record<string, UserInfo>>(
            (resolve, reject) => {
                resolveFunc = resolve;
                rejectFunc = reject;
            },
        );

        if (typeof usePayload === "function") {
            callback = usePayload;
            usePayload = true;
        }
        if (usePayload === undefined) usePayload = true;
        if (!callback) {
            callback = (err: any, data: any) => {
                if (err) return rejectFunc(err);
                resolveFunc(data);
            };
        }

        const originalIdIsArray = Array.isArray(id);
        const ids = originalIdIsArray ? (id as string[]) : [id as string];

        if (usePayload) {
            const form: any = {};
            ids.forEach((v, i) => {
                form[`ids[${i}]`] = v;
            });
            const getGenderString = (code: number) =>
                code === 2 ? "male" : code === 1 ? "female" : "no specific gender";
            defaultFuncs
                .post("https://www.facebook.com/chat/user_info/", ctx.jar, form)
                .then((resData: any) => utils.parseAndCheckLogin(ctx, defaultFuncs)(resData))
                .then((resData: any) => {
                    if (resData?.error && resData?.error !== 3252001) throw resData;
                    const retObj: Record<string, UserInfo> = {};
                    const profiles = resData?.payload?.profiles;
                    if (profiles) {
                        for (const prop in profiles) {
                            if (profiles.hasOwnProperty(prop)) {
                                const inner = profiles[prop];
                                const nameParts = inner.name ? inner.name.split(" ") : [];
                                retObj[prop] = {
                                    id: prop,
                                    name: inner.name,
                                    firstName: inner.firstName,
                                    lastName:
                                        nameParts.length > 1
                                            ? nameParts[nameParts.length - 1]
                                            : null,
                                    vanity: inner.vanity,
                                    profilePicUrl: `https://graph.facebook.com/${prop}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
                                    profileUrl: inner.uri,
                                    gender: getGenderString(inner.gender),
                                    type: inner.type,
                                    isFriend: inner.is_friend,
                                    isBirthday: !!inner.is_birthday,
                                    searchTokens: inner.searchTokens,
                                    alternateName: inner.alternateName,
                                };
                            }
                        }
                    } else {
                        for (const prop of ids) {
                            retObj[prop] = createDefaultUser(prop);
                        }
                    }
                    return originalIdIsArray
                        ? callback!(null, Object.values(retObj) as any)
                        : callback!(null, retObj[ids[0]]);
                })
                .catch((err: any) => {
                    utils.error("getUserInfo (payload)", err);
                    return callback!(err, null as any);
                });
        } else {
            const fetchProfile = async (userID: string) => {
                try {
                    const url = `https://www.facebook.com/${userID}`;
                    const allJsonData = await utils.json(
                        url,
                        ctx.jar,
                        null,
                        ctx.globalOptions,
                        ctx,
                        {},
                    );
                    if (!allJsonData || allJsonData.length === 0)
                        throw new Error(`Could not find JSON data for ID: ${userID}`);
                    const mainUserObject = findMainUserObject(allJsonData, userID);
                    if (!mainUserObject)
                        throw new Error(`Could not isolate main user object for ID: ${userID}`);
                    const get = (obj: any, path: string) => {
                        if (!obj || !path) return null;
                        return path
                            .split(".")
                            .reduce(
                                (prev: any, curr: string) => (prev ? prev[curr] : undefined),
                                obj,
                            );
                    };
                    const name = mainUserObject.name;
                    const nameParts = name ? name.split(" ") : [];
                    const result: UserInfo = {
                        id: mainUserObject.id,
                        name: name,
                        firstName:
                            nameParts[0] ||
                            get(mainUserObject, "short_name") ||
                            get(findFirstValueByKey(allJsonData, "profile_owner"), "short_name"),
                        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
                        vanity:
                            get(mainUserObject, "vanity") ||
                            get(findFirstValueByKey(allJsonData, "props"), "userVanity") ||
                            null,
                        profileUrl: mainUserObject.url,
                        profilePicUrl: `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
                        gender: mainUserObject.gender,
                        type: mainUserObject.__typename,
                        isFriend: mainUserObject.is_viewer_friend,
                        isBirthday: !!mainUserObject.is_birthday,
                        isVerified: !!mainUserObject.show_verified_badge_on_profile,
                        bio:
                            findBioFromProfileTiles(allJsonData) ||
                            get(
                                findFirstValueByKey(allJsonData, "delegate_page"),
                                "best_description.text",
                            ),
                        live_city: findLiveCityFromProfileTiles(allJsonData),
                        headline:
                            get(mainUserObject, "contextual_headline.text") ||
                            get(
                                findFirstValueByKey(allJsonData, "meta_verified_section"),
                                "headline",
                            ),
                        followers: findSocialContextText(
                            mainUserObject.profile_social_context,
                            "followers",
                        ),
                        following: findSocialContextText(
                            mainUserObject.profile_social_context,
                            "following",
                        ),
                        coverPhoto: get(mainUserObject, "cover_photo.photo.image.uri"),
                    };
                    return result;
                } catch (err: any) {
                    utils.error(`Failed to fetch profile for ${userID}: ${err.message}`, err);
                    return createDefaultUser(userID);
                }
            };

            Promise.all(ids.map(fetchProfile))
                .then((results) => {
                    return originalIdIsArray
                        ? callback!(null, results as any)
                        : callback!(null, results[0] || null);
                })
                .catch((err) => {
                    utils.error("getUserInfo (fetch)", err);
                    callback!(err, null as any);
                });
        }
        return returnPromise;
    };
};
