<!--
  CnEditSettingsModal — edit the app's manifest-level settings (ADR-041 / ADR-004).

  Mutates the working manifest copy ONLY: the app's top-level settings rather
  than any single page — the manifest `version`, whether OpenBuild in-app editing
  is offered (`openbuildEditable`), the navigation's settings entry (`nav`), and
  the required app `dependencies[]`. Isolated NcModal file per ADR-004; every
  NcSelect carries an `inputLabel`.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-settings">
			<h2 class="cn-edit-settings__title">
				{{ t('nextcloud-vue', 'Edit settings') }}
			</h2>

			<NcEmptyContent
				v-if="!working"
				:name="t('nextcloud-vue', 'No manifest to edit')" />

			<div v-else class="cn-edit-settings__form">
				<NcTextField
					:value="version"
					:label="t('nextcloud-vue', 'Manifest version')"
					:label-visible="true"
					:placeholder="'1.0.0'"
					@update:value="setVersion" />

				<NcCheckboxRadioSwitch
					:checked="openbuildEditable"
					type="switch"
					@update:checked="setEditable">
					{{ t('nextcloud-vue', 'Allow editing with OpenBuild') }}
				</NcCheckboxRadioSwitch>

				<fieldset class="cn-edit-settings__group">
					<legend class="cn-edit-settings__legend">
						{{ t('nextcloud-vue', 'Navigation') }}
					</legend>
					<NcCheckboxRadioSwitch
						:checked="includePersonalSettings"
						type="switch"
						@update:checked="setIncludePersonalSettings">
						{{ t('nextcloud-vue', 'Show a personal settings entry in the navigation') }}
					</NcCheckboxRadioSwitch>
					<NcTextField
						:value="settingsLabel"
						:label="t('nextcloud-vue', 'Settings entry label')"
						:label-visible="true"
						:placeholder="t('nextcloud-vue', 'Settings')"
						@update:value="setSettingsLabel" />
				</fieldset>

				<NcSelect
					class="cn-edit-settings__deps"
					:value="dependencies"
					:options="[]"
					:multiple="true"
					:taggable="true"
					:clearable="true"
					:input-label="t('nextcloud-vue', 'Required apps (dependencies)')"
					:placeholder="t('nextcloud-vue', 'Type an app id and press Enter')"
					:no-drop="true"
					@input="setDependencies" />
			</div>

			<div class="cn-edit-settings__footer">
				<NcButton type="primary" @click="$emit('close')">
					{{ t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcEmptyContent } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

export default {
	name: 'CnEditSettingsModal',

	components: { NcModal, NcButton, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcEmptyContent },

	props: {
		/**
		 * The working manifest copy whose top-level settings are edited in place.
		 * Never the base — the editor holds the base separately.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** The manifest's semver string (empty when unset). */
		version() {
			return (this.working && typeof this.working.version === 'string') ? this.working.version : ''
		},
		/** Whether OpenBuild in-app editing is offered (defaults true when unset). */
		openbuildEditable() {
			return this.working ? this.working.openbuildEditable !== false : true
		},
		/** The manifest's `nav` object (read-only view; writes go through ensureNav). */
		nav() {
			return (this.working && this.working.nav && typeof this.working.nav === 'object') ? this.working.nav : {}
		},
		/** Whether the nav shows a personal-settings entry. */
		includePersonalSettings() {
			return Boolean(this.nav.includePersonalSettings)
		},
		/** The nav's settings-entry label (empty string when unset). */
		settingsLabel() {
			return typeof this.nav.settingsLabel === 'string' ? this.nav.settingsLabel : ''
		},
		/** The manifest's dependency app ids (always an array). */
		dependencies() {
			return (this.working && Array.isArray(this.working.dependencies)) ? this.working.dependencies : []
		},
	},

	methods: {
		t,
		/**
		 * Set the manifest version string.
		 * @param value
		 */
		setVersion(value) {
			this.$set(this.working, 'version', value)
		},
		/**
		 * Toggle whether OpenBuild editing is offered on this app.
		 * @param checked
		 */
		setEditable(checked) {
			this.$set(this.working, 'openbuildEditable', Boolean(checked))
		},
		/** Ensure `working.nav` is an object, then return it for mutation. */
		ensureNav() {
			if (!this.working.nav || typeof this.working.nav !== 'object') this.$set(this.working, 'nav', {})
			return this.working.nav
		},
		/**
		 * Toggle the personal-settings nav entry.
		 * @param checked
		 */
		setIncludePersonalSettings(checked) {
			this.$set(this.ensureNav(), 'includePersonalSettings', Boolean(checked))
		},
		/**
		 * Set the nav's settings-entry label.
		 * @param value
		 */
		setSettingsLabel(value) {
			this.$set(this.ensureNav(), 'settingsLabel', value)
		},
		/**
		 * Replace the dependency list (NcSelect taggable emits the full array).
		 * @param value
		 */
		setDependencies(value) {
			this.$set(this.working, 'dependencies', Array.isArray(value) ? value.map(String) : [])
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
}

.cn-edit-settings__form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-edit-settings__group {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 12px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin: 0;
}

.cn-edit-settings__legend {
	font-weight: 600;
	padding: 0 6px;
}

.cn-edit-settings__deps {
	width: 100%;
}

.cn-edit-settings__footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
}
</style>
