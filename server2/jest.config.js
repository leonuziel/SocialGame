// server2/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'], // Look for tests in the src directory
  testMatch: [ // Pattern for test files
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.json, e.g., paths)
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Optional: Setup files to run before each test suite (e.g., for global mocks)
  // setupFilesAfterEnv: ['<rootDir>/src/testSetup.ts'],
};
