import { describe, before, after, it } from "node:test";
import assert from "node:assert";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { authorizer, ToInput } from "../src/sdk/helpers";
import { Input } from "../src/models/components";
import { Opa } from "../src/sdk";

// Run these locally, with debug output from testcontainers, like this:
// DEBUG='testcontainers*' node --require ts-node/register --test tests/**/*.ts

describe("tests", async () => {
  const policies = {
    test: `package test
import rego.v1

p_bool if true

p_bool_false if input == false

has_type.type := type_name(input)

compound_input.foo := "bar" if input == {"name": "alice", "list": [1, 2, true]}
`,
    slash: `package has["weird/package"].but
import rego.v1

it_is := true
`,
  };

  let container: StartedTestContainer;
  let serverURL: string;
  before(async () => {
    container = await new GenericContainer("openpolicyagent/opa:latest")
      .withCommand([
        "run",
        "--server",
        "--disable-telemetry",
        "--log-level=debug",
      ])
      .withExposedPorts(8181)
      .withWaitStrategy(Wait.forHttp("/health", 8181).forStatusCode(200))
      .start();
    serverURL = `http://${container.getHost()}:${container.getMappedPort(8181)}`;

    for (const [id, body] of Object.entries(policies)) {
      const response = await fetch(serverURL + "/v1/policies/" + id, {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body,
      });
      assert.ok(response.ok);
    }
  });

  it("can be called without types, without input", async () => {
    const res = await authorizer(new Opa({ serverURL }), "test/p_bool")();
    assert.strictEqual(res, true);
  });

  it("can be called with input==false", async () => {
    const res = await authorizer(
      new Opa({ serverURL }),
      "test/p_bool_false",
    )(false);
    assert.strictEqual(res, true);
  });

  it("supports rules with slashes", async () => {
    const res = await authorizer(
      new Opa({ serverURL }),
      "has/weird%2fpackage/but/it_is",
    )();
    assert.strictEqual(res, true);
  });

  it("supports input/result types", async () => {
    interface myInput {
      name: string;
      list: any[];
    }
    interface myResult {
      foo: string;
    }
    const inp: myInput = { name: "alice", list: [1, 2, true] };
    const res = await authorizer<myInput, myResult>(
      new Opa({ serverURL }),
      "test/compound_input",
    )(inp);
    assert.deepStrictEqual(res, { foo: "bar" });
  });

  it("supports input of type bool", async () => {
    interface typeResult {
      type: string;
    }
    const inp = true;
    const res = await authorizer<boolean, typeResult>(
      new Opa({ serverURL }),
      "test/has_type",
    )(inp);
    assert.deepStrictEqual(res, { type: "boolean" });
  });

  it("calls stringify on a class as input", async () => {
    class A {
      // These are so that JSON.stringify() returns the right thing.
      name: string;
      list: any[];

      constructor(name: string, list: any[]) {
        this.name = name;
        this.list = list;
      }
    }
    const inp = new A("alice", [1, 2, true]);

    interface myResult {
      foo: string;
    }
    const res = await authorizer<A, myResult>(
      new Opa({ serverURL }),
      "test/compound_input",
    )(inp);
    assert.deepStrictEqual(res, { foo: "bar" });
  });

  it("supports input class implementing ToInput", async () => {
    class A implements ToInput {
      // These are so that JSON.stringify() doesn't return the right thing.
      private n: string;
      private l: any[];

      constructor(name: string, list: any[]) {
        this.n = name;
        this.l = list;
      }

      toInput(): Input {
        return { name: this.n, list: this.l };
      }
    }
    const inp = new A("alice", [1, 2, true]);

    interface myResult {
      foo: string;
    }
    const res = await authorizer<A, myResult>(
      new Opa({ serverURL }),
      "test/compound_input",
    )(inp);
    assert.deepStrictEqual(res, { foo: "bar" });
  });

  after(async () => await container.stop());
});
