<!--
  CnEditSidebarModal — edit the active page's right sidebar (ADR-041 / ADR-004).

  Mutates the passed `working` manifest copy ONLY (never the base): toggles the
  active page's sidebar visibility and the visibility of its declared tabs
  (`page.config.sidebar`). Isolated NcDialog file per ADR-004. Uses NcCheckboxRadioSwitch
  (no NcSelect) so no input-label wiring is required.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit sidebar')" @closing="$emit('close')">
		<template v-if="page">
			<NcCheckboxRadioSwitch :checked.sync="sidebarShown" type="switch">
				{{ t('nextcloud-vue', 'Show sidebar on this page') }}
			</NcCheckboxRadioSwitch>

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
							:checked="!isHidden(tab.id)"
							:aria-label="t('nextcloud-vue', 'Visible')"
							@update:checked="(v) => setTabVisible(tab.id, v)" />
						<NcTextField :value.sync="tab.label" :label="t('nextcloud-vue', 'Tab label')" :label-visible="true" />
						<NcTextField :value.sync="tab.id" :label="t('nextcloud-vue', 'Tab id')" :label-visible="true" />
						<NcButton type="tertiary" :aria-label="t('nextcloud-vue', 'Remove')" @click="removeTab(index)">
							<template #icon>
								<Delete :size="20" />
							</template>
						</NcButton>
					</div>
					<label class="cn-edit-sidebar__content">
						<span>{{ t('nextcloud-vue', 'Content') }}</span>
						<NcSelect :value="selectedContent(tab)"
							:options="contentOptions"
							:clearable="false"
							label="label"
							:input-label="t('nextcloud-vue', 'Tab content')"
							@input="(o) => setContent(tab, o)" />
					</label>
				</li>
			</ul>
			<NcButton type="secondary" @click="addTab">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add tab') }}
			</NcButton>
		</template>
		<NcEmptyContent v-else :name="t('nextcloud-vue', 'No editable page')" />

		<template #actions>
			<NcButton type="primary" :disabled="saving" @click="onDone">
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
import { NcDialog, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcTextField, NcLoadingIcon, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditSidebarModal',

	components: { NcDialog, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcTextField, NcLoadingIcon, NcSelect, Plus, Delete },

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
			if (!this.page.config || typeof this.page.config !== 'object') this.$set(this.page, 'config', {})
			const cfg = this.page.config
			if (typeof cfg.sidebar !== 'object' || cfg.sidebar === null) {
				// eslint-disable-next-line vue/no-side-effects-in-computed-properties
				this.$set(cfg, 'sidebar', typeof cfg.sidebar === 'boolean' ? { show: cfg.sidebar } : {})
			}
			return cfg.sidebar
		},
		/** Two-way switch for whole-sidebar visibility. */
		sidebarShown: {
			get() {
				return this.sidebar ? this.sidebar.show !== false : false
			},
			set(value) {
				if (!this.sidebar) return
				// Detail pages gate on `show`; index pages gate their embedded
				// sidebar (and its actions-bar toggle button) on `enabled`. Set
				// both so the toggle mounts/suppresses the sidebar on either page
				// type — a modal-authored `{ show: true }` alone is inert on an
				// index page (no `enabled`, so CnIndexPage renders nothing).
				this.$set(this.sidebar, 'show', value)
				this.$set(this.sidebar, 'enabled', value)
			},
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
			if (!Array.isArray(s.tabs)) this.$set(s, 'tabs', [])
			return s.tabs
		},
		/** The page's hiddenTabs array (ensured to exist). */
		hiddenTabs() {
			const s = this.sidebar
			if (!s) return []
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!Array.isArray(s.hiddenTabs)) this.$set(s, 'hiddenTabs', [])
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
				this.$set(tab, 'widgets', [])
			} else {
				this.$set(tab, 'widgets', [{ type }])
			}
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
				this.$set(this.sidebar, 'show', true)
				this.$set(this.sidebar, 'enabled', true)
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
.cn-edit-sidebar__subtitle {
	margin: 16px 0 8px;
}

.cn-edit-sidebar__tabs {
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
