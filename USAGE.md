<!-- Start SDK Example Usage [usage] -->
```typescript
import { OpaOpenApiClient } from "@styra/opa";

async function run() {
    const sdk = new OpaOpenApiClient();

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