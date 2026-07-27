/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Vite config for the Playwright e2e harness only (not the library build —
 * that stays on Rollup). Serves e2e/harness with the Vue 3 plugin so the real
 * SFCs run in a browser.
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	root: path.resolve(dir, 'harness'),
	plugins: [vue()],
	server: { port: 5199, strictPort: true },
	resolve: {
		dedupe: ['vue'],
		alias: { vue: path.resolve(dir, '../node_modules/vue/dist/vue.esm.js') },
	},
})
