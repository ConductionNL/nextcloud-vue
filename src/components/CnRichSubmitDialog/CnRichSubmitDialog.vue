<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		:no-close="loading"
		data-testid="cn-modal"
		data-testid-modal="cn-rich-submit-dialog"
		@closing="onClose">
		<!-- Result phase. -->
		<div v-if="result !== null"
			class="cn-rich-submit__result"
			data-testid-phase="result">
			<NcNoteCard v-if="result.success" type="success">
				{{ result.message || successText }}
			</NcNoteCard>
			<NcNoteCard v-else-if="result.error" type="error">
				{{ result.error }}
			</NcNoteCard>
		</div>

		<!-- Form phase: reason / files / notes / late warning. -->
		<div v-else
			class="cn-rich-submit__form"
			data-testid-phase="form">
			<p v-if="description" class="cn-rich-submit__description">
				{{ description }}
			</p>

			<NcNoteCard v-if="lateWarning" type="warning">
				{{ lateWarning }}
			</NcNoteCard>

			<!-- Reason taxonomy (radio group / select). -->
			<div v-if="reasons.length > 0" class="cn-rich-submit__field">
				<label class="cn-rich-submit__label">{{ reasonLabel }}<span v-if="reasonRequired" class="cn-rich-submit__required">*</span></label>
				<div class="cn-rich-submit__reason-list">
					<label v-for="r in normalisedReasons"
						:key="r.value"
						class="cn-rich-submit__reason-option"
						:class="{ 'cn-rich-submit__reason-option--active': formData.reason === r.value }">
						<input
							:value="r.value"
							:model-value="formData.reason === r.value"
							type="radio"
							:name="radioGroupName"
							@change="formData.reason = r.value">
						<span class="cn-rich-submit__reason-label">{{ r.label }}</span>
						<small v-if="r.description" class="cn-rich-submit__reason-description">{{ r.description }}</small>
					</label>
				</div>
			</div>

			<!-- Notes / free-text. -->
			<div v-if="showNotes" class="cn-rich-submit__field">
				<label :for="fieldIdFor('notes')" class="cn-rich-submit__label">
					{{ notesLabel }}<span v-if="notesRequired" class="cn-rich-submit__required">*</span>
				</label>
				<textarea :id="fieldIdFor('notes')"
					v-model="formData.notes"
					:placeholder="notesPlaceholder"
					rows="4"
					class="cn-rich-submit__textarea" />
			</div>

			<!-- File upload (single or multi). -->
			<div v-if="showFiles" class="cn-rich-submit__field">
				<label :for="fieldIdFor('files')" class="cn-rich-submit__label">
					{{ filesLabel }}<span v-if="filesRequired" class="cn-rich-submit__required">*</span>
				</label>
				<input :id="fieldIdFor('files')"
					ref="fileInput"
					type="file"
					:accept="filesAccept"
					:multiple="maxFiles !== 1"
					class="cn-rich-submit__file"
					@change="onFilesChange">
				<small v-if="filesHint" class="cn-rich-submit__hint">{{ filesHint }}</small>
				<ul v-if="formData.files.length > 0" class="cn-rich-submit__file-list">
					<li v-for="(f, idx) in formData.files" :key="idx">
						{{ f.name }} <small>({{ humanSize(f.size) }})</small>
					</li>
				</ul>
			</div>

			<NcNoteCard v-if="validationError" type="error">
				{{ validationError }}
			</NcNoteCard>
		</div>

		<template #actions>
			<NcButton @click="onClose">
				{{ result !== null ? closeLabel : cancelLabel }}
			</NcButton>
			<NcButton v-if="result === null"
				variant="primary"
				:disabled="loading || !isValid"
				@click="onConfirm">
				<template #icon>
					<NcLoadingIcon v-if="loading" :size="20" />
				</template>
				{{ confirmLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcNoteCard, NcLoadingIcon } from '@nextcloud/vue'

/**
 * CnRichSubmitDialog — Single-screen rich-submit modal with reason
 * taxonomy + file upload + free-text notes.
 *
 * Use for "submit work" / "submit excuse" / "submit appeal" flows
 * where the submission carries:
 *
 *   1. A reason picked from a closed taxonomy (`reasons[]` prop).
 *   2. Optional or required free-text notes.
 *   3. Optional or required file attachments (with accept / max-files
 *      / max-size constraints).
 *   4. An optional late-submission warning banner (set via
 *      `lateWarning`).
 *
 * For multi-step flows (audience → resource → confirm) use
 * [`CnWizardDialog`](../CnWizardDialog/) instead.
 * For pure schema-driven forms use [`CnFormDialog`](../CnFormDialog/).
 *
 * ```vue
 * <CnRichSubmitDialog
 *   ref="submit"
 *   dialog-title="Submit work"
 *   :reasons="[
 *     { value: 'complete',  label: 'Final submission' },
 *     { value: 'draft',     label: 'Draft (request feedback)' },
 *     { value: 'resubmit',  label: 'Resubmission after feedback' },
 *   ]"
 *   :show-files="true"
 *   :files-required="true"
 *   :files-accept="'.pdf,.docx,.zip'"
 *   :max-files="3"
 *   :max-size-mb="20"
 *   :late-warning="lateWarning"
 *   @confirm="onSubmit"
 *   @close="show = false" />
 * ```
 */
export default {
	name: 'CnRichSubmitDialog',
	components: { NcDialog, NcButton, NcNoteCard, NcLoadingIcon },
	props: {
		/**
		 * Dialog title shown in the NcDialog header.
		 *
		 * @type {string}
		 */
		dialogTitle: { type: String, default: 'Submit' },
		/**
		 * Optional intro text rendered above the fields.
		 *
		 * @type {string}
		 */
		description: { type: String, default: '' },
		/**
		 * Reason taxonomy. Each entry may be a string (`value`,
		 * label is the same) or `{ value, label, description? }`.
		 *
		 * @type {Array<string|{value:string,label:string,description?:string}>}
		 */
		reasons: { type: Array, default: () => [] },
		/** Whether the reason field is required to submit. */
		reasonRequired: { type: Boolean, default: false },
		/** Label preceding the reason taxonomy block. */
		reasonLabel: { type: String, default: 'Reason' },
		/** Show the free-text notes textarea. */
		showNotes: { type: Boolean, default: true },
		/** Whether the notes field is required. */
		notesRequired: { type: Boolean, default: false },
		/** Notes textarea label. */
		notesLabel: { type: String, default: 'Notes' },
		/** Notes textarea placeholder. */
		notesPlaceholder: { type: String, default: '' },
		/** Show the file-upload input. */
		showFiles: { type: Boolean, default: false },
		/** Whether at least one file is required to submit. */
		filesRequired: { type: Boolean, default: false },
		/** Files field label. */
		filesLabel: { type: String, default: 'Attachments' },
		/** Files field hint (rendered below the input). */
		filesHint: { type: String, default: '' },
		/** Accept attribute for the file input (e.g. `'.pdf,.docx'`). */
		filesAccept: { type: String, default: '' },
		/**
		 * Max number of files. 1 makes the input single-file; any
		 * higher value allows multi-select. 0 disables the limit.
		 *
		 * @type {number}
		 */
		maxFiles: { type: Number, default: 0 },
		/**
		 * Per-file max size in megabytes. 0 disables the check.
		 *
		 * @type {number}
		 */
		maxSizeMb: { type: Number, default: 0 },
		/**
		 * Late-submission warning text. Rendered as a warning
		 * banner above the form when non-empty.
		 *
		 * @type {string}
		 */
		lateWarning: { type: String, default: '' },
		/** Confirm-button label. */
		confirmLabel: { type: String, default: 'Submit' },
		/** Cancel-button label. */
		cancelLabel: { type: String, default: 'Cancel' },
		/** Close-button label (result phase). */
		closeLabel: { type: String, default: 'Close' },
		/** Success banner default text when result.message is empty. */
		successText: { type: String, default: 'Submitted.' },
		/**
		 * Seed values for the form (merged onto the empty form).
		 *
		 * @type {{ reason?: string, notes?: string }}
		 */
		defaults: { type: Object, default: () => ({}) },
	},
	data() {
		return {
			loading: false,
			result: null,
			validationError: '',
			formData: {
				reason: '',
				notes: '',
				files: [],
				...this.defaults,
				// Files always start empty — defaults can pre-seed
				// reason / notes only.
				...(this.defaults && this.defaults.files === undefined ? { files: [] } : {}),
			},
			radioGroupName: 'cn-rich-submit-reason-' + Math.random().toString(36).slice(2, 8),
		}
	},
	computed: {
		/**
		 * Reasons normalised to `{ value, label, description? }`
		 * objects regardless of input shape.
		 *
		 * @return {Array<{value:string,label:string,description?:string}>}
		 */
		normalisedReasons() {
			return this.reasons.map((r) => {
				if (typeof r === 'string') return { value: r, label: r }
				return { value: r.value, label: r.label || r.value, description: r.description }
			})
		},
		/**
		 * Whether the form satisfies the required-field rules.
		 *
		 * @return {boolean} True when submittable.
		 */
		isValid() {
			if (this.reasonRequired && !this.formData.reason) return false
			if (this.notesRequired && !this.formData.notes.trim()) return false
			if (this.filesRequired && this.formData.files.length === 0) return false
			return true
		},
	},
	methods: {
		/**
		 * Stable DOM id helper.
		 *
		 * @param {string} key Field key.
		 * @return {string} The DOM id.
		 */
		fieldIdFor(key) {
			return `cn-rich-submit-${key}`
		},
		/**
		 * Handle a change on the file input. Applies max-files and
		 * max-size-mb constraints; surfaces violations as a
		 * `validationError` banner.
		 *
		 * @param {Event} event The file input change event.
		 * @return {void}
		 */
		onFilesChange(event) {
			this.validationError = ''
			const incoming = Array.from(event.target.files || [])
			if (this.maxFiles > 0 && incoming.length > this.maxFiles) {
				this.validationError = `At most ${this.maxFiles} file${this.maxFiles === 1 ? '' : 's'} allowed.`
				event.target.value = ''
				return
			}
			if (this.maxSizeMb > 0) {
				const limit = this.maxSizeMb * 1024 * 1024
				const oversized = incoming.find((f) => f.size > limit)
				if (oversized) {
					this.validationError = `File "${oversized.name}" exceeds the ${this.maxSizeMb} MB per-file limit.`
					event.target.value = ''
					return
				}
			}
			this.formData.files = incoming
		},
		/**
		 * Format a byte count into a short human-readable string.
		 *
		 * @param {number} bytes The size in bytes.
		 * @return {string} Like "1.2 MB".
		 */
		humanSize(bytes) {
			if (bytes < 1024) return `${bytes} B`
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
			return `${(bytes / 1024 / 1024).toFixed(1)} MB`
		},
		/**
		 * Confirm handler. Emits @confirm with the current form data
		 * + sets `loading` until `setResult()` is called.
		 *
		 * @return {void}
		 */
		onConfirm() {
			if (!this.isValid) return
			this.loading = true
			/**
			 * @event confirm Emitted when the user clicks Submit.
			 *   Payload: `{ reason, notes, files }`.
			 * @type {{ reason: string, notes: string, files: File[] }}
			 */
			this.$emit('confirm', {
				reason: this.formData.reason,
				notes: this.formData.notes,
				files: [...this.formData.files],
			})
		},
		/**
		 * Public method called by the parent to switch the dialog
		 * into the result phase.
		 *
		 * @param {object} result `{ success?, message?, error? }`.
		 * @return {void}
		 */
		setResult(result) {
			this.result = result || { success: true }
			this.loading = false
		},
		/**
		 * Reset state and emit @close.
		 *
		 * @return {void}
		 */
		onClose() {
			this.result = null
			this.loading = false
			this.validationError = ''
			this.formData = {
				reason: '',
				notes: '',
				files: [],
				...this.defaults,
				...(this.defaults && this.defaults.files === undefined ? { files: [] } : {}),
			}
			/**
			 * @event close Emitted when the dialog should close.
			 */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-rich-submit__description {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-rich-submit__field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin-bottom: 14px;
}

.cn-rich-submit__label {
	font-weight: 600;
}

.cn-rich-submit__required {
	color: var(--color-error);
	margin-left: 2px;
}

.cn-rich-submit__reason-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-rich-submit__reason-option {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-rich-submit__reason-option--active {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-rich-submit__reason-label {
	font-weight: 500;
}

.cn-rich-submit__reason-description {
	color: var(--color-text-maxcontrast);
}

.cn-rich-submit__textarea {
	width: 100%;
	padding: 8px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	resize: vertical;
}

.cn-rich-submit__file {
	padding: 6px 0;
}

.cn-rich-submit__hint {
	color: var(--color-text-maxcontrast);
}

.cn-rich-submit__file-list {
	margin: 6px 0 0;
	padding-left: 20px;
}
</style>
