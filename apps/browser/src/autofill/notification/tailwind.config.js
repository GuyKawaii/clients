/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const baseConfig = require("../../../tailwind.config");

module.exports = {
  ...baseConfig,
  // Existing notification components own their resets and layout.
  corePlugins: { ...baseConfig.corePlugins, preflight: false },
  content: [
    path.resolve(__dirname, "../content/components/notification/save-base-url-option.ts"),
    path.resolve(__dirname, "../../../../../libs/components/src/checkbox/checkbox-styles.ts"),
  ],
};
