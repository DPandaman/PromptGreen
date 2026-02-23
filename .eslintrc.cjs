/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: "script" },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
  },
  overrides: [
    { files: ["service_worker.js", "shared/*.js"], env: { browser: true } },
    { files: ["tests/*.js"], env: { node: true } },
  ],
};
