module.exports = {
  env: {
    browser: true,
    commonjs: true,
  },
  plugins: ['deprecation', 'import', 'prettier', 'import'],
  extends: ['eslint:recommended', 'prettier', 'plugin:import/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs',
  },
  rules: {
    quotes: ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
    'comma-spacing': ['error', { before: false, after: true }],
    'no-multi-spaces': ['error', { ignoreEOLComments: false }],
    'array-bracket-newline': ['error', 'consistent'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'object-curly-newline': ['error', { multiline: true, consistent: true }],
    'object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
    'keyword-spacing': ['error'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'space-before-blocks': 'error',
    curly: ['error', 'multi-line', 'consistent'],
    'no-bitwise': ['error'],
    'no-trailing-spaces': ['error'],
    'no-duplicate-imports': ['error'],
    'no-shadow': 'off',
    'no-use-before-define': 'off',
    'max-classes-per-file': ['error', 3],
    'no-underscore-dangle': 'off',
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    indent: ['error', 2],
    'max-params': ['error', 5],
  },
};
