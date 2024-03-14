"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizer = void 0;
function authorizer(sdk, path) {
    return async function (input) {
        let result;
        if (input === undefined) {
            result = await sdk.executePolicy({ path });
        }
        else {
            result = await sdk.executePolicyWithInput({
                path,
                requestBody: { input },
            });
        }
        if (!result.successfulPolicyEvaluation)
            throw `no result in API response`;
        return result.successfulPolicyEvaluation.result;
    };
}
exports.authorizer = authorizer;
//# sourceMappingURL=authorizer.js.map