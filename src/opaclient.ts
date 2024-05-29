import { OpaApiClient as Opa } from "./sdk";
import type { Input, Result } from "./sdk/models/components";
import {
  ExecutePolicyWithInputResponse,
  ExecutePolicyResponse,
} from "./sdk/models/operations";
import { SDKOptions } from "./lib/config";
import { HTTPClient } from "./lib/http";
import { RequestOptions as FetchOptions } from "./lib/sdks";

export type { Input, Result };

/**
 * Implement `ToInput` to declare how your provided input is to be converted
 * into the API request payload's "input".
 */
export interface ToInput {
  toInput(): Input;
}

function implementsToInput(object: any): object is ToInput {
  const u = object as ToInput;
  return u.toInput !== undefined && typeof u.toInput == "function";
}

/** Extra options for using the high-level SDK.
 */
export type Options = {
  headers?: Record<string, string>;
  sdk?: SDKOptions;
};

/** Extra per-request options for using the high-level SDK's
 * evaluate/evaluateDefault methods.
 */
export type RequestOptions<Res> = {
  request?: FetchOptions;
  fromResult?: (res?: Result) => Res;
};

/** OPAClient is the starting point for using the high-level API.
 *
 * Use {@link Opa} if you need some low-level customization.
 */
export class OPAClient {
  private opa: Opa;

  /** Create a new `OPA` instance.
   * @param serverURL - The OPA URL, e.g. `https://opa.internal.corp:8443/`.
   * @param opts - Extra options, including low-level `SDKOptions`.
   */
  constructor(serverURL: string, opts?: Options) {
    const sdk = { serverURL, ...opts?.sdk };
    if (opts?.headers) {
      const hdrs = opts.headers;
      const client = opts?.sdk?.httpClient ?? new HTTPClient();
      client.addHook("beforeRequest", (req) => {
        for (const k in hdrs) {
          req.headers.set(k, hdrs[k] as string);
        }
        return req;
      });
      sdk.httpClient = client;
    }
    this.opa = new Opa(sdk);
  }

  /** `evaluate` is used to evaluate the policy at the specified path with optional input.
   *
   * @param path - The path to the policy, without `/v1/data`: use `authz/allow` to evaluate policy `data.authz.allow`.
   * @param input - The input to the policy, if needed.
   * @param opts - Per-request options: `fromResult`, a function that is used to transform the
   * policy evaluation result (which could be `undefined`), and `request` for low-level
   * fetch options.
   */
  async evaluate<In extends Input | ToInput, Res>(
    path: string,
    input?: In,
    opts?: RequestOptions<Res>,
  ): Promise<Res> {
    let result: ExecutePolicyWithInputResponse | ExecutePolicyResponse;

    if (input === undefined) {
      result = await this.opa.executePolicy({ path }, opts?.request);
    } else {
      let inp: Input;
      if (implementsToInput(input)) {
        inp = input.toInput();
      } else {
        inp = input;
      }
      result = await this.opa.executePolicyWithInput(
        {
          path,
          requestBody: { input: inp },
        },
        opts?.request,
      );
    }
    if (!result.successfulPolicyEvaluation) throw `no result in API response`;
    const res = result.successfulPolicyEvaluation.result;
    const fromResult = opts?.fromResult;
    return fromResult ? fromResult(res) : (res as Res);
  }

  /** `evaluateDefault` is used to evaluate the server's default policy with optional input.
   *
   * @param input - The input to the default policy, defaults to `{}`.
   * @param opts - Per-request options: `fromResult`, a function that is used to transform the
   * policy evaluation result (which could be `undefined`), and `request` for low-level
   * fetch options.
   */
  async evaluateDefault<In extends Input | ToInput, Res>(
    input?: In,
    opts?: RequestOptions<Res>,
  ): Promise<Res> {
    let inp = input ?? {};
    if (implementsToInput(inp)) {
      inp = inp.toInput();
    }
    const resp = await this.opa.executeDefaultPolicyWithInput(
      inp,
      undefined, // pretty
      undefined, // gzipEncoding
      opts?.request,
    );
    if (!resp.result) throw `no result in API response`;
    const res = resp.result;
    const fromResult = opts?.fromResult;
    return fromResult ? fromResult(res) : (res as Res);
  }
}
