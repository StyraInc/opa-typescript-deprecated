<!-- Start SDK Example Usage [usage] -->
```typescript
import { OpaApiClient } from "@styra/opa";

const opaApiClient = new OpaApiClient();

async function run() {
    const result = await opaApiClient.executePolicyWithInput({
        path: "app/rbac",
        requestBody: {
            input: false,
        },
    });

    // Handle the result
    console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->