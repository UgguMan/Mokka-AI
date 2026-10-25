import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['server/tests/**/*.test.js','evaluation/**/*.test.js','client/src/**/*.test.{js,jsx}'],testTimeout:60000,hookTimeout:120000,fileParallelism:false}, esbuild:{jsx:'automatic'}});
