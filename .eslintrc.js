module.exports = {
    root: true,
    env: {
      browser: true,
      node: true,
      es2021: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@next/next/recommended',
      'prettier'
    ],
    plugins: ['prettier'],
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': ['error'],
      // aici poți adăuga altele: 
      // 'react/react-in-jsx-scope': 'off',
    },
  };
  