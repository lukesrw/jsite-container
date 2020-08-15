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

    return join(jsite.options.abs, "public", ...handle.request.url.pathname.split("/"));
}

export function index(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("server:index", promises => {
            promises.push(
                async (handle: RequestResponse): Promise<RequestResponse> => {
                    handle.request.url.pathname = handle.request.url.pathname || "/";
                    handle.request.origin.pathname = handle.request.origin.pathname || "/";

                    let file = getFile(jsite, handle);
                    let stats;
                    let target;
                    let diff = handle.request.origin.pathname
                        .split("/")
                        .filter(value => value)
                        .slice(handle.request.url.pathname.split("/").filter(value => value).length)
                        .join("/");

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
                            target = JSON.parse(await fs.readFile(target, "utf-8")) as Rule[];

                            if (
                                target.some(rule => {
                                    handle.request.origin.pathname = handle.request.origin.pathname || "/";

                                    if (Object.prototype.hasOwnProperty.call(rule, "regex") && rule.regex) {
                                        rule.regex = new RegExp(rule.regex, rule.flags || "u");
                                        rule.matches = [...diff.matchAll(rule.regex)];

                                        if (rule.regex.test(diff)) {
                                            target = [rule];

                                            return true;
                                        }
                                    }

                                    return false;
                                })
                            ) {
                                if (!target[0].file.startsWith("/")) {
                                    target[0].file = `${handle.request.url.pathname}/${target[0].file}`.replace(
                                        /\/+/gu,
                                        "/"
                                    );
                                }

                                handle.request.url = await parseURL(target[0].file);
                                handle.request.data.get = Object.assign(handle.request.data.get, target[0].matches);

                                return await jsite.sendEmit("server:request", handle);
                            }
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
                            if (file.endsWith(".js")) {
                                try {
                                    delete require.cache[require.resolve(file)];
                                    handle_custom = require(file);
                                } catch (ignore) {}
                            }

                            handle.response.status = "OK";

                            if (
                                typeof handle_custom === "undefined" ||
                                (typeof handle_custom === "object" && Object.values(handle_custom).length === 0)
                            ) {
                                handle.response.data = createReadStream(file);
                                handle.response.headers["Content-Type"] = lookup(file);
                                handle.response.headers["Content-Length"] = stats.size;
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

                                    handle.response = Object.assign(handle.response, handle_custom);
                                } catch (error) {
                                    console.error(error);

                                    handle.response.status = "INTERNAL_SERVER_ERROR";
                                    handle.response.data = error.message;
                                }
                            }
                        }
                    } catch (ignore) {}

                    return handle;
                }
            );
        });
    }

    return {
        name: "JSite Router"
    };
}
