<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:no-close="loading"
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
			<NcNoteCard type="warning">
				{{ resolvedWarningText }}
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="error"
				:disabled="loading"
				@click="executeDelete">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<TrashCanOutline v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon } from '@nextcloud/vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
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
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		TrashCanOutline,
	},

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
			if (this.nameFormatter) { return this.nameFormatter(this.item) }
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
			if (typeof explicit === 'string' && explicit.trim() !== '') { return explicit }
			if (typeof explicit === 'number') { return String(explicit) }
			return objectDisplayName(this.item) || this.item.id
		},

		resolvedWarningText() {
			return this.warningText.replace('{name}', this.itemName)
		},
	},

	beforeUnmount() {
		if (this.closeTimeout) { clearTimeout(this.closeTimeout) }
	},

	methods: {
		executeDelete() {
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
