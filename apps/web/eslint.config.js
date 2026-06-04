import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Gate CI trên LỖI thật (bug: rules-of-hooks, unused...). Hạ các rule style/
      // code-smell/dev-only xuống WARN để không chặn build mà vẫn hiển thị để dọn dần.
      '@typescript-eslint/no-explicit-any': 'warn',        // code smell (backend cũng off)
      'react-refresh/only-export-components': 'warn',       // chỉ ảnh hưởng HMR dev, KHÔNG ảnh hưởng prod
      'react-hooks/set-state-in-effect': 'warn',            // thường hợp lệ (đồng bộ state)
      'react-hooks/static-components': 'warn',              // perf gợi ý
      'react-hooks/preserve-manual-memoization': 'warn',    // perf gợi ý
      // Biến/tham số có CHỦ ĐÍCH không dùng → đặt tiền tố "_".
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Cho phép `cond && fn()` và `cond ? a() : b()` làm statement (idiom phổ biến, đọc được).
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
])
