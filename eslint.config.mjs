import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    rules: {
      "no-undef": "off",
      "no-redeclare": "off",
      complexity: ["warn", { max: 12 }],
      "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 100, skipBlankLines: true, skipComments: true }]
    }
  }
];
