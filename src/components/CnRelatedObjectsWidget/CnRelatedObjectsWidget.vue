<!--
  CnRelatedObjectsWidget — Everything linked to an object, in one widget.

  Two rendering modes share the CnWidgetWrapper chrome:

  • Tabbed self-fetch (default, `layout="tabs"`) — when an object's
    register/schema/id can be resolved (from props or `objectData['@self']`),
    the widget calls OpenRegister directly:
      /relations (notes, tasks, mails, events, contacts, deck), /uses + /used
      (merged into Objects), /files — and renders one TAB per non-empty group
    with a count badge, showing the items inline. Each leaf tab carries an
    "open in sidebar" affordance that emits `open-integration` without
    replacing the inline content.

  • Legacy list (`layout="list"`, or when register/schema can't be resolved) —
    the original flat sections driven by the object store's
    fetchUses/fetchUsed/fetchContracts/fetchFiles actions plus the static
    leaf-integration "Linked apps" list. This path is deprecated; it warns once.

  Sits on the CnWidgetWrapper chrome, so it carries the shared overflow
  Actions menu (Refresh / Documentation / Request a feature). Refresh
  refetches every section.
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:widget-id="widgetId || objectType"
		:documentation-url="documentationUrl"
		:refreshing="loading"
		flush>
		<!-- Total beside the card title. Carries the count that the tab strip
		     would otherwise show — notably when `hideSingleTabTitle` hid it. -->
		<template v-if="useTabs && showTotalCount && totalCount > 0" #title-meta>
			<span class="cn-related-objects-widget__count">{{ totalCount }}</span>
		</template>

		<div class="cn-related-objects-widget">
			<!-- Tabbed self-fetch mode -->
			<template v-if="useTabs">
				<div v-if="tabStripVisible" class="cn-related-objects-widget__tabs" role="tablist">
					<button v-for="group in visibleGroups"
						:key="`tab-${group.key}`"
						type="button"
						role="tab"
						:aria-selected="String(group.key === activeKey)"
						:class="['cn-related-objects-widget__tab', { 'cn-related-objects-widget__tab--active': group.key === activeKey }]"
						@click="activeKey = group.key">
						<CnIcon :name="group.icon" :size="18" class="cn-related-objects-widget__tab-icon" />
						<span class="cn-related-objects-widget__tab-label">{{ group.label }}</span>
						<span class="cn-related-objects-widget__count">{{ group.total }}</span>
					</button>
				</div>

				<section v-if="activeGroup" class="cn-related-objects-widget__panel" role="tabpanel">
					<ul class="cn-related-objects-widget__list">
						<li v-for="(item, i) in activeGroup.items"
							:key="`item-${activeGroup.key}-${item.id || i}`"
							class="cn-related-objects-widget__row"
							:class="{ 'cn-related-objects-widget__row--expanded': isExpanded(activeGroup.key, item) }"
							tabindex="0"
							role="button"
							@click="onSelectGroupItem(activeGroup, item)"
							@keydown.enter="onSelectGroupItem(activeGroup, item)">
							<CnIcon :name="activeGroup.icon" :size="20" class="cn-related-objects-widget__icon" />
							<span class="cn-related-objects-widget__label">{{ item.label }}</span>
							<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
							<p v-if="item.detail && isExpanded(activeGroup.key, item)"
								class="cn-related-objects-widget__detail">
								{{ item.detail }}
							</p>
						</li>
					</ul>
				</section>

				<div v-if="loading && !visibleGroups.length" class="cn-related-objects-widget__empty">
					{{ loadingLabel }}
				</div>
				<NcEmptyContent v-else-if="hasLoaded && !visibleGroups.length"
					class="cn-related-objects-widget__empty-state"
					:name="resolvedEmptyLabel">
					<template #icon>
						<CnIcon :name="emptyIconName" :size="48" />
					</template>
				</NcEmptyContent>
			</template>

			<!-- Legacy list mode (deprecated) -->
			<template v-else>
				<!-- Objects -->
				<section v-if="showObjects && objectItems.length" class="cn-related-objects-widget__group">
					<h4 class="cn-related-objects-widget__group-title">
						{{ objectsLabel }} <span class="cn-related-objects-widget__count">{{ objectItems.length }}</span>
					</h4>
					<ul class="cn-related-objects-widget__list">
						<li v-for="item in objectItems"
							:key="`obj-${item.id}`"
							class="cn-related-objects-widget__row"
							tabindex="0"
							role="button"
							@click="onSelectObject(item.raw)"
							@keydown.enter="onSelectObject(item.raw)">
							<FileTreeOutline class="cn-related-objects-widget__icon" :size="20" />
							<span class="cn-related-objects-widget__label">{{ item.label }}</span>
							<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
						</li>
					</ul>
				</section>

				<!-- Files -->
				<section v-if="showFiles && fileItems.length" class="cn-related-objects-widget__group">
					<h4 class="cn-related-objects-widget__group-title">
						{{ filesLabel }} <span class="cn-related-objects-widget__count">{{ fileItems.length }}</span>
					</h4>
					<ul class="cn-related-objects-widget__list">
						<li v-for="item in fileItems"
							:key="`file-${item.id}`"
							class="cn-related-objects-widget__row"
							tabindex="0"
							role="button"
							@click="onSelectFile(item.raw)"
							@keydown.enter="onSelectFile(item.raw)">
							<Paperclip class="cn-related-objects-widget__icon" :size="20" />
							<span class="cn-related-objects-widget__label">{{ item.label }}</span>
							<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
						</li>
					</ul>
				</section>

				<!-- Host-supplied extra sections (e.g. mails resolved by a leaf) -->
				<section v-for="section in extraSections"
					:key="`extra-${section.key}`"
					class="cn-related-objects-widget__group">
					<h4 v-if="(section.items || []).length" class="cn-related-objects-widget__group-title">
						{{ section.label }} <span class="cn-related-objects-widget__count">{{ section.items.length }}</span>
					</h4>
					<ul v-if="(section.items || []).length" class="cn-related-objects-widget__list">
						<li v-for="(item, i) in section.items"
							:key="`extra-${section.key}-${i}`"
							class="cn-related-objects-widget__row"
							tabindex="0"
							role="button"
							@click="onSelectExtra(section.key, item)"
							@keydown.enter="onSelectExtra(section.key, item)">
							<CnIcon v-if="section.icon"
								:name="section.icon"
								:size="20"
								class="cn-related-objects-widget__icon" />
							<span class="cn-related-objects-widget__label">{{ item.label || item.title || item.name }}</span>
						</li>
					</ul>
				</section>

				<!-- Linked apps — leaf integrations carrying related content -->
				<section v-if="showIntegrations && linkedApps.length" class="cn-related-objects-widget__group">
					<h4 class="cn-related-objects-widget__group-title">
						{{ linkedAppsLabel }}
					</h4>
					<ul class="cn-related-objects-widget__list cn-related-objects-widget__list--apps">
						<li v-for="app in linkedApps"
							:key="`app-${app.id}`"
							class="cn-related-objects-widget__row cn-related-objects-widget__row--app"
							tabindex="0"
							role="button"
							@click="onOpenIntegration(app.id)"
							@keydown.enter="onOpenIntegration(app.id)">
							<CnIcon :name="app.icon || 'PuzzleOutline'" :size="20" class="cn-related-objects-widget__icon" />
							<span class="cn-related-objects-widget__label">{{ app.label }}</span>
							<ChevronRight class="cn-related-objects-widget__chevron" :size="20" />
						</li>
					</ul>
				</section>

				<!-- Empty -->
				<div v-if="loading && isEmpty" class="cn-related-objects-widget__empty">
					{{ loadingLabel }}
				</div>
				<NcEmptyContent v-else-if="hasLoaded && isEmpty"
					class="cn-related-objects-widget__empty-state"
					:name="resolvedEmptyLabel">
					<template #icon>
						<CnIcon :name="emptyIconName" :size="48" />
					</template>
				</NcEmptyContent>
			</template>
		</div>

		<!-- Add footer — lets the user actually create related content
		     (upload files, write notes) instead of only viewing it. Rendered
		     only on the tabbed self-fetch path (uploads need register/schema/id). -->
		<template v-if="addFooterVisible" #footer>
			<div class="cn-related-objects-widget__footer">
				<NcButton v-if="soleAddable && soleAddable.key === 'files'"
					type="secondary"
					:disabled="uploading"
					@click="openFilePicker">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ uploading ? t('nextcloud-vue', 'Uploading…') : addLabelFor(soleAddable) }}
				</NcButton>
				<NcActions v-else
					:menu-name="t('nextcloud-vue', 'Add')"
					type="secondary"
					:force-menu="true">
					<template #icon>
						<Plus :size="20" />
					</template>
					<NcActionButton v-if="groupAllowed('files')" :close-after-click="true" @click="openFilePicker">
						<template #icon>
							<Paperclip :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Upload file') }}
					</NcActionButton>
					<NcActionInput v-if="groupAllowed('notes')"
						:value="noteDraft"
						:label="t('nextcloud-vue', 'Add note')"
						@update:value="noteDraft = $event"
						@submit="onAddNote">
						<template #icon>
							<CnIcon name="CommentTextOutline" :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Add note') }}
					</NcActionInput>
					<NcActionButton v-for="group in emitAddableGroups"
						:key="`add-${group.key}`"
						:close-after-click="true"
						@click="onAddGroup(group.key)">
						<template #icon>
							<CnIcon :name="group.icon" :size="20" />
						</template>
						{{ addLabelFor(group) }}
					</NcActionButton>
				</NcActions>
				<span v-if="addError" class="cn-related-objects-widget__add-error">{{ addError }}</span>
				<input ref="fileInput"
					type="file"
					multiple
					class="cn-related-objects-widget__file-input"
					@change="onFilesPicked">
			</div>
		</template>
	</CnWidgetWrapper>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { NcActions, NcActionButton, NcActionInput, NcButton, NcEmptyContent } from '@nextcloud/vue'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { buildHeaders } from '../../utils/headers.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { useObjectStore } from '../../store/index.js'
