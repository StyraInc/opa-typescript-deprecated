import { BeforeRequestContext, BeforeRequestHook } from "./types";

export class RewriteRequestPathHook implements BeforeRequestHook {
  beforeRequest(_hookCtx: BeforeRequestContext, request: Request): Request {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/v1/data")) {
      return new Request(decodeURIComponent(request.url), request);
    }
    return request;
  }
}
