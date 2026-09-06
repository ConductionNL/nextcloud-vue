<!--
  CnFlowSettingsModal — the flow's own fields: what it is called, and what
  starts it.

  ⚠️ NOT `CnFlowEditModal`, AND THE DISTINCTION IS DELIBERATE. That name is
  already taken by the FULL editor in a dialog: canvas and sidebar together,
  what Buildiq's "Edit flows…" opens. A modal that means the whole editor to one
  caller and five fields to another is the kind of collision that bites six
  weeks later, when somebody opens the wrong one and cannot say why the graph is
  missing. This one is named for what it edits.

  WHY THESE FIELDS ARE IN A MODAL AT ALL
  --------------------------------------
  They were a sidebar tab. A tab is a place you have to be looking at, so the
  flow's name, its trigger and its restrictions were invisible while the author
  worked on the graph or read a run, and the tab itself cost a third of the
  sidebar's chrome to show five fields nobody edits twice. The header's action
  menu opens this instead, and the tab is gone.

  NO SAVE BUTTON, ON PURPOSE. Every field writes straight through
  `setFlowField`, exactly as it did in the tab, so this dialog edits the same
  document the canvas does and closing it discards nothing. Adding an OK button
  here would imply a commit that does not happen: the flow is still saved by the
  toolbar's Save, and `store.dirty` still says so on the canvas.

  Enabled is NOT here. It is a verb rather than a field, and it lives in the
  action menu with Publish for the same reason.

  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog :name="t('nextcloud-vue', 'Flow settings')"
		size="normal"
		data-testid="flow-settings-modal"
		@closing="$emit('close')">
		<div class="cn-flow-settings">
			<NcTextField :model-value="store.flow.name"
				:label="t('nextcloud-vue', 'Name')"
				data-testid="flow-settings-name"
				@update:model-value="store.setFlowField('name', $event)" />

			<NcTextField :model-value="store.flow.description || ''"
				:label="t('nextcloud-vue', 'Description')"
				@update:model-value="store.setFlowField('description', $event)" />

			<NcSelect :model-value="triggerOption"
				:options="triggerOptions"
				:input-label="t('nextcloud-vue', 'Trigger')"
				:clearable="false"
				@update:model-value="onTrigger" />

			<NcTextField v-if="store.flow.trigger === 'schedule'"
				:model-value="store.flow.cron || ''"
				:label="t('nextcloud-vue', 'Cron schedule')"
				:helper-text="t('nextcloud-vue', 'For example 0 9 * * 1 — 09:00 every Monday.')"
				@update:model-value="store.setFlowField('cron', $event)" />

			<NcTextField :model-value="store.flow.triggerRegister || ''"
				:label="t('nextcloud-vue', 'Restrict to register')"
				:helper-text="t('nextcloud-vue', 'Leave empty for any register.')"
				@update:model-value="store.setFlowField('triggerRegister', $event)" />

			<NcTextField :model-value="store.flow.triggerSchema || ''"
				:label="t('nextcloud-vue', 'Restrict to schema')"
				:helper-text="t('nextcloud-vue', 'Leave empty for any schema.')"
				@update:model-value="store.setFlowField('triggerSchema', $event)" />
		</div>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcSelect, NcTextField } from '@nextcloud/vue'
import { useFlowStore } from '../composables/useFlowStore.js'

export default {
	name: 'CnFlowSettingsModal',

	components: { NcDialog, NcSelect, NcTextField },

	emits: ['close'],

	setup() {
		return { store: useFlowStore() }
	},

	computed: {
		/**
		 * @return {Array<object>} The trigger options, from the event catalogue.
		 */
		triggerOptions() {
			const fromCatalog = this.store.eventCatalog.map((e) => ({ id: e.id, label: e.label || e.id }))

			// `manual` and `schedule` are engine-level triggers rather than
			// dispatched events, so the event catalogue does not carry them.
			return [
				{ id: 'manual', label: this.t('nextcloud-vue', 'Manually only') },
				{ id: 'schedule', label: this.t('nextcloud-vue', 'On a schedule') },
				...fromCatalog,
			]
		},

		/**
		 * @return {object} The currently selected trigger option.
		 */
		triggerOption() {
			const current = this.store.flow.trigger
			return this.triggerOptions.find((o) => o.id === current) || { id: current, label: current }
		},
	},

	methods: {
		t,

		/**
		 * @param {object} option The chosen trigger option.
		 * @return {void}
		 */
		onTrigger(option) {
			this.store.setFlowField('trigger', option ? option.id : 'manual')
		},
	},
}
</script>

<style scoped>
.cn-flow-settings {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 8px 0;
}
</style>