import FileTreeOutline from 'vue-material-design-icons/FileTreeOutline.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import Plus from 'vue-material-design-icons/Plus.vue'

/** Event-bus channel CnWidgetWrapper's Refresh action broadcasts on. */
const REFRESH_BUS_CHANNEL = 'cn:widget:refresh'

/** Core sidebar tabs that are not "related content" leaves. */
const CORE_TABS = ['files', 'notes', 'tags', 'tasks', 'auditTrail', 'shares']

/** One-time guard so the legacy-path deprecation warning logs only once. */
let legacyWarned = false

/**
 * Leaf groups surfaced by the aggregated `/relations` endpoint, in tab order.
 * `responseKey` is the key in the `/relations` payload; `integrationId` is the
 * sidebar tab the "open in sidebar" affordance deep-links to.
 */
const LEAF_GROUPS = [
	{ key: 'mails', responseKey: 'emails', icon: 'Email', integrationId: 'email', requiredApp: 'mail' },
	{ key: 'events', responseKey: 'events', icon: 'Calendar', integrationId: 'calendar', requiredApp: 'calendar' },
	{ key: 'contacts', responseKey: 'contacts', icon: 'AccountBox', integrationId: 'contacts', requiredApp: 'contacts' },
	{ key: 'notes', responseKey: 'notes', icon: 'CommentTextOutline', integrationId: 'notes', requiredApp: '' },
	{ key: 'tasks', responseKey: 'tasks', icon: 'CheckboxMarkedOutline', integrationId: 'tasks', requiredApp: 'tasks' },
	{ key: 'deck', responseKey: 'deck', icon: 'ViewColumnOutline', integrationId: 'deck', requiredApp: 'deck' },
	// Additional pluggable leaf integrations — surfaced automatically when the
	// owning app is installed and the object has links (empty groups are hidden
	// by `visibleGroups`). Server side is wired in RelationsController::LEAF_INTEGRATIONS.
	{ key: 'talk', responseKey: 'talk', icon: 'Forum', integrationId: 'talk', requiredApp: 'spreed' },
	{ key: 'forms', responseKey: 'forms', icon: 'FormatListChecks', integrationId: 'forms', requiredApp: 'forms' },
	{ key: 'maps', responseKey: 'maps', icon: 'MapMarker', integrationId: 'maps', requiredApp: 'maps' },
	{ key: 'polls', responseKey: 'polls', icon: 'Poll', integrationId: 'polls', requiredApp: 'polls' },
	{ key: 'bookmarks', responseKey: 'bookmarks', icon: 'Bookmark', integrationId: 'bookmarks', requiredApp: 'bookmarks' },
	{ key: 'collectives', responseKey: 'collectives', icon: 'NotebookOutline', integrationId: 'collectives', requiredApp: 'collectives' },
	{ key: 'photos', responseKey: 'photos', icon: 'ImageMultiple', integrationId: 'photos', requiredApp: 'photos' },
	{ key: 'cospend', responseKey: 'cospend', icon: 'Cash', integrationId: 'cospend', requiredApp: 'cospend' },
	{ key: 'timetracker', responseKey: 'timetracker', icon: 'ClockOutline', integrationId: 'timetracker', requiredApp: 'timemanager' },
	{ key: 'analytics', responseKey: 'analytics', icon: 'ChartLine', integrationId: 'analytics', requiredApp: 'analytics' },
	{ key: 'flow', responseKey: 'flow', icon: 'Sitemap', integrationId: 'flow', requiredApp: '' },
	{ key: 'openproject', responseKey: 'openproject', icon: 'Briefcase', integrationId: 'openproject', requiredApp: 'integration_openproject' },
	{ key: 'xwiki', responseKey: 'xwiki', icon: 'BookOpenVariant', integrationId: 'xwiki', requiredApp: '' },
]

