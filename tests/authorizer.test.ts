import { describe, before, after, it } from "node:test";
import assert from "node:assert";
import {
  GenericContainer,
  Network,
  StartedNetwork,
  StartedTestContainer,
  Wait,
} from "testcontainers";
import { OPAClient, ToInput, Input, Result } from "../src";
import { SDKError } from "../src/sdk/models/errors";
import { HTTPClient } from "../src/lib/http";

// Run these locally, with debug output from testcontainers, like this:
// DEBUG='testcontainers*' node --import tsx --test tests/**/*.ts

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
    condfail: `package condfail
import rego.v1
p[k] := v if some v, k in input
`,
    main: `package system.main
import rego.v1

main.has_input if input
main.different_input if input.foo == "bar"
`,
  };
  const authzPolicy = `package system.authz
import rego.v1

default allow := false
allow if input.method == "PUT"
allow if input.path[0] == "health"
allow if input.path[1] == "batch"
allow if input.path[2] in {"test", "has", "condfail"}
allow if count(input.path) == 1 # default policy
allow if {
  input.path[2] = "token"
  input.identity = "opensesame"
}
`;

  let container: StartedTestContainer;
  let network: StartedNetwork;
  let proxy: StartedTestContainer;
  let serverURL: string;
  before(async () => {
    network = await new Network().start();
    container = await new GenericContainer(
      "ghcr.io/styrainc/enterprise-opa:1.22.0",
    )
      .withCommand([
        "run",
        "--server",
        "--addr=0.0.0.0:8181",
        "--disable-telemetry",
        "--log-level=debug",
        "--authentication=token",
        "--authorization=basic",
        "--set=default_decision=system/main/main",
        "--set=decision_logs.console=true",
        "--no-license-fallback",
        "/authz.rego",
      ])
      .withEnvironment({
        EOPA_LICENSE_KEY: process.env["EOPA_LICENSE_KEY"] ?? "",
        EOPA_LICENSE_TOKEN: process.env["EOPA_LICENSE_TOKEN"] ?? "",
      })
      .withName("opa")
      .withNetwork(network)
      .withExposedPorts(8181)
      .withWaitStrategy(Wait.forHttp("/health", 8181).forStatusCode(200))
      .withCopyContentToContainer([
        {
          content: authzPolicy,
          target: "/authz.rego",
        },
      ])
      .start();

    proxy = await new GenericContainer("caddy:latest")
      .withNetwork(network)
      .withExposedPorts(8000)
      .withWaitStrategy(Wait.forHttp("/opa/health", 8000).forStatusCode(200))
      .withCopyContentToContainer([
        {
          content: `
:8000 {
  handle_path /opa/* {
    reverse_proxy http://opa:8181
  }
}`,
          target: "/etc/caddy/Caddyfile",
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
    const res = await new OPAClient(serverURL).evaluate("test/p_bool");
    assert.strictEqual(res, true);
  });

  it("rejects with server error on failure", async () => {
    assert.rejects(
      new OPAClient(serverURL).evaluate("condfail/p", {
        a: "a",
        b: "a",
      }),
      {
        message: "API error occurred: Status 500 Content-Type application/json",
        name: "SDKError",
      },
    );
  });

  it("can be called with input==false", async () => {
    const res = await new OPAClient(serverURL).evaluate(
      "test/p_bool_false",
      false,
    );
    assert.strictEqual(res, true);
  });

  describe("default", () => {
    it("can be called without types, without input", async () => {
      const res = await new OPAClient(serverURL).evaluateDefault();
      assert.deepStrictEqual(res, { has_input: true });
    });

    it("can be called with input", async () => {
      const res = await new OPAClient(serverURL).evaluateDefault({
        foo: "bar",
      });
      assert.deepStrictEqual(res, { has_input: true, different_input: true });
    });
  });

  it("supports rules with slashes", async () => {
    const res = await new OPAClient(serverURL).evaluate(
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
    const res = await new OPAClient(serverURL).evaluate<myInput, myResult>(
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
    const res = await new OPAClient(serverURL).evaluate<boolean, typeResult>(
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
    const res = await new OPAClient(serverURL).evaluate<A, myResult>(
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
    const res = await new OPAClient(serverURL).evaluate<A, myResult>(
      "test/compound_input",
      inp,
    );
    assert.deepStrictEqual(res, { foo: "bar" });
  });

  it("supports result class implementing FromResult", async () => {
    const res = await new OPAClient(serverURL).evaluate<any, boolean>(
      "test/compound_result",
      undefined, // input
      {
        fromResult: (r?: Result) =>
          (r as Record<string, any>)["allowed"] ?? false,
      },
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
    }).evaluate("test/p_bool");
    assert.strictEqual(res, true);
    assert.strictEqual(called, true);
  });

  it("allows fetch options", async () => {
    const signal = AbortSignal.abort();
    assert.rejects(
      new OPAClient(serverURL).evaluate("test/p_bool", undefined, {
        fetchOptions: { signal },
      }),
    );
  });

  it("allows custom headers", async () => {
    const authorization = "Bearer opensesame";
    const res = await new OPAClient(serverURL, {
      headers: { authorization },
    }).evaluate("token/p");
    assert.strictEqual(res, true);
  });

  it("supports rules with slashes when proxied", async () => {
    const serverURL = `http://${proxy.getHost()}:${proxy.getMappedPort(8000)}/opa`;
    const res = await new OPAClient(serverURL).evaluate(
      "has/weird%2fpackage/but/it_is",
    );
    assert.strictEqual(res, true);
  });

  describe("batch", () => {
    it("supports rules with slashes", async () => {
      const res = await new OPAClient(serverURL).evaluateBatch(
        "has/weird%2fpackage/but/it_is",
        { a: true, b: false },
      );
      assert.deepEqual(res, { a: true, b: true });
    });

    it("can be called with input==false", async () => {
      const res = await new OPAClient(serverURL).evaluateBatch(
        "test/p_bool_false",
        { a: false, b: false, c: true },
      );
      assert.deepEqual(res, { a: true, b: true, c: undefined });
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
      const res = await new OPAClient(serverURL).evaluateBatch<A, myResult>(
        "test/compound_input",
        { inp },
      );
      assert.deepStrictEqual(res, { inp: { foo: "bar" } });
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
      const res = await new OPAClient(serverURL).evaluateBatch<A, myResult>(
        "test/compound_input",
        { inp },
      );
      assert.deepStrictEqual(res, { inp: { foo: "bar" } });
    });

    it("supports result class implementing FromResult", async () => {
      const res = await new OPAClient(serverURL).evaluateBatch<any, boolean>(
        "test/compound_result",
        { a: { b: undefined } },
        {
          fromResult: (r?: Result) =>
            (r as Record<string, any>)["allowed"] ?? false,
        },
      );
      assert.deepStrictEqual(res, { a: true });
    });

    it("allows custom low-level SDKOptions' HTTPClient", async () => {
      const httpClient = new HTTPClient({});
      let called = false;
      httpClient.addHook("beforeRequest", (req) => {
        called = true;
        return req;
      });
      const inp = true;
      const res = await new OPAClient(serverURL, {
        sdk: { httpClient },
      }).evaluateBatch("test/p_bool", { inp });
      assert.deepEqual(res, { inp });
      assert.strictEqual(called, true);
    });

    it("allows fetch options", async () => {
      const signal = AbortSignal.abort();
      const inp = true;
      assert.rejects(
        new OPAClient(serverURL).evaluateBatch(
          "test/p_bool",
          { inp },
          {
            fetchOptions: { signal },
          },
        ),
      );
    });

    it("allows custom headers", async () => {
      const authorization = "Bearer opensesame";
      const inp = true;
      const res = await new OPAClient(serverURL, {
        headers: { authorization },
      }).evaluateBatch("token/p", { inp });
      assert.deepEqual(res, { inp });
    });

    it("supports rules with slashes when proxied", async () => {
      const serverURL = `http://${proxy.getHost()}:${proxy.getMappedPort(8000)}/opa`;
      const inp = true;
      const res = await new OPAClient(serverURL).evaluateBatch(
        "has/weird%2fpackage/but/it_is",
        { inp },
      );
      assert.deepEqual(res, { inp });
    });

    it("returns mixed-mode result on a failure", async () => {
      const res = await new OPAClient(serverURL).evaluateBatch("condfail/p", {
        one: {
          a: "a",
        },
        two: {
          a: "a",
          b: "a",
        },
      });
      assert.deepEqual(res, {
        one: { a: "a" },
        two: { message: "none" },
      });
    });
  });

  after(async () => {
    await container.stop();
    await proxy.stop();
    await network.stop();
  });
});
