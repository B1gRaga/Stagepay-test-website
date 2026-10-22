import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Next.js 16 no longer lints during `next build`; `npm run lint` runs this,
// and CI fails on errors only.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Shown as warnings to clean up over time rather than block a release:
    // loose `any` types, and React's newer compiler-strict rules, which flag
    // patterns that work today but that the React Compiler prefers rewritten.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // CommonJS config files and Node scripts may use require().
    files: ['**/*.js', '**/*.cjs', 'tools/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  globalIgnores([
    // Defaults of eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Not app source: vendored files, archived static pages, tool output
    'public/**',
    'stagepay-landing/**',
    'brand-asset/**',
    '.taste-skill/**',
    '.agents/**',
    '.claude/**',
    'playwright-report/**',
    'test-results/**',
    '.lighthouseci/**',
  ]),
])

export default eslintConfig
