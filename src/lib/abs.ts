import { join } from "path";

export function getAbs(): string {
    let root;

    if (Object.prototype.hasOwnProperty.call(process.env, "PWD") && process.env.PWD) {
        return process.env.PWD;
    }

    if (typeof require.main === "object") {
        if (Object.prototype.hasOwnProperty.call(require.main, "filename")) {
            root = require.main.filename;
        }

        if (
            Object.prototype.hasOwnProperty.call(require.main, "exports") &&
            Object.prototype.hasOwnProperty.call(require.main.exports, "PhusionPassenger") &&
            Object.prototype.hasOwnProperty.call(require.main.exports.PhusionPassenger, "options") &&
            Object.prototype.hasOwnProperty.call(require.main.exports.PhusionPassenger.options, "startup_file")
        ) {
            root = require.main.exports.PhusionPassenger.options.startup_file;
        }
    }

    return join(root, "..");
}
