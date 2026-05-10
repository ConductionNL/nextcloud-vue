<!--
  CnAppRoot — top-level wrapper for manifest-driven Conduction apps.

  Provides the manifest, custom-component registry, and translate
  function to descendants via Vue's `provide`/`inject`. Orchestrates
  three rendering phases:

    1. Loading        — while useAppManifest.isLoading is true.
                        Default: <CnAppLoading />. Override: #loading slot.
    2. Dependency     — after loading; when any entry in
                        manifest.dependencies is not installed/enabled.
                        Default: <CnDependencyMissing />. Override:
                        #dependency-missing slot.
    3. Shell          — manifest loaded + dependencies satisfied.
                        Renders #menu (default <CnAppNav />) + the
                        consuming app's <router-view>, plus optional
                        #header-actions, #sidebar, and #footer slots.

  Consuming apps that want manifest-driven pages but their own root
  layout can skip CnAppRoot entirely and use CnPageRenderer / CnAppNav
  with explicit props (the props-vs-inject fallback). CnAppRoot is the
  full-shell convenience.

  See REQ-JMR-003 and REQ-JMR-013 of the json-manifest-renderer spec.
-->
<template>
	<NcContent :app-name="appId">
		<!-- Loading phase -->
		<template v-if="phase === 'loading'">
			<slot name="loading">
				<CnAppLoading />
			</slot>
		</template>

		<!-- Dependency-check phase -->
		<template v-else-if="phase === 'dependency-missing'">
			<slot name="dependency-missing" :dependencies="unresolvedDependencies">
				<CnDependencyMissing
					:dependencies="unresolvedDependencies"
					:app-name="appId" />
			</slot>
		</template>

		<!-- Shell phase -->
		<template v-else>
			<slot name="menu">
				<CnAppNav :permissions="permissions" />
			</slot>
			<NcAppContent>
				<router-view />
				<slot name="header-actions" />
				<slot name="footer" />
			</NcAppContent>
			<!--
			  Sidebar slot — gated by the `cnPageSidebarVisible` inject
			  provided by `CnPageRenderer`. When the current manifest
			  page declares `sidebar.show: false` (sibling of `config`),
			  the renderer flips the holder's `.value` to `false` and
			  the slot stops rendering. The default holder value (used
			  when no `CnPageRenderer` ancestor exists) is `true`, so
			  apps that mount their own page components without the
			  renderer keep rendering the slot exactly as today.

			  Default content: when `cnPageSidebarComponent.value` is a
			  Vue component (set by the renderer when the current page
			  declares a `sidebarComponent` registry name), it renders
			  here as the slot's DEFAULT content. The consumer's
			  `#sidebar` slot override (when supplied) wins via Vue's
			  standard slot mechanic; the resolved component is the
			  fallback. See manifest-named-view-sidebar spec.
			-->
			<slot v-if="cnPageSidebarVisible.value !== false" name="sidebar">
				<component
					:is="cnPageSidebarComponent.value"
					v-if="cnPageSidebarComponent.value" />
			</slot>
			<!--
			  Hoisted index-page sidebar. CnIndexPage publishes its
			  embedded CnIndexSidebar config (component + props +
			  listeners) into the `cnIndexSidebarConfig` holder so it
			  mounts at NcContent level — the only place where Nextcloud's
			  NcAppSidebar slides correctly from the right. Rendering
			  alongside the consumer's `#sidebar` slot is safe because
			  the embedded sidebar only sets the holder when the page is
			  an index AND `sidebar.enabled !== false`; detail-page
			  sidebars (CnObjectSidebar) keep owning the slot.
			-->
			<component
				v-if="cnIndexSidebarConfig.value"
				:is="cnIndexSidebarConfig.value.component"
				v-bind="cnIndexSidebarConfig.value.props"
				v-on="cnIndexSidebarConfig.value.listeners" />
		</template>
	</NcContent>
</template>

<script>
import { NcAppContent, NcContent } from '@nextcloud/vue'
import CnAppNav from '../CnAppNav/CnAppNav.vue'
import CnAppLoading from '../CnAppLoading/CnAppLoading.vue'
import CnDependencyMissing from '../CnDependencyMissing/CnDependencyMissing.vue'
import { useAppStatus } from '../../composables/useAppStatus.js'

