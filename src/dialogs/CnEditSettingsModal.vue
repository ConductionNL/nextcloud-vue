<!--
  CnEditSettingsModal — edit the app's SETTINGS MENU (ADR-041 / ADR-004).

  The settings menu is the gear-foldout at the bottom of CnAppNav: the `menu[]`
  entries tagged `section: "settings"`, plus the auto-prepended "Personal
  settings" entry. This modal edits exactly that — NOT the app's configuration.
  It mutates the working manifest copy ONLY: the settings-section menu items
  (via the same compact CnMenuTreeNode the main menu editor uses, scoped to the
  settings section) and the foldout's personal-settings entry (label + whether
  it shows). Isolated NcDialog file per ADR-004; every NcSelect carries an
  `inputLabel`.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit settings menu')" @closing="$emit('close')">
		<p class="cn-edit-settings__hint">
			{{ t('nextcloud-vue', 'These items appear in the settings ⚙ foldout at the bottom of the navigation.') }}
		</p>

		<CnMenuTreeNode :list="menu"
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
				:model-value="includePersonalSettings"
				type="switch"
				@update:model-value="setIncludePersonalSettings">
				{{ t('nextcloud-vue', 'Show the “Personal settings” entry in the foldout') }}
			</NcCheckboxRadioSwitch>
			<NcTextField
				:model-value="settingsLabel"
				:label="t('nextcloud-vue', 'Foldout label')"
				:label-visible="true"
				:placeholder="t('nextcloud-vue', 'Settings')"
				@update:model-value="setSettingsLabel" />
		</fieldset>

		<fieldset class="cn-edit-settings__group">
			<legend class="cn-edit-settings__legend">
				{{ t('nextcloud-vue', 'Roadmap entry') }}
			</legend>
			<NcCheckboxRadioSwitch
				:model-value="includeRoadmap"
				type="switch"
				@update:model-value="setIncludeRoadmap">
				{{ t('nextcloud-vue', 'Show a “Features & roadmap” entry in the foldout') }}
			</NcCheckboxRadioSwitch>
			<template v-if="includeRoadmap">
				<NcTextField
					:model-value="roadmapLabel"
					:label="t('nextcloud-vue', 'Roadmap label')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'Features & roadmap')"
					@update:model-value="setRoadmapLabel" />
				<NcTextField
					:model-value="roadmapUrl"
					:label="t('nextcloud-vue', 'Roadmap link (URL or in-app route)')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'https://…')"
					@update:model-value="setRoadmapUrl" />
			</template>
		</fieldset>

		<fieldset class="cn-edit-settings__group">
			<legend class="cn-edit-settings__legend">
				{{ t('nextcloud-vue', 'Documentation entry') }}
			</legend>
			<NcCheckboxRadioSwitch
				:model-value="includeDocumentation"
				type="switch"
				@update:model-value="setIncludeDocumentation">
				{{ t('nextcloud-vue', 'Show a “Documentation” entry in the foldout') }}
			</NcCheckboxRadioSwitch>
			<template v-if="includeDocumentation">
				<NcTextField
					:model-value="documentationLabel"
					:label="t('nextcloud-vue', 'Documentation label')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'Documentation')"
					@update:model-value="setDocumentationLabel" />
				<NcTextField
					:model-value="documentationUrl"
					:label="t('nextcloud-vue', 'Documentation link (URL)')"
					:label-visible="true"
					:placeholder="t('nextcloud-vue', 'https://…')"
					@update:model-value="setDocumentationUrl" />
			</template>
		</fieldset>

		<template #actions>
			<NcButton type="secondary" @click="add">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add settings item') }}
			</NcButton>
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
import { NcDialog, NcButton, NcTextField, NcCheckboxRadioSwitch, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import CnMenuTreeNode from '../components/CnMenuTreeNode/CnMenuTreeNode.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditSettingsModal',

	components: { NcDialog, NcButton, NcTextField, NcCheckboxRadioSwitch, NcEmptyContent, NcLoadingIcon, Plus, ContentSaveOutline, CnMenuTreeNode },

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
		/**
		 * Whether the foldout shows the auto "Personal settings" entry. Mirrors
		 * CnAppNav's runtime default (shown unless explicitly `false`) so the
		 * toggle reflects reality — otherwise an app that never set the flag shows
		 * the toggle OFF while the entry is still rendered in the nav.
		 */
		includePersonalSettings() {
			return this.nav.includePersonalSettings !== false
		},
		/** The settings foldout label (empty string when unset). */
		settingsLabel() {
			return typeof this.nav.settingsLabel === 'string' ? this.nav.settingsLabel : ''
		},
		/** Whether the foldout shows a "Features & roadmap" entry (off by default). */
		includeRoadmap() {
			return this.nav.includeRoadmap === true
		},
		/** Label for the roadmap foldout entry (empty string when unset). */
		roadmapLabel() {
			return typeof this.nav.roadmapLabel === 'string' ? this.nav.roadmapLabel : ''
		},
		/** Target link/route for the roadmap foldout entry (empty when unset). */
		roadmapUrl() {
			return typeof this.nav.roadmapUrl === 'string' ? this.nav.roadmapUrl : ''
		},
		/** Whether the foldout shows a "Documentation" entry (off by default). */
		includeDocumentation() {
			return this.nav.includeDocumentation === true
		},
		/** Label for the documentation foldout entry (empty string when unset). */
		documentationLabel() {
			return typeof this.nav.documentationLabel === 'string' ? this.nav.documentationLabel : ''
		},
		/** Target URL for the documentation foldout entry (empty when unset). */
		documentationUrl() {
			return typeof this.nav.documentationUrl === 'string' ? this.nav.documentationUrl : ''
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
			if (!this.working.nav || typeof this.working.nav !== 'object') this.working.nav = {}
			return this.working.nav
		},
		/**
		 * Toggle the auto personal-settings entry.
		 * @param checked
		 */
		setIncludePersonalSettings(checked) {
			this.ensureNav().includePersonalSettings = Boolean(checked)
		},
		/**
		 * Set the settings foldout label.
		 * @param value
		 */
		setSettingsLabel(value) {
			this.ensureNav().settingsLabel = value
		},
		/**
		 * Toggle the roadmap foldout entry.
		 * @param checked
		 */
		setIncludeRoadmap(checked) {
			this.ensureNav().includeRoadmap = Boolean(checked)
		},
		/**
		 * Set the roadmap entry label.
		 * @param value
		 */
		setRoadmapLabel(value) {
			this.ensureNav().roadmapLabel = value
		},
		/**
		 * Set the roadmap entry link/route.
		 * @param value
		 */
		setRoadmapUrl(value) {
			this.ensureNav().roadmapUrl = value
		},
		/**
		 * Toggle the documentation foldout entry.
		 * @param checked
		 */
		setIncludeDocumentation(checked) {
			this.ensureNav().includeDocumentation = Boolean(checked)
		},
		/**
		 * Set the documentation entry label.
		 * @param value
		 */
		setDocumentationLabel(value) {
			this.ensureNav().documentationLabel = value
		},
		/**
		 * Set the documentation entry URL.
		 * @param value
		 */
		setDocumentationUrl(value) {
			this.ensureNav().documentationUrl = value
		},
	},
}
</script>

<style scoped>
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
</style>
