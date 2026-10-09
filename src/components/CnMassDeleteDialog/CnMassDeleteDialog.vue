<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="confirm"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:name="dialogTitle"
		size="normal"
		:noClose="loading"
		@closing="$emit('close')">
		<!-- Review phase -->
		<div v-if="result === null"
			class="cn-mass-delete__review"
			data-testid="cn-modal"
			data-testid-modal="cn-mass-delete-dialog"
			data-testid-phase="review">
			<template v-if="isBoardLook">
				<p class="cn-dialog__sentence" data-testid="cn-mass-delete-sentence">
					{{ sentenceParts[0] }}<strong class="cn-dialog__name">{{ countLabel }}</strong>{{ sentenceParts[1] }}
					<template v-if="irreversible">
						{{ irreversibleText }}
					</template>
				</p>
				<p class="cn-dialog__note"
					role="note"
					data-testid="cn-mass-delete-note">
					<AlertOutline :size="20" aria-hidden="true" />
					<span>{{ warningText }}</span>
				</p>
			</template>
			<NcNoteCard v-else type="warning">
				{{ warningText }}
			</NcNoteCard>

			<div class="cn-mass-delete__list">
				<div
					v-for="item in localItems"
					:key="item.id"
					class="cn-mass-delete__item">
					<span class="cn-mass-delete__item-name">
						{{ getItemName(item) }}
					</span>
					<NcButton
						variant="tertiary"
						:aria-label="removeLabel"
						@click="removeItem(item.id)">
						<template #icon>
							<Close :size="16" />
						</template>
					</NcButton>
				</div>
			</div>

			<p v-if="localItems.length === 0" class="cn-mass-delete__empty">
				{{ emptyText }}
			</p>
			<CnConfirmValueField v-if="confirmValue !== ''"
				v-model="typedConfirmValue"
				:value="confirmValue"
				:label="confirmFieldLabel" />
		</div>

		<!-- Result phase -->
		<div v-else
			class="cn-mass-delete__result"
			data-testid="cn-modal"
			data-testid-modal="cn-mass-delete-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result === null ? cancelLabel : closeLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="error"
				:class="{ 'cn-dialog__confirm-pending': confirmValuePending }"
				:disabled="loading || localItems.length === 0 || confirmValuePending"
				:aria-disabled="confirmValuePending ? 'true' : undefined"
				data-testid="cn-mass-delete-dialog-confirm"
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
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import AlertOutline from 'vue-material-design-icons/AlertOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import CnConfirmValueField from '../CnConfirmValueField/CnConfirmValueField.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import { confirmValueMixin } from '../../mixins/confirmValue.js'
import { dialogBoardMixin } from '../../mixins/dialogBoard.js'
import { splitAroundPlaceholder } from '../../utils/dialogSentence.js'

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

	components: {
		CnDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		TrashCanOutline,
		Close,
		AlertOutline,
		CnConfirmValueField,
	},

	mixins: [dialogBoardMixin, confirmValueMixin],

	props: {
		/** Items to delete. Each must have an `id` property. */
		items: {
			type: Array,
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

		/** Label for the cancel button (visible before the delete runs). */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button (visible after delete completes). */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the primary confirm button that triggers the delete. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
		/** Aria label for the per-row "remove from list" icon button. */
		removeLabel: { type: String, default: () => t('nextcloud-vue', 'Remove from list') },

		/** Board look: end the sentence with "This action cannot be undone." */
		irreversible: { type: Boolean, default: true },
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			localItems: [...this.items],
			loading: false,
			result: null,
			closeTimeout: null,
		}
	},

	computed: {
		/** The board sentence around the bold item count. */
		sentenceParts() {
			return splitAroundPlaceholder(t('nextcloud-vue', 'Are you sure you want to permanently delete {count}?'), 'count')
		},

		countLabel() {
			return n('nextcloud-vue', '%n item', '%n items', this.localItems.length)
		},

		irreversibleText() {
			return t('nextcloud-vue', 'This action cannot be undone.')
		},
	},

	watch: {
		items(val) {
			this.localItems = [...val]
		},
	},

	beforeUnmount() {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout)
		}
	},

	methods: {
		getItemName(item) {
			if (this.nameFormatter) {
				return this.nameFormatter(item)
			}
			return item[this.nameField] || item.name || item.title || item.id
		},

		removeItem(id) {
			this.localItems = this.localItems.filter((i) => i.id !== id)
		},

		executeDelete() {
			if (!this.confirmValueMatches) {
				return
			}
			this.loading = true
			const ids = this.localItems.map((i) => i.id)
			/**
			 * @event confirm Emitted when the user confirms deletion.
			 * Payload: array of item IDs to delete.
			 */
			this.$emit('confirm', ids)
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
.cn-mass-delete__list {
	max-height: 300px;
	overflow-y: auto;
	margin-top: 12px;
}

.cn-mass-delete__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-mass-delete__item:last-child {
	border-bottom: none;
}

.cn-mass-delete__item-name {
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-mass-delete__empty {
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
	padding: 20px;
}
</style>