export default {
	name: 'CnAppRoot',

	components: {
		NcAppContent,
		NcContent,
		CnAppNav,
		CnAppLoading,
		CnDependencyMissing,
	},

	provide() {
		return {
			cnManifest: this.manifest,
			cnCustomComponents: this.customComponents,
			cnTranslate: this.translate,
			cnPageTypes: this.pageTypes,
			/**
			 * Reactive holder that descendants — specifically
			 * CnIndexPage — write to in order to mount their embedded
			 * sidebar at NcContent level. The Vue 2 reactive idiom is
			 * `{ value }` so descendants assign `holder.value = config`.
			 * `config` is `{ component, props, listeners }`.
			 *
			 * Default null. CnIndexPage clears it on unmount so the
			 * hoisted sidebar disappears when the user navigates away.
			 */
			cnIndexSidebarConfig: this.cnIndexSidebarConfig,
			/**
			 * Sentinel that CnIndexPage checks to decide whether to
			 * publish its embedded sidebar to the hoist (true) or
			 * render it inline (false, default for non-CnAppRoot
			 * hosts).
			 */
			cnHostsIndexSidebar: true,
		}
	},

	/**
	 * Inject the current page's sidebar-visibility flag and
	 * sidebar-component override. The provider is `CnPageRenderer`
	 * (a typical descendant via `<router-view>`).
	 *
	 * `cnPageSidebarVisible` default — used when no `CnPageRenderer`
	 * ancestor exists (e.g. apps mounting their own page components
	 * without the renderer) — is `{ value: true }` so the `#sidebar`
	 * slot renders unchanged.
	 *
	 * `cnPageSidebarComponent` default is `{ value: null }` so the
	 * slot's default content stays empty unless the manifest
	 * explicitly opts in via `pages[].sidebarComponent`. Apps that
	 * already provide a `#sidebar` slot override see no behaviour
	 * change either way — the override wins over the slot default.
	 *
	 * The shape `{ value: T }` is a hand-rolled reactive holder
	 * (Vue 2 options API) — see `CnPageRenderer.data()`.
	 */
	inject: {
		cnPageSidebarVisible: { default: () => ({ value: true }) },
		cnPageSidebarComponent: { default: () => ({ value: null }) },
	},

	data() {
		return {
			/**
			 * Reactive holder that descendants write into to mount
			 * their embedded index sidebar at NcContent level. Shared
			 * via provide(); see the `cnIndexSidebarConfig` provide
			 * docs for the contract.
			 */
			cnIndexSidebarConfig: { value: null },
		}
	},

	props: {
		/**
		 * Reactive manifest object (from useAppManifest). The renderer
		 * reads `manifest.dependencies`, `manifest.menu`, and is
		 * propagated to descendants via provide/inject.
		 *
		 * @type {object}
		 */
		manifest: {
			type: Object,
			required: true,
		},
		/**
		 * Nextcloud app id. Forwarded to NcContent as `app-name` and
		 * to CnDependencyMissing for the heading.
		 *
		 * @type {string}
		 */
		appId: {
			type: String,
			required: true,
		},
		/**
		 * Whether the manifest is still loading from the backend.
		 * Typically wired to `useAppManifest().isLoading`. Defaults to
		 * false so that apps using only the bundled manifest skip the
		 * loading phase.
		 *
		 * @type {boolean}
		 */
		isLoading: {
			type: Boolean,
			default: false,
		},
		/**
		 * Custom-component registry consumed by CnPageRenderer for
		 * `type: "custom"` pages and slot overrides. Empty by default.
		 *
		 * @type {object}
		 */
		customComponents: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Translate function provided by the consuming app. The library
		 * never imports `t()` from a specific app, so the consumer
		 * passes its own translator. Typically a closure over the
		 * Nextcloud `t()` mixin pre-bound to the app id, e.g.
		 * `(key) => t(appId, key)`.
		 *
		 * Defaults to an identity function so untranslated keys surface
		 * visibly rather than crashing.
		 *
		 * Note: the prop is named `translate` (not `t`) to avoid
		 * shadowing the global `t()` method that Conduction apps
		 * install via `Vue.mixin({ methods: { t, n } })`. The provide
		 * key is `cnTranslate`.
		 *
		 * @type {Function}
		 */
		translate: {
			type: Function,
			default: (key) => key,
		},
		/**
		 * List of permission strings the current user holds. Forwarded
		 * to CnAppNav's permission filter.
		 *
		 * @type {Array<string>}
		 */
		permissions: {
			type: Array,
			default: () => [],
		},
		/**
		 * Page-type registry. Map of `pages[].type` → Vue component.
		 * Provided to descendant CnPageRenderer instances via inject.
		 * When omitted, the renderer falls back to the library's
		 * `defaultPageTypes`. Apps with custom page types pass a merged
		 * map: `{ ...defaultPageTypes, report: MyReportPage }`.
		 *
		 * @type {object|null}
		 */
		pageTypes: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/**
		 * Per-dependency status, computed once per `appId` declared in
		 * `manifest.dependencies`. Reading the value here triggers the
		 * useAppStatus composable for each id; results are cached
		 * module-side so subsequent reads are free.
		 */
		dependencyStatuses() {
			const deps = Array.isArray(this.manifest?.dependencies)
				? this.manifest.dependencies
				: []
			return deps.map((id) => ({ id, status: useAppStatus(id) }))
		},
		unresolvedDependencies() {
			return this.dependencyStatuses
				.filter(({ status }) => !status.installed.value || !status.enabled.value)
				.map(({ id }) => ({ id, name: id, enabled: false }))
		},
		phase() {
			if (this.isLoading) return 'loading'
			if (this.unresolvedDependencies.length > 0) return 'dependency-missing'
			return 'shell'
		},
	},
}
</script>
