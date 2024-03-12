import { z } from "zod";

import { Opa } from "opa";
import { ExecutePolicyWithInputResponse } from "opa/models/operations";
import { Result } from "opa/models/components";

// Q2: How would a helper for processing the result look like?
// A2: A helper could look like this:
function allowed(result: ExecutePolicyWithInputResponse | Result): boolean {
  function isBoolean(res: Result): res is boolean {
    return typeof res === "boolean";
  }

  if (!result) return false;
  if (isBoolean(result)) {
    return result;
  } else {
    const res = result as ExecutePolicyWithInputResponse;
    return !res.successfulPolicyEvaluation?.result;
  }
}

// A2: using zod, example for expecting an "allowed" key
function allowed2(result: ExecutePolicyWithInputResponse): boolean {
  const schema = z.record(z.literal("allowed"), z.boolean());
  try {
    const res = schema.parse(result.successfulPolicyEvaluation?.result);
    return res.allowed ?? false;
  } catch (_) {
    return false;
  }
}

function allowed3(result: Result): boolean {
  const schema = z.record(z.literal("allowed"), z.boolean());
  try {
    const res = schema.parse(result);
    return res.allowed ?? false;
  } catch (_) {
    return false;
  }
}

// Re: Q1, attempted helper
async function evalQuery<T extends Record<string, any>>(
  input: T,
): Promise<Result | undefined> {
  const sdk = new Opa();
  const result = await sdk.executePolicyWithInput({
    path: "test",
    requestBody: { input },
  });
  return result.successfulPolicyEvaluation?.result;
}

async function run() {
  const sdk = new Opa();

  // 1:1 HTTP API call
  const result = await sdk.executePolicyWithInput({
    path: "test",
    requestBody: {
      input: {
        foo: "x",
        bar: "x",
      },
    },
  });

  console.log(result.successfulPolicyEvaluation?.result);

  // Q4: How to simplify type conversion here? This is ugly:
  console.log(
    allowed(
      (result.successfulPolicyEvaluation?.result as Record<string, any>)
        .allowed,
    ),
  );
  console.log(allowed2(result)); // this presumes that there's an `allowed` key in the result Record

  // Q1: How to expose something high-level than requestBody/input -- like resource/actor/action?
  // Q1.1: How would we allow the user to construct an input object from domain-specific parts?
  const result1 = evalQuery({
    foo: "y",
    bar: "y",
  });
  console.log(allowed(result1));
}

// Q3: Is there a way to use decorators? https://www.typescriptlang.org/docs/handbook/decorators.html
// bookmark: https://mirone.me/a-complete-guide-to-typescript-decorator/
// A3: Looks like it's feasible. The question is how to best let the user express
// the mapping between "domain objects" and >input payloads<
function checkPermissions(action: string, resource: string) {
  return function (_target: any, _key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const check = await evalQuery({ action, resource, foo: "x", bar: "x" });
      if (check && allowed3(check)) {
        return originalMethod.apply(this, args);
      }
      throw `error checking permissions for ${action} on ${resource}`;
    };
    return descriptor;
  };
}

class Example {
  @checkPermissions("read", "foo")
  foo() {
    console.log("yay");
  }
}

async function run2() {
  const e = new Example();
  e.foo();
}

//run();

run2();
