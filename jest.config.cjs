const path = require('path')
const { pathsToModuleNameMapper } = require('ts-jest')

const { compilerOptions } = require('./tsconfig.json')

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [ '<rootDir>/jest.setup.js' ],
  testMatch: [
    '**/*.spec.(js|ts)',
  ],

  collectCoverage: true,
  coverageDirectory: path.join(__dirname, './coverage'),
  coverageReporters: ['lcov', 'text'],

  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: __dirname,
  }),
  modulePathIgnorePatterns: [
    '<rootDir>/.next/'
  ],
};
