/** @type { import('typedoc').TypeDocOptionMap & import('typedoc-plugin-replace-text').Config } */
module.exports = {
  out: "output",
  hideGenerator: true,
  sidebarLinks: {
    "Styra OPA SDKs Overview": "https://docs.styra.com/sdk/",
  },
  entryPoints: ["src/highlevel/index.ts", "src/sdk/index.ts"],
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
    ],
  },
};
