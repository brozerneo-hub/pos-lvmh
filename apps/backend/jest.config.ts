import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFiles: ['<rootDir>/test-utils/setup.ts'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/test-utils/**',
    '!**/functions/index.ts',
    '!**/dev-server.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  coverageThreshold: {
    global: { statements: 85, branches: 80, functions: 85, lines: 85 },
  },
  testTimeout: 15_000,
};

export default config;
