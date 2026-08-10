/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Entry point for the Playwright e2e harness. Provides minimal `t`/`n` globals
 * (the Nextcloud l10n mixin is absent outside a real NC runtime) and mounts the
 * demo App.
 */
import Vue from 'vue'
// Nextcloud CSS custom properties so the harness reflects real theming
// (the library styles everything with var(--color-*) tokens).
import '../../styleguide/nextcloud-tokens.css'
// The library's global patch stylesheet. A consuming app gets this through
// `src/css/index.css`; the harness needs it so specs that assert on globally
// patched behaviour (e.g. where a body-portaled popup stacks relative to a
// dialog) measure what a consumer actually renders.
import '../../src/css/patches.css'
import App from './App.vue'

// Minimal l10n shims so library components that call the global `t`/`n` render.
const t = (app, text, vars) => (vars
	? String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`))
	: text)
Vue.prototype.t = t
Vue.prototype.n = (app, s, p, count) => (count === 1 ? s : p)
window.t = t

new Vue({ render: (h) => h(App) }).$mount('#app')
