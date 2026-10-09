<template>
	<NcDialog
		:name="dialogTitle"
		size="small"
		:noClose="loading"
		@closing="$emit('close')">
		<!-- Result phase -->
		<div v-if="result !== null"
			class="cn-copy__result"
			data-testid="cn-modal"
			data-testid-modal="cn-copy-dialog"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ successText }}
			</NcNoteCard>
			<NcNoteCard v-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
			<p v-if="result.success && result.url" class="cn-copy__new-object">
				<a :href="result.url" data-testid="cn-copy-new-object">{{ t('nextcloud-vue', 'Open the copy') }}</a>
			</p>
			<!-- What happened to each link: the ones that were not linked say why. -->
			<ul v-if="refusedLinks.length > 0" class="cn-copy__refused" data-testid="cn-copy-refused">
				<li v-for="(link, index) in refusedLinks" :key="index">
					{{ t('nextcloud-vue', '{title} was not linked: {reason}', { title: link.title || link.id || link.kind, reason: link.reason || t('nextcloud-vue', 'no reason given') }) }}
				</li>
			</ul>
		</div>

		<!-- Form phase -->
		<div v-else
			class="cn-copy__form"
			data-testid="cn-modal"
			data-testid-modal="cn-copy-dialog"
			data-testid-phase="form">
			<div class="cn-copy__pattern">
				<label for="cn-copy-pattern">{{ patternLabel }}</label>
				<NcSelect
					inputId="cn-copy-pattern"
					:labelOutside="true"
					:options="patternOptions"
					:modelValue="selectedPattern"
					:clearable="false"
					@update:modelValue="selectedPattern = $event" />
			</div>

			<div class="cn-copy__preview">
				<div class="cn-copy__preview-row">
					<span class="cn-copy__preview-original">{{ itemName }}</span>
					<span class="cn-copy__preview-arrow">&rarr;</span>
					<span class="cn-copy__preview-new">{{ newName }}</span>
				</div>
			</div>

			<!-- The links this page lets a copy take along (config.copy.include). -->
			<div v-if="kinds.length > 0" class="cn-copy__links" data-testid="cn-copy-links">
				<h3 class="cn-copy__links-title">
					{{ t('nextcloud-vue', 'Links to take along') }}
				</h3>
				<NcNoteCard v-if="serverCopy === false" type="info" data-testid="cn-copy-links-unavailable">
					{{ t('nextcloud-vue', 'Links are not copied yet. Only the fields are copied.') }}
				</NcNoteCard>
				<div v-for="kind in kinds" :key="kind" class="cn-copy__link-kind">
					<NcCheckboxRadioSwitch
						:modelValue="ticked[kind] === true && serverCopy === true"
						:disabled="serverCopy !== true"
						:data-testid="`cn-copy-kind-${kind}`"
						@update:modelValue="ticked[kind] = $event">
						{{ kindLabel(kind) }}
					</NcCheckboxRadioSwitch>
					<ul v-if="linkInfo && linkInfo[kind] && linkInfo[kind].titles.length > 0" class="cn-copy__link-titles">
						<li v-for="(title, index) in linkInfo[kind].titles" :key="index">
							{{ title }}
						</li>
						<li v-if="linkInfo[kind].total > linkInfo[kind].titles.length" class="cn-copy__link-more">
							{{ t('nextcloud-vue', 'and {count} more', { count: linkInfo[kind].total - linkInfo[kind].titles.length }) }}
						</li>
					</ul>
				</div>
			</div>
		</div>

		<template #actions>
			<NcButton @click="$emit('close')">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton
				v-if="result === null"
				variant="primary"
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcDialog, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import { copyKindsOf, useObjectCopy } from '../../composables/useObjectCopy.js'

/**
 * CnCopyDialog — Single-item copy confirmation dialog with naming pattern.
 *
 * Two-phase UI: form (with name preview) then result. The dialog does NOT
 * perform the copy itself — it emits a `confirm` event with the item ID
 * and the new name. The parent performs the actual API call and calls
 * `setResult()` via a ref.
 *
 * ```vue
 * <CnCopyDialog
 *   v-if="showCopyDialog"
 *   ref="copyDialog"
 *   :item="itemToCopy"
 *   @confirm="onCopyConfirm"
 *   @close="showCopyDialog = false" />
 * ```
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
 *
 * @event confirm Emitted when the user confirms copying. Payload: `{ id, newName }`, plus `include` (the ticked link kinds) when the page lists links and the server can copy them.
 * @event close Emitted when the dialog should be closed (cancel, close button, or auto-close after success).
 */
