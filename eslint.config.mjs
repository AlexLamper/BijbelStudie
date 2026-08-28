import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // `.next` and `.next-verify` (see next.config.ts's NEXT_DIST_DIR note) are
  // build output, not source - without this ESLint was linting the compiled
  // JS in both of them, which drowned the handful of real findings in the repo
  // under ~31k errors from generated code.
  { ignores: [".next/**", ".next-verify/**", ".vercel/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
