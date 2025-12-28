import * as debugModule from "./debug";

// Re-export debug module functions
export const { logOptions, log, error, warn, info, success, debug } = debugModule;

// Constants mapping
const j: Record<string, string> = {
    _: "%",
    A: "%2",
    B: "000",
    C: "%7d",
    D: "%7b%22",
    E: "%2c%22",
    F: "%22%3a",
    G: "%2c%22ut%22%3a1",
    H: "%2c%22bls%22%3a",
    I: "%2c%22n%22%3a%22%",
    J: "%22%3a%7b%22i%22%3a0%7d",
    K: "%2c%22pt%22%3a0%2c%22vis%22%3a",
    L: "%2c%22ch%22%3a%7b%22h%22%3a%22",
    M: "%7b%22v%22%3a2%2c%22time%22%3a1",
    N: ".channel%22%2c%22sub%22%3a%5b",
    O: "%2c%22sb%22%3a1%2c%22t%22%3a%5b",
    P: "%2c%22ud%22%3a100%2c%22lc%22%3a0",
    Q: "%5d%2c%22f%22%3anull%2c%22uct%22%3a",
    R: ".channel%22%2c%22sub%22%3a%5b1%5d",
    S: "%22%2c%22m%22%3a0%7d%2c%7b%22i%22%3a",
    T: "%2c%22blc%22%3a1%2c%22snd%22%3a1%2c%22ct%22%3a",
    U: "%2c%22blc%22%3a0%2c%22snd%22%3a1%2c%22ct%22%3a",
    V: "%2c%22blc%22%3a0%2c%22snd%22%3a0%2c%22ct%22%3a",
    W: "%2c%22s%22%3a0%2c%22blo%22%3a0%7d%2c%22bl%22%3a%7b%22ac%22%3a",
    X: "%2c%22ri%22%3a0%7d%2c%22state%22%3a%7b%22p%22%3a0%2c%22ut%22%3a1",
    Y: "%2c%22pt%22%3a0%2c%22vis%22%3a1%2c%22bls%22%3a0%2c%22blc%22%3a0%2c%22snd%22%3a1%2c%22ct%22%3a",
    Z: "%2c%22sb%22%3a1%2c%22t%22%3a%5b%5d%2c%22f%22%3anull%2c%22uct%22%3a0%2c%22s%22%3a0%2c%22blo%22%3a0%7d%2c%22bl%22%3a%7b%22ac%22%3a",
};

const i: Record<string, string> = {};
const l: string[] = [];
for (const m in j) {
    i[j[m]] = m;
    l.push(j[m]);
}
l.reverse();
const h = new RegExp(l.join("|"), "g");

export const NUM_TO_MONTH = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
export const NUM_TO_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function padZeros(val: string | number, len: number = 2): string {
    let sVal = String(val);
    while (sVal.length < len) sVal = "0" + sVal;
    return sVal;
}

export function generateThreadingID(clientID: string): string {
    const k = Date.now();
    const l = Math.floor(Math.random() * 4294967295);
    const m = clientID;
    return "<" + k + ":" + l + "-" + m + "@mail.projektitan.com>";
}

export function binaryToDecimal(data: string): string {
    let ret = "";
    let dataCopy = data;
    while (dataCopy !== "0" && dataCopy.length > 0) {
        let end = 0;
        let fullName = "";
        let i = 0;
        for (; i < dataCopy.length; i++) {
            end = 2 * end + parseInt(dataCopy[i], 10);
            if (end >= 10) {
                fullName += "1";
                end -= 10;
            } else {
                fullName += "0";
            }
        }
        ret = end.toString() + ret;
        dataCopy = fullName.slice(fullName.indexOf("1"));
        if (fullName.indexOf("1") === -1) dataCopy = "0"; // Correctly handle 0
    }
    return ret || "0";
}

export function generateOfflineThreadingID(): string {
    const ret = Date.now();
    const value = Math.floor(Math.random() * 4294967295);
    const str = ("0000000000000000000000" + value.toString(2)).slice(-22);
    const msgs = ret.toString(2) + str;
    return binaryToDecimal(msgs);
}

export function presenceEncode(str: string): string {
    return encodeURIComponent(str)
        .replace(/([_A-Z])|%../g, function (m, n) {
            return n ? "%" + n.charCodeAt(0).toString(16) : m;
        })
        .toLowerCase()
        .replace(h, function (m) {
            return i[m];
        });
}

export function generatePresence(userID: string): string {
    const time = Date.now();
    return (
        "E" +
        presenceEncode(
            JSON.stringify({
                v: 3,
                time: parseInt((time / 1000).toString(), 10),
                user: userID,
                state: {
                    ut: 0,
                    t2: [],
                    lm2: null,
                    uct2: time,
                    tr: null,
                    tw: Math.floor(Math.random() * 4294967295) + 1,
                    at: time,
                },
                ch: {
                    ["p_" + userID]: 0,
                },
            }),
        )
    );
}

export function getFrom(str: string, startToken: string, endToken: string): string {
    const start = str.indexOf(startToken) + startToken.length;
    if (start < startToken.length) return "";

    const lastHalf = str.substring(start);
    const end = lastHalf.indexOf(endToken);
    if (end === -1) {
        throw Error("Could not find endTime `" + endToken + "` in the given string.");
    }
    return lastHalf.substring(0, end);
}

export function makeParsable(html: string): string {
    const withoutForLoop = html.replace(/for\s*\(\s*;\s*;\s*\)\s*;/, "");
    const maybeMultipleObjects = withoutForLoop.split(/\}\r\n *\{/);
    if (maybeMultipleObjects.length === 1) return maybeMultipleObjects[0];

    return "[" + maybeMultipleObjects.join("},{") + "]";
}

export function getSignatureID(): string {
    return Math.floor(Math.random() * 2147483648).toString(16);
}

export function generateTimestampRelative(): string {
    const d = new Date();
    return d.getHours() + ":" + padZeros(d.getMinutes());
}

export function getType(obj: any): string {
    return Object.prototype.toString.call(obj).slice(8, -1);
}
