<!--
  CnAppRoot — top-level wrapper for manifest-driven Conduction apps.

  Provides the manifest, custom-component registry, and translate
  function to descendants via Vue's `provide`/`inject`. Orchestrates
  four rendering phases:

    0. Capabilities  — checks the Nextcloud capabilities API for any
                       app id listed in `requiresApps` (default
                       `['openregister']`). When a required app is
                       missing, default content is <NcEmptyContent>
                       with an OR-store action; consumers may replace
                       the surface entirely via the #or-missing slot.
                       Apps that do not need the guard pass
                       `:requires-apps="[]"`.
    1. Loading       — while useAppManifest.isLoading is true.
                       Default: <CnAppLoading />. Override: #loading slot.
    2. Dependency    — after loading; when any entry in
                       manifest.dependencies is not installed/enabled.
                       Default: <CnDependencyMissing />. Override:
                       #dependency-missing slot.
    3. Shell         — manifest loaded + dependencies satisfied.
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

  See REQ-JMR-003 and REQ-JMR-013 of the json-manifest-renderer spec,
  and REQ-OR-1..REQ-OR-7 of the cnapproot-app-availability-guard spec.
-->
<template>
	<NcContent :app-name="appId">
		<!-- Phase 0a: capabilities check in flight -->
		<template v-if="capabilitiesLoading">
			<div class="cn-app-root__capabilities-loading">
				<NcLoadingIcon :size="32" />
			</div>
		</template>

		<!--
		  @slot or-missing
		  @description Custom missing-app screen used when one or more
		  entries in `requiresApps` are absent from the Nextcloud
		  capabilities payload. Receives `{ missingApps: string[] }`.
		  Default content: an `<NcEmptyContent>` with the OpenRegister
		  database icon, i18n title/description, and a primary action
		  linking to the OpenRegister integration page. Override when
		  the consumer needs a custom CTA (e.g. softwarecatalog linking
		  to its public landing page). See REQ-OR-4.
		-->
		<template v-else-if="missingApps.length > 0">
			<slot name="or-missing" :missing-apps="missingApps">
				<div class="cn-app-root__or-missing">
					<NcEmptyContent
						:name="translate('app-availability.title')"
						:description="translate('app-availability.description')">
						<template #icon>
							<DatabaseSearchOutline :size="64" />
						</template>
						<template #action>
							<a
								class="cn-app-root__or-missing-action"
								:href="orStoreLink">
								{{ translate('app-availability.action') }}
							</a>
						</template>
					</NcEmptyContent>
				</div>
			</slot>
		</template>

		<!--
		  @slot loading
		  @description Loading screen rendered while the manifest
		  fetch is in flight (REQ-JMR-013). Default content is a
		  `<CnAppLoading />` brand spinner. Override when the consumer
		  needs a custom skeleton or branded loader.
		-->
		<template v-else-if="phase === 'loading'">
			<slot name="loading">
				<CnAppLoading />
			</slot>
		</template>

		<!--
		  @slot dependency-missing
		  @description Empty-state surface rendered when one or more
		  entries in `manifest.dependencies` are not installed/enabled.
		  Receives `{ dependencies }` (the unresolved list). Default:
		  `<CnDependencyMissing>`. See REQ-JMR-011.
		-->
		<template v-else-if="phase === 'dependency-missing'">
			<slot name="dependency-missing" :dependencies="unresolvedDependencies">
				<CnDependencyMissing
					:dependencies="unresolvedDependencies"
					:app-name="appId" />
			</slot>
		</template>

		<!-- Phase 3: shell -->
		<template v-else>
			<!--
			  @slot menu
			  @description Left-rail navigation surface. Default:
			  `<CnAppNav>` reading `manifest.menu` and filtering by
			  `permissions`. Override to ship a hand-rolled menu while
			  keeping the rest of CnAppRoot's shell.
			-->
			<slot name="menu">
				<CnAppNav :permissions="permissions" />
			</slot>
			<NcAppContent>
				<router-view />
				<!--
				  @slot header-actions
				  @description Optional action buttons rendered in the
				  page header alongside the router-view. Empty by
				  default; consumer apps fill it with toolbar buttons.
				-->
				<slot name="header-actions" />
				<!--
				  @slot footer
				  @description Optional footer surface rendered below the
				  router-view inside `NcAppContent`. Empty by default.
				-->
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
			<!--
			  @slot sidebar
			  @description Right-rail sidebar surface. Gated by the
			  `cnPageSidebarVisible` inject (provided by `CnPageRenderer`)
			  so manifest pages can suppress the sidebar via
			  `pages[].sidebar.show: false`. Default content: when
			  `cnPageSidebarComponent.value` is set (provided by
			  `CnPageRenderer` for `pages[].sidebarComponent`), that
			  component renders here; otherwise empty. Consumer-supplied
			  slot content always wins over the resolved component.
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

			<!--
			  AI Chat Companion — auto-mounted at the END of NcContent's
			  children so its embedded NcAppSidebar slides in from the right
			  edge (positioning relies on being the last NcContent sibling,
			  same trick the hoisted index-page sidebar above uses).
			  Gating (health probe, pageKind overrides) happens inside the
			  component. No per-app wiring required.
			-->
			<CnAiCompanion />
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
import { NcAppContent, NcAppSettingsDialog, NcAppSettingsSection, NcContent, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import { getCapabilities } from '@nextcloud/capabilities'
import DatabaseSearchOutline from 'vue-material-design-icons/DatabaseSearchOutline.vue'
import CnAppNav from '../CnAppNav/CnAppNav.vue'
import CnAppLoading from '../CnAppLoading/CnAppLoading.vue'
import CnDependencyMissing from '../CnDependencyMissing/CnDependencyMissing.vue'
import CnAiCompanion from '../CnAiCompanion/CnAiCompanion.vue'
import { useAppStatus } from '../../composables/useAppStatus.js'
import Vue from 'vue'

/**
 * Default URL for the OpenRegister integration page. The empty-state
 * action links here so users can install / enable OpenRegister with one
 * click. Override per-environment by replacing the default empty-state
 * via the `#or-missing` slot.
 */
const OR_STORE_LINK = '/index.php/settings/apps/integration/openregister'

export default {
	name: 'CnAppRoot',

	components: {
		NcAppContent,
		NcAppSettingsDialog,
		NcAppSettingsSection,
		NcContent,
		NcEmptyContent,
		NcLoadingIcon,
		DatabaseSearchOutline,
		CnAppNav,
		CnAppLoading,
		CnDependencyMissing,
		CnAiCompanion,
	},

	provide() {
		return {
			cnManifest: this.manifest,
			cnCustomComponents: this.customComponents,
			cnTranslate: this.translate,
			cnPageTypes: this.pageTypes,
			cnFormatters: this.formatters,
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
			/**
			 * Reactive AI context holder. Page components (CnIndexPage,
			 * CnDetailPage, CnDashboardPage) overwrite fields on this object
			 * in created() and watch() so the widget sees live context.
			 * The same object reference is stable for the lifetime of CnAppRoot.
			 */
			cnAiContext: this.cnAiContext,
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
		 * Cell-formatter registry. Map of formatter-id →
		 * `(value, row, property) => string|number`. Resolves the
		 * `pages[].config.columns[].formatter` ids that index/logs pages
		 * declare, so per-column value formatting (status-label maps,
		 * "days in step", currency, …) lives in small pure data functions
		 * instead of bespoke `type:"custom"` table views. Provided to
		 * descendant CnDataTable / CnCellRenderer via inject (`cnFormatters`).
		 * Empty by default — a column with no `formatter`, or an app that
		 * passes no `formatters`, renders exactly as before.
		 *
		 * @type {object}
		 */
		formatters: {
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
		 * Required Nextcloud apps for this Conduction app to function.
		 * Default `['openregister']` — every fleet app stores its data
		 * in OpenRegister, so the guard is on by default. Consumer apps
		 * that don't need OpenRegister (the styleguide, the docs site,
		 * future utility apps) opt out via `:requires-apps="[]"`.
		 *
		 * On `mounted()`, CnAppRoot calls `getCapabilities()` from
		 * `@nextcloud/capabilities` exactly once and compares the
		 * returned capability keys against this list. When ANY entry
		 * is missing, CnAppRoot renders an `<NcEmptyContent>` (the
		 * default) or the consumer's `#or-missing` slot.
		 *
		 * Multi-app future-proofing free: a future docudesk-derived app
		 * needing both can declare
		 * `:requires-apps="['openregister', 'openconnector']"`.
		 *
		 * Network failure on `getCapabilities()` (admin-restricted,
		 * offline, CORS) falls through to the renderer rather than
		 * blocking the app on a flaky check — the data layer surfaces
		 * the actual failure when API calls hit OpenRegister.
		 *
		 * See REQ-OR-1..REQ-OR-7 of cnapproot-app-availability-guard.
		 *
		 * @type {Array<string>}
		 */
		requiresApps: {
			type: Array,
			default: () => ['openregister'],
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

	/**
	 * Component-instance state for the capabilities guard.
	 *
	 * - `capabilitiesLoading`: `true` only when the prop says we need
	 *   to check (i.e. `requiresApps.length > 0`). Apps that opt out
	 *   via `:requires-apps="[]"` see this initialise to `false`, so
	 *   no spinner flashes and the renderer mounts on the first
	 *   render. Apps that need the guard see `true` initially; the
	 *   `mounted()` hook runs the check and flips to `false`.
	 * - `missingApps`: the list of `requiresApps` entries NOT
	 *   present in the capabilities payload. When empty, the
	 *   renderer mounts; when non-empty, the empty-state renders.
	 * - `guardError`: stores the caught error so consumers
	 *   inspecting the component instance can introspect failures.
	 *   The error path falls through to the renderer regardless.
	 */
	data() {
		const willCheck = Array.isArray(this.requiresApps) && this.requiresApps.length > 0
		return {
			capabilitiesLoading: willCheck,
			missingApps: [],
			guardError: null,
			/**
			 * Reactive holder that descendants write into to mount
			 * their embedded index sidebar at NcContent level. Shared
			 * via provide(); see the `cnIndexSidebarConfig` provide
			 * docs for the contract.
			 */
			cnIndexSidebarConfig: { value: null },
			/**
			 * Reactive AI context. Provided to all descendants via
			 * provide('cnAiContext'). Page components overwrite fields
			 * in their created() + watch() to give the companion
			 * per-page context. The same object reference is stable
			 * across the lifetime of CnAppRoot.
			 *
			 * Shape: CnAiContext (hydra-locked TypeScript interface)
			 *   { appId, pageKind, objectUuid?, registerSlug?,
			 *     schemaSlug?, route? }
			 */
			cnAiContext: Vue.observable({
				appId: this.appId || 'unknown',
				pageKind: 'custom',
				route: { path: (typeof window !== 'undefined' ? window.location.pathname : '') },
			}),
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

	mounted() {
		// Opt-out fast-path: empty `requiresApps` already initialised
		// `capabilitiesLoading` to `false` in data(); skip the check.
		if (!Array.isArray(this.requiresApps) || this.requiresApps.length === 0) {
			return
		}

		try {
			const capabilities = getCapabilities()
			const keys = (capabilities && typeof capabilities === 'object')
				? Object.keys(capabilities)
				: []
			this.missingApps = this.requiresApps.filter((id) => !keys.includes(id))
		} catch (err) {
			// Capabilities API failure — log and fall through to the
			// renderer. The data layer will surface the actual problem
			// if OR is genuinely missing.
			// eslint-disable-next-line no-console
			console.warn(
				'[CnAppRoot] Failed to read Nextcloud capabilities for the app-availability guard:',
				err,
			)
			this.guardError = err
			this.missingApps = []
		} finally {
			this.capabilitiesLoading = false
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
		/**
		 * Default link surfaced by the missing-app empty-state action.
		 * Points at the OpenRegister integration page in the Nextcloud
		 * app store. Replaceable per consumer via the `#or-missing`
		 * slot.
		 */
		orStoreLink() {
			return OR_STORE_LINK
		},
		resolvedUserSettingsTitle() {
			return this.userSettingsTitle || this.translate('User settings')
		},
	},
}
</script>

<style>
.cn-app-root__capabilities-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 100vh;
	background: var(--color-main-background);
}

.cn-app-root__or-missing {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 100vh;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-app-root__or-missing-action {
	display: inline-block;
	padding: calc(1.5 * var(--default-grid-baseline)) calc(3 * var(--default-grid-baseline));
	border-radius: var(--border-radius);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	text-decoration: none;
}

.cn-app-root__or-missing-action:hover,
.cn-app-root__or-missing-action:focus {
	background: var(--color-primary-element-hover);
	text-decoration: underline;
}
</style>
