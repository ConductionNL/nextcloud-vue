/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Vite config for the Playwright e2e harness only (not the library build —
 * that stays on Rollup). Serves e2e/harness with the Vue 3 plugin so the real
 * SFCs run in a browser.
 *
 * WHY `.mjs` AND NOT `.js`: `@vitejs/plugin-vue` 6 is ESM-only. This package
 * has no `"type": "module"`, so Vite loads a `.js` config through its CJS
 * path and the import fails outright with `"@vitejs/plugin-vue" resolved to
 * an ESM file. ESM file cannot be loaded by require`. That is a config-LOAD
 * failure, so the dev server never starts and EVERY Playwright spec fails at
 * `webServer` startup rather than on anything to do with the components.
 * The `.mjs` extension forces the ESM loader — same reason
 * `rollup.config.vue3.mjs` and `eslint.config.mjs` carry it.
 *
 * `package.json`'s `harness` script and `playwright.config.js`'s `webServer`
 * command both name this file; keep all three in step.
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
		// Vue 3's counterpart of Vue 2's `vue.esm.js` full build (runtime +
		// template compiler). `vue.esm.js` does not exist in Vue 3 at all, so
		// the old alias silently pointed at a missing file. The COMPILER-
		// INCLUDING build is deliberate: harness-mounted components render
		// manifest-driven templates at runtime, which the runtime-only build
		// cannot do (it fails with "Component provided template option but
		// runtime compilation is not supported").
		alias: { vue: path.resolve(dir, '../node_modules/vue/dist/vue.esm-bundler.js') },
	},
})
