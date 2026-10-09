<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="confirm"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:name="dialogTitle"
		size="small"
		:noClose="loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null"
			class="cn-delete__result"
			data-testid="cn-modal"
			data-testid-modal="cn-delete-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Confirm phase -->
		<div v-else
			class="cn-delete__confirm"
			data-testid="cn-modal"
			data-testid-modal="cn-delete-dialog"
			data-testid-phase="confirm">
			<!-- Board look: a sentence that names the item in bold, the warning (when
			     the app set one) as a note under it. -->
			<template v-if="isBoardLook">
				<p class="cn-dialog__sentence" data-testid="cn-delete-sentence">
					{{ sentenceParts[0] }}<strong class="cn-dialog__name">{{ itemName }}</strong>{{ sentenceParts[1] }}
					<template v-if="irreversible">
						{{ irreversibleText }}
					</template>
				</p>
				<p v-if="hasCustomWarning"
					class="cn-dialog__note"
					role="note"
					data-testid="cn-delete-note">
					<AlertOutline :size="20" aria-hidden="true" />
					<span>{{ resolvedWarningText }}</span>
				</p>
			</template>
			<NcNoteCard v-else type="warning">
				{{ resolvedWarningText }}
			</NcNoteCard>
			<CnConfirmValueField v-if="confirmValue !== ''"
				v-model="typedConfirmValue"
				:value="confirmValue"
				:label="confirmFieldLabel" />
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="error"
				:class="{ 'cn-dialog__confirm-pending': confirmValuePending }"
				:disabled="loading || confirmValuePending"
				:aria-disabled="confirmValuePending ? 'true' : undefined"
				data-testid="cn-delete-dialog-confirm"
				@click="executeDelete">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<TrashCanOutline v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import AlertOutline from 'vue-material-design-icons/AlertOutline.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import CnConfirmValueField from '../CnConfirmValueField/CnConfirmValueField.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import { confirmValueMixin } from '../../mixins/confirmValue.js'
import { dialogBoardMixin } from '../../mixins/dialogBoard.js'
import { splitAroundPlaceholder } from '../../utils/dialogSentence.js'
import { objectDisplayName } from '../../utils/objectName.js'

/**
 * CnDeleteDialog — Single-item delete confirmation dialog.
 *
 * Two-phase UI: confirm then result. The dialog does NOT perform the delete
 * itself — it emits a `confirm` event with the item ID. The parent performs
 * the actual API call and calls `setResult()` via a ref.
 *
 * ```vue
 * <CnDeleteDialog
 *   v-if="showDeleteDialog"
 *   ref="deleteDialog"
 *   :item="itemToDelete"
 *   @confirm="onDeleteConfirm"
 *   @close="showDeleteDialog = false" />
 * ```
 *
 * // In methods:
 * async onDeleteConfirm(id) {
 *   try {
 *     await store.deleteItem(id)
 *     this.$refs.deleteDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.deleteDialog.setResult({ error: e.message })
 *   }
 * }
 *
 * @event confirm Emitted when the user confirms deletion. Payload: the item ID.
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 */
export default {
	name: 'CnDeleteDialog',

	components: {
		CnDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		TrashCanOutline,
		AlertOutline,
		CnConfirmValueField,
	},

	mixins: [dialogBoardMixin, confirmValueMixin],

	props: {
		/** The item to delete. Must have an `id` property. */
		item: {
			type: Object,
			required: true,
		},

		/** Property name used for display (e.g., 'title', 'name') */
		nameField: {
			type: String,
			default: 'title',
		},

		/** Optional function to format the item name. Receives the item, returns a string. Overrides nameField when provided. */
		nameFormatter: {
			type: Function,
			default: null,
		},

		/** Dialog title */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Delete item'),
		},

		/** Warning text. Use `{name}` as placeholder for the item name. */
		warningText: {
			type: String,
			default: () => t('nextcloud-vue', 'Are you sure you want to permanently delete "{name}"? This action cannot be undone.'),
		},

		/** Success message */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Item successfully deleted.'),
		},

		/** Label for the cancel button (visible before the delete runs). */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button (visible after delete completes). */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the primary confirm button that triggers the delete. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },

		/**
		 * Board look: end the sentence with "This action cannot be undone."
		 * Set false for a delete that can be undone (the item goes to a bin).
		 */
		irreversible: { type: Boolean, default: true },
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			loading: false,
			result: null,
			closeTimeout: null,
		}
	},

	computed: {
		itemName() {
			if (this.nameFormatter) {
				return this.nameFormatter(this.item)
			}
			// The caller's `nameField` first — it is the explicit instruction —
			// but only when it holds a STRING. A schema whose `name` is
			// structured (Haal Centraal naming gives a person
			// `name: { givenNames, namePrefix, surname }`) would otherwise put
			// that object into the sentence, and "permanently delete
			// \"[object Object]\"?" is a prompt nobody can answer.
			//
			// Everything after it is the shared `objectDisplayName`, which asks
			// `@self.name` — OpenRegister's own derived display name — before
			// sniffing the record's fields, and type-checks each candidate. It
			// replaces the hand-rolled chain that used to live here; that chain
			// had no `@self.name` and no `displayName`, so on a person record it
			// fell all the way through to the UUID even after the object was
			// skipped.
			const explicit = this.item[this.nameField]
			if (typeof explicit === 'string' && explicit.trim() !== '') {
				return explicit
			}
			if (typeof explicit === 'number') {
				return String(explicit)
			}
			return objectDisplayName(this.item) || this.item.id
		},

		resolvedWarningText() {
			return this.warningText.replace('{name}', this.itemName)
		},

		/** The board sentence around the bold item name. */
		sentenceParts() {
			return splitAroundPlaceholder(t('nextcloud-vue', 'Are you sure you want to permanently delete {name}?'))
		},

		irreversibleText() {
			return t('nextcloud-vue', 'This action cannot be undone.')
		},

		/**
		 * Whether the app set its own warning. The default warning is the whole
		 * sentence the board look already states, so it is not repeated as a note.
		 */
		hasCustomWarning() {
			return this.warningText !== t('nextcloud-vue', 'Are you sure you want to permanently delete "{name}"? This action cannot be undone.')
		},
	},

	beforeUnmount() {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout)
		}
	},

	methods: {
		executeDelete() {
			if (!this.confirmValueMatches) {
				return
			}
			this.loading = true
			this.$emit('confirm', this.item.id)
		},

		/**
		 * Set the result of the delete operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData - Result data to pass to the dialog
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData
			if (resultData.success) {
				this.closeTimeout = setTimeout(() => {
					this.$emit('close')
				}, 2000)
			}
		},
	},
}
</script>

<style scoped>
.cn-delete__confirm {
	padding: 4px 0;
}
</style>
