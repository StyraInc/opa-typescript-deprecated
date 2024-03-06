<!-- Start SDK Example Usage [usage] -->
```typescript
import { Opa } from "opa";

async function run() {
    const sdk = new Opa();

    const result = await sdk.executePolicyWithInput({
        path: "",
        requestBody: {
            input: {
                key: "<value>",
            },
        },
    });

    // Handle the result
    console.log(result);
}

run();

```
<!-- End SDK Example Usage [usage] -->