<!--
  CnPageRenderer — JSON-driven page dispatcher.

  Mounted inside <router-view>, CnPageRenderer reads the manifest, finds
  the page definition whose `id` matches the current route name, and
  renders the appropriate page component by dispatching on `type`.

  Page types are resolved via the `pageTypes` registry. The library
  ships a built-in registry (`defaultPageTypes` — index, detail,
  dashboard) and consumers can extend it by passing a merged map to
  CnAppRoot or CnPageRenderer. The `custom` type is special: it
  resolves `page.component` against the customComponents registry
  rather than the page-types map. Adding a new built-in page type to
  the library is one line in `pageTypes.js` — no change here.

  Each entry in `pageTypes` is wrapped in `defineAsyncComponent` so
  apps using only a subset of types do not pay the bundle cost for
  others (notably the GridStack-backed dashboard).

  Manifest, customComponents, pageTypes, and translate are injected
  from CnAppRoot by default; each can also be passed as props for
  standalone use without CnAppRoot. Props always take precedence
  over inject.

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
			<template
				v-for="entry in resolvedSlotEntries"
				#[entry.name]="slotProps">
				<component
					:is="entry.component"
					:key="entry.name"
					v-bind="slotProps" />
			</template>
		</component>
	</div>
</template>

<script>
import { defaultPageTypes } from './pageTypes.js'

export default {
	name: 'CnPageRenderer',

	inject: {
		cnManifest: { default: null },
		cnCustomComponents: { default: () => ({}) },
		cnTranslate: { default: () => (key) => key },
		cnPageTypes: { default: null },
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
		/**
		 * Page-type registry. Map of `pages[].type` value → Vue
		 * component to mount. Consumers extend the library defaults by
		 * spreading them: `{ ...defaultPageTypes, report: MyReportPage }`.
		 *
		 * Falls back to the injected `cnPageTypes` and finally to the
		 * library's `defaultPageTypes`. The special `custom` type is
		 * NOT looked up here — it resolves through the customComponents
		 * registry instead.
		 *
		 * @type {object|null}
		 */
		pageTypes: {
			type: Object,
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
		/**
		 * Effective page-type registry. Prop wins over inject; both
		 * fall back to the library's `defaultPageTypes`. Apps that want
		 * the library defaults plus extras typically construct the prop
		 * value as `{ ...defaultPageTypes, ...myExtras }`.
		 */
		effectivePageTypes() {
			return this.pageTypes ?? this.cnPageTypes ?? defaultPageTypes
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
		 * Component to render for the current page. Looked up in
		 * `effectivePageTypes` for built-in / library / consumer-extended
		 * types; resolved against `effectiveCustomComponents` for
		 * `type: "custom"` pages.
		 *
		 * Async loading is the responsibility of whoever populated the
		 * `pageTypes` map (the library wraps each entry in
		 * `defineAsyncComponent`); the renderer treats any value in the
		 * map as a Vue component.
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
			const component = this.effectivePageTypes[page.type]
			if (!component) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Unknown page type "${page.type}" for page id "${page.id}". Add it to the pageTypes registry (e.g. via the pageTypes prop on CnAppRoot or CnPageRenderer).`,
				)
				return null
			}
			return component
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
		 * Combined slot-override map for the dispatched page component.
		 * Sources:
		 *   1. `page.slots` — generic { slotName: registryName } map.
		 *   2. `page.headerComponent` — sugar for `slots.header`.
		 *   3. `page.actionsComponent` — sugar for `slots.actions`.
		 *
		 * Sugar fields take precedence when both are set so that the
		 * legacy fields remain meaningful in mixed manifests. Returned
		 * as an array of `{ name, component }` entries to make the
		 * `<template v-for>` + dynamic-slot-name pattern work in Vue 2.
		 */
		resolvedSlotEntries() {
			const page = this.currentPage
			if (!page) return []
			const map = { ...(page.slots ?? {}) }
			if (page.headerComponent) map.header = page.headerComponent
			if (page.actionsComponent) map.actions = page.actionsComponent
			const entries = []
			for (const [name, registryName] of Object.entries(map)) {
				const component = this.resolveRegistryName(registryName, name)
				if (component) entries.push({ name, component })
			}
			return entries
		},
		/**
		 * @deprecated Use `resolvedSlotEntries` for general slot
		 * resolution. Retained for compatibility with code that read the
		 * computed directly.
		 */
		headerOverride() {
			return this.resolvedSlotEntries.find((e) => e.name === 'header')?.component ?? null
		},
		/**
		 * @deprecated See `headerOverride`.
		 */
		actionsOverride() {
			return this.resolvedSlotEntries.find((e) => e.name === 'actions')?.component ?? null
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

	methods: {
		/**
		 * Resolve a registry component name. Logs a single console.warn
		 * naming the slot if the name is not in the registry.
		 *
		 * @param {string} registryName Name of the component to look up
		 *   in `effectiveCustomComponents`.
		 * @param {string} slotName Slot the component would have filled
		 *   (used only for the warning message).
		 * @return {object|null}
		 */
		resolveRegistryName(registryName, slotName) {
			const resolved = this.effectiveCustomComponents[registryName]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Slot-override component "${registryName}" referenced by page id "${this.currentPage.id}" (slot "${slotName}") not found in registry.`,
				)
				return null
			}
			return resolved
		},
	},
}
</script>

<style>
.cn-page-renderer {
	display: contents;
}
</style>
