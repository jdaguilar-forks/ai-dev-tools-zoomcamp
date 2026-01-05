export default {
  testEnvironment: 'node',
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
