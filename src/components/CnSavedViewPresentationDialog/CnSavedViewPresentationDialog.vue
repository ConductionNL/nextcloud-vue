<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:noClose="loading"
		@closing="onClose">
		<div class="cn-view-presentation-dialog" data-testid="cn-modal" data-testid-modal="cn-saved-view-presentation-dialog">
			<NcNoteCard v-if="error" type="error">
				{{ error }}
			</NcNoteCard>
			<CnViewPresentationPicker
				:schema="schema"
				:value="presentation"
				:errors="pathErrors"
				@input="(v) => presentation = v" />
		</div>
		<template #actions>
			<NcButton :disabled="loading" @click="onClose">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="loading || !complete"
				data-testid="cn-saved-view-presentation-confirm"
				@click="onConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" :name="t('nextcloud-vue', 'Loading …')" />
				</template>
				{{ t('nextcloud-vue', 'Save') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcDialog, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnViewPresentationPicker from '../CnViewPresentationPicker/CnViewPresentationPicker.vue'
import { isPresentationComplete, presentationErrorPath } from '../../utils/presentationCandidates.js'

/**
 * CnSavedViewPresentationDialog — change how a saved view shows (table, board
 * or calendar). Opened by `CnIndexPage` from the Presentation entry of a view
 * the user may edit (`@self.access` `owner` or `write`) in
 * `CnSavedViewsControl`. Emits `confirm(presentation)`; the parent saves and
 * closes the dialog, or calls `setError(message)`, which keeps the form open
 * and shows a message naming `kanban.groupByField`, `calendar.dateField` or
 * `calendar.endDateField` under that picker.
 */
export default {
	name: 'CnSavedViewPresentationDialog',

	components: { CnViewPresentationPicker, NcButton, NcDialog, NcLoadingIcon, NcNoteCard },

	props: {
		/** The view being edited (its `presentation` seeds the picker). */
		view: {
			type: Object,
			default: () => ({}),
		},

		/** The view's JSON Schema, which decides what each picker offers. */
		schema: {
			type: Object,
			default: null,
		},

		/** Dialog title. */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'How this view shows'),
		},
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			presentation: this.view && this.view.presentation && typeof this.view.presentation === 'object' ? this.view.presentation : { viewType: 'table' },
			loading: false,
			error: '',
			pathErrors: {},
		}
	},

	computed: {
		complete() {
			return isPresentationComplete(this.presentation)
		},
	},

	methods: {
		t,

		onConfirm() {
			this.loading = true
			this.error = ''
			this.pathErrors = {}
			/**
			 * @event confirm Save clicked. Payload: the presentation in OpenRegister's shape.
			 * @type {object}
			 */
			this.$emit('confirm', this.presentation)
		},

		onClose() {
			/** @event close Dialog dismissed. */
			this.$emit('close')
		},

		/**
		 * Parent-callable (via ref): show a refusal. A message naming one of the
		 * three presentation paths lands under that picker, any other at the top.
		 *
		 * @param {string} message The server's message.
		 * @public
		 */
		setError(message) {
			this.loading = false
			const text = message || t('nextcloud-vue', 'Failed to save the presentation')
			const path = presentationErrorPath(text)
			if (path) {
				this.pathErrors = { [path]: text }
				this.error = ''
			} else {
				this.error = text
			}
		},
	},
}
</script>

<style scoped>
.cn-view-presentation-dialog {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block: 8px;
}
</style>
