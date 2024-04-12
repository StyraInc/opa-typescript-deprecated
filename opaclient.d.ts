import type { Input, Result } from "./sdk/models/components";
import { SDKOptions } from "./lib/config";
export type { Input, Result };
/**
 * Implement `ToInput` to declare how your provided input is to be converted
 * into the API request payload's "input".
 */
export interface ToInput {
    toInput(): Input;
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
export declare class OPAClient {
    private opa;
    /** Create a new `OPA` instance.
     * @param serverURL - The OPA URL, e.g. `https://opa.internal.corp:8443/`.
     * @param opts - Extra options, ncluding low-level `SDKOptions`.
     */
    constructor(serverURL: string, opts?: Options);
    /** `authorize` is used to evaluate the policy at the specified.
     *
     * @param path - The path to the policy, without `/v1/data`: use `authz/allow` to evaluate policy `data.authz.allow`.
     * @param input - The input to the policy, if needed.
     * @param fromResult - A function that is used to transform the policy evaluation result (which could be `undefined`).
     */
    authorize<In extends Input | ToInput, Res>(path: string, input?: In, fromResult?: (res?: Result) => Res): Promise<Res>;
}
//# sourceMappingURL=opaclient.d.ts.map