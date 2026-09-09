const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Angular publishes ESM as `.mjs`; @tanstack/table-core publishes ESM-only `.js`.
  // Both have to be transformed, and this reaches every project that imports
  // `@zen/components` — the barrel there pulls TanStack Table in transitively.
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|.*@tanstack)'],
};
