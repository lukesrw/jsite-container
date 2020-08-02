/**
 * Node.js modules
 */
import { IncomingMessage, OutgoingHttpHeaders } from "http";

/**
 * Npm packages
 */
import * as status from "http-status";
import * as Generic from "./generic";
import { Modify } from "../types/modify";
import { Url } from "url";
import { Readable } from "stream";

export interface IncomingMessageData
    extends Modify<
        IncomingMessage,
        {
            url?: string | Url;
        }
    > {
    data?: {
        [method: string]: Generic.Object;
        get: Generic.Object;
        files?: any;
    };
}

export interface RequestResponse {
    request: IncomingMessageData;
    response: {
        data: string | Readable;
        headers: OutgoingHttpHeaders;
        status: keyof typeof status;
    };
}
