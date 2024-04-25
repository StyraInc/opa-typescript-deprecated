/** @type { import('typedoc').TypeDocOptionMap & import('typedoc-plugin-replace-text').Config } */
module.exports = {
  name: "Styra OPA TypeScript SDK",
  out: "output",
  hideGenerator: true,
  navigationLinks: {
    "Styra OPA SDKs": "https://docs.styra.com/sdk/",
    NPM: "https://www.npmjs.com/package/@styra/opa",
    GitHub: "https://github.com/StyraInc/opa-typescript",
  },
  entryPoints: [
    "./src",
    "./src/lib",
    "./src/sdk",
    "./src/sdk/models/components",
    "./src/sdk/models/errors",
    "./src/sdk/models/operations",
  ],
  excludeInternal: true,
  excludePrivate: true,
  excludeProtected: true,
  // excludeNotDocumented: true,
  entryPointStrategy: "resolve",
  // readme: "./README.md",
  plugin: ["typedoc-plugin-replace-text", "typedoc-plugin-extras"],
  favicon: "./.typedoc/favicon.ico",
  replaceText: {
    replacements: [
      { pattern: "# OPA Typescript SDK", replace: "" },
      {
        pattern: `> \\[!NOTE\\]`,
        replace: "",
      },
      {
        pattern: `> For low-level SDK usage, see the sections below.\n\n---`,
        replace: "",
      },
      {
        // this captures all links to speakeasy's generated docs
        pattern: "docs/sdks/opaapiclient/README\\.md",
        replace: "classes/sdk.OpaApiClient.html",
      },
      { pattern: "#executepolicy\\)", replace: "#executePolicy)" },
      {
        pattern: "#executepolicywithinput\\)",
        replace: "#executePolicyWithInput)",
      },
      {
        pattern:
          "For supported JavaScript runtimes, please consult \\[RUNTIMES\\.md\\]\\(RUNTIMES\\.md\\)\\.",
        replace:
          "See [the repository docs](https://github.com/StyraInc/opa-typescript/blob/main/RUNTIMES.md) for supported JavaScript runtimes.",
      },
    ],
  },
};
