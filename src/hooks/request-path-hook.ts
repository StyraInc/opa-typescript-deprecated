import { BeforeCreateRequestContext, BeforeCreateRequestHook } from "./types";
import { RequestInput } from "../lib/http";

export class RewriteRequestPathHook implements BeforeCreateRequestHook {
  beforeCreateRequest(
    _hookCtx: BeforeCreateRequestContext,
    input: RequestInput,
  ): RequestInput {
    const url = new URL(input.url);
    if (url.pathname.indexOf("/v1/data/") != -1) {
      url.pathname = decodeURIComponent(url.pathname);
      return { ...input, url };
    }
    return input;
  }
}
