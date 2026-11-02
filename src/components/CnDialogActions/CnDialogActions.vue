<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcButton :disabled="saving" data-testid="cn-dialog-actions-cancel" @click="onCancel">
		{{ cancelLabel }}
	</NcButton>
	<NcButton
		:variant="variant"
		:disabled="saving || !canSubmit"
		data-testid="cn-dialog-actions-submit"
		@click="onSubmit">
		<template v-if="saving || confirmIcon" #icon>
			<NcLoadingIcon
				v-if="saving"
				:size="20"
				:name="t('nextcloud-vue', 'Loading …')" />
			<CnIcon v-else :name="confirmIcon" :size="20" />
		</template>
		{{ confirmLabel }}
	</NcButton>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnDialogActions — the footer of a hand-built dialog: a cancel button and a
 * primary button that shows a loading icon while the dialog saves.
 *
 * Put it in the `#actions` slot of `CnDialog` (or `NcDialog`) when the dialog
 * body is too custom for `CnFormDialog`. The component holds no state: the
 * parent owns `saving` and `canSubmit` and does the work on `submit`.
 *
 * ```vue
 * <CnDialog :name="t('myapp', 'Edit source')" default-width="form" @closing="close">
 *   <MySourceForm v-model="source" />
 *   <template #actions>
 *     <CnDialogActions
 *       :saving="saving"
 *       :can-submit="source.title !== ''"
 *       :confirm-label="editing ? t('myapp', 'Save') : t('myapp', 'Create')"
 *       @cancel="close"
 *       @submit="save" />
 *   </template>
 * </CnDialog>
 * ```
 *
 * The primary button is disabled while `saving` is true or `canSubmit` is
 * false. While saving it draws a loading icon with an accessible name, so a
 * screen-reader user hears that the save is running.
 */
export default {
	name: 'CnDialogActions',

	components: {
		CnIcon,
		NcButton,
		NcLoadingIcon,
	},

	props: {
		/** Whether a save is in flight. Disables both buttons and draws a loading icon on the primary one. */
		saving: {
			type: Boolean,
			default: false,
		},

		/** Whether the dialog holds enough to submit. False disables the primary button. */
		canSubmit: {
			type: Boolean,
			default: true,
		},

		/** Label of the primary button. */
		confirmLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Save'),
		},

		/** Label of the cancel button. */
		cancelLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Cancel'),
		},

		/** Variant of the primary button. Use `error` for a destructive submit. */
		variant: {
			type: String,
			default: 'primary',
			validator: (v) => ['primary', 'secondary', 'error', 'warning', 'success'].includes(v),
		},

		/** A CnIcon name drawn on the primary button when it is not saving. Empty draws none. */
		confirmIcon: {
			type: String,
			default: '',
		},
	},

	emits: ['cancel', 'submit'],

	methods: {
		t,

		onCancel() {
			/**
			 * @event cancel Emitted when the cancel button is clicked.
			 */
			this.$emit('cancel')
		},

		onSubmit() {
			/**
			 * @event submit Emitted when the primary button is clicked while it is enabled.
			 */
			this.$emit('submit')
		},
	},
}
</script>
