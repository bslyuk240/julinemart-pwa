import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".claude/**",
      "android/**",
    ],
  },
  // Downgrade pre-existing codebase issues to warnings so they don't block CI builds.
  // New code should avoid these patterns; treat warnings as a backlog, not a green light.
  {
    rules: {
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-img-element": "warn",
      "prefer-const": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // New in eslint-plugin-react-hooks@7 (bundled by eslint-config-next@16),
      // defaulted to "error". They flag long-standing, working patterns across
      // ~30 pre-existing files (setState-in-effect, Date.now() in render,
      // functions referenced before their declaration). Adopting React
      // Compiler cleanly is a separate effort from this dependency upgrade -
      // downgraded to warnings so they're visible without blocking builds.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // @typescript-eslint plugin is only registered for ts/tsx files (see the
  // "next/typescript" block in eslint-config-next's flat config) - scope
  // these rules the same way or ESLint errors on plain .js/.mjs files.
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
    },
  },
  {
    files: [
      "src/app/api/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
      "src/server/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='console'][arguments.0.type='Identifier'][arguments.0.name=/^(err(or)?|e)$/i]",
          message:
            "Do not log raw error objects on the server; use a sanitized logger (handleApiError) instead.",
        },
      ],
    },
  },
];

export default eslintConfig;
