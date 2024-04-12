"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPAClient = void 0;
const sdk_1 = require("./sdk");
const http_1 = require("./lib/http");
function implementsToInput(object) {
    const u = object;
    return u.toInput !== undefined && typeof u.toInput == "function";
}
/** OPAClient is the starting point for using the high-level API.
 *
 * Use {@link Opa} if you need some low-level customization.
 */
class OPAClient {
    /** Create a new `OPA` instance.
     * @param serverURL - The OPA URL, e.g. `https://opa.internal.corp:8443/`.
     * @param opts - Extra options, ncluding low-level `SDKOptions`.
     */
    constructor(serverURL, opts) {
        var _a, _b;
        const sdk = { serverURL, ...opts === null || opts === void 0 ? void 0 : opts.sdk };
        if (opts === null || opts === void 0 ? void 0 : opts.headers) {
            const hdrs = opts.headers;
            const client = (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.sdk) === null || _a === void 0 ? void 0 : _a.httpClient) !== null && _b !== void 0 ? _b : new http_1.HTTPClient();
            client.addHook("beforeRequest", (req) => {
                for (const k in hdrs) {
                    req.headers.set(k, hdrs[k]);
                }
                return req;
            });
            sdk.httpClient = client;
        }
        this.opa = new sdk_1.OpaApiClient(sdk);
    }
    /** `authorize` is used to evaluate the policy at the specified.
     *
     * @param path - The path to the policy, without `/v1/data`: use `authz/allow` to evaluate policy `data.authz.allow`.
     * @param input - The input to the policy, if needed.
     * @param fromResult - A function that is used to transform the policy evaluation result (which could be `undefined`).
     */
    async authorize(path, input, fromResult) {
        let result;
        if (input === undefined) {
            result = await this.opa.executePolicy({ path });
        }
        else {
            let inp;
            if (implementsToInput(input)) {
                inp = input.toInput();
            }
            else {
                inp = input;
            }
            result = await this.opa.executePolicyWithInput({
                path,
                requestBody: { input: inp },
            });
        }
        if (!result.successfulPolicyEvaluation)
            throw `no result in API response`;
        const res = result.successfulPolicyEvaluation.result;
        return fromResult ? fromResult(res) : res;
    }
}
exports.OPAClient = OPAClient;
//# sourceMappingURL=opaclient.js.map