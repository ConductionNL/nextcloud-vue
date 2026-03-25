<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:can-close="!loading"
		@closing="$emit('close')">
		<!-- Review phase -->
		<div v-if="result === null" class="cn-mass-copy__review">
			<div class="cn-mass-copy__pattern">
				<label for="cn-mass-copy-pattern">{{ patternLabel }}</label>
				<NcSelect
					input-id="cn-mass-copy-pattern"
					:options="patternOptions"
					:value="selectedPattern"
					:clearable="false"
					@input="onPatternChange" />
			</div>

			<div class="cn-mass-copy__list">
				<div
					v-for="item in localItems"
					:key="item.id"
					class="cn-mass-copy__item">
					<div class="cn-mass-copy__item-names">
						<span class="cn-mass-copy__item-original">{{ getItemName(item) }}</span>
						<span class="cn-mass-copy__item-arrow">&rarr;</span>
						<span class="cn-mass-copy__item-new">{{ getNewName(item) }}</span>
					</div>
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

			<p v-if="localItems.length === 0" class="cn-mass-copy__empty">
				{{ emptyText }}
			</p>
		</div>

		<!-- Result phase -->
		<div v-else class="cn-mass-copy__result">
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
				type="primary"
				:disabled="loading || localItems.length === 0"
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
import Close from 'vue-material-design-icons/Close.vue'

/**
 * CnMassCopyDialog — Two-phase mass copy confirmation dialog.
 *
 * Phase 1 (review): Shows the items to be copied with a naming pattern
 * selector and real-time preview of new names. Phase 2 (result): Shows
 * success or error.
 *
 * The dialog does NOT perform the copy itself — it emits a `confirm` event
 * with the items and naming function. The parent performs the actual API
 * call and calls `setResult()` via a ref.
 *
 * @example
 * <CnMassCopyDialog
 *   v-if="showCopyDialog"
 *   ref="copyDialog"
 *   :items="selectedObjects"
 *   :name-field="'title'"
 *   @confirm="onCopyConfirm"
 *   @close="showCopyDialog = false" />
 *
 * // In methods:
 * async onCopyConfirm({ ids, getName }) {
 *   try {
 *     for (const item of this.selectedObjects) {
 *       await store.copyObject(item.id, { title: getName(item) })
 *     }
 *     this.$refs.copyDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.copyDialog.setResult({ error: e.message })
 *   }
 * }
 */
export default {
	name: 'CnMassCopyDialog',

	components: {
		NcDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		NcSelect,
		ContentCopy,
		Close,
	},

	props: {
		/** Items to copy. Each must have an `id` property. */
		items: {
			type: Array,
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
			default: 'Copy Items',
		},
		/** Label for the naming pattern selector */
		patternLabel: {
			type: String,
			default: 'Naming pattern',
		},
		/** Text when all items removed from list */
		emptyText: {
			type: String,
			default: 'No items selected for copying.',
		},
		/** Success message */
		successText: {
			type: String,
			default: 'Items successfully copied.',
		},
		cancelLabel: { type: String, default: 'Cancel' },
		closeLabel: { type: String, default: 'Close' },
		confirmLabel: { type: String, default: 'Copy' },
		removeLabel: { type: String, default: 'Remove from list' },
	},

	data() {
		return {
			localItems: [...this.items],
			loading: false,
			result: null,
			closeTimeout: null,
			selectedPattern: { id: 'copy-of', label: 'Copy of {name}' },
		}
	},

	computed: {
		patternOptions() {
			return [
				{ id: 'copy-of', label: 'Copy of {name}' },
				{ id: 'name-copy', label: '{name} - Copy' },
				{ id: 'name-parens', label: '{name} (Copy)' },
			]
		},
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
			return item[this.nameField] || item.name || item.title || item.id
		},

		getNewName(item) {
			const name = this.getItemName(item)
			return this.applyPattern(name, this.selectedPattern.id)
		},

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

		onPatternChange(option) {
			this.selectedPattern = option
		},

		removeItem(id) {
			this.localItems = this.localItems.filter((i) => i.id !== id)
		},

		executeCopy() {
			this.loading = true
			const ids = this.localItems.map((i) => i.id)
			const patternId = this.selectedPattern.id
			/**
			 * @event confirm Emitted when the user confirms copying.
			 * Payload: { ids, getName } where getName(item) returns the new name.
			 */
			this.$emit('confirm', {
				ids,
				getName: (item) => {
					const name = this.getItemName(item)
					return this.applyPattern(name, patternId)
				},
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
.cn-mass-copy__pattern {
	margin-bottom: 16px;
}

.cn-mass-copy__pattern label {
	display: block;
	font-weight: 600;
	margin-bottom: 4px;
}

.cn-mass-copy__list {
	max-height: 300px;
	overflow-y: auto;
}

.cn-mass-copy__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 12px;
	border-bottom: 1px solid var(--color-border);
}

.cn-mass-copy__item:last-child {
	border-bottom: none;
}

.cn-mass-copy__item-names {
	display: flex;
	align-items: center;
	gap: 8px;
	overflow: hidden;
	flex: 1;
}

.cn-mass-copy__item-original {
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-mass-copy__item-arrow {
	flex-shrink: 0;
	color: var(--color-text-maxcontrast);
}

.cn-mass-copy__item-new {
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-mass-copy__empty {
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
	padding: 20px;
}
</style>
