/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  plugins: ["@stryker-mutator/vitest-runner"],
  testRunner: "vitest",
  mutate: [
    "src/lib/prompt-assembly.ts",
    "src/lib/message-helpers.ts",
    "src/lib/conversation-summary.ts",
  ],
  reporters: ["clear-text", "progress"],
  coverageAnalysis: "off",
  tempDirName: ".stryker-tmp",
  vitest: {
    configFile: "vitest.config.ts",
  },
};

export default config;
