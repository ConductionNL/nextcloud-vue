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
				<component
					:is="resolveRegistryTab(provider)"
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
					<CnNotesTab
						:object-id="objectId"
						:register="register"
						:schema="schema"
						:api-base="apiBase" />
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
		     `metadata` → CnObjectMetadataWidget — with the customComponents
		     registry as the escape hatch) OR `component` (resolved against
		     the customComponents registry directly). -->
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
import { CnObjectDataWidget } from '../CnObjectDataWidget/index.js'
import { CnObjectMetadataWidget } from '../CnObjectMetadataWidget/index.js'

/**
 * Built-in widget registry used by the open-enum `tabs` prop.
 * - `data`     → CnObjectDataWidget (schema-driven editable grid)
 * - `metadata` → CnObjectMetadataWidget (read-only system metadata)
 *
 * Any `widgets[].type` value not in this map falls back to the
 * customComponents registry (prop, then injected `cnCustomComponents`).
 */
const BUILTIN_WIDGETS = {
	data: CnObjectDataWidget,
	metadata: CnObjectMetadataWidget,
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
	},

	inject: {
		cnCustomComponents: { default: () => ({}) },
	},

	setup(props) {
		const exposed = {}
		// Integration registry: opt-in via `useRegistry` prop. We
		// always wire the composable up so consumers can toggle
		// `useRegistry` reactively without a remount.
		const { integrations: registryIntegrations, resolveWidget } = useIntegrationRegistry()
		exposed.registryIntegrations = registryIntegrations
		exposed.resolveRegistryWidget = resolveWidget

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
		 * Opt into the pluggable integration registry. When `true`,
		 * the hardcoded built-in tabs are replaced by one tab per
		 * provider registered on `window.OCA.OpenRegister.integrations`
		 * (and via `useIntegrationRegistry()`). Slot overrides
		 * `#tab-<id>` and `hiddenTabs` / `excludeIntegrations` still
		 * apply.
		 *
		 * Mutually exclusive with the open-enum `tabs` prop — when
		 * both are set, `tabs` wins and a console.warn is logged.
		 *
		 * @type {boolean}
		 */
		useRegistry: {
			type: Boolean,
			default: false,
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
		/** @deprecated Use subtitle instead */
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
		filesLabel: { type: String, default: () => t('nextcloud-vue', 'Files') },
		notesLabel: { type: String, default: () => t('nextcloud-vue', 'Notes') },
		tagsLabel: { type: String, default: () => t('nextcloud-vue', 'Tags') },
		tasksLabel: { type: String, default: () => t('nextcloud-vue', 'Tasks') },
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
		 *   `metadata` → CnObjectMetadataWidget. Any other `type` resolves
		 *   against the customComponents registry.
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
	},

	emits: ['update:open'],

	data() {
		return {
			activeTab: this.computeInitialActiveTab(),
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
	},

	watch: {
		tabs: {
			immediate: false,
			handler() {
				// Re-anchor activeTab when the tab set changes so the
				// active id stays valid (otherwise NcAppSidebar shows no
				// active tab when the consumer swaps in a fresh array).
				this.activeTab = this.computeInitialActiveTab()
			},
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
		 * Resolve a registry provider's tab component. Returns the
		 * registered `tab` Vue component, or null when the provider is
		 * malformed (the parity gate normally prevents this, but
		 * third-party registrations might slip through).
		 *
		 * @param {object} provider Normalised registry entry.
		 * @return {object|null} Vue component, or null.
		 */
		resolveRegistryTab(provider) {
			if (provider && provider.tab) {
				return provider.tab
			}
			return null
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
		 * Resolve a widget type to a component. Built-in types
		 * (`data`, `metadata`) map to CnObjectDataWidget /
		 * CnObjectMetadataWidget. Any other type falls back to the
		 * customComponents registry. Logs a console.warn and returns
		 * null when nothing resolves.
		 *
		 * @param {string} type Widget type identifier
		 * @return {object|null} Vue component, or null when unresolved
		 */
		resolveWidgetComponent(type) {
			if (BUILTIN_WIDGETS[type]) return BUILTIN_WIDGETS[type]
			const reg = this.effectiveCustomComponents
			if (reg && reg[type]) return reg[type]
			// eslint-disable-next-line no-console
			console.warn(`[CnObjectSidebar] Unknown widget type "${type}" — not in built-ins (data, metadata) and not in customComponents registry.`)
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
			const reg = this.effectiveCustomComponents
			const resolved = reg && reg[tab.component]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(`[CnObjectSidebar] Tab "${tab.id}" component "${tab.component}" not found in customComponents registry.`)
				return null
			}
			return resolved
		},
	},
}
</script>
