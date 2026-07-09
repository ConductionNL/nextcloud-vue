<!--
  CnFilesWidgetDeleteDialog — delete-confirmation dialog for CnFilesWidget.

  Lives in src/dialogs/ per ADR-004 modal/dialog file-isolation. Uses NcDialog
  (focus-trap + Esc close + themed chrome) instead of a hand-rolled overlay.
  Mounted by CnFilesWidget via `:open` / `@update:open`; emits `confirm` when
  the user confirms the deletion. The parent owns the actual delete request.
-->
<template>
	<NcDialog
		:open="open"
		:name="t('nextcloud-vue', 'Delete file')"
		size="small"
		:close-on-click-outside="true"
		@update:open="$emit('update:open', $event)">
		<p class="cn-files-widget-delete-dialog__message">
			{{ t('nextcloud-vue', 'Are you sure you want to delete {name}?', { name: fileName }) }}
		</p>

		<template #actions>
			<NcButton variant="tertiary" @click="$emit('update:open', false)">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton variant="error" @click="$emit('confirm')">
				{{ t('nextcloud-vue', 'Delete') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton } from '@nextcloud/vue'

export default {
	name: 'CnFilesWidgetDeleteDialog',

	components: {
		NcDialog,
		NcButton,
	},

	props: {
		/** Whether the dialog is open. */
		open: {
			type: Boolean,
			default: false,
		},
		/** Name of the file pending deletion, shown in the confirmation prompt. */
		fileName: {
			type: String,
			default: '',
		},
	},

	emits: ['update:open', 'confirm'],

	methods: {
		t,
	},
}
</script>

<style scoped>
.cn-files-widget-delete-dialog__message {
	padding: 4px 0 8px;
}
</style>
