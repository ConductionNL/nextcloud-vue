<!--
  CnObjectSidebar — Right sidebar with standardized tabs for generic object functionality.

  Provides Files, Notes, Tags, Tasks, and Audit Trail tabs that integrate with
  OpenRegister API endpoints (which bridge to Nextcloud-native APIs).
  All tabs are optional and overridable via props and slots.
-->
<template>
	<NcAppSidebar
		:name="sidebarTitle"
		:title="sidebarTitle"
		:subtitle="sidebarSubtitle"
		:open="open"
		:active.sync="activeTab"
		data-testid="cn-object-sidebar"
		@update:open="$emit('update:open', $event)"
		@close="$emit('update:open', false)">
		<!-- REGISTRY BRANCH: pluggable integration registry-driven.
		     Renders one tab per provider registered on
		     `window.OCA.OpenRegister.integrations`. `hiddenTabs` /
		     `excludeIntegrations` filter the set; the `#extra-tabs`
		     slot still appends consumer-supplied tabs. Per-integration
		     slot overrides aren't supported in registry mode — apps
		     that need to override a built-in tab should register their
		     own provider with the same id (collision policy: first
		     wins) before OpenRegister's bundle loads. -->
		<template v-if="isRegistryMode">
			<NcAppSidebarTab
				v-for="(provider, idx) in filteredRegistryIntegrations"
				:id="provider.id"
				:key="provider.id"
				:name="provider.label"
				:order="provider.order != null ? provider.order : idx + 1"
				:data-testid="`cn-object-sidebar-tab-${provider.id}`">
				<template #icon>
					<CnIcon v-if="provider.icon" :name="provider.icon" :size="20" />
				</template>
				<!-- MOUNT BRANCH (openregister#2127): a `renderMode: 'mount'`
				     leaf renders through CnLeafMountHost — a bare host-owned
				     element the leaf mounts its own framework into. Mounted
				     lazily when the tab is active; unmounted on hide/teardown. -->
				<CnLeafMountHost
					v-if="isMountProvider(provider)"
					:provider="provider"
					:active="activeTab === provider.id"
					:mount-props="sidebarMountProps" />
				<component
					:is="resolveRegistryTab(provider)"
					v-else
					v-bind="sharedTabProps" />
			</NcAppSidebarTab>
			<slot name="extra-tabs" />
		</template>

		<!-- BACKWARDS-COMPATIBLE BRANCH: hard-coded built-in tabs.
		     Used when no custom `tabs` prop is provided and the
		     registry mode is not active. The slot overrides
		     (#tab-files etc.) and `hiddenTabs` filtering remain
		     unchanged. -->
		<template v-else-if="!hasCustomTabs">
			<!-- Files Tab -->
			<NcAppSidebarTab
				v-if="!isTabHidden('files')"
				id="files"
				:name="filesLabel"
				:order="1"
				data-testid="cn-object-sidebar-tab-files">
				<template #icon>
					<Paperclip :size="20" />
				</template>
				<slot name="tab-files" :object-id="objectId" :object-type="objectType">
					<CnFilesTab
						:object-id="objectId"
						:register="register"
						:schema="schema"
						:api-base="apiBase" />
				</slot>
			</NcAppSidebarTab>

			<!-- Notes Tab -->
			<NcAppSidebarTab
				v-if="!isTabHidden('notes')"
				id="notes"
				:name="notesLabel"
				:order="2"
				data-testid="cn-object-sidebar-tab-notes">
				<template #icon>
					<CommentTextOutline :size="20" />
				</template>
				<slot name="tab-notes" :object-id="objectId" :object-type="objectType">
					<!-- The `mention` passthrough is the notification hook: apps
					     mounting the full sidebar receive the mentioned user ids
					     and dispatch NC notifications from their own backend. -->
					<CnNotesTab
						:object-id="objectId"
						:register="register"
						:schema="schema"
						:api-base="apiBase"
						@mention="$emit('mention', $event)" />
				</slot>
			</NcAppSidebarTab>

			<!-- Tags Tab -->
			<NcAppSidebarTab
				v-if="!isTabHidden('tags')"
				id="tags"
				:name="tagsLabel"
				:order="3"
				data-testid="cn-object-sidebar-tab-tags">
				<template #icon>
					<TagOutline :size="20" />
				</template>
				<slot name="tab-tags" :object-id="objectId" :object-type="objectType">
					<CnTagsTab
						:object-id="objectId"
						:register="register"
						:schema="schema"
						:api-base="apiBase" />
				</slot>
			</NcAppSidebarTab>

			<!-- Tasks Tab -->
			<NcAppSidebarTab
				v-if="!isTabHidden('tasks')"
				id="tasks"
				:name="tasksLabel"
				:order="4"
				data-testid="cn-object-sidebar-tab-tasks">
				<template #icon>
					<CheckboxMarkedOutline :size="20" />
				</template>
				<slot name="tab-tasks" :object-id="objectId" :object-type="objectType">
					<CnTasksTab
						:object-id="objectId"
						:register="register"
						:schema="schema"
						:api-base="apiBase" />
				</slot>
			</NcAppSidebarTab>

			<!-- Audit Trail Tab -->
			<NcAppSidebarTab
				v-if="!isTabHidden('auditTrail')"
				id="auditTrail"
				:name="auditTrailLabel"
				:order="5"
				data-testid="cn-object-sidebar-tab-audit-trail">
				<template #icon>
					<History :size="20" />
				</template>
				<slot name="tab-audit-trail" :object-id="objectId" :object-type="objectType">
					<CnAuditTrailTab
						:object-id="objectId"
						:register="register"
						:schema="schema"
						:api-base="apiBase" />
				</slot>
			</NcAppSidebarTab>

			<!-- Custom tabs slot (only relevant in legacy mode) -->
			<slot name="extra-tabs" />
		</template>

		<!-- OPEN-ENUM BRANCH: render the consumer-supplied `tabs` array.
		     Each tab declares its content via `widgets` (resolved against
		     the built-in widget registry — `data` → CnObjectDataWidget,
		     `metadata` → CnObjectMetadataWidget, `audit`/`audit-trail` →
		     CnAuditTrailTab, `object-table` → CnWidgetObjectTable — with the
		     customComponents registry as the escape hatch) OR `component`
		     (resolved against the customComponents registry directly). -->
		<template v-else>
			<NcAppSidebarTab
				v-for="(tab, idx) in tabs"
				:id="tab.id"
				:key="tab.id"
				:name="tab.label"
				:order="tab.order != null ? tab.order : idx + 1"
				:data-testid="`cn-object-sidebar-tab-${tab.id}`">
				<template v-if="tab.icon" #icon>
					<CnIcon :name="tab.icon" :size="20" />
				</template>

				<!-- Component-registry escape hatch wins when `component` is set
				     (with a console.warn at mount time when widgets is also set). -->
				<component
					:is="resolveTabComponent(tab)"
					v-if="tab.component"
					v-bind="sharedTabProps" />

				<!-- Widget array path. Each widget receives the shared object
				     context plus its own `props`; per-widget props win on overlap. -->
				<div v-else class="cn-object-sidebar__tab-widgets">
					<template v-for="(w, wIdx) in tab.widgets || []">
						<component
							:is="resolveWidgetComponent(w.type)"
							v-if="resolveWidgetComponent(w.type)"
							:key="wIdx"
							v-bind="{ ...sharedTabProps, ...(w.props || {}) }" />
					</template>
				</div>
			</NcAppSidebarTab>
		</template>
	</NcAppSidebar>
</template>

<script>
import { inject, provide, ref, watch } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { NcAppSidebar, NcAppSidebarTab } from '@nextcloud/vue'

import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import History from 'vue-material-design-icons/History.vue'
import { useObjectSubscription } from '../../composables/useObjectSubscription.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'

import CnFilesTab from './CnFilesTab.vue'
import CnNotesTab from './CnNotesTab.vue'
import CnTagsTab from './CnTagsTab.vue'
import CnTasksTab from './CnTasksTab.vue'
import CnAuditTrailTab from './CnAuditTrailTab.vue'

import { CnIcon } from '../CnIcon/index.js'
import { CnLeafMountHost } from '../CnLeafMountHost/index.js'
import { CnObjectDataWidget } from '../CnObjectDataWidget/index.js'
import { CnObjectMetadataWidget } from '../CnObjectMetadataWidget/index.js'
import CnWidgetObjectTable from '../CnWidgetObjectTable/CnWidgetObjectTable.vue'

/**
 * Built-in widget registry used by the open-enum `tabs` prop.
 * - `data`         → CnObjectDataWidget (schema-driven editable grid)
 * - `metadata`     → CnObjectMetadataWidget (read-only system metadata)
 * - `audit`        → CnAuditTrailTab (the object's change log / audit trail)
 * - `object-table` → CnWidgetObjectTable (a declarative list scoped to the
 *   parent object — the full source / endpointSource / columns / actions
 *   contract). Resolves `@objectId` / `@object.<field>` filter tokens against
 *   the object context this sidebar `provide`s (see setup), so a detail
 *   page's ZGW-style relation tab (e.g. a zaak's besluiten, filtered by
 *   `{ zaak: "@objectId" }`) renders as a sidebar tab with no bespoke code.
 *
 * Any `widgets[].type` value not in this map falls back to the
 * customComponents registry (prop, then injected `cnCustomComponents`).
 */
const BUILTIN_WIDGETS = {
	data: CnObjectDataWidget,
	metadata: CnObjectMetadataWidget,
	audit: CnAuditTrailTab,
	// Alias matching the dashboard/detail-page widget key `audit-trail` so a
	// manifest can declare a sidebar tab with `widgets: [{ type: 'audit-trail' }]`
	// (the same key it uses for the detail-page body widget) and get the object's
	// change log as a proper sidebar tab.
	'audit-trail': CnAuditTrailTab,
	// The declarative list widget (same key as the detail-page body widget), so
	// a sidebar tab can render a related-object list scoped to the parent
	// object via `@objectId` / `@object.<field>` tokens in its `source.filter`.
	'object-table': CnWidgetObjectTable,
}

/**
 * CnObjectSidebar — Right sidebar for entity detail pages.
 *
 * Provides standardized tabs for generic object functionality (Files, Notes, Tags,
 * Tasks, Audit Trail) that integrate with OpenRegister API endpoints bridging to
 * Nextcloud-native APIs. Each tab is a self-contained component.
 *
 * Basic usage
 * ```vue
 * <CnObjectSidebar
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :register="registerConfig.register"
 *   :schema="registerConfig.schema" />
 * ```
 *
 * Hide specific tabs
 * ```vue
 * <CnObjectSidebar
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :hidden-tabs="['tasks', 'tags']" />
 * ```
 *
 * Override a tab
 * ```vue
 * <CnObjectSidebar object-type="pipelinq_lead" :object-id="leadId">
 *   <template #tab-notes="{ objectId }">
 *     <MyCustomNotesComponent :id="objectId" />
 *   </template>
 * </CnObjectSidebar>
 * ```
 */
export default {
	name: 'CnObjectSidebar',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		Paperclip,
		CommentTextOutline,
		TagOutline,
		CheckboxMarkedOutline,
		History,
		CnFilesTab,
		CnNotesTab,
		CnTagsTab,
		CnTasksTab,
		CnAuditTrailTab,
		CnIcon,
		CnLeafMountHost,
	},

	inject: {
		cnCustomComponents: { default: () => ({}) },
		// v2 component registry (ADR-036). Kind-tagged entries
		// ({ kind, component }); a sidebar tab's `component` ref resolves
		// against this first so apps that migrated their tab components to
		// the registry (e.g. as `kind: 'page'`) still render. Empty default
		// keeps the legacy `customComponents`-only path unchanged.
		cnRegistry: { default: () => ({}) },
	},

	props: {
		/** The entity type (e.g., "pipelinq_lead", "procest_case") */
		objectType: {
			type: String,
			required: true,
		},
		/** The object UUID */
		objectId: {
			type: String,
			required: true,
		},
		/** OpenRegister register ID */
		register: {
			type: String,
			default: '',
		},
		/** OpenRegister schema ID */
		schema: {
			type: String,
			default: '',
		},
		/** Array of tab IDs to hide: 'files', 'notes', 'tags', 'tasks', 'auditTrail' */
		hiddenTabs: {
			type: Array,
			default: () => [],
		},
		/**
		 * Use the pluggable integration registry to drive the sidebar
		 * tabs. Defaults to `true` (ADR-019): tabs are rendered one per
		 * provider registered on `window.OCA.OpenRegister.integrations`
		 * (and via `useIntegrationRegistry()`). The canonical five
		 * built-ins — files / notes / tags / tasks / audit-trail — are
		 * shipped as providers in `builtinIntegrations` and registered by
		 * OpenRegister's bootstrap (`registerBuiltinIntegrations()`), so
		 * the default surface is unchanged for apps that register them.
		 *
		 * Set `false` to opt back into the legacy hardcoded-tabs path,
		 * which renders the five built-in tabs directly from this
		 * component and supports the `#tab-<id>` slot overrides. Use this
		 * for consumers that do not call `registerBuiltinIntegrations()`
		 * and want the built-in tabs without standing up the registry.
		 *
		 * `hiddenTabs` / `excludeIntegrations` and the `#extra-tabs` slot
		 * apply in both modes.
		 *
		 * Mutually exclusive with the open-enum `tabs` prop — when both
		 * are set, `tabs` wins and a console.warn is logged.
		 *
		 * @type {boolean}
		 */
		useRegistry: {
			type: Boolean,
			default: true,
		},
		/**
		 * Integration ids to exclude when rendering registry-driven
		 * tabs. Mirrors `hiddenTabs` for the legacy mode.
		 *
		 * @type {string[]}
		 */
		excludeIntegrations: {
			type: Array,
			default: () => [],
		},
		/** Whether the sidebar is open */
		open: {
			type: Boolean,
			default: true,
		},
		/** Sidebar title (defaults to objectType) */
		title: {
			type: String,
			default: '',
		},
		/** Sidebar subtitle */
		subtitle: {
			type: String,
			default: '',
		},
		/** @deprecated Use `subtitle` instead. Alias kept for backwards compatibility. */
		subtitleProp: {
			type: String,
			default: '',
		},
		/** Base API URL for OpenRegister */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},
		/**
		 * Whether to auto-subscribe to live updates for the
		 * current object. Defaults to true. The sidebar calls
		 * `objectStore.subscribe(objectType, objectId)` on mount and
		 * unsubscribes on unmount via `tryOnScopeDispose`.
		 *
		 * @type {boolean}
		 */
		subscribe: {
			type: Boolean,
			default: true,
		},
		/**
		 * Optional explicit Pinia store instance. When omitted,
		 * the sidebar skips auto-subscribe (Pinia not yet active
		 * in the consumer context).
		 *
		 * @type {object|null}
		 */
		objectStore: {
			type: Object,
			default: null,
		},

		// --- Pre-translated labels ---
		/** Label for the Files tab */
		filesLabel: { type: String, default: () => t('nextcloud-vue', 'Files') },
		/** Label for the Notes tab */
		notesLabel: { type: String, default: () => t('nextcloud-vue', 'Notes') },
		/** Label for the Tags tab */
		tagsLabel: { type: String, default: () => t('nextcloud-vue', 'Tags') },
		/** Label for the Tasks tab */
		tasksLabel: { type: String, default: () => t('nextcloud-vue', 'Tasks') },
		/** Label for the Audit Trail tab */
		auditTrailLabel: { type: String, default: () => t('nextcloud-vue', 'Audit trail') },

		/**
		 * Open-enum tab definitions. When provided with at least one
		 * entry, REPLACES the hard-coded built-in tabs (Files, Notes,
		 * Tags, Tasks, Audit Trail). When unset (the default), the
		 * built-in tabs render as today.
		 *
		 * Each entry shape:
		 * - `id` (string, required) — unique tab id, used for active-tab tracking.
		 * - `label` (string, required) — tab display label (caller-resolved i18n).
		 * - `icon` (string, optional) — MDI icon name resolved via CnIcon.
		 * - `widgets` (array, optional) — list of widget specs `{ type, props? }`
		 *   to render inside the tab. Built-in types: `data` → CnObjectDataWidget,
		 *   `metadata` → CnObjectMetadataWidget, `audit` / `audit-trail` →
		 *   CnAuditTrailTab, `object-table` → CnWidgetObjectTable (a declarative
		 *   list scoped to the parent object via `@objectId` / `@object.<field>`
		 *   filter tokens). Any other `type` resolves against the customComponents
		 *   registry.
		 * - `component` (string, optional) — name resolved against the
		 *   customComponents registry. Mutually exclusive with `widgets`
		 *   (when both are set, `component` wins and a console.warn is logged).
		 * - `order` (number, optional) — explicit order; defaults to array index + 1.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, widgets?: Array<{ type: string, props?: object }>, component?: string, order?: number }>|null}
		 */
		tabs: {
			type: Array,
			default: null,
		},

		/**
		 * Custom-component registry. Keys are names referenced by
		 * `tabs[].component` and unknown `tabs[].widgets[].type` values.
		 * Falls back to the injected `cnCustomComponents` from a
		 * CnAppRoot ancestor when omitted.
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},

		/**
		 * Externally-requested active tab id. When set to a non-null id,
		 * the sidebar switches to that tab — lets a host deep-link into a
		 * specific leaf (e.g. a "Linked apps" row on the detail page that
		 * opens the Mails tab). Leave null for normal internal tracking.
		 */
		requestedTab: {
			type: String,
			default: null,
		},
	},

	emits: [
		'update:open',
		/**
		 * Forwarded unchanged from the built-in CnNotesTab after a note with
		 * at least one `@mention` was saved. Payload:
		 * `{ objectId, register, schema, noteId, mentionedUserIds }`.
		 */
		'mention',
	],

	setup(props) {
		const exposed = {}
		// Integration registry: on by default via the `useRegistry`
		// prop (ADR-019). We always wire the composable up so consumers
		// can toggle `useRegistry` reactively without a remount.
		const { integrations: registryIntegrations, resolveWidget, resolveTab } = useIntegrationRegistry()
		exposed.registryIntegrations = registryIntegrations
		exposed.resolveRegistryWidget = resolveWidget
		// `resolveTab` is local-first (LIB_INTEGRATION_COMPONENTS) so the
		// dispatched sidebar tab component is bound to this rendering
		// bundle's Vue — sidesteps the dual-runtime ADR-019 trap that
		// surfaced as `useNcFormBox(...)` undefined on cross-bundle
		// registrations. See openregister#1958.
		exposed.resolveRegistryTabComponent = resolveTab

		// Object token context for sidebar-tab widgets that resolve `@objectId` /
		// `@object.<field>` tokens — the `object-table` built-in in particular
		// (e.g. a detail page's ZGW relation tab listing a zaak's besluiten,
		// filtered by `{ zaak: "@objectId" }`). Mirrors the reactive
		// `{ objectId, object, register, schema }` ref CnDetailPage provides.
		//
		// Provided ONLY when no ancestor already supplies `cnObjectContext`, so
		// a CnDetailPage parent's richer context (which carries the loaded
		// `object` for `@object.<field>`) keeps flowing through to the tab
		// widgets unchanged. When the sidebar is mounted standalone (no detail
		// page ancestor) it seeds the context from its own props — enough for
		// `@objectId` + register/schema resolution.
		const parentObjectContext = inject('cnObjectContext', null)
		if (!parentObjectContext) {
			const cnObjectContext = ref({
				objectId: props.objectId || null,
				object: null,
				register: props.register || '',
				schema: props.schema || '',
			})
			provide('cnObjectContext', cnObjectContext)
			watch(
				() => [props.objectId, props.register, props.schema],
				() => {
					cnObjectContext.value = {
						objectId: props.objectId || null,
						object: cnObjectContext.value.object || null,
						register: props.register || '',
						schema: props.schema || '',
					}
				},
			)
		}

		// Auto-subscribe to live updates for the active object. No-op
		// when `objectStore` is null (no Pinia active) or when the
		// consumer disabled it via `subscribe: false`. The
		// composable's reactive `id` argument keeps the subscription
		// in sync as the user navigates between sidebar objects.
		if (props.objectStore && props.subscribe) {
			useObjectSubscription(
				props.objectStore,
				() => props.objectType,
				() => props.objectId,
				{ enabled: () => Boolean(props.objectType && props.objectId) },
			)
		}
		return exposed
	},

	data() {
		return {
			activeTab: this.requestedTab || this.computeInitialActiveTab(),
		}
	},

	computed: {
		sidebarTitle() {
			return this.title || this.objectType || 'Details'
		},
		sidebarSubtitle() {
			return this.subtitle || this.subtitleProp || ''
		},
		/** Whether the consumer has supplied a custom `tabs` array. */
		hasCustomTabs() {
			return Array.isArray(this.tabs) && this.tabs.length > 0
		},
		/**
		 * Whether registry mode is active. Custom `tabs` always wins
		 * (with a warning at mount) so consumers don't get a surprise
		 * mode switch.
		 */
		isRegistryMode() {
			return this.useRegistry === true && this.hasCustomTabs === false
		},
		/**
		 * Filtered registry snapshot: drops providers whose id is in
		 * `excludeIntegrations` or `hiddenTabs`. Stays reactive on
		 * the underlying registry's `onChange` notifications.
		 */
		filteredRegistryIntegrations() {
			const excluded = new Set([
				...(this.excludeIntegrations || []),
				...(this.hiddenTabs || []),
			])
			const all = this.registryIntegrations || []
			return all.filter((p) => excluded.has(p.id) === false)
		},
		/** Effective customComponents registry: prop wins, inject fallback. */
		effectiveCustomComponents() {
			return this.customComponents || this.cnCustomComponents || {}
		},
		/**
		 * Effective v2 component registry (ADR-036). Kind-tagged entries
		 * keyed by component name. Consulted by `resolveTabComponent` so a
		 * tab's `component` ref resolves against the registry as well as the
		 * legacy `customComponents` map.
		 */
		effectiveRegistry() {
			return this.cnRegistry || {}
		},
		/**
		 * Shared object context forwarded to every widget / component
		 * mounted inside a custom tab — same context the built-in tabs
		 * receive today.
		 */
		sharedTabProps() {
			return {
				objectId: this.objectId,
				objectType: this.objectType,
				register: this.register,
				schema: this.schema,
				apiBase: this.apiBase,
			}
		},
		/**
		 * Context forwarded to a mount-mode leaf's `mount(el, props)` for the
		 * single-entity sidebar surface — the same shape an SFC tab receives,
		 * plus the `surface` name and an `integrationContext` bag. Reactive
		 * on the object identity so CnLeafMountHost re-mounts on object change.
		 */
		sidebarMountProps() {
			return {
				...this.sharedTabProps,
				surface: 'single-entity',
				integrationContext: {
					register: this.register,
					schema: this.schema,
					objectId: this.objectId,
				},
			}
		},
	},

	watch: {
		tabs: {
			immediate: false,
			handler() {
				// Re-anchor activeTab when the tab set changes so the
				// active id stays valid (otherwise NcAppSidebar shows no
				// active tab when the consumer swaps in a fresh array).
				this.activeTab = this.requestedTab || this.computeInitialActiveTab()
			},
		},
		requestedTab(id) {
			// Host deep-link: switch to the requested tab when it changes.
			if (id) this.activeTab = id
		},
	},

	mounted() {
		if (this.useRegistry === true && this.hasCustomTabs === true) {
			// eslint-disable-next-line no-console
			console.warn('[CnObjectSidebar] `useRegistry` is true but `tabs` is also set — falling back to `tabs` (registry mode ignored). Pass one or the other.')
		}
	},

	methods: {
		isTabHidden(tabId) {
			return this.hiddenTabs.includes(tabId)
		},

		/**
		 * Resolve a registry provider's tab component, preferring the
		 * LOCAL lib-owned component (rendering-bundle Vue) over the
		 * shared registry's stored object. Falls back to the stored
		 * `provider.tab` for consumer-custom ids (which live in the
		 * consumer's own bundle and therefore render under the same
		 * Vue instance with no mismatch). See openregister#1958.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {object|null} Vue component, or null.
		 */
		resolveRegistryTab(provider) {
			if (!provider || typeof provider.id !== 'string') {
				return null
			}
			const local = this.resolveRegistryTabComponent(provider.id)
			if (local) {
				return local
			}
			return provider.tab || null
		},

		/**
		 * Whether a registry provider renders via the mount hand-off
		 * (`renderMode: 'mount'`, openregister#2127) rather than an SFC tab.
		 * Mount-mode leaves carry `mount`/`unmount` functions the host calls
		 * against a bare element via CnLeafMountHost.
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {boolean} true when the provider is mount-mode.
		 */
		isMountProvider(provider) {
			return Boolean(provider)
				&& provider.renderMode === 'mount'
				&& typeof provider.mount === 'function'
				&& typeof provider.unmount === 'function'
		},

		/**
		 * Pick a sensible default active tab on mount and on tabs[]
		 * changes. When custom tabs are present, the first entry wins.
		 * When unset, the built-in `files` tab is the default (matches
		 * the legacy behavior).
		 */
		computeInitialActiveTab() {
			if (Array.isArray(this.tabs) && this.tabs.length > 0) {
				return this.tabs[0].id
			}
			return 'files'
		},

		/**
		 * Resolve a widget type to a component. Built-in types (`data`,
		 * `metadata`, `audit` / `audit-trail`, `object-table`) map to their
		 * lib component; any other type falls back to the customComponents
		 * registry. Logs a console.warn and returns null when nothing
		 * resolves.
		 *
		 * @param {string} type Widget type identifier
		 * @return {object|null} Vue component, or null when unresolved
		 */
		resolveWidgetComponent(type) {
			if (BUILTIN_WIDGETS[type]) return BUILTIN_WIDGETS[type]
			const reg = this.effectiveCustomComponents
			if (reg && reg[type]) return reg[type]
			// eslint-disable-next-line no-console
			console.warn(`[CnObjectSidebar] Unknown widget type "${type}" — not in built-ins (data, metadata, audit, audit-trail, object-table) and not in customComponents registry.`)
			return null
		},

		/**
		 * Resolve a tab's `component` registry name. Logs a
		 * console.warn when both `widgets` and `component` are set
		 * (component wins) or when the registry name is missing.
		 *
		 * @param {object} tab Tab definition
		 * @return {object|null} Vue component, or null when unresolved
		 */
		resolveTabComponent(tab) {
			if (tab.widgets && tab.widgets.length > 0) {
				// eslint-disable-next-line no-console
				console.warn(`[CnObjectSidebar] Tab "${tab.id}" declares both widgets[] and component — component wins, widgets are ignored.`)
			}
			// v2 registry first (ADR-036): any kind-tagged entry with a
			// `component` field is acceptable for a slot/tab lookup — this
			// is what lets a `kind: 'page'` tab component (the procest
			// pattern) render. Fall back to the legacy customComponents map.
			const registryEntry = this.effectiveRegistry[tab.component]
			if (registryEntry && registryEntry.component) {
				return registryEntry.component
			}
			const reg = this.effectiveCustomComponents
			const resolved = reg && reg[tab.component]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(`[CnObjectSidebar] Tab "${tab.id}" component "${tab.component}" not found in registry or customComponents.`)
				return null
			}
			return resolved
		},
	},
}
</script>

<style scoped>
/* NcAppSidebar lays every tab out as an equal share of the sidebar width
 * (`flex: 1 1`) with an ellipsis caption, so an object with many tabs — e.g. a
 * lead's 5+ tabs — shrinks them until the labels truncate. Keep the tabs
 * equal-width (uniform) but stop them shrinking below a readable minimum, and
 * let the strip scroll horizontally once they no longer fit. `flex-basis: 0`
 * + equal grow keeps every tab the same width whether the row fits or scrolls.
 * Apps with longer labels can widen the floor via --cn-sidebar-tab-min-width. */
:deep(.app-sidebar-tabs__nav) {
	overflow-x: auto;
}

:deep(.app-sidebar-tabs__nav .app-sidebar-tabs__tab) {
	flex-grow: 1;
	flex-shrink: 0;
	flex-basis: 0;
	/* !important to beat NcAppSidebar's own min-width on the button variant. */
	min-width: var(--cn-sidebar-tab-min-width, 7rem) !important;
}
</style>
