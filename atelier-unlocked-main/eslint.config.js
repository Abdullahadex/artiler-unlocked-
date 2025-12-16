import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/__tests__/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: [
      "**/ui/sonner.tsx", 
      "**/ui/toggle.tsx", 
      "**/ui/badge.tsx",
      "**/ui/button.tsx",
      "**/ui/form.tsx",
      "**/ui/navigation-menu.tsx",
      "**/ui/sidebar.tsx",
      "**/contexts/AuthContext.tsx",
      "**/app/layout.tsx"
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
