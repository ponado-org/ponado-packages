import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'server/index': 'src/server/index.ts',
    'shared/index': 'src/shared/index.ts'
  },
  format: 'esm',
  dts: true,
});
