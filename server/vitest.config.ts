import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/dating_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      ADMIN_TOKEN: 'test-admin-token-0123456789abcdef',
    },
  },
});
