/* eslint-env node */
const seConfig = require("./.eslintrc.cjs");
module.exports = {
  ...seConfig,
  plugins: ["@typescript-eslint", "markdown"],
  overrides: [
    {
      files: ["**/*.md"],
      processor: "markdown/markdown",
    },
    {
      // 1. Target ```ts code blocks in .md files.
      files: ["**/*.md/*.ts"],
      rules: {
        // 2. Disable other rules.
        "no-console": "off",
        "import/no-unresolved": "off",
      },
    },
  ],
};
