/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/vendor-auth',
              message: 'DELETED: Use @/domains/auth instead (canonical source)',
            },
            {
              name: '../lib/vendor-auth',
              message: 'DELETED: Use @/domains/auth instead (canonical source)',
            },
            {
              name: '../../lib/vendor-auth',
              message: 'DELETED: Use @/domains/auth instead (canonical source)',
            },
            {
              name: '../../../lib/vendor-auth',
              message: 'DELETED: Use @/domains/auth instead (canonical source)',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
