import { join } from "path";

const DEFAULT_DEPTH = 3;

export function getAbs(depth: number = DEFAULT_DEPTH): string {
    let abs = (Error().stack || "")
        .split("\n")
        .filter(text => !/\(internal\/|\/pm2\//u.test(text))
        [depth].trim();

    return join(abs.substring(abs.lastIndexOf(" ") + 2, abs.indexOf(":")), "..");
}
