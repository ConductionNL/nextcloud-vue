<!--
  CnFilesWidgetDeleteDialog — delete-confirmation dialog for CnFilesWidget.

  Lives in src/dialogs/ per ADR-004 modal/dialog file-isolation. Uses NcDialog
  (focus-trap + Esc close + themed chrome) instead of a hand-rolled overlay.
  Mounted by CnFilesWidget via `:open` / `@update:open`; emits `confirm` when
  the user confirms the deletion. The parent owns the actual delete request.
-->
<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="confirm"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:open="open"
		:name="t('nextcloud-vue', 'Delete file')"
		size="small"
		:closeOnClickOutside="true"
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
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import CnDialog from '../components/CnDialog/CnDialog.vue'
import { dialogBoardMixin } from '../mixins/dialogBoard.js'

export default {
	name: 'CnFilesWidgetDeleteDialog',

	components: {
		CnDialog,
		NcButton,
	},

	mixins: [dialogBoardMixin],

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
