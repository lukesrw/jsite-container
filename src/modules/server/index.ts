/**
 * Node.js modules
 */
import { createServer, ServerResponse } from "http";
import * as zlib from "zlib";

/**
 * Npm packages
 */
import { JSite } from "../..";
import * as status from "http-status";
import { request as parseRequest, url as parseURL } from "jsite-parse";

/**
 * Interfaces
 */
import { RequestResponse } from "../../interfaces/net";
import { ModuleInfo } from "../../interfaces/module";
import { Url } from "url";
import { Readable } from "stream";

const DEFAULT_RESPONSE_DATA = `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">

        <style>
            html,
            body {
                font-family: Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif;
                margin: 20px 23px;
            }
        </style>
    </head>
    <body>
        `;

export function server(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("jsite:start", promises => {
            promises.push(async () => {
                jsite.custom.server = createServer();

                jsite.custom.server.on("request", async (request: any, response: ServerResponse) => {
                    try {
                        request.data = await parseRequest(request);
                    } catch (error) {
                        console.log(error);

                        request.data = {
                            get: {}
                        };
                    }

                    let handle: RequestResponse = {
                        request,
                        response: {
                            data: DEFAULT_RESPONSE_DATA,
                            headers: {
                                "Content-Type": "text/html"
                            },
                            route: [],
                            status: "NOT_FOUND"
                        }
                    };

                    handle.request.url = (await parseURL(request.url)) as Url;
                    handle.request.origin = handle.request.url;

                    handle = await jsite.sendEmit("server:request", handle);

                    if (!Object.prototype.hasOwnProperty.call(status, handle.response.status)) {
                        throw new Error(`Unsupported Status: ${handle.response.status}`);
                    }
                    if (handle.response.status !== "OK" && handle.response.data === DEFAULT_RESPONSE_DATA) {
                        handle.response.data += `<h1>${
                            status[status[handle.response.status] as keyof typeof status]
                        }</h1>
    </body>
</html>`;
                    }
                    if (typeof handle.response.data !== "string" && typeof handle.response.data.pipe !== "function") {
                        handle.response.data = JSON.stringify(handle.response.data);
                        handle.response.headers["Content-Type"] = "application/json; charset=utf-8";
                    }
                    if (typeof handle.response.data === "string") {
                        handle.response.headers["Content-Length"] = Buffer.byteLength(handle.response.data);
                        handle.response.data = Readable.from(handle.response.data);
                    }

                    let compression: "createDeflate" | "createGzip" | "createBrotliCompress" | undefined;
                    /**
                     * adding compression, for some reason, takes 5 seconds
                     * this didn't happen in previous versions - work out why
                     *
                     * as a short-term workaround, need to implement caching
                     * this entire server:request bit should start with jsite.sendEmit("cache:get", request)
                     *
                     * @todo fix
                     *
                    if (typeof handle.request.headers["accept-encoding"] === "string") {
                        if (/\bdeflate\b/u.test(handle.request.headers["accept-encoding"])) {
                            handle.response.headers["Content-Encoding"] = "deflate";
                            compression = "createDeflate";
                        } else if (/\bgzip\b/u.test(handle.request.headers["accept-encoding"])) {
                            handle.response.headers["Content-Encoding"] = "gzip";
                            compression = "createGzip";
                        } else if (/\bbr\b/u.test(handle.request.headers["accept-encoding"])) {
                            handle.response.headers["Content-Encoding"] = "br";
                            compression = "createBrotliCompress";
                        }
                    }
                    /**/

                    response.writeHead(status[handle.response.status] as number, handle.response.headers);
                    if (compression && typeof zlib[compression] === "function") {
                        handle.response.data.pipe(zlib[compression]()).pipe(response);
                    } else {
                        handle.response.data.pipe(response);
                    }
                });

                jsite.custom.server.listen({
                    port: 3000
                });

                return jsite;
            });
        });
    }

    return {
        name: "JSite Server"
    };
}
