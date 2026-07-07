import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Production-pragmatic rule overrides.
  //
  // Rationale: the codebase uses Mongoose lean() documents (which return
  // untyped plain objects) and a number of `any` types in places where the
  // runtime shape comes from the database. Downgrading these from `error`
  // to `warn` keeps them visible in `next lint` output for cleanup, but
  // does NOT block production builds or CI.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off",
      // React 19 compiler rules — fire on legitimate data-fetching patterns
      // (setState inside useEffect after an async call). Downgrade to warn so
      // they're visible but don't block builds.
      "react-hooks/set-state-in-effect": "warn",
      // Unescaped entities in JSX text — purely stylistic, doesn't affect runtime
      "react/no-unescaped-entities": "warn",
    },
  },
  // Global ignores
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build/tooling scripts that use CommonJS
    "dns-setup.cjs",
    "scripts/**",
  ]),
]);

export default eslintConfig;
