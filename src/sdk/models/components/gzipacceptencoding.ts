/*
 * Code generated by Speakeasy (https://speakeasyapi.dev). DO NOT EDIT.
 */

import * as z from "zod";

export enum GzipAcceptEncoding {
    Gzip = "gzip",
}

/** @internal */
export namespace GzipAcceptEncoding$ {
    export const inboundSchema = z.nativeEnum(GzipAcceptEncoding);
    export const outboundSchema = inboundSchema;
}