/** @type { import('typedoc').TypeDocOptionMap & import('typedoc-plugin-replace-text').Config } */
module.exports = {
  out: "output",
  hideGenerator: true,
  sidebarLinks: {
    "Styra OPA SDKs Overview": "https://docs.styra.com/sdk/",
  },
  entryPoints: ["src/index.ts"],
  plugin: ["typedoc-plugin-replace-text"],
  replaceText: {
    // inCodeCommentText: true,
    // inCodeCommentTags: true,
    // inIncludedFiles: true,
    replacements: [
      {
        pattern: `> \\[!NOTE\\]`,
        replace: "",
      },
      {
        pattern: `> For low-level SDK usage, see the sections below.\n\n---`,
        replace: "",
      },
      {
        pattern: "## SDK Example Usage\n",
        replace: "## Low-level SDK Examples", // TODO(sr): insert more caveats?
      },
      {
        // this captures all links to speakeasy's generated docs
        pattern: "docs/sdks/opa/README\\.md",
        replace: "classes/sdk.Opa.html",
      },
      { pattern: "#executepolicy", replace: "#executePolicy" },
      {
        pattern: "#executepolicywithinput",
        replace: "#executePolicyWithInput",
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
