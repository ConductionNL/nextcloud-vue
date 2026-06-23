<!--
  CnEditSettingsModal — edit the app's SETTINGS MENU (ADR-041 / ADR-004).

  The settings menu is the gear-foldout at the bottom of CnAppNav: the `menu[]`
  entries tagged `section: "settings"`, plus the auto-prepended "Personal
  settings" entry. This modal edits exactly that — NOT the app's configuration.
  It mutates the working manifest copy ONLY: the settings-section menu items
  (via the same compact CnMenuTreeNode the main menu editor uses, scoped to the
  settings section) and the foldout's personal-settings entry (label + whether
  it shows). Isolated NcModal file per ADR-004; every NcSelect carries an
  `inputLabel`.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-settings">
			<h2 class="cn-edit-settings__title">
				{{ t('nextcloud-vue', 'Edit settings menu') }}
			</h2>

			<p class="cn-edit-settings__hint">
				{{ t('nextcloud-vue', 'These items appear in the settings ⚙ foldout at the bottom of the navigation.') }}
			</p>

			<CnMenuTreeNode :list="menu"
				:depth="0"
				:max-depth="1"
				:pages="pageOptions"
				section="settings" />

			<NcEmptyContent
				v-if="!settingsItemCount"
				:name="t('nextcloud-vue', 'No settings items yet')"
				:description="t('nextcloud-vue', 'Add an item to build the settings menu.')" />

			<fieldset class="cn-edit-settings__group">
				<legend class="cn-edit-settings__legend">
					{{ t('nextcloud-vue', 'Personal settings entry') }}
				</legend>
				<NcCheckboxRadioSwitch
					:checked="includePersonalSettings"
					type="switch"
					@update:checked="setIncludePersonalSettings">
					{{ t('nextcloud-vue', 'Show the “Personal settings” entry in the foldout') }}
				</NcCheckboxRadioSwitch>
				<NcTextField
					:value="settingsLabel"
					:label="t('nextcloud-vue', 'Foldout label')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'Settings')"
					@update:value="setSettingsLabel" />
			</fieldset>

			<div class="cn-edit-settings__footer">
				<NcButton type="secondary" @click="add">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add settings item') }}
				</NcButton>
				<NcButton type="primary" :disabled="saving" @click="onDone">
					{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcCheckboxRadioSwitch, NcEmptyContent } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnMenuTreeNode from '../components/CnMenuTreeNode/CnMenuTreeNode.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditSettingsModal',

	components: { NcModal, NcButton, NcTextField, NcCheckboxRadioSwitch, NcEmptyContent, Plus, CnMenuTreeNode },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose settings-section menu + nav settings
		 * are edited in place. Never the base — the editor holds the base
		 * separately.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** The working manifest's menu array (always an array). */
		menu() {
			if (this.working && !Array.isArray(this.working.menu)) {
				// The working manifest is ours to mutate by design — never the base.
				// eslint-disable-next-line vue/no-mutating-props, vue/no-side-effects-in-computed-properties
				this.working.menu = []
			}
			return this.working ? this.working.menu : []
		},
		/** Count of settings-section items (drives the empty state). */
		settingsItemCount() {
			return this.menu.filter((i) => i && i.section === 'settings').length
		},
		/**
		 * The manifest's pages as Route-dropdown options (value = page id =
		 * route name, label = title) — same source CnEditMenuModal uses.
		 *
		 * @return {Array<{value: string, label: string}>}
		 */
		pageOptions() {
			const pages = (this.working && Array.isArray(this.working.pages)) ? this.working.pages : []
			return pages
				.filter((p) => p && typeof p.id === 'string' && p.id !== '')
				.map((p) => ({ value: p.id, label: (typeof p.title === 'string' && p.title) ? p.title : p.id }))
		},
		/** The manifest's `nav` object (read-only view; writes go through ensureNav). */
		nav() {
			return (this.working && this.working.nav && typeof this.working.nav === 'object') ? this.working.nav : {}
		},
		/** Whether the foldout shows the auto "Personal settings" entry. */
		includePersonalSettings() {
			return Boolean(this.nav.includePersonalSettings)
		},
		/** The settings foldout label (empty string when unset). */
		settingsLabel() {
			return typeof this.nav.settingsLabel === 'string' ? this.nav.settingsLabel : ''
		},
	},

	methods: {
		t,
		/** Append a new blank settings-section menu entry (ordered last). */
		add() {
			const settings = this.menu.filter((i) => i && i.section === 'settings')
			const maxOrder = settings.reduce((m, i) => Math.max(m, typeof i.order === 'number' ? i.order : 0), 0)
			this.menu.push({ id: `settings-${settings.length + 1}`, label: '', icon: 'icon-settings', route: '', section: 'settings', order: maxOrder + 10 })
		},
		/** Ensure `working.nav` is an object, then return it for mutation. */
		ensureNav() {
			if (!this.working.nav || typeof this.working.nav !== 'object') this.$set(this.working, 'nav', {})
			return this.working.nav
		},
		/** Toggle the auto personal-settings entry. */
		setIncludePersonalSettings(checked) {
			this.$set(this.ensureNav(), 'includePersonalSettings', Boolean(checked))
		},
		/** Set the settings foldout label. */
		setSettingsLabel(value) {
			this.$set(this.ensureNav(), 'settingsLabel', value)
		},
	},
}
</script>

<style scoped>
.cn-edit-settings {
	padding: 20px;
}

.cn-edit-settings__title {
	margin-top: 0;
	margin-bottom: 4px;
}

.cn-edit-settings__hint {
	color: var(--color-text-maxcontrast);
	margin: 0 0 12px;
}

.cn-edit-settings__group {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 12px 0 0;
}

.cn-edit-settings__legend {
	font-weight: 600;
	padding: 0 6px;
}

.cn-edit-settings__footer {
	display: flex;
	justify-content: space-between;
	margin-top: 16px;
}
</style>
