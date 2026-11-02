<script>
import { translate as t } from '@nextcloud/l10n'
import { markRaw } from 'vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import CnMassActionDialog from '../CnMassActionDialog/CnMassActionDialog.vue'

/**
 * CnMassDeleteDialog — Two-phase mass delete confirmation dialog.
 *
 * Phase 1 (review): Shows the items to be deleted with the ability to remove
 * individual items before confirming. Phase 2 (result): Shows success or error.
 *
 * The dialog does NOT perform the delete itself — it emits a `confirm` event
 * with the item IDs. The parent component performs the actual API call and
 * calls `setResult()` via a ref.
 *
 * It is `CnMassActionDialog` with the delete texts, the `error` variant and a
 * trash icon as defaults; every prop of that dialog applies here too.
 *
 * ```vue
 * <CnMassDeleteDialog
 *   v-if="showDeleteDialog"
 *   :items="selectedObjects"
 *   :name-field="'title'"
 *   @confirm="onDeleteConfirm"
 *   @close="showDeleteDialog = false" />
 * ```
 *
 * // In methods:
 * async onDeleteConfirm(ids) {
 *   try {
 *     await store.massDelete(ids)
 *     this.$refs.deleteDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.deleteDialog.setResult({ error: e.message })
 *   }
 * }
 *
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 */
export default {
	name: 'CnMassDeleteDialog',

	extends: CnMassActionDialog,

	testidPrefix: 'cn-mass-delete',

	props: {
		/** Dialog title */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Delete items'),
		},

		/** Warning text shown above the item list */
		warningText: {
			type: String,
			default: () => t('nextcloud-vue', 'The following items will be permanently deleted. Remove any items you want to keep.'),
		},

		/** Text when all items removed from list */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No items selected for deletion.'),
		},

		/** Success message */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Items successfully deleted.'),
		},

		/** Label for the primary confirm button that triggers the delete. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },

		/** Visual variant of the primary button. */
		variant: {
			type: String,
			default: 'error',
			validator: (v) => ['primary', 'error', 'warning', 'success'].includes(v),
		},

		/**
		 * Icon on the primary button: a CnIcon name or an icon component.
		 * Defaults to a trash can.
		 *
		 * @type {string|object}
		 */
		confirmIcon: { type: [String, Object], default: () => markRaw(TrashCanOutline) },

		/** Board look: the question above the list, with `{count}` where the bold item count goes. */
		sentence: {
			type: String,
			default: () => t('nextcloud-vue', 'Are you sure you want to permanently delete {count}?'),
		},

		/** Board look: end the sentence with "This action cannot be undone." */
		irreversible: { type: Boolean, default: true },
	},
}
</script>
