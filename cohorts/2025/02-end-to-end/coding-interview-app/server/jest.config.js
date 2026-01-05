export default {
  testEnvironment: 'node',
  testTimeout: 300000,
  collectCoverageFrom: [
    'index.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js',
  ],
  transform: {},
  moduleNameMapper: {},
};
