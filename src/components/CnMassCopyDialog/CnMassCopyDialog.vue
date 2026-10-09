<template>
	<CnDialog
		:look="look"
		:width="width"
		defaultWidth="form"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:name="dialogTitle"
		size="normal"
		:noClose="loading"
		@closing="$emit('close')">
		<!-- Review phase -->
		<div v-if="result === null"
			class="cn-mass-copy__review"
			data-testid="cn-modal"
			data-testid-modal="cn-mass-copy-dialog"
			data-testid-phase="review">
			<div class="cn-mass-copy__pattern">
				<label for="cn-mass-copy-pattern">{{ patternLabel }}</label>
				<NcSelect
					inputId="cn-mass-copy-pattern"
					:options="patternOptions"
					:modelValue="selectedPattern"
					:clearable="false"
					@update:modelValue="onPatternChange" />
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
						variant="tertiary"
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

			<!-- The link kinds this page lets a copy take along; the kinds and the total, not every row's links. -->
			<div v-if="kinds.length > 0" class="cn-mass-copy__links" data-testid="cn-mass-copy-links">
				<h3>{{ t('nextcloud-vue', 'Links to take along') }}</h3>
				<NcNoteCard v-if="serverCopy === false" type="info" data-testid="cn-mass-copy-links-unavailable">
					{{ t('nextcloud-vue', 'Links are not copied yet. Only the fields are copied.') }}
				</NcNoteCard>
				<NcCheckboxRadioSwitch
					v-for="kind in kinds"
					:key="kind"
					:modelValue="ticked[kind] === true && serverCopy === true"
					:disabled="serverCopy !== true"
					:data-testid="`cn-mass-copy-kind-${kind}`"
					@update:modelValue="ticked[kind] = $event">
					{{ kindLabel(kind) }}
				</NcCheckboxRadioSwitch>
			</div>
		</div>

		<!-- Result phase -->
		<div v-else
			class="cn-mass-copy__result"
			data-testid="cn-modal"
			data-testid-modal="cn-mass-copy-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
			<ul v-if="refusedLinks.length > 0" class="cn-mass-copy__refused" data-testid="cn-mass-copy-refused">
				<li v-for="(link, index) in refusedLinks" :key="index">
					{{ t('nextcloud-vue', '{title} was not linked: {reason}', { title: link.title || link.id || link.kind, reason: link.reason || t('nextcloud-vue', 'no reason given') }) }}
				</li>
			</ul>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result === null ? cancelLabel : closeLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="primary"
				:disabled="loading || localItems.length === 0"
				@click="executeCopy">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
					<ContentCopy v-else :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import CnDialog from '../CnDialog/CnDialog.vue'
