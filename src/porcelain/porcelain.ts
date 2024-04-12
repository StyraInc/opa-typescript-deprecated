import { OpaApiClient as Opa } from "../sdk";
import type { Input, Result } from "../models/components";
import {
  ExecutePolicyWithInputResponse,
  ExecutePolicyResponse,
} from "../models/operations";
import { SDKOptions } from "../lib/config";
import { HTTPClient } from "../lib/http";

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

/** OPAClient is the starting point for using the high-level API.
 *
 * Use {@link Opa} if you need some low-level customization.
 */
export class OPAClient {
  private opa: Opa;

  /** Create a new `OPA` instance.
   * @param serverURL - The OPA URL, e.g. `https://opa.internal.corp:8443/`.
   * @param opts - Extra options, ncluding low-level `SDKOptions`.
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

  /** `authorize` is used to evaluate the policy at the specified.
   *
   * @param path - The path to the policy, without `/v1/data`: use `authz/allow` to evaluate policy `data.authz.allow`.
   * @param input - The input to the policy, if needed.
   * @param fromResult - A function that is used to transform the policy evaluation result (which could be `undefined`).
   */
  async authorize<In extends Input | ToInput, Res>(
    path: string,
    input?: In,
    fromResult?: (res?: Result) => Res,
  ): Promise<Res> {
    let result: ExecutePolicyWithInputResponse | ExecutePolicyResponse;

    if (input === undefined) {
      result = await this.opa.executePolicy({ path });
    } else {
      let inp: Input;
      if (implementsToInput(input)) {
        inp = input.toInput();
      } else {
        inp = input;
      }
      result = await this.opa.executePolicyWithInput({
        path,
        requestBody: { input: inp },
      });
    }
    if (!result.successfulPolicyEvaluation) throw `no result in API response`;
    const res = result.successfulPolicyEvaluation.result;
    return fromResult ? fromResult(res) : (res as Res);
  }
}
