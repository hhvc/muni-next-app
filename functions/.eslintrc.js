const path = require('path');

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      path.resolve(__dirname, "tsconfig.json"),
      path.resolve(__dirname, "tsconfig.dev.json")
    ],
    sourceType: "module",
    tsconfigRootDir: __dirname,
    createDefaultProgram: true
  },
  ignorePatterns: [
    "lib/**/*",
    "generated/**/*",
    ".eslintrc.js"
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "linebreak-style": ["error", "windows"],
    "operator-linebreak": ["error", "after", { 
      overrides: { 
        "?": "before", 
        ":": "before" 
      } 
    }],
    "quote-props": ["error", "consistent-as-needed"],
    "object-curly-spacing": ["error", "always"],
    "max-len": ["error", { 
      code: 120, 
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    "require-jsdoc": "off",
    "@typescript-eslint/no-var-requires": "off"
  },
};