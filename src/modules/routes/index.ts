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

/**
 * Constants
 */
const INDEX_FILES = ["index.js", "index.html"];

export function router(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("server:request", promises => {
            promises.push(
                async (handle: any): Promise<RequestResponse> => {
                    let file = join(jsite.options.abs, "public", ...handle.request.url.pathname.split("/"));

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
                        }

                        if (stats.isFile()) {
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
