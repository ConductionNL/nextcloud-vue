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
// CnFlowDetail and the flow store are Pinia-backed, so the harness needs a
// pinia instance to mount them at all.
import { createPinia } from 'pinia'
// Nextcloud CSS custom properties so the harness reflects real theming
// (the library styles everything with var(--color-*) tokens).
import '../../styleguide/nextcloud-tokens.css'
// The library's global patch stylesheet — a consuming app gets this through
// `src/css/index.css`. It carries the modal stacking baseline, so the harness
// needs it for any spec that measures how something stacks against a dialog.
import '../../src/css/patches.css'
// The context menu is positioned by a stylesheet, not by inline styles:
// `context-menu.css` transforms the popper to the cursor. A consuming app
// gets it through `src/css/index.css`; without it here the menu opened and
// stayed parked at its off-screen -9999px trigger, which reads in a spec as
// "the menu never opened".
import '../../src/css/context-menu.css'
import App from './App.vue'

// Minimal l10n shims so library components that call the global `t`/`n` render.
const t = (app, text, vars) => (vars
	? String(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`))
	: text)
const n = (app, s, p, count) => (count === 1 ? s : p)

const app = createApp(App)
app.use(createPinia())

// A ROUTER, FOR ONE SCENARIO ONLY (?runlink=1).
//
// The run deep link is a claim about NAVIGATION: clicking a run must route to
// the flow with the run in the query, and the flow page must open that run. A
// stubbed $router would let that pass on a push that never routed, so this
// scenario needs the real one.
//
// It is installed behind the flag rather than globally because every other
// spec in this suite runs without a router today, and adding one would change
// 37 spec files' environment to serve one of them. Hash history keeps the
// harness reachable at `/` while still putting `?run=` where a spec can read
// it back off the URL.
if (typeof window !== 'undefined' && window.location.search.includes('runlink')) {
	const { createRouter, createWebHashHistory } = await import('vue-router')
	const { default: CnPageRenderer } = await import('../../src/components/CnPageRenderer/CnPageRenderer.vue')

	// The destination is CnPageRenderer on a `type: "flow"` page, not
	// CnFlowDetail directly: the renderer is the layer a real app routes
	// through, and it is where the manifest's page type is resolved.
	const manifest = {
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'FlowDetail', route: '/flows/:id', type: 'flow', title: 'Flow', config: { app: 'openregister' } }],
	}

	app.use(createRouter({
		history: createWebHashHistory(),
		routes: [
			{ path: '/', name: 'Home', component: { template: '<p data-testid="runlink-home">No flow open.</p>' } },
			{
				path: '/flows/:id',
				name: 'FlowDetail',
				component: CnPageRenderer,
				props: () => ({ manifest }),
			},
		],
	}))
}
// Vue 3's replacement for Vue.prototype.
app.config.globalProperties.t = t
app.config.globalProperties.n = n
window.t = t

app.mount('#app')
