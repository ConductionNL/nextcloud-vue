<!--
  CnPageRenderer — JSON-driven page dispatcher.

  Mounted inside <router-view>, CnPageRenderer reads the manifest, finds
  the page definition whose `id` matches the current route name, and
  renders the appropriate page component:

    - type: "index"     → CnIndexPage
    - type: "detail"    → CnDetailPage
    - type: "dashboard" → CnDashboardPage
    - type: "custom"    → component resolved from the customComponents
                          registry by `page.component`

  The page-type components are loaded via `defineAsyncComponent` so that
  apps using only a subset of types do not pay the bundle cost for the
  others (notably CnDashboardPage which depends on GridStack).

  Manifest, customComponents, and translate are injected from CnAppRoot
  by default but can also be passed as props for standalone use without
  CnAppRoot. Props always take precedence over inject.

  See REQ-JMR-005 of the json-manifest-renderer specification.
-->
<template>
	<div
		v-if="currentPage"
		:data-page-id="currentPage.id"
		class="cn-page-renderer">
		<component
			:is="resolvedComponent"
			v-if="resolvedComponent"
			v-bind="resolvedProps">
			<template v-if="headerOverride" #header="slotProps">
				<component :is="headerOverride" v-bind="slotProps" />
			</template>
			<template v-if="actionsOverride" #actions="slotProps">
				<component :is="actionsOverride" v-bind="slotProps" />
			</template>
		</component>
	</div>
</template>

<script>
import { defineAsyncComponent } from 'vue'

const PAGE_TYPE_LOADERS = {
	index: () => import('../CnIndexPage/CnIndexPage.vue'),
	detail: () => import('../CnDetailPage/CnDetailPage.vue'),
	dashboard: () => import('../CnDashboardPage/CnDashboardPage.vue'),
}

export default {
	name: 'CnPageRenderer',

	inject: {
		cnManifest: { default: null },
		cnCustomComponents: { default: () => ({}) },
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Manifest object. When omitted, falls back to the injected
		 * `cnManifest` from a CnAppRoot ancestor. Provide explicitly when
		 * mounting CnPageRenderer outside of CnAppRoot.
		 *
		 * @type {object|null}
		 */
		manifest: {
			type: Object,
			default: null,
		},
		/**
		 * Custom-component registry. Keys are the names referenced by
		 * `page.component` (for `type: "custom"` pages). When omitted,
		 * falls back to the injected `cnCustomComponents`.
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},
		/**
		 * Translate function. When omitted, falls back to the injected
		 * `cnTranslate`. Currently not used directly by the renderer
		 * itself — exposed as a prop for symmetry and so future page
		 * components rendered by the renderer can `inject('cnTranslate')`
		 * via the consumer's setup.
		 *
		 * @type {Function|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	computed: {
		/** Effective manifest: explicit prop wins over injected value. */
		effectiveManifest() {
			return this.manifest ?? this.cnManifest
		},
		/** Effective custom-component registry. */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
		},
		/** Page definition matching the current route name, or null. */
		currentPage() {
			const manifest = this.effectiveManifest
			if (!manifest || !Array.isArray(manifest.pages)) {
				return null
			}
			const routeName = this.$route?.name
			if (!routeName) {
				return null
			}
			return manifest.pages.find((page) => page.id === routeName) ?? null
		},
		/**
		 * Component to render for the current page. For built-in types
		 * this is a `defineAsyncComponent` wrapper so unused page types
		 * don't ship in apps that don't reference them. For custom types
		 * it's the synchronous component resolved from the app-provided
		 * registry.
		 */
		resolvedComponent() {
			const page = this.currentPage
			if (!page) {
				return null
			}
			if (page.type === 'custom') {
				const name = page.component
				const resolved = this.effectiveCustomComponents[name]
				if (!resolved) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnPageRenderer] Custom component "${name}" not found in registry for page id "${page.id}".`,
					)
					return null
				}
				return resolved
			}
			const loader = PAGE_TYPE_LOADERS[page.type]
			if (!loader) {
				// Schema validation should have prevented this, but be defensive.
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Unknown page type "${page.type}" for page id "${page.id}".`,
				)
				return null
			}
			return defineAsyncComponent(loader)
		},
		/**
		 * Props forwarded to the dispatched page component. Spreads the
		 * page's `config` object so manifest authors can supply whatever
		 * shape the target page expects. Intentionally generic — per-type
		 * prop validation lives on the target components themselves.
		 */
		resolvedProps() {
			return this.currentPage?.config ?? {}
		},
		/**
		 * Custom component to render in the dispatched page's `#header`
		 * slot, resolved from `page.headerComponent` against the registry.
		 * Null when not set or not found in the registry (with a console
		 * warning emitted when an unknown name is referenced).
		 */
		headerOverride() {
			return this.resolveSlotOverride('headerComponent')
		},
		/**
		 * Custom component to render in the dispatched page's `#actions`
		 * slot, resolved from `page.actionsComponent` against the registry.
		 */
		actionsOverride() {
			return this.resolveSlotOverride('actionsComponent')
		},
	},

	methods: {
		resolveSlotOverride(field) {
			const name = this.currentPage?.[field]
			if (!name) return null
			const resolved = this.effectiveCustomComponents[name]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Slot-override component "${name}" referenced by page id "${this.currentPage.id}" (${field}) not found in registry.`,
				)
				return null
			}
			return resolved
		},
	},

	created() {
		// Surface the page id in Vue devtools and stack traces. The base
		// component name `CnPageRenderer` becomes `CnPageRenderer:<id>`
		// for the lifetime of this instance.
		if (this.currentPage) {
			this.$options.name = `CnPageRenderer:${this.currentPage.id}`
		} else {
			// Warn once at mount time when no page matches the current route.
			// eslint-disable-next-line no-console
			console.warn(
				`[CnPageRenderer] No page found for $route.name = "${this.$route?.name}". The renderer will mount nothing.`,
			)
		}
	},
}
</script>

<style>
.cn-page-renderer {
	display: contents;
}
</style>