/**
 * CnRelatedObjectsWidget — Everything linked to an object, in one widget.
 *
 * In the default tabbed mode the widget resolves an object's
 * register/schema/id (from props or `objectData['@self']`) and fetches its
 * relations directly from OpenRegister — the aggregated `/relations` groups
 * (mails, meetings, contacts, notes, tasks, deck), `/uses` + `/used` (merged
 * into Objects) and `/files` — rendering one tab per non-empty group with a
 * count badge and the items inline. Each leaf tab offers an "open in sidebar"
 * affordance that emits `open-integration`.
 *
 * Passing `layout="list"` (or mounting without a resolvable register/schema)
 * falls back to the deprecated store-action path that renders flat sections
 * plus the static leaf-integration "Linked apps" list.
 *
 * ```vue
 * <CnRelatedObjectsWidget
 *   :object-data="lead"
 *   @select-object="openObject"
 *   @open-integration="openSidebarTab" />
 * ```
 */
export default {
	name: 'CnRelatedObjectsWidget',

	components: {
		CnWidgetWrapper,
		CnIcon,
		FileTreeOutline,
		Paperclip,
		ChevronRight,
		Plus,
		NcActions,
		NcActionButton,
		NcActionInput,
		NcButton,
		NcEmptyContent,
	},

	props: {
		/** Widget title shown in the header. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Related'),
		},
		/** The registered object type slug (used for legacy store fetches). */
		objectType: {
			type: String,
			default: '',
		},
		/** The object's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/** The object data — used to derive id/register/schema when not passed explicitly. */
		objectData: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * OpenRegister register slug. When omitted, derived from
		 * `objectData['@self'].register`. Required (with `schema`) for the
		 * tabbed self-fetch path.
		 */
		register: {
			type: String,
			default: '',
		},
		/**
		 * OpenRegister schema slug. When omitted, derived from
		 * `objectData['@self'].schema`. Required (with `register`) for the
		 * tabbed self-fetch path.
		 */
		schema: {
			type: String,
			default: '',
		},
		/**
		 * Render mode. `'tabs'` (default) self-fetches from OpenRegister and
		 * renders a tab per non-empty group. `'list'` forces the deprecated
		 * store-action list path.
		 * @type {'tabs'|'list'}
		 */
		layout: {
			type: String,
			default: 'tabs',
			validator: (value) => ['tabs', 'list'].includes(value),
		},
		/** Include `/contracts` relations in the Objects group (opt-in). */
		showContracts: {
			type: Boolean,
			default: false,
		},
		/**
		 * Whitelist of relation-group keys to display (tabbed path). When
		 * non-empty, ONLY these groups render — e.g. `['objects', 'files',
		 * 'mails']`. Empty (default) shows every non-empty group. Lets a detail
		 * page carry several Related widgets each scoped to different relations.
		 * Keys: `objects`, `files`, and the leaf groups (mails, events, contacts,
		 * notes, tasks, deck, talk, forms, maps, polls, …).
		 * @type {string[]}
		 */
		includeGroups: {
			type: Array,
			default: () => [],
		},
		/**
		 * Object store instance (legacy list path only). When omitted, the
		 * widget tries Pinia auto-detection. Relation/file sections only render
		 * when the store exposes the matching `fetch*` actions.
		 */
		store: {
			type: Object,
			default: null,
		},
		/** Show the related-objects (uses/used/contracts) section/tab. */
		showObjects: {
			type: Boolean,
			default: true,
		},
		/** Show the files section/tab. */
		showFiles: {
			type: Boolean,
			default: true,
		},
		/** Show the leaf-integration entry-point section (legacy list path). */
		showIntegrations: {
			type: Boolean,
			default: true,
		},
		/**
		 * Integration ids to omit from the "Linked apps" section (on top of
		 * the always-omitted core tabs files/notes/tags/tasks/audit/shares).
		 * @type {string[]}
		 */
		excludeIntegrations: {
			type: Array,
			default: () => [],
		},
		/**
		 * Extra related sections the store can't resolve generically (legacy
		 * list path). Each: `{ key, label, icon?, items: [] }`.
		 * @type {Array<{ key: string, label: string, icon?: string, items: object[] }>}
		 */
		extraSections: {
			type: Array,
			default: () => [],
		},
		/** Documentation link for the overflow Actions menu. */
		documentationUrl: {
			type: String,
			default: '',
		},
		/** Stable id forwarded to the widget chrome. Falls back to objectType. */
		widgetId: {
			type: String,
			default: '',
		},
		/** Section/tab heading for related objects. */
		objectsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Objects'),
		},
		/** Section/tab heading for files. */
		filesLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Files'),
		},
		/** Section heading for the leaf-integration entry points (legacy list path). */
		linkedAppsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Linked apps'),
		},
		/**
		 * Deprecated no-op label, kept for backward compatibility.
		 * @deprecated No longer rendered — tabbed mode deep-links each item to its
		 * owning Nextcloud app instead of offering an open-in-sidebar action.
		 */
		openInSidebarLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Open in sidebar'),
		},
		/**
		 * Empty-state label shown when nothing is related. When left at its
		 * default, a contextual label is derived instead: a widget scoped to a
		 * single relation group (`includeGroups: ['files']`) shows
		 * "No files yet", an unscoped one shows "No relations yet".
		 */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Nothing related yet'),
		},
		/**
		 * Render the "Add" footer (upload file / add note / per-group add
		 * events) on the tabbed self-fetch path. Disable for read-only hosts.
		 */
		showAddFooter: {
			type: Boolean,
			default: true,
		},
		/**
		 * Suppress the tab strip when only one group is visible. A lone tab
		 * repeats the widget title verbatim ("Files" card carrying a "Files"
		 * tab), so hide it and let the card header stand alone.
		 */
		hideSingleTabTitle: {
			type: Boolean,
			default: true,
		},
		/**
		 * Render a count pill beside the widget title totalling every visible
		 * group. Keeps the count reachable once `hideSingleTabTitle` has taken
		 * the sole tab — and its pill — away.
		 */
		showTotalCount: {
			type: Boolean,
			default: true,
		},
	},

	setup() {
		const { integrations, getById } = useIntegrationRegistry()
		return { integrations, getById }
	},

	data() {
		return {
			/** Whether any section/tab is currently fetching. */
			loading: false,
			/** True once the first fetch has completed (gates the empty state). */
			hasLoaded: false,
			/** Merged related-object rows (legacy list path). */
			objectItems: [],
			/** File rows (legacy list path). */
			fileItems: [],
			/** Tab groups (tabbed self-fetch path): `{ key, label, icon, integrationId, items, total }`. */
			groups: [],
			/** Active tab key. */
			activeKey: '',
			/** Key of the inline-expanded row (`{group}-{id}`) for leaves with no owning-app page (e.g. notes). */
			expandedKey: '',
			/** Whether a footer file upload is in flight. */
			uploading: false,
			/** Last add-footer error message (upload / note create). */
			addError: '',
			/** Bound text of the footer's "Add note" input. */
			noteDraft: '',
		}
	},

	computed: {
		/**
		 * The object-data record, guaranteed to be a plain object. The
		 * `object-data` prop is often `null` while the host's object is still
		 * loading (CnDetailPage binds `:object-data="currentObject"`), so guard
		 * it here — the resolver computeds below must never dereference null.
		 *
		 * @return {object} the object data, or an empty object.
		 */
		safeObjectData() {
			return (this.objectData && typeof this.objectData === 'object') ? this.objectData : {}
		},

		/** Resolved object id — explicit prop wins, else from object data. */
		resolvedId() {
			const self = this.safeObjectData['@self'] || {}
			return this.objectId || this.safeObjectData.id || self.id || ''
		},

		/** Resolved register slug — explicit prop wins, else from `@self`. */
		resolvedRegister() {
			const self = this.safeObjectData['@self'] || {}
			return this.register || self.register || ''
		},

		/** Resolved schema slug — explicit prop wins, else from `@self`. */
		resolvedSchema() {
			const self = this.safeObjectData['@self'] || {}
			return this.schema || self.schema || ''
		},

		/** True when the tabbed self-fetch path is usable. */
		useTabs() {
			return this.layout === 'tabs'
				&& Boolean(this.resolvedRegister && this.resolvedSchema && this.resolvedId)
		},

		/**
		 * Tab groups that have at least one item (tabbed path), honouring the
		 * `includeGroups` whitelist when set.
		 */
		visibleGroups() {
			const allow = Array.isArray(this.includeGroups) ? this.includeGroups : []
			return this.groups.filter((group) =>
				(group.total > 0 || group.items.length > 0)
				&& (allow.length === 0 || allow.includes(group.key)),
			)
		},

		/**
		 * Whether the tab strip renders. A single visible group makes the strip
		 * a restatement of the card header, so `hideSingleTabTitle` drops it.
		 *
		 * @return {boolean} true when the tab strip should be shown.
		 */
		tabStripVisible() {
			if (!this.visibleGroups.length) return false
			return !(this.hideSingleTabTitle && this.visibleGroups.length === 1)
		},

		/**
		 * Items across every visible group — rendered as a pill beside the
		 * widget title. Falls back to the loaded item count when a group
		 * reports no server-side total.
		 *
		 * @return {number} the summed total.
		 */
		totalCount() {
			return this.visibleGroups.reduce(
				(sum, group) => sum + (group.total || group.items.length || 0),
				0,
			)
		},

		/** Placeholder shown in the body while the first fetch is in flight. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},

		/** The currently active group, defaulting to the first visible one. */
		activeGroup() {
			if (!this.visibleGroups.length) return null
			return this.visibleGroups.find((group) => group.key === this.activeKey) || this.visibleGroups[0]
		},

		/** Leaf integrations that can carry related content (legacy list path). */
		linkedApps() {
			const omit = new Set([...CORE_TABS, ...this.excludeIntegrations])
			return (this.integrations || []).filter((entry) => !omit.has(entry.id))
		},

		/** True when every legacy section is empty. */
		isEmpty() {
			if (this.objectItems.length || this.fileItems.length) return false
			if (this.extraSections.some((s) => (s.items || []).length)) return false
			if (this.showIntegrations && this.linkedApps.length) return false
			return true
		},

		/** Single configured relation group key, or '' when unscoped/multi. */
		singleSourceKey() {
			const allow = Array.isArray(this.includeGroups) ? this.includeGroups : []
			return allow.length === 1 ? allow[0] : ''
		},

		/**
		 * Effective empty-state label: an explicit `emptyLabel` wins; otherwise
		 * a single-source widget names its source ("No files yet") and an
		 * unscoped/multi-source one shows the generic "No relations yet".
		 */
		resolvedEmptyLabel() {
			const legacyDefault = t('nextcloud-vue', 'Nothing related yet')
			if (this.emptyLabel && this.emptyLabel !== legacyDefault) return this.emptyLabel
			if (this.singleSourceKey) {
				return t('nextcloud-vue', 'No {source} yet', { source: this.groupLabelFor(this.singleSourceKey).toLowerCase() })
			}
			return t('nextcloud-vue', 'No relations yet')
		},

		/** Empty-state icon: the single source's own icon, else a generic link. */
		emptyIconName() {
			if (this.singleSourceKey) return this.groupIconFor(this.singleSourceKey)
			return 'LinkVariant'
		},

		/** Whether the Add footer renders (prop + tabbed path with a real object). */
		addFooterVisible() {
			return this.showAddFooter && this.useTabs && this.addableGroups.length > 0
		},

		/**
		 * Relation groups the footer can add to, honouring `includeGroups`
		 * and the show* switches. Files and notes have built-in flows; other
		 * groups surface an entry that emits `add` for the host to handle.
		 */
		addableGroups() {
			const candidates = [
				...(this.showObjects ? [{ key: 'objects', label: this.objectsLabel, icon: 'FileTreeOutline' }] : []),
				...(this.showFiles ? [{ key: 'files', label: this.filesLabel, icon: 'Paperclip' }] : []),
				...LEAF_GROUPS.map((def) => ({ key: def.key, label: this.leafLabel(def.key), icon: def.icon })),
			]
			const allow = Array.isArray(this.includeGroups) ? this.includeGroups : []
			if (allow.length === 0) {
				// Unscoped widgets keep the footer focused on the two built-in
				// flows instead of listing every conceivable leaf group.
				return candidates.filter((g) => ['files', 'notes'].includes(g.key))
			}
			return candidates.filter((g) => allow.includes(g.key))
		},

		/** The only addable group when exactly one is configured, else null. */
		soleAddable() {
			return this.addableGroups.length === 1 ? this.addableGroups[0] : null
		},

		/** Addable groups without a built-in flow — rendered as emit-`add` entries. */
		emitAddableGroups() {
			return this.addableGroups.filter((g) => !['files', 'notes'].includes(g.key))
		},
	},

	watch: {
		resolvedId() {
			this.loadAll()
		},
	},

	mounted() {
		this.loadAll()
		subscribe(REFRESH_BUS_CHANNEL, this.onBusRefresh)
	},

	beforeUnmount() {
		unsubscribe(REFRESH_BUS_CHANNEL, this.onBusRefresh)
	},

	methods: {
		t,

		/**
		 * Display label for a relation group key.
		 * @param {string} key - Group key (`objects`, `files`, or a leaf key).
		 * @return {string}
		 */
		groupLabelFor(key) {
			if (key === 'objects') return this.objectsLabel
			if (key === 'files') return this.filesLabel
			return this.leafLabel(key)
		},

		/**
		 * Icon name for a relation group key.
		 * @param {string} key - Group key.
		 * @return {string}
		 */
		groupIconFor(key) {
			if (key === 'objects') return 'FileTreeOutline'
			if (key === 'files') return 'Paperclip'
			const def = LEAF_GROUPS.find((g) => g.key === key)
			return (def && (this.integrationIcon(def.integrationId) || def.icon)) || 'LinkVariant'
		},

		/**
		 * Whether a group is available to the Add footer.
		 * @param {string} key - Group key.
		 * @return {boolean}
		 */
		groupAllowed(key) {
			return this.addableGroups.some((g) => g.key === key)
		},

		/**
		 * "Add …" label for a group entry.
		 * @param {{ key: string, label: string }} group - The addable group.
		 * @return {string}
		 */
		addLabelFor(group) {
			return t('nextcloud-vue', 'Add {source}', { source: String(group.label || group.key).toLowerCase() })
		},

		/** Open the hidden file input for the footer upload flow. */
		openFilePicker() {
			this.addError = ''
			if (this.$refs.fileInput) this.$refs.fileInput.click()
		},

		/**
		 * Upload the picked files to the object and refresh the groups.
		 * @param {Event} event - The file input change event.
		 * @return {Promise<void>}
		 */
		async onFilesPicked(event) {
			const files = Array.from((event.target && event.target.files) || [])
			event.target.value = ''
			if (!files.length || this.uploading) return
			this.uploading = true
			this.addError = ''
			try {
				const formData = new FormData()
				files.forEach((file) => formData.append('files[]', file))
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/filesMultipart', {
					register: this.resolvedRegister,
					schema: this.resolvedSchema,
					id: this.resolvedId,
				})
				// buildHeaders(null): let the browser set the multipart boundary.
				const response = await fetch(url, { method: 'POST', headers: buildHeaders(null), body: formData })
				if (!response.ok) throw new Error(`${response.status}`)
				/**
				 * @event file-uploaded Files were uploaded via the Add footer.
				 * @type {File[]}
				 */
				this.$emit('file-uploaded', files)
				await this.loadAll()
			} catch (e) {
				this.addError = t('nextcloud-vue', 'Upload failed')
			} finally {
				this.uploading = false
			}
		},

		/**
		 * Create a note on the object from the footer's note input.
		 *
		 * Reads `noteDraft` rather than the submitted form: NcActionInput's
		 * input carries no `name`, so a FormData lookup always comes back null
		 * and the note is silently dropped.
		 *
		 * @return {Promise<void>}
		 */
		async onAddNote() {
			const message = String(this.noteDraft || '').trim()
			if (!message) return
			this.addError = ''
			try {
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/notes', {
					register: this.resolvedRegister,
					schema: this.resolvedSchema,
					id: this.resolvedId,
				})
				const response = await fetch(url, {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify({ message }),
				})
				if (!response.ok) throw new Error(`${response.status}`)
				this.noteDraft = ''
				/**
				 * @event note-added A note was created via the Add footer.
				 * @type {string}
				 */
				this.$emit('note-added', message)
				await this.loadAll()
			} catch (e) {
				this.addError = t('nextcloud-vue', 'Could not add note')
			}
		},

		/**
		 * Emit the add request for groups without a built-in flow.
		 * @param {string} key - The group key (objects, mails, events, …).
		 */
		onAddGroup(key) {
			/**
			 * @event add An Add-footer entry without a built-in flow was
			 * activated; the host routes it (e.g. open a link-object dialog).
			 * @type {string}
			 */
			this.$emit('add', key)
		},

		/**
		 * Emit the related-object selection for the host to route.
		 * @param {object} raw - The related object record.
		 */
		onSelectObject(raw) {
			/**
			 * @event select-object A related-object row was clicked.
			 * @type {object}
			 */
			this.$emit('select-object', raw)
		},

		/**
		 * Emit the file selection for the host to route.
		 * @param {object} raw - The file record.
		 */
		onSelectFile(raw) {
			/**
			 * @event select-file A file row was clicked.
			 * @type {object}
			 */
			this.$emit('select-file', raw)
		},

		/**
		 * Handle a click in the tabbed path: deep-link to the item's owning
		 * Nextcloud app when a link can be resolved, otherwise emit a
		 * host-routed event. Related objects always route through the host
		 * (their owning app's detail page).
		 * @param {object} group - The active group descriptor.
		 * @param {object} item - The clicked, normalised row (`item.raw` is the record).
		 */
		onSelectGroupItem(group, item) {
			if (group.key === 'objects') {
				this.onSelectObject(item.raw)
				return
			}
			const href = this.resolveItemHref(group.key, item.raw)
			if (href) {
				window.open(href, '_blank', 'noopener,noreferrer')
				return
			}
			if (group.key === 'files') {
				this.onSelectFile(item.raw)
				return
			}
			// No owning-app page to deep-link to (e.g. notes are NC comments) —
			// toggle the body text inline so the click does something useful
			// instead of silently nothing.
			if (item.detail) {
				const key = `${group.key}-${item.id}`
				this.expandedKey = (this.expandedKey === key) ? '' : key
			}
			/**
			 * @event select-related A leaf-group row (mails, events, …) was clicked
			 * and no owning-app deep link could be resolved.
			 * @type {{ group: string, item: object }}
			 */
			this.$emit('select-related', { group: group.key, item: item.raw })
		},

		/**
		 * Whether a row is currently inline-expanded (no-deep-link leaves).
		 * @param {string} groupKey - The active group key.
		 * @param {object} item - The normalised row.
		 * @return {boolean}
		 */
		isExpanded(groupKey, item) {
			return this.expandedKey === `${groupKey}-${item.id}`
		},

		/**
		 * Resolve the owning-app deep link for a related item, or '' when none
		 * can be built (the caller then falls back to a host-routed event).
		 * @param {string} groupKey - The group key (files, contacts, deck, …).
		 * @param {object} raw - The leaf/file record.
		 * @return {string} A Nextcloud URL, or '' when unresolved.
		 */
		resolveItemHref(groupKey, raw) {
			// A record may carry its own absolute owning-app link.
			if (raw.url || raw.link || raw.accessUrl) {
				return raw.url || raw.link || raw.accessUrl
			}
			// Files → canonical Nextcloud file permalink (Files + Viewer).
			if (groupKey === 'files') {
				const fileid = raw.id || raw.fileid
				return fileid ? generateUrl('/f/{fileid}', { fileid: String(fileid) }) : ''
			}
			// Contacts → open the contact card in the Contacts app.
			if (groupKey === 'contacts' && raw.contactUid) {
				const key = raw.addressbookId != null ? `${raw.contactUid}~${raw.addressbookId}` : String(raw.contactUid)
				return generateUrl('/apps/contacts/All contacts/{key}', { key })
			}
			// Deck → open the card on its board.
			if (groupKey === 'deck' && raw.boardId && (raw.cardId || raw.id)) {
				return generateUrl('/apps/deck/board/{board}/card/{card}', { board: String(raw.boardId), card: String(raw.cardId || raw.id) })
			}
			// Tasks → open the task in the Tasks app.
			if (groupKey === 'tasks') {
				const cal = raw.calendarId || raw.calendarUri
				const task = raw.uri || raw.uid || raw.id
				if (cal && task) return generateUrl('/apps/tasks/#/calendars/{cal}/tasks/{task}', { cal: String(cal), task: String(task) })
			}
			// Meetings/events → open the event in the Calendar app (dav path, base64url).
			if (groupKey === 'events') {
				const cal = raw.calendarUri || raw.calendarId
				const ev = raw.uri || (raw.uid ? `${raw.uid}.ics` : '')
				if (cal && ev) {
					const token = btoa(`${cal}/${ev}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
					return generateUrl('/apps/calendar/edit/{token}', { token })
				}
			}
			// Mails → open the message in the Mail app.
			if (groupKey === 'mails' && (raw.messageId || raw.id)) {
				return generateUrl('/apps/mail/box/0/{id}', { id: String(raw.messageId || raw.id) })
			}
			return ''
		},

		/**
		 * The registered integration's icon name, or '' when not registered.
		 * @param {string} integrationId - The integration id.
		 * @return {string}
		 */
		integrationIcon(integrationId) {
			if (!integrationId || typeof this.getById !== 'function') return ''
			const entry = this.getById(integrationId)
			return (entry && entry.icon) || ''
		},

		/**
		 * Emit a click in a host-supplied extra section (legacy list path).
		 * @param {string} sectionKey - The section's key.
		 * @param {object} item - The clicked item.
		 */
		onSelectExtra(sectionKey, item) {
			/**
			 * @event select-extra A row in a host-supplied `extraSections`
			 * group was clicked.
			 * @type {{ section: string, item: object }}
			 */
			this.$emit('select-extra', { section: sectionKey, item })
		},

		/**
		 * Emit the leaf-integration open request for the host to route
		 * (the detail-page auto-body deep-links the sidebar tab).
		 * @param {string} integrationId - The leaf integration id.
		 */
		onOpenIntegration(integrationId) {
			/**
			 * @event open-integration A "Linked apps" row or a tab's
			 * "open in sidebar" affordance was activated.
			 * @type {string}
			 */
			this.$emit('open-integration', integrationId)
		},

		/**
		 * Build an OpenRegister object sub-resource URL.
		 * @param {string} suffix - The sub-resource (e.g. 'relations', 'uses', 'files').
		 * @return {string} The fully-qualified API URL.
		 */
		relatedUrl(suffix) {
			return generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/{suffix}', {
				register: this.resolvedRegister,
				schema: this.resolvedSchema,
				id: this.resolvedId,
				suffix,
			})
		},

		/**
		 * GET an OpenRegister sub-resource, returning the parsed JSON or null.
		 * @param {string} suffix - The sub-resource suffix.
		 * @return {Promise<object|null>}
		 */
		async fetchSubResource(suffix) {
			try {
				// `no-store`: relations change as the user links content; a stale
				// cached empty response would wrongly show the empty state on load.
				const response = await fetch(this.relatedUrl(suffix), { method: 'GET', headers: buildHeaders(), cache: 'no-store' })
				if (!response.ok) return null
				return await response.json()
			} catch {
				return null
			}
		},

		/**
		 * Resolve the object store: explicit prop first, then Pinia (legacy path).
		 * @return {object|null}
		 */
		getStore() {
			if (this.store) return this.store
			try {
				if (!this.$pinia) return null
				return useObjectStore()
			} catch {
				return null
			}
		},

		/**
		 * Normalise a related object into a display row.
		 * @param {object} raw - The related object record.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toObjectRow(raw) {
			const self = raw['@self'] || {}
			const id = raw.id || self.id || self.uuid || ''
			const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim())
			// Pick a human label. Skip `@self.name` when OpenRegister has fallen
			// back to the bare uuid (schemas with no configured name field), and
			// cover common display properties across schemas — including Dutch
			// ones (onderwerp, omschrijving, naam, titel) — before the schema/id.
			const label = [
				raw.title, raw.name, raw.displayName, raw.label,
				raw.onderwerp, raw.subject, raw.omschrijving, raw.naam, raw.titel,
				self.title, self.name, raw.summary, raw.description,
			].find((v) => typeof v === 'string' && v.trim() && !isUuid(v)) || self.schema || String(id)
			const meta = self.schema || raw.schema || ''
			return { id, label, meta: typeof meta === 'string' ? meta : '', raw }
		},

		/**
		 * Normalise a file record into a display row.
		 * @param {object} raw - The file record.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toFileRow(raw) {
			const id = raw.id || raw.fileid || raw.name || ''
			const label = raw.name || raw.title || raw.basename || String(id)
			const size = raw.size != null ? this.formatSize(raw.size) : ''
			return { id, label, meta: size, raw }
		},

		/**
		 * Normalise a leaf-relation record (mail, event, contact, …) into a row.
		 * @param {object} raw - The leaf record.
		 * @param {number} index - Position fallback for the id.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toLeafRow(raw, index) {
			const id = raw.id || raw.uuid || raw.uri || `leaf-${index}`
			// Leaf shapes vary by type: contacts use displayName, events/tasks use
			// summary, mails use subject, deck uses cardTitle, polls use question,
			// talk uses roomName, notes/comments use message — fall back through the
			// union of known title fields so no leaf renders its numeric link id.
			const label = raw.title || raw.cardTitle || raw.albumName || raw.displayName
				|| raw.fullName || raw.summary || raw.subject || raw.question || raw.roomName
				|| raw.projectName || raw.reportName || raw.name || raw.basename
				|| raw.message || raw.content || raw.label || String(id)
			const meta = raw.date || raw.linkedAt || raw.createdAt || ''
			// Body text for leaves that have no owning-app page (notes/comments) —
			// shown inline on click since there's nowhere to deep-link to.
			const detail = raw.content || raw.message || raw.description || raw.comment || ''
			return {
				id: String(id),
				label,
				meta: typeof meta === 'string' ? meta : '',
				detail: typeof detail === 'string' ? detail : '',
				raw,
			}
		},

		/**
		 * Human-readable byte size.
		 * @param {number} bytes - Raw byte count.
		 * @return {string}
		 */
		formatSize(bytes) {
			if (!Number.isFinite(bytes)) return ''
			const units = ['B', 'KB', 'MB', 'GB']
			let n = bytes
			let u = 0
			while (n >= 1024 && u < units.length - 1) { n /= 1024; u++ }
			return `${n.toFixed(u === 0 ? 0 : 1)} ${units[u]}`
		},

		/**
		 * Dispatch to the tabbed self-fetch or the legacy store path.
		 * @return {Promise<void>}
		 */
		async loadAll() {
			this.loading = true
			try {
				if (this.useTabs) {
					await this.loadTabs()
				} else {
					await this.loadViaStore()
				}
			} finally {
				this.loading = false
				this.hasLoaded = true
			}
		},

		/**
		 * Fetch every group directly from OpenRegister and build the tabs.
		 * @return {Promise<void>}
		 */
		async loadTabs() {
			this.loading = true
			try {
				const [relations, uses, used, contracts, files] = await Promise.all([
					this.fetchSubResource('relations'),
					this.showObjects ? this.fetchSubResource('uses') : null,
					this.showObjects ? this.fetchSubResource('used') : null,
					(this.showObjects && this.showContracts) ? this.fetchSubResource('contracts') : null,
					this.showFiles ? this.fetchSubResource('files') : null,
				])

				const groups = []

				if (this.showObjects) {
					const objectItems = this.mergeObjectResults([uses, used, contracts])
					groups.push({ key: 'objects', label: this.objectsLabel, icon: 'FileTreeOutline', integrationId: '', items: objectItems, total: objectItems.length })
				}

				if (this.showFiles) {
					const fileResults = (files && files.results) || []
					groups.push({ key: 'files', label: this.filesLabel, icon: 'Paperclip', integrationId: 'files', items: fileResults.map((f) => this.toFileRow(f)), total: files ? (files.total ?? fileResults.length) : 0 })
				}

				for (const def of LEAF_GROUPS) {
					const block = relations && relations[def.responseKey]
					const results = (block && block.results) || []
					groups.push({
						key: def.key,
						label: this.leafLabel(def.key),
						// Prefer the registered integration's icon so it matches the
						// sidebar/linked-apps; fall back to the known-good default.
						icon: this.integrationIcon(def.integrationId) || def.icon,
						integrationId: def.integrationId,
						requiredApp: def.requiredApp,
						items: results.map((r, i) => this.toLeafRow(r, i)),
						total: block ? (block.total ?? results.length) : 0,
					})
				}

				this.groups = groups
				if (!this.activeGroup && this.visibleGroups.length) {
					this.activeKey = this.visibleGroups[0].key
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Merge uses/used/contracts result envelopes into deduped object rows.
		 * @param {Array<object|null>} envelopes - The `{ results }` payloads.
		 * @return {Array<{ id: string, label: string, meta: string, raw: object }>}
		 */
		mergeObjectResults(envelopes) {
			const seen = new Set()
			const merged = []
			for (const envelope of envelopes) {
				for (const raw of ((envelope && envelope.results) || [])) {
					const row = this.toObjectRow(raw)
					const key = String(row.id)
					if (key && seen.has(key)) continue
					if (key) seen.add(key)
					merged.push(row)
				}
			}
			return merged
		},

		/**
		 * Translated label for a leaf group key.
		 * @param {string} key - The group key.
		 * @return {string}
		 */
		leafLabel(key) {
			const labels = {
				mails: t('nextcloud-vue', 'Mails'),
				events: t('nextcloud-vue', 'Meetings'),
				contacts: t('nextcloud-vue', 'Contacts'),
				notes: t('nextcloud-vue', 'Notes'),
				tasks: t('nextcloud-vue', 'Tasks'),
				deck: t('nextcloud-vue', 'Deck'),
				talk: t('nextcloud-vue', 'Talk'),
				forms: t('nextcloud-vue', 'Forms'),
				maps: t('nextcloud-vue', 'Maps'),
				polls: t('nextcloud-vue', 'Polls'),
				bookmarks: t('nextcloud-vue', 'Bookmarks'),
				collectives: t('nextcloud-vue', 'Collectives'),
				photos: t('nextcloud-vue', 'Photos'),
				cospend: t('nextcloud-vue', 'Cospend'),
				timetracker: t('nextcloud-vue', 'Time tracking'),
				analytics: t('nextcloud-vue', 'Analytics'),
				flow: t('nextcloud-vue', 'Flows'),
				openproject: t('nextcloud-vue', 'OpenProject'),
				xwiki: t('nextcloud-vue', 'Wiki'),
			}
			return labels[key] || key
		},

		/**
		 * Legacy store-action path: fetch relations/files from the object store.
		 * @return {Promise<void>}
		 */
		async loadViaStore() {
			if (!legacyWarned) {
				legacyWarned = true
				console.warn('[CnRelatedObjectsWidget] The store-action list path is deprecated; pass an object with `@self` (or register/schema props) to use the tabbed self-fetch path.')
			}

			const store = this.getStore()
			const type = this.objectType
			const id = this.resolvedId
			if (!store || !type || !id) {
				this.objectItems = []
				this.fileItems = []
				return
			}

			this.loading = true
			try {
				if (this.showObjects) {
					const calls = []
					if (typeof store.fetchUses === 'function') calls.push(store.fetchUses(type, id))
					if (typeof store.fetchUsed === 'function') calls.push(store.fetchUsed(type, id))
					if (typeof store.fetchContracts === 'function') calls.push(store.fetchContracts(type, id))
					const groups = await Promise.all(calls)
					const seen = new Set()
					const merged = []
					for (const group of groups) {
						for (const raw of (group || [])) {
							const row = this.toObjectRow(raw)
							const key = String(row.id)
							if (key && seen.has(key)) continue
							if (key) seen.add(key)
							merged.push(row)
						}
					}
					this.objectItems = merged
				}

				if (this.showFiles && typeof store.fetchFiles === 'function') {
					const files = await store.fetchFiles(type, id)
					this.fileItems = (files || []).map((f) => this.toFileRow(f))
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Refetch when the shared widget Refresh fires for this widget.
		 * @param {{ widgetId: string }} payload - Bus payload.
		 */
		onBusRefresh(payload) {
			const mine = this.widgetId || this.objectType
			if (!payload || !payload.widgetId || !mine || payload.widgetId === mine) {
				this.loadAll()
			}
		},
	},
}
</script>

<style scoped>
.cn-related-objects-widget__group {
	padding: calc(2 * var(--default-grid-baseline, 4px)) 0;
}

.cn-related-objects-widget__group + .cn-related-objects-widget__group {
	border-top: 1px solid var(--color-border);
}

.cn-related-objects-widget__group-title {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 4px;
	padding: 0 calc(2 * var(--default-grid-baseline, 4px));
	font-size: 0.8em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	padding: calc(1.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	border-bottom: 1px solid var(--color-border);
}

.cn-related-objects-widget__tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border: none;
	border-radius: var(--border-radius-pill, 16px);
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 0.9em;
}

.cn-related-objects-widget__tab:hover {
	background: var(--color-background-hover);
}

.cn-related-objects-widget__tab--active {
	background: var(--color-primary-element-light, var(--color-background-dark));
	color: var(--color-primary-element-light-text, var(--color-main-text));
}

.cn-related-objects-widget__tab:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-related-objects-widget__tab-icon {
	flex: 0 0 auto;
}

.cn-related-objects-widget__panel-actions {
	display: flex;
	justify-content: flex-end;
	padding: 4px calc(2 * var(--default-grid-baseline, 4px)) 0;
}

.cn-related-objects-widget__open-sidebar {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border: none;
	background: transparent;
	color: var(--color-primary-element);
	cursor: pointer;
	font-size: 0.85em;
}

.cn-related-objects-widget__open-sidebar:hover {
	text-decoration: underline;
}

.cn-related-objects-widget__count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border-radius: 9px;
	background: var(--color-background-dark);
	font-size: 0.9em;
	font-weight: 600;
}

.cn-related-objects-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-related-objects-widget__row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10px;
	padding: calc(1.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	cursor: pointer;
	border-radius: var(--border-radius);
}

.cn-related-objects-widget__detail {
	flex-basis: 100%;
	margin: 4px 0 0 calc(20px + 10px);
	padding: 8px 10px;
	font-size: 0.9em;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	color: var(--color-main-text);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
}

.cn-related-objects-widget__row:hover {
	background: var(--color-background-hover);
}

.cn-related-objects-widget__row:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-related-objects-widget__icon {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-related-objects-widget__meta {
	flex: 0 0 auto;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__chevron {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__empty {
	padding: calc(3 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-related-objects-widget__empty-state {
	/* NcEmptyContent defaults to filling tall parents; inside a widget cell a
	   compact block reads better. */
	padding: calc(4 * var(--default-grid-baseline, 4px)) 0;
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__footer {
	display: flex;
	align-items: center;
	gap: calc(2 * var(--default-grid-baseline, 4px));
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

.cn-related-objects-widget__add-error {
	color: var(--color-error);
	font-size: 0.85em;
}

.cn-related-objects-widget__file-input {
	display: none;
}
</style>
