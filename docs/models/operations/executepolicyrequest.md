# ExecutePolicyRequest


## Fields

| Field                                                                                                                                                                                                                                                                        | Type                                                                                                                                                                                                                                                                         | Required                                                                                                                                                                                                                                                                     | Description                                                                                                                                                                                                                                                                  | Example                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`                                                                                                                                                                                                                                                                       | *string*                                                                                                                                                                                                                                                                     | :heavy_check_mark:                                                                                                                                                                                                                                                           | The path separator is used to access values inside object and array documents. If the path indexes into an array, the server will attempt to convert the array index to an integer. If the path element cannot be converted to an integer, the server will respond with 404. | app/rbac                                                                                                                                                                                                                                                                     |
| `acceptEncoding`                                                                                                                                                                                                                                                             | [components.GzipAcceptEncoding](../../models/components/gzipacceptencoding.md)                                                                                                                                                                                               | :heavy_minus_sign:                                                                                                                                                                                                                                                           | Indicates the server should respond with a gzip encoded body. The server will send the compressed response only if its length is above `server.encoding.gzip.min_length` value. See the configuration section                                                                |                                                                                                                                                                                                                                                                              |
| `pretty`                                                                                                                                                                                                                                                                     | *boolean*                                                                                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                                                                                           | If parameter is `true`, response will formatted for humans.                                                                                                                                                                                                                  |                                                                                                                                                                                                                                                                              |
| `provenance`                                                                                                                                                                                                                                                                 | *boolean*                                                                                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                                                                                           | If parameter is true, response will include build/version info in addition to the result.                                                                                                                                                                                    |                                                                                                                                                                                                                                                                              |
| `explain`                                                                                                                                                                                                                                                                    | [components.Explain](../../models/components/explain.md)                                                                                                                                                                                                                     | :heavy_minus_sign:                                                                                                                                                                                                                                                           | Return query explanation in addition to result.                                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                              |
| `metrics`                                                                                                                                                                                                                                                                    | *boolean*                                                                                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                                                                                           | Return query performance metrics in addition to result.                                                                                                                                                                                                                      |                                                                                                                                                                                                                                                                              |
| `instrument`                                                                                                                                                                                                                                                                 | *boolean*                                                                                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                                                                                           | Instrument query evaluation and return a superset of performance metrics in addition to result.                                                                                                                                                                              |                                                                                                                                                                                                                                                                              |
| `strictBuiltinErrors`                                                                                                                                                                                                                                                        | *boolean*                                                                                                                                                                                                                                                                    | :heavy_minus_sign:                                                                                                                                                                                                                                                           | Treat built-in function call errors as fatal and return an error immediately.                                                                                                                                                                                                |                                                                                                                                                                                                                                                                              |