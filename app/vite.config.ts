import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'node:path'
import inject from '@rollup/plugin-inject'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: {},
  },
  resolve: {
    alias: {
      // https://stackoverflow.com/posts/75778243/revisions
      'node-fetch': 'isomorphic-fetch',
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: process.env.NODE_ENV == 'development',
      },
      include: ['buffer'],
    }),
    tailwindcss(),
    viteTsconfigPaths({
      //
      root: resolve(__dirname),
    }),
  ],
  build: {
    target: 'esnext', // Output ESNext code
    rollupOptions: {
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
      // external: ['vite-plugin-node-polyfills/shims/buffer', 'stream', 'http', 'https', 'zlib'],
      output: {
        manualChunks: {
          'solana-vendor': ['@solana/web3.js', '@solana/spl-token'],
          'wallet-adapter': ['@solana/wallet-adapter-react', '@solana/wallet-adapter-react-ui'],
          'ui-vendor': ['@heroui/react', 'framer-motion'],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext', // Ensure dependency pre-bundling supports ESNext
      supported: {
        'import-assertions': true, // Explicitly enable import assertions in esbuild
      },
    },
  },
})
