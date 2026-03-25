<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null" class="cn-copy__result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase -->
		<div v-else class="cn-copy__form">
			<div class="cn-copy__pattern">
				<label for="cn-copy-pattern">{{ patternLabel }}</label>
				<NcSelect
					input-id="cn-copy-pattern"
					:options="patternOptions"
					:value="selectedPattern"
					:clearable="false"
					@input="selectedPattern = $event" />
			</div>

			<div class="cn-copy__preview">
				<div class="cn-copy__preview-row">
					<span class="cn-copy__preview-original">{{ itemName }}</span>
					<span class="cn-copy__preview-arrow">&rarr;</span>
					<span class="cn-copy__preview-new">{{ newName }}</span>
				</div>
			</div>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				type="primary"
				:disabled="loading"
				@click="executeCopy">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<ContentCopy v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon, NcSelect } from '@nextcloud/vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'

/**
 * CnCopyDialog — Single-item copy confirmation dialog with naming pattern.
 *
 * Two-phase UI: form (with name preview) then result. The dialog does NOT
 * perform the copy itself — it emits a `confirm` event with the item ID
 * and the new name. The parent performs the actual API call and calls
 * `setResult()` via a ref.
 *
 * @example
 * <CnCopyDialog
 *   v-if="showCopyDialog"
 *   ref="copyDialog"
 *   :item="itemToCopy"
 *   @confirm="onCopyConfirm"
 *   @close="showCopyDialog = false" />
 *
 * // In methods:
 * async onCopyConfirm({ id, newName }) {
 *   try {
 *     await store.copyItem(id, { title: newName })
 *     this.$refs.copyDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.copyDialog.setResult({ error: e.message })
 *   }
 * }
 */
export default {
	name: 'CnCopyDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcSelect,
		ContentCopy,
	},

	props: {
		/** The item to copy. Must have an `id` property. */
		item: {
			type: Object,
			required: true,
		},
		/** Property name used for display (e.g., 'title', 'name') */
		nameField: {
			type: String,
			default: 'title',
		},
		/** Dialog title */
		dialogTitle: {
			type: String,
			default: 'Copy Item',
		},
		/** Label for the naming pattern selector */
		patternLabel: {
			type: String,
			default: 'Naming pattern',
		},
		/** Success message */
		successText: {
			type: String,
			default: 'Item successfully copied.',
		},
		cancelLabel: { type: String, default: 'Cancel' },
		closeLabel: { type: String, default: 'Close' },
		confirmLabel: { type: String, default: 'Copy' },
	},

	data() {
		return {
			loading: false,
			result: null,
			closeTimeout: null,
			selectedPattern: { id: 'copy-of', label: 'Copy of {name}' },
		}
	},

	computed: {
		itemName() {
			return this.item[this.nameField] || this.item.name || this.item.title || this.item.id
		},

		patternOptions() {
			return [
				{ id: 'copy-of', label: 'Copy of {name}' },
				{ id: 'name-copy', label: '{name} - Copy' },
				{ id: 'name-parens', label: '{name} (Copy)' },
			]
		},

		newName() {
			return this.applyPattern(this.itemName, this.selectedPattern.id)
		},
	},

	beforeDestroy() {
		if (this.closeTimeout) clearTimeout(this.closeTimeout)
	},

	/**
	 * @event confirm Emitted when the user confirms copying. Payload: `{ id, newName }`.
	 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
	 */

	methods: {
		applyPattern(name, patternId) {
			switch (patternId) {
			case 'copy-of':
				return `Copy of ${name}`
			case 'name-copy':
				return `${name} - Copy`
			case 'name-parens':
				return `${name} (Copy)`
			default:
				return `Copy of ${name}`
			}
		},

		executeCopy() {
			this.loading = true
			this.$emit('confirm', {
				id: this.item.id,
				newName: this.newName,
			})
		},

		/**
		 * Set the result of the copy operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string }} resultData
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
.cn-copy__pattern {
	margin-bottom: 16px;
}

.cn-copy__pattern label {
	display: block;
	font-weight: 600;
	margin-bottom: 4px;
}

.cn-copy__preview {
	margin-top: 12px;
}

.cn-copy__preview-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	background-color: var(--color-background-hover);
	border-radius: var(--border-radius);
}

.cn-copy__preview-original {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-copy__preview-arrow {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-copy__preview-new {
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
