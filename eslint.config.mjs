import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
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
