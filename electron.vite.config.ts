import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

const sharedAliases = [
  { find: '@renderer/app', replacement: resolve('src/renderer/app') },
  { find: '@renderer/shared', replacement: resolve('src/renderer/shared') },
  { find: '@renderer', replacement: resolve('src/renderer') },
  { find: '@main', replacement: resolve('src/main') },
  { find: '@preload', replacement: resolve('src/preload') },
  { find: '@shared', replacement: resolve('src/shared') },
  { find: '@assets', replacement: resolve('assets') }
]

export default defineConfig({
  main: {
    resolve: {
      alias: sharedAliases
    },
    plugins: [
      externalizeDepsPlugin({
        // Explicitly externalize koffi and other potential native deps
        exclude: []
      })
    ],
    build: {
      rollupOptions: {
        external: ['koffi', 'better-sqlite3']
      }
    }
  },
  preload: {
    resolve: {
      alias: sharedAliases
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    publicDir: resolve('src/renderer/public'),
    resolve: {
      alias: sharedAliases
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    assetsInclude: ['**/*.dds'], // Include DDS files as assets
    plugins: [react(), tailwindcss()],
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      exclude: ['multithreading']
    },
    build: {
      commonjsOptions: {
        exclude: [/node_modules\/multithreading\//]
      }
    }
  }
})