export default {
	name: 'CnCopyDialog',

	components: {
		NcDialog,
		NcButton,
		NcCheckboxRadioSwitch,
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

		/** Optional function to format the item name. Receives the item, returns a string. Overrides nameField when provided. */
		nameFormatter: {
			type: Function,
			default: null,
		},

		/** Dialog title */
		dialogTitle: {
			type: String,
			default: () => t('nextcloud-vue', 'Copy item'),
		},

		/** Label for the naming pattern selector */
		patternLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Naming pattern'),
		},

		/** Success message */
		successText: {
			type: String,
			default: () => t('nextcloud-vue', 'Item successfully copied.'),
		},

		/**
		 * Link kinds a copy may take along, from the page's `config.copy.include`:
		 * `relationRows`, `incoming`, `files`. Each is listed with its linked
		 * items and ticked by default. Empty keeps the dialog as it was.
		 *
		 * @type {Array<'relationRows'|'incoming'|'files'>}
		 */
		include: {
			type: Array,
			default: () => [],
		},

		/** Register slug of the item, for reading its links. Empty: the item's `@self.register`. */
		register: {
			type: String,
			default: '',
		},

		/** Schema slug of the item, for reading its links. Empty: the item's `@self.schema`. */
		schema: {
			type: String,
			default: '',
		},

		/** Label for the cancel button (visible before the copy runs). */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the close button (visible after copy completes). */
		closeLabel: { type: String, default: () => t('nextcloud-vue', 'Close') },
		/** Label for the primary confirm button that triggers the copy. */
		confirmLabel: { type: String, default: () => t('nextcloud-vue', 'Copy') },
	},

	emits: ['close', 'confirm'],

	data() {
		return {
			loading: false,
			result: null,
			closeTimeout: null,
			selectedPatternId: 'copy-of',
			/** What the item is linked to, per kind: `{ titles, total }`. */
			linkInfo: null,
			/** Whether the server offers the copy endpoint (null while checking). */
			serverCopy: null,
			/** Which kinds are ticked. */
			ticked: {},
		}
	},

	computed: {
		itemName() {
			if (this.nameFormatter) {
				return this.nameFormatter(this.item)
			}
			return this.item[this.nameField] || this.item.name || this.item.title || this.item.id
		},

		patternOptions() {
			return [
				{ id: 'copy-of', label: t('nextcloud-vue', 'Copy of {name}') },
				{ id: 'name-copy', label: t('nextcloud-vue', '{name} - Copy') },
				{ id: 'name-parens', label: t('nextcloud-vue', '{name} (Copy)') },
			]
		},

		selectedPattern: {
			get() {
				return this.patternOptions.find((p) => p.id === this.selectedPatternId) || this.patternOptions[0]
			},

			set(pattern) {
				this.selectedPatternId = pattern ? pattern.id : 'copy-of'
			},
		},

		newName() {
			return this.applyPattern(this.itemName, this.selectedPatternId)
		},

		/** @return {string[]} The link kinds the page lets a copy take along. */
		kinds() {
			return copyKindsOf(this.include)
		},

		/** @return {object} The item's address for the object API. */
		source() {
			const self = (this.item && this.item['@self']) || {}
			return { register: this.register || self.register || '', schema: this.schema || self.schema || '', id: this.item.id }
		},

		/** @return {object[]} Links the server did not make, with the reason. */
		refusedLinks() {
			return this.result && Array.isArray(this.result.links) ? this.result.links.filter((l) => l && l.ok === false) : []
		},
	},

	created() {
		if (this.kinds.length > 0) {
			this.loadLinks()
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
		 * Read what the item is linked to, and whether the server can copy the links.
		 * Without a register and schema, or without the endpoint, the list stays
		 * read-only and the copy carries the fields only.
		 *
		 * @return {Promise<void>}
		 */
		async loadLinks() {
			if (!this.source.register || !this.source.schema) {
				this.serverCopy = false
				return
			}
			const copier = useObjectCopy()
			this.serverCopy = await copier.available(this.source)
			this.linkInfo = await copier.links(this.source, this.kinds)
			this.ticked = Object.fromEntries(this.kinds.map((k) => [k, true]))
		},

		/**
		 * The label of a link kind with its count.
		 *
		 * @param {string} kind The kind.
		 * @return {string} For example "Used by 12".
		 */
		kindLabel(kind) {
			const total = this.linkInfo && this.linkInfo[kind] ? this.linkInfo[kind].total : 0
			const names = {
				incoming: t('nextcloud-vue', 'Used by {count}', { count: total }),
				relationRows: t('nextcloud-vue', 'Connections {count}', { count: total }),
				files: t('nextcloud-vue', 'Files {count}', { count: total }),
			}
			return names[kind]
		},

		applyPattern(name, patternId) {
			switch (patternId) {
				case 'copy-of':
					return t('nextcloud-vue', 'Copy of {name}', { name })
				case 'name-copy':
					return t('nextcloud-vue', '{name} - Copy', { name })
				case 'name-parens':
					return t('nextcloud-vue', '{name} (Copy)', { name })
				default:
					return t('nextcloud-vue', 'Copy of {name}', { name })
			}
		},

		executeCopy() {
			this.loading = true
			const payload = { id: this.item.id, newName: this.newName }
			// Links ride along only when the page opted in, the server can copy them
			// and the person left them ticked; otherwise the payload is what it was.
			const include = this.serverCopy === true ? this.kinds.filter((k) => this.ticked[k] === true) : []
			if (include.length > 0) {
				payload.include = include
			}
			this.$emit('confirm', payload)
		},

		/**
		 * Set the result of the copy operation. Call this from the parent
		 * after the API call completes.
		 *
		 * @param {{ success?: boolean, error?: string, url?: string, links?: Array<{kind: string, title?: string, ok: boolean, reason?: string}> }} resultData - Result data to pass to the dialog. `links` is the per-link outcome from the server (the ones with `ok: false` are listed with their reason); `url` links to the new object
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

.cn-copy__links-title {
	margin: 16px 0 4px;
	font-size: 1em;
}

.cn-copy__link-titles {
	margin: 0 0 8px 32px;
	padding: 0;
	list-style: disc;
	color: var(--color-text-maxcontrast);
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
