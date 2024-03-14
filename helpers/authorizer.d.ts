import { Opa } from "../sdk";
import { Input } from "../models/components";
export interface ToInput {
    toInput(): Input;
}
export declare function authorizer<In extends Input | ToInput, Res>(sdk: Opa, path: string): (_?: In) => Promise<Res>;
//# sourceMappingURL=authorizer.d.ts.map