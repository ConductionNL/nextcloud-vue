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
		data-testid="cn-page"
		:data-testid-page-id="currentPage.id"
		:class="['cn-page-renderer', { 'cn-page-renderer--no-sidebar': !pageSidebarVisibleValue }]">
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

	/**
	 * Expose the current page's sidebar-visibility state and
	 * sidebar-component override to descendants (notably
	 * `CnAppRoot` which gates its `#sidebar` slot on
	 * `cnPageSidebarVisible.value` and renders
	 * `cnPageSidebarComponent.value` as the slot's default content).
	 * Each provider is a reactive holder so consumers can `inject`
	 * once and read `.value` whenever they render — Vue 2 reactivity
	 * tracks the mutation site (the watchers below in `data()`).
	 *
	 * `cnPageSidebarVisible` default holder value is `true`, so when
	 * `pages[].sidebar.show` is unset / `true`, behaviour matches
	 * today (slot renders).
	 *
	 * `cnPageSidebarComponent` default holder value is `null`, so
	 * when `pages[].sidebarComponent` is unset, the host App's
	 * `#sidebar` slot renders its consumer-supplied content (or
	 * nothing) — no behaviour change for apps that don't adopt the
	 * field.
	 */
	provide() {
		return {
			cnPageSidebarVisible: this.pageSidebarVisible,
			cnPageSidebarComponent: this.pageSidebarComponent,
		}
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

	data() {
		// Reactive holders for the per-page sidebar visibility flag and
		// sidebar-component override. Both live on data() so Vue 2
		// reactivity tracks `.value` mutations in the watchers below;
		// `provide()` returns the same references so descendant injects
		// observe each update.
		return {
			pageSidebarVisible: { value: true },
			pageSidebarComponent: { value: null },
		}
	},

	computed: {
		/**
		 * Convenience accessor on the reactive holder so the template
		 * `v-bind:class` reads a primitive boolean. Vue 2 templates
		 * unwrap `data` references but not arbitrary `{value}`
		 * holders, so this stays explicit.
		 */
		pageSidebarVisibleValue() {
			return this.pageSidebarVisible.value !== false
		},
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
		 * Props forwarded to the dispatched page component. Merges:
		 *
		 *   1. The page's static `config` object — manifest-authored data
		 *      shared across every visit to this route.
		 *   2. The router's `$route.params` — dynamic placeholders captured
		 *      from the URL (e.g. `/meetings/:id/live` → `{ id: '...' }`).
		 *      Without this merge, children that declare a route-derived
		 *      prop (`props: { id: { type: String, required: true } }`)
		 *      receive `undefined` even when the URL clearly contains the
		 *      value, because the generated route definition's `props: true`
		 *      only binds params to `CnPageRenderer` itself, not the
		 *      dispatched child component. Params take precedence over
		 *      `config` collisions so URL truth wins; config keeps acting
		 *      as a default-overrides layer.
		 *
		 * Per-type prop validation lives on the target components.
		 */
		resolvedProps() {
			return {
				...(this.currentPage?.config ?? {}),
				...(this.$route?.params ?? {}),
			}
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
		 * Per-page sidebar visibility flag derived from the page
		 * entry's top-level `sidebar.show` field (sibling of `config`).
		 * Defaults to `true` when unset. Watched below to push the
		 * value into the reactive `pageSidebarVisible` holder shared
		 * via provide/inject with `CnAppRoot`.
		 */
		currentPageSidebarVisible() {
			const page = this.currentPage
			if (!page || !page.sidebar || typeof page.sidebar !== 'object') {
				return true
			}
			return page.sidebar.show !== false
		},
		/**
		 * Per-page sidebar component derived from the page entry's
		 * top-level `sidebarComponent` field (sibling of `config`).
		 * The string is resolved against the effective
		 * `customComponents` registry — same registry as
		 * `headerComponent`, `actionsComponent`, `cardComponent`, and
		 * `slots.*`. Returns `null` when the field is unset, the
		 * registry name is missing, or resolution fails (a
		 * `console.warn` is logged in the missing-name case so
		 * manifest authors notice misconfiguration). Watched below to
		 * push the value into the reactive `pageSidebarComponent`
		 * holder shared via provide/inject with `CnAppRoot`.
		 *
		 * @return {object|null} The resolved Vue component, or null.
		 */
		currentPageSidebarComponent() {
			const page = this.currentPage
			if (!page || typeof page.sidebarComponent !== 'string' || page.sidebarComponent.length === 0) {
				return null
			}
			const name = page.sidebarComponent
			const resolved = this.effectiveCustomComponents[name]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnPageRenderer] Sidebar component "${name}" referenced by page id "${page.id}" not found in customComponents registry.`,
				)
				return null
			}
			return resolved
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

	watch: {
		currentPageSidebarVisible: {
			immediate: true,
			handler(visible) {
				// Mutate the shared holder's `.value` so descendant
				// injects (notably CnAppRoot) re-render the slot gate.
				this.pageSidebarVisible.value = visible
				// When BOTH visibility is off AND a sidebar component
				// was declared, the sidebarComponent is dead config.
				// Log once at watcher flush time so manifest authors
				// notice the misconfiguration. Visibility wins — the
				// component holder still carries the resolved value
				// for downstream consumers that inspect it directly.
				if (visible === false && this.currentPage?.sidebarComponent) {
					// eslint-disable-next-line no-console
					console.warn(
						`[CnPageRenderer] Page id "${this.currentPage.id}" declares both sidebar.show: false and sidebarComponent "${this.currentPage.sidebarComponent}". Visibility wins; the sidebarComponent will not render.`,
					)
				}
			},
		},
		currentPageSidebarComponent: {
			immediate: true,
			handler(component) {
				// Mutate the shared holder's `.value` so descendant
				// injects (notably CnAppRoot) re-render the slot
				// default content with the resolved component.
				this.pageSidebarComponent.value = component
			},
		},
	},

	created() {
		// Surface the page id in Vue devtools and stack traces. The base
		// component name `CnPageRenderer` becomes `CnPageRenderer:<id>`
		// for the lifetime of this instance.
		if (this.currentPage) {
			this.$options.name = `CnPageRenderer:${this.currentPage.id}`
		} else if (this.$route) {
			// Router is present but no page matches — warn so developers notice misconfigured routes.
			// eslint-disable-next-line no-console
			console.warn(
				`[CnPageRenderer] No page found for $route.name = "${this.$route.name}". The renderer will mount nothing.`,
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

/*
 * Hook class applied when the current page's manifest entry has
 * `sidebar.show: false`. The library does not ship visual rules
 * here — consumer apps with style-driven sidebar layouts (e.g. CSS
 * grid where the host shell sibling sidebar is a grid track) can
 * target this class to collapse / hide the sibling element.
 *
 * The programmatic counterpart is the `cnPageSidebarVisible`
 * inject — `CnAppRoot` reads it to gate `<slot name="sidebar" />`.
 */
.cn-page-renderer--no-sidebar {
	/* intentionally empty — consumer-styled */
}
</style>
