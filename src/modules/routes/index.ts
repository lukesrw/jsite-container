/**
 * Node.js modules
 */
import { promises as fs, createReadStream } from "fs";
import { join } from "path";

/**
 * NPM packages
 */
import { JSite } from "../..";
import { url as parseURL } from "jsite-parse";
const { lookup } = require("mime-types");

/**
 * Interfaces
 */
import { ModuleInfo } from "../../interfaces/module";
import { RequestResponse } from "../../interfaces/net";
import { Rule } from "./interfaces";

/**
 * Constants
 */
const INDEX_FILES = ["index.js", "index.html"];

function getFile(jsite: JSite, handle: any) {
    handle.request.url.pathname = handle.request.url.pathname || "/";

    return join(jsite.options.abs, "public", ...handle.request.url.pathname.split("/")).replace(/\\/gu, "/");
}

export function index(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("server:index", promises => {
            promises.push(
                async (handle: RequestResponse): Promise<RequestResponse> => {
                    handle.request.url.pathname = handle.request.url.pathname || "/";
                    handle.request.origin.pathname = handle.request.origin.pathname || "/";

                    let file = getFile(jsite, handle);
                    handle.response.route.push(`${file}/index.json`);

                    let stats;
                    let target: string | false = false;
                    let rules: Rule[];
                    let diff = decodeURIComponent(
                        handle.request.origin.pathname
                            .split("/")
                            .filter(value => value)
                            .slice(handle.request.url.pathname.split("/").filter(value => value).length)
                            .join("/")
                    );

                    try {
                        stats = await fs.stat(file);
                    } catch (ignore) {}

                    try {
                        if (stats) {
                            if (stats.isFile()) {
                                if (file.endsWith(".json")) {
                                    target = file;
                                }
                            } else if (stats.isDirectory()) {
                                let files = await fs.readdir(file);

                                if (files.includes("index.json")) {
                                    target = join(
                                        jsite.options.abs,
                                        "public",
                                        ...handle.request.url.pathname.split("/"),
                                        "index.json"
                                    );
                                }
                            }
                        }

                        if (target) {
                            rules = JSON.parse(await fs.readFile(target, "utf-8"));

                            if (
                                rules.some(rule => {
                                    handle.request.origin.pathname = handle.request.origin.pathname || "/";

                                    if (Object.prototype.hasOwnProperty.call(rule, "regex") && rule.regex) {
                                        rule.regex = new RegExp(rule.regex, rule.flags || "u");

                                        if (rule.regex.test(diff)) {
                                            rule.matches = [...diff.matchAll(rule.regex)];
                                            rule.matches[0].groups = rule.matches[0].groups || {};
                                            rules = [rule];

                                            return true;
                                        }
                                    }

                                    return false;
                                })
                            ) {
                                handle.response.route[handle.response.route.length - 1] += " (!)";

                                if (!rules[0].file.startsWith("/")) {
                                    rules[0].file = `${handle.request.url.pathname}/${rules[0].file}`.replace(
                                        /\/+/gu,
                                        "/"
                                    );
                                }
                                rules[0].matches[0].groups = rules[0].matches[0].groups || {};

                                for (const key in rules[0].matches[0].groups) {
                                    if (Object.prototype.hasOwnProperty.call(rules[0].matches[0].groups, key)) {
                                        rules[0].file = rules[0].file.replace(
                                            new RegExp(`<${key}>`, "gu"),
                                            rules[0].matches[0].groups[key]
                                        );
                                    }
                                }

                                handle.request.url = await parseURL(rules[0].file);

                                handle.request.data.get = Object.assign(
                                    handle.request.data.get,
                                    rules[0].matches[0].groups
                                );

                                return await jsite.sendEmit("server:request", handle);
                            }

                            handle.response.route[handle.response.route.length - 1] += ` (.) (${diff})`;
                        }

                        if (handle.request.url.pathname !== "/") {
                            handle.request.url = await parseURL(
                                `/${handle.request.url.pathname
                                    .split("/")
                                    .reverse()
                                    .filter(value => value)
                                    .slice(1)
                                    .reverse()
                                    .join("/")}`
                            );

                            return await jsite.sendEmit("server:index", handle);
                        }
                    } catch (error) {
                        console.log(error);
                    }

                    return handle;
                }
            );
        });
    }

    return {
        name: "Index"
    };
}

export function router(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("server:request", promises => {
            promises.push(
                async (handle: RequestResponse): Promise<RequestResponse> => {
                    let file = getFile(jsite, handle);
                    if (handle.response.route.includes(file)) {
                        let in_submenu = false;

                        handle.response.status = "LOOP_DETECTED";
                        handle.response.data += "<h1>508 - Loop Detected</h1><ol>";
                        handle.response.route.concat(file).forEach(part => {
                            if (part === file) part = `<b>${part}</b>`;

                            if (part.includes("/index.json")) {
                                if (!in_submenu) {
                                    handle.response.data += "<ol>";
                                    in_submenu = true;
                                }
                            } else if (in_submenu) {
                                in_submenu = false;
                            }

                            handle.response.data += `<li>${part}</li>`;
                        });
                        handle.response.data += "</ol>";

                        return handle;
                    }

                    handle.response.route.push(file);

                    handle.request.url.pathname = handle.request.url.pathname || "/";

                    try {
                        let stats = await fs.stat(file);
                        if (stats.isDirectory()) {
                            let files = await fs.readdir(file);
                            let file_index: string = "";

                            if (
                                INDEX_FILES.some(index => {
                                    file_index = index;

                                    return files.includes(index);
                                })
                            ) {
                                handle.request.url = await parseURL(join(handle.request.url.pathname, file_index));

                                return await jsite.sendEmit("server:request", handle);
                            }
                        } else if (stats.isFile()) {
                            let handle_custom: any;

                            if (file.endsWith("/index.json")) {
                                handle.response.status = "FORBIDDEN";

                                return handle;
                            }

                            if (file.endsWith(".js")) {
                                try {
                                    jsite.clearRequireCache();
                                    handle_custom = require(file);
                                } catch (ignore) {}
                            }

                            if (
                                typeof handle_custom === "undefined" ||
                                (typeof handle_custom === "object" && Object.values(handle_custom).length === 0)
                            ) {
                                handle.response.data = createReadStream(file);
                                handle.response.headers["Content-Type"] = lookup(file);
                                handle.response.headers["Content-Length"] = stats.size;
                                handle.response.status = "OK";
                            } else {
                                try {
                                    if (typeof handle_custom === "function") {
                                        handle_custom = await handle_custom(handle, jsite);
                                    }

                                    if (typeof handle_custom === "string") {
                                        handle_custom = {
                                            data: handle_custom
                                        };
                                    }

                                    if (Object.prototype.hasOwnProperty.call(handle_custom, "data")) {
                                        handle.response.status = "OK";
                                    }

                                    handle.response = Object.assign(handle.response, handle_custom);
                                } catch (error) {
                                    console.error(error);

                                    handle.response.status = "INTERNAL_SERVER_ERROR";
                                    handle.response.data += error.message;
                                }
                            }
                        }
                    } catch (ignore) {}

                    if (handle.response.status === "NOT_FOUND") {
                        handle = await jsite.sendEmit("server:index", handle);
                    }

                    return handle;
                }
            );
        });
    }

    return {
        name: "JSite Router"
    };
}