import { copyKindsOf, useObjectCopy } from '../../composables/useObjectCopy.js'
import { dialogBoardMixin } from '../../mixins/dialogBoard.js'

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
 * ```vue
 * <CnMassCopyDialog
 *   v-if="showCopyDialog"
 *   ref="copyDialog"
 *   :items="selectedObjects"
 *   :name-field="'title'"
 *   @confirm="onCopyConfirm"
 *   @close="showCopyDialog = false" />
 * ```
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
 *
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 */
export default {
	name: 'CnMassCopyDialog',

	components: {
		CnDialog,
		NcButton,
		NcCheckboxRadioSwitch,
		NcNoteCard,
		NcLoadingIcon,
		NcSelect,
		ContentCopy,
		Close,
	},

	mixins: [dialogBoardMixin],

	props: {
		/**
		 * Link kinds a copy may take along, from the page's `config.copy.include`
		 * (`relationRows`, `incoming`, `files`). Each is offered ticked. Empty keeps
		 * the dialog as it was.
		 *
		 * @type {Array<'relationRows'|'incoming'|'files'>}
		 */
		include: {
			type: Array,
			default: () => [],
		},

		/** Register slug of the items, for checking the server can copy links. Empty: the first item's `@self.register`. */
		register: {
			type: String,
			default: '',
		},

		/** Schema slug of the items. Empty: the first item's `@self.schema`. */
		schema: {
			type: String,
			default: '',
		},

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

		/** Optional function to format the item name. Receives the item, returns a string. Overrides nameField when provided. */
		nameFormatter: {
			type: Function,
			default: null,
		},

		/** Dialog title */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Copy items'),
		},

		/** Label for the naming pattern selector */
		patternLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Naming pattern'),
		},

		/** Text when all items removed from list */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No items selected for copying.'),
		},

		/** Success message */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Items successfully copied.'),
		},

		/** Label for the cancel button (visible before the copy runs). */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button (visible after copy completes). */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the primary confirm button that triggers the copy. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Copy') },
		/** Aria label for the per-row "remove from list" icon button. */
		removeLabel: { type: String, default: () => t('nextcloud-vue', 'Remove from list') },
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			localItems: [...this.items],
			loading: false,
			result: null,
			closeTimeout: null,
			selectedPattern: { id: 'copy-of', label: 'Copy of {name}' },
			/** Whether the server offers the copy endpoint (null while checking). */
			serverCopy: null,
			/** Which link kinds are ticked. */
			ticked: Object.fromEntries(copyKindsOf(this.include).map((k) => [k, true])),
		}
	},

	computed: {
		/** @return {string[]} The link kinds the page lets a copy take along. */
		kinds() {
			return copyKindsOf(this.include)
		},

		/** @return {object[]} Links the server did not make, with the reason. */
		refusedLinks() {
			return this.result && Array.isArray(this.result.links) ? this.result.links.filter((l) => l && l.ok === false) : []
		},

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

	created() {
		if (this.kinds.length > 0) {
			this.checkServerCopy()
		}
	},

	beforeUnmount() {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout)
		}
	},

	methods: {
		t,

		/**
		 * Ask whether the server can copy links. Without a register and schema, or
		 * without the endpoint, the list is read-only and the copy carries fields only.
		 *
		 * @return {Promise<void>}
		 */
		async checkServerCopy() {
			const first = this.items[0] || {}
			const self = first['@self'] || {}
			const register = this.register || self.register
			const schema = this.schema || self.schema
			this.serverCopy = register && schema ? await useObjectCopy().available({ register, schema, id: first.id }) : false
		},

		/**
		 * The label of a link kind.
		 *
		 * @param {string} kind The kind.
		 * @return {string} For example "Used by".
		 */
		kindLabel(kind) {
			const names = {
				incoming: t('nextcloud-vue', 'Objects that use each entry'),
				relationRows: t('nextcloud-vue', 'Connections of each entry'),
				files: t('nextcloud-vue', 'Files of each entry'),
			}
			return names[kind]
		},

		getItemName(item) {
			if (this.nameFormatter) {
				return this.nameFormatter(item)
			}
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
			 * Payload: { ids, getName } where getName(item) returns the new name, plus `include` (the ticked link kinds) when the page lists links and the server can copy them.
			 */
			const payload = {
				ids,
				getName: (item) => {
					const name = this.getItemName(item)
					return this.applyPattern(name, patternId)
				},
			}
			// Links ride along only when the page opted in, the server can copy them and they stay ticked.
			const include = this.serverCopy === true ? this.kinds.filter((k) => this.ticked[k] === true) : []
			if (include.length > 0) {
				payload.include = include
			}
			/**
			 * @event confirm Emitted when the user confirms copying. Payload: { ids, getName, include? } where getName(item) returns the new name and include lists the ticked link kinds.
			 * @type {{ ids: Array<string>, getName: Function, include?: Array<string> }}
			 */
			this.$emit('confirm', payload)
		},

		/**
		 * Set the result of the copy operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string, links?: Array<{kind: string, title?: string, ok: boolean, reason?: string}> }} resultData - Result data to pass to the dialog. `links` is the per-link outcome the server returned for all rows; the ones with `ok: false` are listed with their reason
		 * @public
		 */
		setResult(resultData) {
			this.loading = false
			this.result = resultData
			if (resultData.success) {
				this.closeTimeout = setTimeout(() => {
					/**
					 * @event close Emitted when the dialog should close (cancel, close button, or auto-close after success).
					 */
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
