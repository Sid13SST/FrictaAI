module.exports = {
  extends: ["eslint:recommended", "prettier"],
  settings: {
    react: {
      version: "detect",
    },
  },
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": "warn",
    "no-console": "warn"
  }
};
