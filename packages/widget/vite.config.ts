import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  plugins: [preact({ devToolsEnabled: false })],
  ...(command === 'build'
    ? {
        build: {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'CasinoChat',
            fileName: (format) => `casino-chat.${format}.js`,
            formats: ['umd', 'es'] as const,
          },
          rollupOptions: {
            output: {
              assetFileNames: 'casino-chat.[ext]',
            },
          },
          cssCodeSplit: false,
          minify: true,
          target: 'es2018',
        },
      }
    : {}),
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      command === 'build' ? 'production' : 'development',
    ),
  },
}));
