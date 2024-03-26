import { Opa } from "../sdk";
import type { Input, Result } from "../models/components";
import {
  ExecutePolicyWithInputResponse,
  ExecutePolicyResponse,
} from "../models/operations";

export type { Input, Result };

export interface ToInput {
  toInput(): Input;
}

function implementsToInput(object: any): object is ToInput {
  const u = object as ToInput;
  return u.toInput !== undefined && typeof u.toInput == "function";
}

export class OPA {
  private opa: Opa;

  constructor(serverURL: string) {
    this.opa = new Opa({ serverURL });
  }

  async authorize<In extends Input | ToInput, Res>(
    path: string,
    input?: In,
    fromResult?: (_?: Result) => Res,
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
