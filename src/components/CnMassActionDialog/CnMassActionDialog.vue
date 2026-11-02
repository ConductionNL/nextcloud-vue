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
			:data-testid-modal="testidPrefix + '-dialog'"
			data-testid-phase="review">
			<template v-if="isBoardLook">
				<p class="cn-dialog__sentence" :data-testid="testidPrefix + '-sentence'">
					{{ sentenceParts[0] }}<strong class="cn-dialog__name">{{ countLabel }}</strong>{{ sentenceParts[1] }}
					<template v-if="irreversible">
						{{ irreversibleText }}
					</template>
				</p>
				<p class="cn-dialog__note"
					role="note"
					:data-testid="testidPrefix + '-note'">
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
			:data-testid-modal="testidPrefix + '-dialog'"
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
				:variant="variant"
				:class="{ 'cn-dialog__confirm-pending': confirmValuePending }"
				:disabled="loading || localItems.length === 0 || confirmValuePending"
				:aria-disabled="confirmValuePending ? 'true' : undefined"
				:data-testid="testidPrefix + '-dialog-confirm'"
				@click="executeConfirm">
				<template v-if="loading || confirmIcon" #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<CnIcon v-else-if="typeof confirmIcon === 'string'" :name="confirmIcon" :size="20" />
					<component :is="confirmIcon" v-else :size="20" />
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
import CnConfirmValueField from '../CnConfirmValueField/CnConfirmValueField.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import { confirmValueMixin } from '../../mixins/confirmValue.js'
import { dialogBoardMixin } from '../../mixins/dialogBoard.js'
import { splitAroundPlaceholder } from '../../utils/dialogSentence.js'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnMassActionDialog — two-phase confirmation dialog for one action on many
 * items: publish, lock, validate, restore, delete.
 *
 * Phase 1 (review): shows the items the action applies to, each with a button
 * that takes it off the list. Phase 2 (result): shows success or an error.
 *
 * The dialog does NOT perform the action itself. It emits `confirm` with the
 * ids of the items still on the list; the parent performs the call and
 * reports back through `setResult()` on a ref.
 *
 * ```vue
 * <CnMassActionDialog
 *   v-if="showPublish"
 *   ref="publishDialog"
 *   :items="selectedObjects"
 *   :dialog-title="t('myapp', 'Publish objects')"
 *   :warning-text="t('myapp', 'The following objects will be published.')"
 *   :confirm-label="t('myapp', 'Publish')"
 *   confirm-icon="Publish"
 *   @confirm="onPublishConfirm"
 *   @close="showPublish = false" />
 * ```
 *
 * // In methods:
 * async onPublishConfirm(ids) {
 *   try {
 *     await store.massPublish(ids)
 *     this.$refs.publishDialog.setResult({ success: true })
 *   } catch (e) {
 *     this.$refs.publishDialog.setResult({ error: e.message })
 *   }
 * }
 *
 * `CnMassDeleteDialog` is this dialog with the delete texts, the `error`
 * variant and a trash icon as defaults.
 *
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 */
export default {
	name: 'CnMassActionDialog',

	/** Prefix of the dialog's test ids: `<prefix>-dialog`, `<prefix>-dialog-confirm`, `<prefix>-sentence`, `<prefix>-note`. */
	testidPrefix: 'cn-mass-action',

	components: {
		CnDialog,
		NcButton,
		NcNoteCard,
		NcLoadingIcon,
		CnIcon,
		Close,
		AlertOutline,
		CnConfirmValueField,
	},

	mixins: [dialogBoardMixin, confirmValueMixin],

	props: {
		/** Items the action applies to. Each must have an `id` property. */
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
			default: () => t('nextcloud-vue', 'Confirm action'),
		},

		/** Warning text shown above the item list */
		warningText: {
			type: String,
			default: () => t('nextcloud-vue', 'The action applies to the following items. Remove any items you want to leave out.'),
		},

		/** Text when all items removed from list */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No items selected.'),
		},

		/** Success message */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Done.'),
		},

		/** Label for the cancel button (visible before the action runs). */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button (visible after the action completes). */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the primary button that confirms the action. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Confirm') },
		/** Aria label for the per-row "remove from list" icon button. */
		removeLabel: { type: String, default: () => t('nextcloud-vue', 'Remove from list') },

		/**
		 * Visual variant of the primary button. Use `error` for a destructive
		 * action such as delete or purge.
		 */
		variant: {
			type: String,
			default: 'primary',
			validator: (v) => ['primary', 'error', 'warning', 'success'].includes(v),
		},

		/**
		 * Icon on the primary button: a CnIcon name (`Publish`) or an icon
		 * component. Empty draws none.
		 *
		 * @type {string|object}
		 */
		confirmIcon: { type: [String, Object], default: '' },

		/**
		 * Board look: the question above the list, with `{count}` where the
		 * bold item count goes.
		 */
		sentence: {
			type: String,
			default: () => t('nextcloud-vue', 'Are you sure you want to continue with {count}?'),
		},

		/** Board look: end the sentence with "This action cannot be undone." */
		irreversible: { type: Boolean, default: false },
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
			return splitAroundPlaceholder(this.sentence, 'count')
		},

		/** Prefix of the test ids, set per preset. */
		testidPrefix() {
			return this.$options.testidPrefix
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

		executeConfirm() {
			if (!this.confirmValueMatches) {
				return
			}
			this.loading = true
			const ids = this.localItems.map((i) => i.id)
			/**
			 * Emitted when the user confirms the action. Payload: the ids of the items still on the list.
			 *
			 * @event confirm
			 * @type {Array<string|number>}
			 */
			this.$emit('confirm', ids)
		},

		/**
		 * Set the result of the action. Call this from the parent
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
					/**
					 * Emitted when the dialog should close: cancel, close button, or 2 seconds after a success.
					 *
					 * @event close
					 */
					this.$emit('close')
				}, 2000)
			}
		},
	},
}
</script>

<style scoped>
/* Every preset keeps the cn-mass-delete class names: apps style against them. */
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
