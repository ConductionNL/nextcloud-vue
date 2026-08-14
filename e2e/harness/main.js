/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Entry point for the Playwright e2e harness. Provides minimal `t`/`n` globals
 * (the Nextcloud l10n mixin is absent outside a real NC runtime) and mounts the
 * demo App.
 *
 * VUE 3 BOOTSTRAP. This was still the Vue 2 form — `import Vue from 'vue'`,
 * `Vue.prototype.t = …`, `new Vue({ render }).$mount('#app')` — after the
 * library moved to Vue 3. Vue 3 has no default export, so the harness failed at
 * module evaluation with
 *
 *     SyntaxError: The requested module '.../deps/vue.js' does not provide an
 *     export named 'default'
 *
 * …and the page rendered nothing, so EVERY spec in this suite failed at its
 * first `toBeVisible`. A harness that cannot boot reports no failure of its
 * own; it just makes every spec look broken, which is a strong disincentive to
 * add one.
 */
import { createApp } from 'vue'
// Nextcloud CSS custom properties so the harness reflects real theming
// (the library styles everything with var(--color-*) tokens).
import '../../styleguide/nextcloud-tokens.css'
// The library's global patch stylesheet — a consuming app gets this through
// `src/css/index.css`. It carries the modal stacking baseline, so the harness
// needs it for any spec that measures how something stacks against a dialog.
import '../../src/css/patches.css'
import App from './App.vue'

// Minimal l10n shims so library components that call the global `t`/`n` render.
const t = (app, text, vars) => (vars
	? String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`))
	: text)
const n = (app, s, p, count) => (count === 1 ? s : p)

const app = createApp(App)
// Vue 3's replacement for Vue.prototype.
app.config.globalProperties.t = t
app.config.globalProperties.n = n
window.t = t

app.mount('#app')
