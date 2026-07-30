/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Entry point for the Playwright e2e harness. Provides minimal `t`/`n` globals
 * (the Nextcloud l10n mixin is absent outside a real NC runtime) and mounts the
 * demo App.
 *
 * VUE 3 BOOTSTRAP: `new Vue({ render: h => h(App) }).$mount('#app')` and
 * `Vue.prototype.t = ...` are both gone. There is no global Vue constructor to
 * `new` and no shared prototype to hang globals on — `createApp()` returns a
 * per-app instance and `app.config.globalProperties` is the replacement for
 * `Vue.prototype`. Both must be set BEFORE `mount()`, since the library SFCs
 * read `t` during their first render.
 */
import { createApp } from 'vue'
// Nextcloud CSS custom properties so the harness reflects real theming
// (the library styles everything with var(--color-*) tokens).
import '../../styleguide/nextcloud-tokens.css'
import App from './App.vue'
import { installModalStack } from '../../src/utils/modalStack.js'

// Nested-modal stacking. In a real app `CnAppRoot` does this on mount; the
// harness mounts individual SFCs with no shell, so it takes the same route a
// consumer without `CnAppRoot` takes — one call at bootstrap. Without it every
// `.modal-mask` keeps @nextcloud/vue's flat z-index, two open dialogs tie, and
// the painting order falls back to DOM order (see nested-dialog-stacking.e2e.js).
installModalStack()

// Minimal l10n shims so library components that call the global `t`/`n` render.
const t = (app, text, vars) => (vars
	? String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`))
	: text)
const n = (app, s, p, count) => (count === 1 ? s : p)

const app = createApp(App)
app.config.globalProperties.t = t
app.config.globalProperties.n = n
// Also on `window`: some library modules call a bare global `t()` from plain
// JS (outside a component instance), where globalProperties is not in scope.
window.t = t
window.n = n

app.mount('#app')
