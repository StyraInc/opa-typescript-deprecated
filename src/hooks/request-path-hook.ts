import { BeforeRequestContext, BeforeRequestHook } from "./types";

export class RewriteRequestPathHook implements BeforeRequestHook {
  beforeRequest(_hookCtx: BeforeRequestContext, request: Request): Request {
    return new Request(decodeURIComponent(request.url), request);
  }
}
