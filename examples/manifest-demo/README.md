# Manifest demo

A reference `manifest.json` and minimal `main.ts` wiring that exercises every page type and feature of the JSON-driven manifest renderer.

## What's in the manifest

- All four page types: `index`, `detail`, `dashboard`, `custom`
- A nested menu (one level of `children[]`)
- A permission-gated nav item (`audit`)
- A declared dependency (`openregister`) that triggers the dependency-check phase if not installed
- A `headerComponent`/`actionsComponent` slot override pattern (omitted from the demo for clarity, but supported per REQ-JMR-005)

## Minimal `main.ts` (Tier 4 — full shell)

```ts
import Vue from 'vue'
import VueRouter from 'vue-router'
import { translate, translatePlural } from '@nextcloud/l10n'
import { CnAppRoot, useAppManifest } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'
import SettingsPage from './views/SettingsPage.vue'

Vue.use(VueRouter)
Vue.mixin({ methods: { t: translate, n: translatePlural } })

// vue-router config is generated from the manifest pages: each page.id
// becomes a route name, page.route becomes the path, and CnPageRenderer
// is the component for every route.
import { CnPageRenderer } from '@conduction/nextcloud-vue'

const router = new VueRouter({
	routes: bundledManifest.pages.map((p) => ({
		name: p.id,
		path: p.route,
		component: CnPageRenderer,
	})),
})

new Vue({
	router,
	render: (h) => {
		const { manifest, isLoading } = useAppManifest('myapp', bundledManifest)
		return h(CnAppRoot, {
			props: {
				manifest: manifest.value,
				appId: 'myapp',
				isLoading: isLoading.value,
				customComponents: { SettingsPage },
				translate: (key) => translate('myapp', key),
				permissions: window.OC?.currentUser?.permissions ?? [],
			},
		})
	},
}).$mount('#content')
```

The `customComponents` registry is the bailout for `type: "custom"` pages and for slot overrides (`headerComponent` / `actionsComponent`). Add any app-specific Vue component there.

## Lower-tier adoption

You don't have to use the full shell. See `docs/migrating-to-manifest.md` for tiers 1–3 (use `useAppManifest` alone, or `+ CnPageRenderer`, or `+ CnAppNav`) — each tier is self-contained.
