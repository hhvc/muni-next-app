// @ts-check
/* eslint-disable quote-props, quotes */
const path = require('path');

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      path.resolve(__dirname, 'tsconfig.json'),
      path.resolve(__dirname, 'tsconfig.dev.json'),
    ],
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '/lib/**/*',
    '/generated/**/*',
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    // Reglas básicas
    quotes: ['error', 'double'],
    indent: ['error', 2],
    
    // Reglas de importación
    'import/no-unresolved': 0,
    
    // Reglas de operadores
    'operator-linebreak': ['error', 'after', { 
      overrides: { 
        '?': 'before', 
        ':': 'before',
      }, 
    }],
    
    // Reglas de formato
    'quote-props': ['error', 'consistent-as-needed'],
    'object-curly-spacing': ['error', 'always'],
    'max-len': ['error', { 
      code: 120, 
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    
    // Reglas deshabilitadas
    'require-jsdoc': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'no-invalid-this': 'off',
  },
};