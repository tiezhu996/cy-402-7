/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["src/services/**/*.ts", "src/controllers/**/*.ts"],
  clearMocks: true,
  resetMocks: true,
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"]
};
