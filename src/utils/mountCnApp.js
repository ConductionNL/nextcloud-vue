/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * mountCnApp: boot a manifest app on CnAppRoot in one call. It builds the
 * router from the manifest's pages (one route per page, rendered by
 * CnPageRenderer, plus a catch-all), registers the icons and the library's
 * translations, and mounts CnAppRoot with the manifest and the registry.
 *
 * The library does not depend on vue-router, so the host hands over its own
 * `createRouter` and `createWebHistory` (`vueRouter`), or a ready router.
 *
 * @module utils/mountCnApp
 * @spec openspec/changes/mount-cn-app/specs/mount-cn-app/spec.md
 */

import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { createApp, h } from 'vue'
import CnAppRoot from '../components/CnAppRoot/CnAppRoot.vue'
import { registerIcons } from '../components/CnIcon/CnIcon.vue'
import CnPageRenderer from '../components/CnPageRenderer/CnPageRenderer.vue'
import { defaultPageTypes } from '../components/CnPageRenderer/pageTypes.js'
import { registerTranslations } from '../l10n/index.js'

/**
 * The vue-router routes of a manifest: one per page, named by its id and
 * rendered by CnPageRenderer (`props` on a route with parameters), then a
 * catch-all that redirects to `fallback`.
 *
 * @param {{pages?: Array<{id: string, route: string}>}} manifest The manifest.
 * @param {{component?: object, fallback?: string}} [options] The page component (default CnPageRenderer) and where an unknown path goes (default `/`).
 * @return {Array<object>} The routes.
 * @spec openspec/changes/mount-cn-app/specs/mount-cn-app/spec.md#requirement-the-router-comes-from-the-manifest
 */
export function routesFromManifest(manifest, { component = null, fallback = '/' } = {}) {
	// A shallow copy: the barrel's component record is not extensible, and the router attaches caches to it.
	const page = component || { ...CnPageRenderer }
	const routes = (Array.isArray(manifest && manifest.pages) ? manifest.pages : [])
		.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.route === 'string' && entry.route !== '')
		.map((entry) => ({ name: entry.id, path: entry.route, component: page, props: entry.route.includes(':') }))
	routes.push({ path: '/:pathMatch(.*)*', redirect: fallback })
	return routes
}

/**
 * The router base for this page load. Nextcloud serves an app under both
 * `/apps/<id>` and `/index.php/apps/<id>`; the base is the form the reader
 * arrived on, else what `generateUrl` gives.
 *
 * @param {string} appId The app id.
 * @param {string} [pathname] The current path (default `window.location.pathname`).
 * @return {string} The base.
 * @spec openspec/changes/mount-cn-app/specs/mount-cn-app/spec.md#requirement-the-router-comes-from-the-manifest
 */
export function appRouterBase(appId, pathname = (typeof window !== 'undefined' ? window.location.pathname : '')) {
	const escaped = String(appId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match = String(pathname || '').match(new RegExp(`^(.*/apps/${escaped})(?:/|$)`))
	return match ? match[1] : generateUrl(`/apps/${appId}`)
}

/**
 * Create and mount a manifest app on CnAppRoot.
 *
 * @param {string|Element} target Where to mount (`#content` or an element).
 * @param {object} options The app.
 * @param {string} options.appId The app id.
 * @param {object} options.manifest The effective manifest.
 * @param {object} [options.registry] The kind-tagged registry (ADR-036).
 * @param {object} [options.pageTypes] Page type components (default the library's).
 * @param {object} [options.icons] MDI icons the manifest names, for `registerIcons`.
 * @param {object} [options.router] A ready router; else one is built with `vueRouter`.
 * @param {{createRouter: Function, createWebHistory: Function}} [options.vueRouter] vue-router's two factories.
 * @param {Array<object>} [options.plugins] Plugins to install (pinia, ...).
 * @param {object} [options.rootComponent] The root (default CnAppRoot); a host App.vue that wraps CnAppRoot.
 * @param {object} [options.rootProps] More props for the root (`customComponents`, `translate`, ...).
 * @return {{app: object, router: object}} The mounted app and its router.
 * @spec openspec/changes/mount-cn-app/specs/mount-cn-app/spec.md#requirement-a-manifest-app-boots-in-one-call
 */
export function mountCnApp(target, { appId, manifest, registry = {}, pageTypes = defaultPageTypes, icons = null, router = null, vueRouter = null, plugins = [], rootComponent = null, rootProps = {} } = {}) {
	if (!appId || !manifest) {
		throw new Error('mountCnApp needs an appId and a manifest')
	}
	let appRouter = router
	if (!appRouter) {
		if (!vueRouter || typeof vueRouter.createRouter !== 'function' || typeof vueRouter.createWebHistory !== 'function') {
			throw new Error('mountCnApp needs a router, or vueRouter: { createRouter, createWebHistory }')
		}
		appRouter = vueRouter.createRouter({ history: vueRouter.createWebHistory(appRouterBase(appId)), routes: routesFromManifest(manifest) })
	}
	if (icons) {
		registerIcons(icons)
	}
	try {
		registerTranslations()
	} catch (e) {
		// The library's strings then read in English.
		// eslint-disable-next-line no-console
		console.warn(`[${appId}] registerTranslations failed`, e)
	}
	// Shallow copies: frozen module records cannot carry the caches Vue attaches.
	const props = { manifest, registry: { ...registry }, pageTypes: { ...pageTypes }, appId, ...rootProps }
	const app = createApp({ render: () => h(rootComponent || CnAppRoot, props) })
	app.mixin({ methods: { t, n } })
	for (const plugin of Array.isArray(plugins) ? plugins : []) {
		app.use(plugin)
	}
	app.use(appRouter)
	app.mount(target)
	return { app, router: appRouter }
}
