<!--
  CnEditSidebarModal — edit the active page's right sidebar (ADR-041 / ADR-004).

  Mutates the passed `working` manifest copy ONLY (never the base): toggles the
  active page's sidebar visibility and, per page type, what that sidebar holds
  (`page.config.sidebar`). Index and detail pages mean different things by it —
  the Search & columns panel vs. the object sidebar's tabs — so the body follows
  the page type. Isolated NcDialog file per ADR-004.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit sidebar')" @closing="$emit('close')">
		<template v-if="page">
			<NcCheckboxRadioSwitch v-model="sidebarShown" type="switch">
				{{ t('nextcloud-vue', 'Show sidebar on this page') }}
			</NcCheckboxRadioSwitch>
			<p class="cn-edit-sidebar__hint">
				{{ sidebarHint }}
			</p>

			<!-- An index sidebar is the Search & columns panel: no tabs, but its
			     own settings. `facets` is deliberately absent — it is live data
			     the page feeds the panel, not something an author writes. -->
			<template v-if="isIndexPage">
				<NcCheckboxRadioSwitch
					:model-value="showMetadata"
					type="switch"
					@update:model-value="setShowMetadata">
					{{ t('nextcloud-vue', 'Include the Metadata column group') }}
				</NcCheckboxRadioSwitch>

				<NcSelect class="cn-edit-sidebar__field"
					:model-value="selectedDefaultTab"
					:options="defaultTabOptions"
					:clearable="false"
					label="label"
					:input-label="t('nextcloud-vue', 'Tab opened first')"
					@update:model-value="setDefaultTab" />

				<h3 class="cn-edit-sidebar__subtitle">
					{{ t('nextcloud-vue', 'Extra column groups') }}
				</h3>
				<p class="cn-edit-sidebar__hint">
					{{ t('nextcloud-vue', 'Offered in the Columns tab on top of the schema’s own properties and Metadata.') }}
				</p>
				<ul class="cn-edit-sidebar__groups">
					<!-- Keyed on the list index, not group.id — see the tabs list below. -->
					<li v-for="(group, index) in editableColumnGroups" :key="index" class="cn-edit-sidebar__tab">
						<div class="cn-edit-sidebar__tab-row">
							<NcTextField v-model="group.label" :label="t('nextcloud-vue', 'Group label')" :label-visible="true" />
							<NcTextField v-model="group.id" :label="t('nextcloud-vue', 'Group id')" :label-visible="true" />
							<NcButton variant="tertiary" :aria-label="t('nextcloud-vue', 'Remove')" @click="removeColumnGroup(index)">
								<template #icon>
									<Delete :size="20" />
								</template>
							</NcButton>
						</div>
						<NcTextField :model-value="columnKeys(group)"
							:label="t('nextcloud-vue', 'Column keys, comma separated')"
							:label-visible="true"
							@update:model-value="(v) => setColumnKeys(group, v)" />
					</li>
				</ul>
				<NcButton variant="secondary" @click="addColumnGroup">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add column group') }}
				</NcButton>
			</template>

			<template v-else>
				<NcTextField class="cn-edit-sidebar__field"
					:model-value="sidebarString('title')"
					:label="t('nextcloud-vue', 'Sidebar title')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'Defaults to the object type')"
					@update:model-value="(v) => setSidebarString('title', v)" />
				<NcTextField class="cn-edit-sidebar__field"
					:model-value="sidebarString('subtitle')"
					:label="t('nextcloud-vue', 'Sidebar subtitle')"
					:label-visible="true"
					@update:model-value="(v) => setSidebarString('subtitle', v)" />
				<NcTextField class="cn-edit-sidebar__field"
					:model-value="sidebarString('register')"
					:label="t('nextcloud-vue', 'Register')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'Defaults to the page’s own')"
					@update:model-value="(v) => setSidebarString('register', v)" />
				<NcTextField class="cn-edit-sidebar__field"
					:model-value="sidebarString('schema')"
					:label="t('nextcloud-vue', 'Schema')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'Defaults to the page’s own')"
					@update:model-value="(v) => setSidebarString('schema', v)" />

				<NcCheckboxRadioSwitch
					:model-value="useRegistry"
					type="switch"
					@update:model-value="setUseRegistry">
					{{ t('nextcloud-vue', 'Build the tabs from registered integrations') }}
				</NcCheckboxRadioSwitch>
				<p class="cn-edit-sidebar__hint">
					{{ t('nextcloud-vue', 'One tab per registered provider, instead of the five built-in tabs (files, notes, tags, tasks, audit trail).') }}
				</p>
				<NcNoteCard v-if="registryOverridden" type="warning">
					{{ t('nextcloud-vue', 'Tabs are declared below, so they win and registry mode is ignored. Remove them to use the registry.') }}
				</NcNoteCard>
				<NcTextField v-if="useRegistry"
					class="cn-edit-sidebar__field"
					:model-value="sidebarList('excludeIntegrations')"
					:label="t('nextcloud-vue', 'Excluded integration ids, comma separated')"
					:label-visible="true"
					@update:model-value="(v) => setSidebarList('excludeIntegrations', v)" />

				<h3 class="cn-edit-sidebar__subtitle">
					{{ t('nextcloud-vue', 'Tabs') }}
				</h3>
				<ul class="cn-edit-sidebar__tabs">
					<!-- Key on the stable list index, NOT tab.id. The Tab id field below edits -->
					<!-- tab.id; keying on it would re-key (destroy + recreate) this <li> on every -->
					<!-- keystroke, blowing away the focused input. -->
					<li v-for="(tab, index) in editableTabs" :key="index" class="cn-edit-sidebar__tab">
						<div class="cn-edit-sidebar__tab-row">
							<NcCheckboxRadioSwitch
								:model-value="!isHidden(tab.id)"
								:aria-label="t('nextcloud-vue', 'Visible')"
								@update:model-value="(v) => setTabVisible(tab.id, v)" />
							<NcTextField v-model="tab.label" :label="t('nextcloud-vue', 'Tab label')" :label-visible="true" />
							<NcTextField v-model="tab.id" :label="t('nextcloud-vue', 'Tab id')" :label-visible="true" />
							<NcButton variant="tertiary" :aria-label="t('nextcloud-vue', 'Remove')" @click="removeTab(index)">
								<template #icon>
									<Delete :size="20" />
								</template>
							</NcButton>
						</div>
						<label class="cn-edit-sidebar__content">
							<span>{{ t('nextcloud-vue', 'Content') }}</span>
							<NcSelect :model-value="selectedContent(tab)"
								:options="contentOptions"
								:clearable="false"
								label="label"
								:input-label="t('nextcloud-vue', 'Tab content')"
								@update:model-value="(o) => setContent(tab, o)" />
						</label>
					</li>
				</ul>
				<NcButton variant="secondary" @click="addTab">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add tab') }}
				</NcButton>
			</template>
		</template>
		<NcEmptyContent v-else :name="t('nextcloud-vue', 'No editable page')" />

		<template #actions>
			<NcButton variant="primary" :disabled="saving" @click="onDone">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcTextField, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditSidebarModal',

	components: { NcDialog, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcTextField, NcLoadingIcon, NcNoteCard, NcSelect, Plus, Delete },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose active page sidebar is edited in place.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
		/**
		 * The active page's id; selects which page's sidebar config to edit.
		 *
		 * @type {string}
		 */
		pageId: {
			type: String,
			default: '',
		},
	},

	emits: ['close'],

	computed: {
		/** The active page object from the working manifest, or null. */
		page() {
			const pages = this.working && Array.isArray(this.working.pages) ? this.working.pages : []
			return pages.find((p) => p && p.id === this.pageId) ?? null
		},
		/** The page's normalised sidebar config object (ensured to exist). */
		sidebar() {
			if (!this.page) return null
			// Normalise the working page in place so the editor can bind to it —
			// the working manifest is ours to mutate by design (see CnEditPagesModal).
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!this.page.config || typeof this.page.config !== 'object') this.page.config = {}
			const cfg = this.page.config
			if (typeof cfg.sidebar !== 'object' || cfg.sidebar === null) {
				// eslint-disable-next-line vue/no-side-effects-in-computed-properties
				cfg.sidebar = typeof cfg.sidebar === 'boolean' ? { show: cfg.sidebar } : {}
			}
			return cfg.sidebar
		},
		/**
		 * Whether the active page is an index page. Index and detail pages mean
		 * different things by `config.sidebar`: on an index it is the Search &
		 * columns panel (`enabled` / `showMetadata` / `columnGroups` / `facets`),
		 * on a detail it is the object sidebar with `tabs[]`.
		 *
		 * @return {boolean}
		 */
		isIndexPage() {
			return this.page?.type === 'index'
		},
		/** What `config.sidebar` controls on this page type. */
		sidebarHint() {
			return this.isIndexPage
				? t('nextcloud-vue', 'The index sidebar is the Search & columns panel, opened from the toolbar. It has no tabs.')
				: t('nextcloud-vue', 'The detail sidebar holds the tabs below.')
		},
		/** Two-way switch for whole-sidebar visibility. */
		sidebarShown: {
			get() {
				if (!this.sidebar) return false
				// CnIndexPage mounts nothing without an explicit `enabled: true`,
				// while CnDetailPage treats an absent flag as on. Reading `show`
				// alone reported a page with no sidebar config as shown, so the
				// switch sat on, the sidebar was not there, and pressing it did
				// the opposite of what it looked like.
				if (this.isIndexPage) return this.sidebar.enabled === true && this.sidebar.show !== false
				return this.sidebar.show !== false
			},
			set(value) {
				if (!this.sidebar) return
				// Detail pages gate on `show`; index pages gate their embedded
				// sidebar (and its actions-bar toggle button) on `enabled`. Set
				// both so the toggle mounts/suppresses the sidebar on either page
				// type — a modal-authored `{ show: true }` alone is inert on an
				// index page (no `enabled`, so CnIndexPage renders nothing).
				// Vue 3: reactive objects accept direct assignment (no $set).
				this.sidebar.show = value
				this.sidebar.enabled = value
			},
		},
		/** Whether the index sidebar offers its built-in Metadata column group (defaults on). */
		showMetadata() {
			return this.sidebar ? this.sidebar.showMetadata !== false : false
		},
		/** The two built-in CnIndexSidebar tabs. */
		defaultTabOptions() {
			return [
				{ id: 'search-tab', label: t('nextcloud-vue', 'Search & filters') },
				{ id: 'columns-tab', label: t('nextcloud-vue', 'Columns') },
			]
		},
		/** The tab CnIndexSidebar opens on (`sidebar.search.defaultTab`). */
		selectedDefaultTab() {
			const id = this.sidebar?.search?.defaultTab
			return this.defaultTabOptions.find((o) => o.id === id) || this.defaultTabOptions[0]
		},
		/** The page's sidebar `columnGroups[]` (ensured to exist) — for editing. */
		editableColumnGroups() {
			const s = this.sidebar
			if (!s) return []
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!Array.isArray(s.columnGroups)) s.columnGroups = []
			return s.columnGroups
		},
		/**
		 * Whether the detail sidebar builds its tabs from the integration
		 * registry (ADR-019). CnDetailPage publishes `useRegistry === true`, so
		 * an unset flag means the five built-in tabs.
		 *
		 * @return {boolean}
		 */
		useRegistry() {
			return this.sidebar?.useRegistry === true
		},
		/**
		 * Whether declared tabs are overriding registry mode. CnObjectSidebar
		 * lets `tabs` win over `useRegistry` and warns; say so here instead.
		 *
		 * @return {boolean}
		 */
		registryOverridden() {
			return this.useRegistry && this.tabs.length > 0
		},
		/** Declared sidebar tabs on this page (or empty). */
		tabs() {
			const s = this.sidebar
			return s && Array.isArray(s.tabs) ? s.tabs : []
		},
		/** The page's sidebar `tabs[]` array (ensured to exist) — for editing. */
		editableTabs() {
			const s = this.sidebar
			if (!s) return []
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!Array.isArray(s.tabs)) s.tabs = []
			return s.tabs
		},
		/** The page's hiddenTabs array (ensured to exist). */
		hiddenTabs() {
			const s = this.sidebar
			if (!s) return []
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!Array.isArray(s.hiddenTabs)) s.hiddenTabs = []
			return s.hiddenTabs
		},
		/** Selectable content types for a tab (mapped to a built-in widget). */
		contentOptions() {
			return [
				{ id: '', label: t('nextcloud-vue', 'No content (empty tab)') },
				{ id: 'data', label: t('nextcloud-vue', 'Object data') },
				{ id: 'metadata', label: t('nextcloud-vue', 'Metadata') },
				{ id: 'audit', label: t('nextcloud-vue', 'Audit log') },
			]
		},
	},

	methods: {
		t,
		/**
		 * The currently selected content option for a tab (reads its first widget).
		 *
		 * @param {object} tab The tab object.
		 * @return {object} The matching content option.
		 */
		selectedContent(tab) {
			const type = (Array.isArray(tab.widgets) && tab.widgets[0]) ? tab.widgets[0].type : ''
			return this.contentOptions.find((o) => o.id === type) || this.contentOptions[0]
		},
		/**
		 * Set a tab's content widget from the chosen option. An empty choice
		 * clears the widgets (a plain labelled tab).
		 *
		 * @param {object} tab The tab to mutate.
		 * @param {object} option The selected content option.
		 */
		setContent(tab, option) {
			const type = option ? option.id : ''
			if (type === '') {
				tab.widgets = []
			} else {
				tab.widgets = [{ type }]
			}
		},
		/**
		 * Show or hide the index sidebar's Metadata column group. Dropped when
		 * on, which is CnIndexSidebar's default, so the config stays minimal.
		 *
		 * @param {boolean} value Whether the group should be offered.
		 * @return {void}
		 */
		setShowMetadata(value) {
			if (!this.sidebar) return
			if (value) delete this.sidebar.showMetadata
			else this.sidebar.showMetadata = false
		},
		/**
		 * Read a string field off the sidebar config.
		 *
		 * @param {string} key The sidebar config key.
		 * @return {string} The stored value, or ''.
		 */
		sidebarString(key) {
			const value = this.sidebar?.[key]
			return typeof value === 'string' ? value : ''
		},
		/**
		 * Write a string field, dropping the key when blank so the config
		 * keeps only what the author actually set.
		 *
		 * @param {string} key The sidebar config key.
		 * @param {string} value The new value.
		 * @return {void}
		 */
		setSidebarString(key, value) {
			if (!this.sidebar) return
			if (value) this.sidebar[key] = value
			else delete this.sidebar[key]
		},
		/**
		 * Read a string-array field as the comma-separated string a field edits.
		 *
		 * @param {string} key The sidebar config key.
		 * @return {string} The entries, comma separated.
		 */
		sidebarList(key) {
			const value = this.sidebar?.[key]
			return Array.isArray(value) ? value.join(', ') : ''
		},
		/**
		 * Write a string-array field from the comma-separated field, dropping
		 * the key when nothing is left.
		 *
		 * @param {string} key The sidebar config key.
		 * @param {string} value The comma-separated entries.
		 * @return {void}
		 */
		setSidebarList(key, value) {
			if (!this.sidebar) return
			const entries = String(value).split(',').map((e) => e.trim()).filter(Boolean)
			if (entries.length) this.sidebar[key] = entries
			else delete this.sidebar[key]
		},
		/**
		 * Turn registry-driven tabs on or off. Dropped when off, which is what
		 * CnDetailPage publishes for an unset flag.
		 *
		 * @param {boolean} value Whether to build tabs from the registry.
		 * @return {void}
		 */
		setUseRegistry(value) {
			if (!this.sidebar) return
			if (value) this.sidebar.useRegistry = true
			else delete this.sidebar.useRegistry
		},
		/**
		 * Set the tab CnIndexSidebar opens on. Dropped when it equals the
		 * `search-tab` default, so the config stays minimal.
		 *
		 * @param {{id: string}|null} option The selected tab option.
		 * @return {void}
		 */
		setDefaultTab(option) {
			if (!this.sidebar) return
			const id = option ? option.id : 'search-tab'
			if (id === 'search-tab') {
				if (this.sidebar.search) delete this.sidebar.search.defaultTab
				return
			}
			// `search` is CnIndexPage's pass-through bag of CnIndexSidebar props.
			if (!this.sidebar.search || typeof this.sidebar.search !== 'object') this.sidebar.search = {}
			this.sidebar.search.defaultTab = id
		},
		/**
		 * A column group's keys as the comma-separated string the field edits.
		 *
		 * @param {{columns: Array<{key: string}>}} group The column group.
		 * @return {string} The group's column keys.
		 */
		columnKeys(group) {
			return (Array.isArray(group.columns) ? group.columns : [])
				.map((c) => (c && typeof c === 'object' ? c.key : c))
				.filter(Boolean)
				.join(', ')
		},
		/**
		 * Rewrite a column group's `columns[]` from the comma-separated field.
		 * Each key keeps its existing label; a new key labels itself.
		 *
		 * @param {object} group The column group to mutate.
		 * @param {string} value The comma-separated key list.
		 * @return {void}
		 */
		setColumnKeys(group, value) {
			const existing = new Map((Array.isArray(group.columns) ? group.columns : [])
				.filter((c) => c && typeof c === 'object')
				.map((c) => [c.key, c.label]))
			group.columns = String(value)
				.split(',')
				.map((key) => key.trim())
				.filter(Boolean)
				.map((key) => ({ key, label: existing.get(key) ?? key }))
		},
		/** Append a new column group to the index sidebar. */
		addColumnGroup() {
			const n = this.editableColumnGroups.length + 1
			this.editableColumnGroups.push({ id: `group-${n}`, label: '', columns: [] })
		},
		/**
		 * Remove the column group at `index`.
		 *
		 * @param {number} index The group index to remove.
		 * @return {void}
		 */
		removeColumnGroup(index) {
			this.editableColumnGroups.splice(index, 1)
		},
		/**
		 * Whether a tab id is currently hidden.
		 *
		 * @param {string} id The tab id.
		 * @return {boolean} True when the tab is in hiddenTabs.
		 */
		isHidden(id) {
			return this.hiddenTabs.includes(id)
		},
		/**
		 * Show or hide a tab by id, mutating the working copy's hiddenTabs.
		 *
		 * @param {string} id The tab id.
		 * @param {boolean} visible Whether the tab should be visible.
		 */
		setTabVisible(id, visible) {
			const idx = this.hiddenTabs.indexOf(id)
			if (visible && idx !== -1) this.hiddenTabs.splice(idx, 1)
			else if (!visible && idx === -1) this.hiddenTabs.push(id)
		},
		/** Add a new sidebar tab, enabling the sidebar if it was off. */
		addTab() {
			if (this.sidebar) {
				// Enable on both gates (see `sidebarShown`) so adding a tab mounts
				// the sidebar on index pages too, not just detail pages.
				// Vue 3: reactive objects accept direct assignment (no $set).
				this.sidebar.show = true
				this.sidebar.enabled = true
			}
			this.editableTabs.push({ id: `tab-${this.editableTabs.length + 1}`, label: '', widgets: [] })
		},
		/**
		 * Remove the tab at `index`.
		 *
		 * @param {number} index The tab index to remove.
		 */
		removeTab(index) {
			this.editableTabs.splice(index, 1)
		},
	},
}
</script>

<style scoped>
.cn-edit-sidebar__hint {
	color: var(--color-text-maxcontrast);
	margin: 4px 0 12px;
}

.cn-edit-sidebar__subtitle {
	margin: 16px 0 8px;
}

.cn-edit-sidebar__field {
	margin-bottom: 12px;
	width: 100%;
}

.cn-edit-sidebar__tabs,
.cn-edit-sidebar__groups {
	display: flex;
	flex-direction: column;
	gap: 6px;
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-edit-sidebar__tab {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-sidebar__tab-row {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}

.cn-edit-sidebar__content {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
</style>
