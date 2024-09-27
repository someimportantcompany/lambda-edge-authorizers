const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    path.join(__dirname, './jest.setup.ts'),
  ],
  testMatch: [
    '**/*.test.ts',
  ],

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/',
  coverageReporters: ['lcov', 'text'],

  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],
};
