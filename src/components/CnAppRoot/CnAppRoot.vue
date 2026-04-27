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
			<router-view />
			<slot name="header-actions" />
			<slot name="sidebar" />
			<slot name="footer" />
		</template>
	</NcContent>
</template>

<script>
import { NcContent } from '@nextcloud/vue'
import CnAppNav from '../CnAppNav/CnAppNav.vue'
import CnAppLoading from '../CnAppLoading/CnAppLoading.vue'
import CnDependencyMissing from '../CnDependencyMissing/CnDependencyMissing.vue'
import { useAppStatus } from '../../composables/useAppStatus.js'

export default {
	name: 'CnAppRoot',

	components: {
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
