const { pathsToModuleNameMapper } = require("ts-jest");

const { compilerOptions } = require("../../tsconfig.base");

const sharedConfig = require("../../libs/shared/jest.config.angular");

/** @type {import('jest').Config} */
module.exports = {
  ...sharedConfig,
  setupFilesAfterEnv: ["<rootDir>/test.setup.ts"],
  // Allow DOM tests to exercise the actual Lit templates and event bindings.
  transformIgnorePatterns: [
    "node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|oauth4webapi/.*|(?:lit|lit-html|lit-element|@lit/reactive-element)/))",
  ],
  moduleNameMapper: pathsToModuleNameMapper(
    { "@bitwarden/common/spec": ["libs/common/spec"], ...(compilerOptions?.paths ?? {}) },
    {
      prefix: "<rootDir>/../../",
    },
  ),
};
