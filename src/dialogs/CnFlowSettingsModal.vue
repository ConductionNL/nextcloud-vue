<!--
  CnFlowSettingsModal — the flow's own fields: what it is called, and nothing
  about what starts it.

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

  HOW IT RUNS *IS* HERE. `executionMode` decides whether a run happens inline
  or is queued for the worker, and it was editable NOWHERE — a field the engine
  reads on every dispatch that no author could see, let alone set. It is a
  property of the flow, so it belongs with the flow's other fields.

  🔴 THE TRIGGER IS NOT HERE EITHER, AND THAT IS THE POINT OF THIS FILE NOW.
  What starts a flow is a NODE on the canvas — `openregister.trigger-object`,
  `…trigger-schedule`, `…trigger-manual` — not a property of the flow row. The
  four legacy columns (`trigger`, `triggerRegister`, `triggerSchema`, `cron`)
  hold exactly ONE trigger between them, so "on a schedule AND when an object
  changes" had no representation at all and was worked around by duplicating
  the flow. The engine already dispatches from the derived node index; these
  fields were a second, weaker way to say the same thing, in a place the author
  was not looking.

  Two writers for one fact is the shape that drifts, so one of them goes. A
  flow with no trigger node now says so on the canvas, where the graph is, and
  the Run button explains itself rather than starting something the graph does
  not describe.

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

			<p class="cn-flow-settings__note" data-testid="flow-settings-trigger-note">
				{{ t('nextcloud-vue', 'What starts this flow is a step on the canvas. Add a trigger step to give it a way in.') }}
			</p>

			<NcCheckboxRadioSwitch type="switch"
				:model-value="store.runsSynchronously"
				data-testid="flow-settings-sync"
				@update:model-value="store.setFlowField('executionMode', $event ? 'sync' : 'async')">
				{{ t('nextcloud-vue', 'Run immediately instead of queueing') }}
			</NcCheckboxRadioSwitch>
			<p class="cn-flow-settings__note">
				{{ t('nextcloud-vue', 'Off by default. A queued run is picked up by the background worker, which keeps a slow flow from holding up whatever started it.') }}
			</p>
		</div>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcDialog, NcTextField } from '@nextcloud/vue'
import { useFlowStore } from '../composables/useFlowStore.js'

export default {
	name: 'CnFlowSettingsModal',

	components: { NcCheckboxRadioSwitch, NcDialog, NcTextField },

	emits: ['close'],

	setup() {
		return { store: useFlowStore() }
	},

	methods: {
		t,
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

.cn-flow-settings__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
