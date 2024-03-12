import { Opa } from "./sdk";
import { Input } from "../models/components";

export function authorizer<In extends Input, Res>(
  path: string,
): (_: In) => Promise<Res> {
  const sdk = new Opa();
  return async function (input: In): Promise<Res> {
    const result = await sdk.executePolicyWithInput({
      path,
      requestBody: { input },
    });
    return result.successfulPolicyEvaluation?.result as Res;
  };
}
