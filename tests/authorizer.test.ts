import { describe, before, after, it } from "node:test";
import assert from "node:assert";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { OPAClient, ToInput, Input, Result } from "../src/";
import { HTTPClient } from "../src/lib/http";

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

compound_result.allowed := true
`,
    slash: `package has["weird/package"].but
import rego.v1

it_is := true`,
    token: `package token
import rego.v1
p := true
`,
  };
  const authzPolicy = `package system.authz
import rego.v1

default allow := false
allow if input.method == "PUT"
allow if input.path[0] == "health"
allow if input.path[2] == "test"
allow if input.path[2] == "has"
allow if {
  input.path[2] = "token"
  input.identity = "opensesame"
}
`;

  let container: StartedTestContainer;
  let serverURL: string;
  before(async () => {
    container = await new GenericContainer("openpolicyagent/opa:latest")
      .withCommand([
        "run",
        "--server",
        "--disable-telemetry",
        "--log-level=debug",
        "--authentication=token",
        "--authorization=basic",
        "/authz.rego",
      ])
      .withExposedPorts(8181)
      .withWaitStrategy(Wait.forHttp("/health", 8181).forStatusCode(200))
      .withCopyContentToContainer([
        {
          content: authzPolicy,
          target: "/authz.rego",
        },
      ])
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
    const res = await new OPAClient(serverURL).authorize("test/p_bool");
    assert.strictEqual(res, true);
  });

  it("can be called with input==false", async () => {
    const res = await new OPAClient(serverURL).authorize(
      "test/p_bool_false",
      false,
    );
    assert.strictEqual(res, true);
  });

  it("supports rules with slashes", async () => {
    const res = await new OPAClient(serverURL).authorize(
      "has/weird%2fpackage/but/it_is",
    );
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
    const res = await new OPAClient(serverURL).authorize<myInput, myResult>(
      "test/compound_input",
      inp,
    );
    assert.deepStrictEqual(res, { foo: "bar" });
  });

  it("supports input of type bool", async () => {
    interface typeResult {
      type: string;
    }
    const inp = true;
    const res = await new OPAClient(serverURL).authorize<boolean, typeResult>(
      "test/has_type",
      inp,
    );
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
    const res = await new OPAClient(serverURL).authorize<A, myResult>(
      "test/compound_input",
      inp,
    );
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
    const res = await new OPAClient(serverURL).authorize<A, myResult>(
      "test/compound_input",
      inp,
    );
    assert.deepStrictEqual(res, { foo: "bar" });
  });

  it("supports result class implementing FromResult", async () => {
    const res = await new OPAClient(serverURL).authorize<any, boolean>(
      "test/compound_result",
      undefined, // input
      (r?: Result) => (r as Record<string, any>)["allowed"] ?? false,
    );
    assert.deepStrictEqual(res, true);
  });

  it("allows custom low-level SDKOptions' HTTPClient", async () => {
    const httpClient = new HTTPClient({});
    let called = false;
    httpClient.addHook("beforeRequest", (req) => {
      called = true;
      return req;
    });
    const res = await new OPAClient(serverURL, {
      sdk: { httpClient },
    }).authorize("test/p_bool");
    assert.strictEqual(res, true);
    assert.strictEqual(called, true);
  });

  it("allows custom headers", async () => {
    const authorization = "Bearer opensesame";
    const res = await new OPAClient(serverURL, {
      headers: { authorization },
    }).authorize("token/p");
    assert.strictEqual(res, true);
  });

  after(async () => await container.stop());
});
