# OPA Typescript SDK

Styra's OPA SDK

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![NPM Version](https://img.shields.io/npm/v/%40styra%2Fopa?style=flat&color=%2324b6e0)](https://www.npmjs.com/package/@styra/opa)

<!-- Start SDK Installation [installation] -->
## SDK Installation

### NPM

```bash
npm add @styra/opa
```

### Yarn

```bash
yarn add @styra/opa
```
<!-- End SDK Installation [installation] -->

<!-- Start Requirements [requirements] -->
## Requirements

For supported JavaScript runtimes, please consult [RUNTIMES.md](RUNTIMES.md).
<!-- End Requirements [requirements] -->

## SDK Example Usage (high-level)

All the code examples that follow assume that the high-level SDK module has been imported, and that an `OPA` instance was created:

```ts
import { OPAClient } from "@styra/opa";

const serverURL = "http://opa-host:8181";
const path = "authz/allow";
const opa = new OPAClient(serverURL);
```

### Simple query

For a simple boolean response without input, use the SDK as follows:

```ts
const allowed = await opa.authorize(path);
console.log(allowed ? "allowed!" : "denied!");
```

Note that `allowed` will be of type `any`. You can change that by providing type parameters to `authorize`:

```ts
const allowed = await opa.authorize<never, boolean>(path);
```

The first parameter is the type of `input` passed into `authorized`; we don't have any in this example, so you can use anything for it (`any`, `unknown`, or `never`).

<details><summary>HTTP Request</summary>

```http
POST /v1/data/authz/allow
Content-Type: application/json

{}
```

</details>

### Input

Input is provided as a second (optional) argument to `authorize`:

```ts
const input = { user: "alice" };
const allowed = await opa.authorize(path, input);
console.log(allowed ? "allowed!" : "denied!");
```

For providing types, use

```ts
interface myInput {
  user: string;
}
const input: myInput = { user: "alice" };
const allowed = await opa.authorize<myInput, boolean>(path, input);
console.log(allowed ? "allowed!" : "denied!");
```

<details><summary>HTTP Request</summary>

```http
POST /v1/data/authz/allow
Content-Type: application/json

{ "input": { "user": "alice" } }
```

</details>

### Result Types

When the result of the policy evaluation is more complex, you can pass its type to `authorized` and get a typed result:

```ts
interface myInput {
  user: string;
}
interface myResult {
  authorized: boolean;
  details: string[];
}
const input: myInput = { user: "alice" };
const result = await opa.authorize<myInput, myResult>(path, input);
console.log(result.authorized ? "allowed!" : "denied!");
```

### Input Transformations

If you pass in an arbitrary object as input, it'll be stringified (`JSON.stringify`):

```ts
class A {
  // With these names, JSON.stringify() returns the right thing.
  name: string;
  list: any[];

  constructor(name: string, list: any[]) {
    this.name = name;
    this.list = list;
  }
}
const inp = new A("alice", [1, 2, true]);
const allowed = await opa.authorize<myInput, boolean>(path, inp);
console.log(allowed ? "allowed!" : "denied!");
```

You can control the input that's constructed from an object by implementing `ToInput`:

```ts
class A implements ToInput {
  // With these names, JSON.stringify() doesn't return the right thing.
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
const allowed = await opa.authorize<myInput, boolean>(path, inp);
console.log(allowed ? "allowed!" : "denied!");
```

<details><summary>HTTP Request</summary>

```http
POST /v1/data/authz/allow
Content-Type: application/json

{ "input": { "name": "alice", "list": [ 1, 2, true ] } }
```

</details>

### Result Transformations

If the result format of the policy evaluation does not match what you want it to be, you can provide a _third argument_, a function that transforms the API result.

Assuming that the policy evaluates to

```json
{
  "allowed": true,
  "details": ["property-a is OK", "property-B is OK"]
}
```

you can turn it into a boolean result like this:

```ts
const allowed = await opa.authorize<any, boolean>(
  path,
  undefined,
  (r?: Result) => (r as Record<string, any>)["allowed"] ?? false,
);
console.log(allowed ? "allowed!" : "denied!");
```

### Example Projects

#### Express

In [the StyraInc/styra-demo-tickethub repository](https://github.com/StyraInc/styra-demo-tickethub/tree/main/server/node), you'll find a NodeJS backend service that is using `@styra/opa`:

```javascript
router.get("/tickets/:id", [param("id").isInt().toInt()], async (req, res) => {
  const {
    params: { id },
  } = req;
  await authz.authorized(path, { action: "get", id }, req);

  const ticket = await prisma.tickets.findUniqueOrThrow({
    where: { id },
    ...includeCustomers,
  });
  return res.status(OK).json(toTicket(ticket));
});
```

#### NestJS

In [StyraInc/opa-typescript-example-nestjs](https://github.com/StyraInc/opa-typescript-example-nestjs), we have an decorator-based API authorization example using `@styra/opa`:

```ts
@Controller('cats')
@AuthzQuery('cats/allow')
@AuthzStatic({ resource: 'cat' })
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  @Authz(({ body: { name } }) => ({ name, action: 'create' }))
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get(':name')
  @AuthzQuery('cats') // For illustration, we're querying the package extent
  @Decision((r) => r.allow)
  @Authz(({ params: { name } }) => ({
    name,
    action: 'get',
  }))
  async findByName(@Param('name') name: string): Promise<Cat> {
    return this.catsService.findByName(name);
  }
}
```

Please refer to [the repository's README.md](https://github.com/StyraInc/opa-typescript-example-nestjs/tree/main#opa-typescript-nestjs-example) for more details.

> [!NOTE]
> For low-level SDK usage, see the sections below.

---

<!-- Start SDK Example Usage [usage] -->
## SDK Example Usage

### Example

```typescript
import { OpaApiClient } from "@styra/opa";

async function run() {
    const sdk = new OpaApiClient();

    const result = await sdk.executePolicyWithInput({
        path: "app/rbac",
        requestBody: {
            input: {
                user: "alice",
                action: "read",
                object: "id123",
                type: "dog",
            },
        },
    });

    // Handle the result
    console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->

<!-- Start Available Resources and Operations [operations] -->
## Available Resources and Operations

### [OpaApiClient SDK](docs/sdks/opaapiclient/README.md)

* [executePolicy](docs/sdks/opaapiclient/README.md#executepolicy) - Execute a policy
* [executePolicyWithInput](docs/sdks/opaapiclient/README.md#executepolicywithinput) - Execute a policy given an input
* [health](docs/sdks/opaapiclient/README.md#health) - Verify the server is operational
<!-- End Available Resources and Operations [operations] -->

<!-- Start Error Handling [errors] -->
## Error Handling

All SDK methods return a response object or throw an error. If Error objects are specified in your OpenAPI Spec, the SDK will throw the appropriate Error type.

| Error Object       | Status Code        | Content Type       |
| ------------------ | ------------------ | ------------------ |
| errors.ClientError | 400                | application/json   |
| errors.ServerError | 500                | application/json   |
| errors.SDKError    | 4xx-5xx            | */*                |

Validation errors can also occur when either method arguments or data returned from the server do not match the expected format. The `SDKValidationError` that is thrown as a result will capture the raw value that failed validation in an attribute called `rawValue`. Additionally, a `pretty()` method is available on this error that can be used to log a nicely formatted string since validation errors can list many issues and the plain error string may be difficult read when debugging. 


```typescript
import { OpaApiClient } from "@styra/opa";
import * as errors from "@styra/opa/models/errors";

async function run() {
    const sdk = new OpaApiClient();

    let result;
    try {
        result = await sdk.executePolicy({
            path: "app/rbac",
        });
    } catch (err) {
        switch (true) {
            case err instanceof errors.SDKValidationError: {
                // Validation errors can be pretty-printed
                console.error(err.pretty());
                // Raw value may also be inspected
                console.error(err.rawValue);
                return;
            }
            case err instanceof errors.ClientError: {
                console.error(err); // handle exception
                return;
            }
            case err instanceof errors.ServerError: {
                console.error(err); // handle exception
                return;
            }
            default: {
                throw err;
            }
        }
    }

    // Handle the result
    console.log(result);
}

run();

```
<!-- End Error Handling [errors] -->

<!-- Start Server Selection [server] -->
## Server Selection

### Select Server by Index

You can override the default server globally by passing a server index to the `serverIdx` optional parameter when initializing the SDK client instance. The selected server will then be used as the default on the operations that use it. This table lists the indexes associated with the available servers:

| # | Server | Variables |
| - | ------ | --------- |
| 0 | `http://localhost:8181` | None |

```typescript
import { OpaApiClient } from "@styra/opa";

async function run() {
    const sdk = new OpaApiClient({
        serverIdx: 0,
    });

    const result = await sdk.executePolicy({
        path: "app/rbac",
    });

    // Handle the result
    console.log(result);
}

run();

```


### Override Server URL Per-Client

The default server can also be overridden globally by passing a URL to the `serverURL` optional parameter when initializing the SDK client instance. For example:

```typescript
import { OpaApiClient } from "@styra/opa";

async function run() {
    const sdk = new OpaApiClient({
        serverURL: "http://localhost:8181",
    });

    const result = await sdk.executePolicy({
        path: "app/rbac",
    });

    // Handle the result
    console.log(result);
}

run();

```
<!-- End Server Selection [server] -->

<!-- Start Custom HTTP Client [http-client] -->
## Custom HTTP Client

The TypeScript SDK makes API calls using an `HTTPClient` that wraps the native
[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). This
client is a thin wrapper around `fetch` and provides the ability to attach hooks
around the request lifecycle that can be used to modify the request or handle
errors and response.

The `HTTPClient` constructor takes an optional `fetcher` argument that can be
used to integrate a third-party HTTP client or when writing tests to mock out
the HTTP client and feed in fixtures.

The following example shows how to use the `"beforeRequest"` hook to to add a
custom header and a timeout to requests and how to use the `"requestError"` hook
to log errors:

```typescript
import { OpaApiClient } from "@styra/opa";
import { HTTPClient } from "@styra/opa/lib/http";

const httpClient = new HTTPClient({
  // fetcher takes a function that has the same signature as native `fetch`.
  fetcher: (request) => {
    return fetch(request);
  }
});

httpClient.addHook("beforeRequest", (request) => {
  const nextRequest = new Request(request, {
    signal: request.signal || AbortSignal.timeout(5000);
  });

  nextRequest.headers.set("x-custom-header", "custom value");

  return nextRequest;
});

httpClient.addHook("requestError", (error, request) => {
  console.group("Request Error");
  console.log("Reason:", `${error}`);
  console.log("Endpoint:", `${request.method} ${request.url}`);
  console.groupEnd();
});

const sdk = new OpaApiClient({ httpClient });
```
<!-- End Custom HTTP Client [http-client] -->

<!-- Placeholder for Future Speakeasy SDK Sections -->

## Development

### Maturity

This SDK is in beta, and there may be breaking changes between versions without a major version update. Therefore, we recommend pinning usage
to a specific package version. This way, you can install the same version each time without breaking changes unless you are intentionally
looking for the latest version.
