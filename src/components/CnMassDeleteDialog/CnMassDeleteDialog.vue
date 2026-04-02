<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Review phase -->
		<div v-if="result === null" class="cn-mass-delete__review">
			<NcNoteCard type="warning">
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
						type="tertiary"
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
		</div>

		<!-- Result phase -->
		<div v-else class="cn-mass-delete__result">
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
				type="error"
				:disabled="loading || localItems.length === 0"
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
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon } from '@nextcloud/vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'

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
 * @example
 * <CnMassDeleteDialog
 *   v-if="showDeleteDialog"
 *   :items="selectedObjects"
 *   :name-field="'title'"
 *   @confirm="onDeleteConfirm"
 *   @close="showDeleteDialog = false" />
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
 */
export default {
	name: 'CnMassDeleteDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		TrashCanOutline,
		Close,
	},

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
			default: 'Delete Items',
		},
		/** Warning text shown above the item list */
		warningText: {
			type: String,
			default: 'The following items will be permanently deleted. Remove any items you want to keep.',
		},
		/** Text when all items removed from list */
		emptyText: {
			type: String,
			default: 'No items selected for deletion.',
		},
		/** Success message */
		successText: {
			type: String,
			default: 'Items successfully deleted.',
		},
		cancelLabel: { type: String, default: 'Cancel' },
		closeLabel: { type: String, default: 'Close' },
		confirmLabel: { type: String, default: 'Delete' },
		removeLabel: { type: String, default: 'Remove from list' },
	},

	data() {
		return {
			localItems: [...this.items],
			loading: false,
			result: null,
			closeTimeout: null,
		}
	},

	watch: {
		items(val) {
			this.localItems = [...val]
		},
	},

	beforeDestroy() {
		if (this.closeTimeout) clearTimeout(this.closeTimeout)
	},

	methods: {
		getItemName(item) {
			if (this.nameFormatter) return this.nameFormatter(item)
			return item[this.nameField] || item.name || item.title || item.id
		},

		removeItem(id) {
			this.localItems = this.localItems.filter((i) => i.id !== id)
		},

		executeDelete() {
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
