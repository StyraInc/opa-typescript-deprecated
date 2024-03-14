import { Opa } from "..";
import { Input } from "../../models/components";
import {
  ExecutePolicyWithInputResponse,
  ExecutePolicyResponse,
} from "../../models/operations";

export interface ToInput {
  toInput(): Input;
}

export function authorizer<In extends Input | ToInput, Res>(
  sdk: Opa,
  path: string,
): (_?: In) => Promise<Res> {
  return async function (input?: In): Promise<Res> {
    let result: ExecutePolicyWithInputResponse | ExecutePolicyResponse;
    if (input === undefined) {
      result = await sdk.executePolicy({ path });
    } else {
      result = await sdk.executePolicyWithInput({
        path,
        requestBody: { input },
      });
    }
    if (!result.successfulPolicyEvaluation) throw `no result in API response`;
    return result.successfulPolicyEvaluation.result as Res;
  };
}
