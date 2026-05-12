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

  Hosts a single `NcAppSettingsDialog` that any descendant can open
  via the injected `cnOpenUserSettings()` method. CnAppNav binds the
  inject to manifest entries with `action: "user-settings"`. Apps
  populate the modal by passing `NcAppSettingsSection`s into the
  `#user-settings` slot; the slot falls back to a single placeholder
  section when no content is supplied.

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
			-->
			<slot v-if="cnPageSidebarVisible.value !== false" name="sidebar" />
			<!--
			  User-settings modal. Always mounted so descendants can
			  open it via the `cnOpenUserSettings` inject (CnAppNav
			  wires this to manifest entries with
			  `action: "user-settings"`). The `#user-settings` slot
			  hosts NcAppSettingsSection children; the placeholder
			  fallback below renders when no slot content is supplied.
			-->
			<NcAppSettingsDialog
				:open="userSettingsOpen"
				:show-navigation="true"
				:name="resolvedUserSettingsTitle"
				@update:open="userSettingsOpen = $event">
				<!-- @slot user-settings Sections rendered inside the host NcAppSettingsDialog. Pass NcAppSettingsSection children. Defaults to a single placeholder section when omitted. -->
				<slot name="user-settings">
					<NcAppSettingsSection
						id="general"
						:name="translate('User preferences')">
						<p>{{ translate('User preferences will appear here.') }}</p>
					</NcAppSettingsSection>
				</slot>
			</NcAppSettingsDialog>
		</template>
	</NcContent>
</template>

<script>
import { NcAppContent, NcAppSettingsDialog, NcAppSettingsSection, NcContent } from '@nextcloud/vue'
import CnAppNav from '../CnAppNav/CnAppNav.vue'
import CnAppLoading from '../CnAppLoading/CnAppLoading.vue'
import CnDependencyMissing from '../CnDependencyMissing/CnDependencyMissing.vue'
import { useAppStatus } from '../../composables/useAppStatus.js'

export default {
	name: 'CnAppRoot',

	components: {
		NcAppContent,
		NcAppSettingsDialog,
		NcAppSettingsSection,
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
			 * Open the host app's NcAppSettingsDialog. Bound to
			 * `this` so descendants don't have to. Used by CnAppNav
			 * to dispatch `action: "user-settings"` clicks; consumer
			 * apps can also call it directly via inject for custom
			 * triggers (e.g. an avatar-menu entry).
			 */
			cnOpenUserSettings: () => {
				this.userSettingsOpen = true
			},
		}
	},

	/**
	 * Inject the current page's sidebar-visibility flag. The provider
	 * is `CnPageRenderer` (a typical descendant via `<router-view>`).
	 * The default — used when no `CnPageRenderer` ancestor exists
	 * (e.g. apps mounting their own page components without the
	 * renderer) — is `{ value: true }` so the `#sidebar` slot
	 * renders unchanged.
	 *
	 * The shape `{ value: boolean }` is a hand-rolled reactive holder
	 * (Vue 2 options API) — see `CnPageRenderer.data().pageSidebarVisible`.
	 */
	inject: {
		cnPageSidebarVisible: { default: () => ({ value: true }) },
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
		/**
		 * Title rendered at the top of the user-settings modal
		 * (NcAppSettingsDialog `name` prop). Defaults to the
		 * translated string "User settings"; pass a custom label
		 * (e.g. "Decidesk preferences") to override per app.
		 *
		 * @type {string}
		 */
		userSettingsTitle: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			/**
			 * Open state of the host NcAppSettingsDialog. Toggled
			 * to `true` by the provided `cnOpenUserSettings()`
			 * method (CnAppNav binds this to manifest entries with
			 * `action: "user-settings"`); the dialog flips it back
			 * via its `update:open` event.
			 */
			userSettingsOpen: false,
		}
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
		resolvedUserSettingsTitle() {
			return this.userSettingsTitle || this.translate('User settings')
		},
	},
}
</script>
