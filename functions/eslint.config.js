// @ts-check
"use strict";

module.exports = {
  ignores: [".eslintrc.cjs"],
  rules: {
    // Reglas específicas para Firebase Functions
    "max-len": ["error", { code: 120 }],
    "require-jsdoc": "off",
  },
};
