/* eslint-env node */
module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "markdown"],
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
  rules: {
    // Handled by typescript compiler
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "import/no-named-as-default-member": "off",

    "import/no-default-export": "error",
  },
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
