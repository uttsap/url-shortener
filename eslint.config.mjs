import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', '**/dist/**', '**/node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/member-ordering': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array-simple'
        }
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-shadow': [
        'error',
        {
          hoist: 'all'
        }
      ],
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrors: 'none'
        }
      ],
      '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/quotes': 'off',
      '@typescript-eslint/unified-signatures': 'error',

      // import rules must be here with plugin registered
      'import/no-deprecated': 'warn',
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          named: { enabled: true, types: 'types-last' },
        },
      ],

      'prettier/prettier': ['error'],
    },
  },
);
