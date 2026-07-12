import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unusedImports from 'eslint-plugin-unused-imports'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'unused-imports': unusedImports },
    rules: {
      // Cho phép pattern destructure-để-loại-bỏ ({ a, b, ...rest }) và biến _bỏ_qua
      'no-unused-vars': ['error', {
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      // Import không dùng: tự xóa được bằng eslint --fix
      'unused-imports/no-unused-imports': 'error',
      // 2 rule dưới: pattern có sẵn toàn codebase, chỉ ảnh hưởng HMR/hiệu năng dev
      // → hạ warn để error = lỗi THẬT cần sửa; refactor dần khi đụng từng file
      'react-refresh/only-export-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
