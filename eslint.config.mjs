import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Cloudflare build output. `.open-next/` contains a copy of the
      // compiled server plus bundled dependencies; linting it reported
      // 28,095 problems in someone else's minified code and buried the
      // one real warning this project has.
      ".open-next/**",
      ".wrangler/**",
      "cloudflare-env.d.ts",
    ],
  },
];

export default eslintConfig;
