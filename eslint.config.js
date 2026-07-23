import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.superpowers/**', '.playwright-cli/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-prototype-builtins': 'warn',
      'no-redeclare': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn'
    },
  },
  {
    files: ['src/main.js'],
    rules: {
      'no-case-declarations': 'off',
      'no-empty': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off'
    },
  },
  {
    files: ['*.config.js', 'server.js', 'scripts/**/*.mjs', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: globals.serviceworker,
    },
  },
];
