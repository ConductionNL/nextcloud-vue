<!--
  CnEditSidebarModal — edit the active page's right sidebar (ADR-041 / ADR-004).

  Mutates the passed `working` manifest copy ONLY (never the base): toggles the
  active page's sidebar visibility and the visibility of its declared tabs
  (`page.config.sidebar`). Isolated NcModal file per ADR-004. Uses NcCheckboxRadioSwitch
  (no NcSelect) so no input-label wiring is required.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-sidebar">
			<h2 class="cn-edit-sidebar__title">
				{{ t('nextcloud-vue', 'Edit sidebar') }}
			</h2>

			<template v-if="page">
				<NcCheckboxRadioSwitch :checked.sync="sidebarShown" type="switch">
					{{ t('nextcloud-vue', 'Show sidebar on this page') }}
				</NcCheckboxRadioSwitch>

				<h3 class="cn-edit-sidebar__subtitle">
					{{ t('nextcloud-vue', 'Tabs') }}
				</h3>
				<ul class="cn-edit-sidebar__tabs">
					<li v-for="(tab, index) in editableTabs" :key="tab.id || index" class="cn-edit-sidebar__tab-row">
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

			<div class="cn-edit-sidebar__footer">
				<NcButton type="primary" :disabled="saving" @click="onDone">
					<template v-if="saving" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcTextField, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditSidebarModal',

	components: { NcModal, NcButton, NcCheckboxRadioSwitch, NcEmptyContent, NcTextField, NcLoadingIcon, Plus, Delete },

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
				if (this.sidebar) this.$set(this.sidebar, 'show', value)
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
	},

	methods: {
		t,
		/**
		 * Whether a tab id is currently hidden.
		 * @param id
		 */
		isHidden(id) {
			return this.hiddenTabs.includes(id)
		},
		/**
		 * Show or hide a tab by id, mutating the working copy's hiddenTabs.
		 * @param id
		 * @param visible
		 */
		setTabVisible(id, visible) {
			const idx = this.hiddenTabs.indexOf(id)
			if (visible && idx !== -1) this.hiddenTabs.splice(idx, 1)
			else if (!visible && idx === -1) this.hiddenTabs.push(id)
		},
		/** Add a new sidebar tab, enabling the sidebar if it was off. */
		addTab() {
			if (this.sidebar) this.$set(this.sidebar, 'show', true)
			this.editableTabs.push({ id: `tab-${this.editableTabs.length + 1}`, label: '', widgets: [] })
		},
		/**
		 * Remove the tab at `index`.
		 * @param index
		 */
		removeTab(index) {
			this.editableTabs.splice(index, 1)
		},
	},
}
</script>

<style scoped>
.cn-edit-sidebar {
	padding: 20px;
}

.cn-edit-sidebar__title {
	margin-top: 0;
}

.cn-edit-sidebar__subtitle {
	margin: 16px 0 8px;
}

.cn-edit-sidebar__tabs {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-edit-sidebar__footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
}
</style>
