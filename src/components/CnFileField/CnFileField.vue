<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div
		class="cn-file-field"
		role="group"
		:aria-labelledby="labelId"
		data-testid="cn-file-field">
		<span :id="labelId" class="cn-file-field__label">{{ label }}</span>

		<!-- The native input is never the control a person operates: the
		     button below is, so it takes keyboard focus and carries the label
		     through the group. A `display: none` input inside a <label> (the
		     older widget-form pattern) cannot be reached by keyboard at all. -->
		<input
			ref="fileInput"
			type="file"
			class="cn-file-field__input"
			tabindex="-1"
			aria-hidden="true"
			:accept="accept || null"
			:disabled="disabled"
			data-testid="cn-file-field-input"
			@change="onFileChange">

		<div class="cn-file-field__row">
			<NcButton
				variant="secondary"
				:disabled="disabled || reading"
				data-testid="cn-file-field-choose"
				@click="openPicker">
				{{ hasValue ? t('nextcloud-vue', 'Replace file') : t('nextcloud-vue', 'Choose file') }}
			</NcButton>
			<NcButton
				v-if="hasValue && !disabled"
				variant="tertiary"
				:disabled="reading"
				data-testid="cn-file-field-remove"
				@click="clear">
				{{ t('nextcloud-vue', 'Remove file') }}
			</NcButton>
		</div>

		<p v-if="displayName" class="cn-file-field__name" data-testid="cn-file-field-name">
			{{ displayName }}
		</p>
		<p
			v-if="shownError"
			class="cn-file-field__error"
			role="alert"
			data-testid="cn-file-field-error">
			{{ shownError }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { FALLBACK_MAX_BYTES, readFileAsDataUrl } from '../../utils/widgetUpload.js'

let uidCounter = 0

/**
 * A form field that reads one file the user picks and hands back its content.
 *
 * The value it emits is always a `data:` URL built by `FileReader` from the
 * file the user chose. It never takes, builds or emits a path or a URL, so
 * the field cannot decide where anything is stored. That decision belongs to
 * whoever receives the value. OpenRegister, for a schema property of
 * `type: "file"`, stores the content in the object's own folder under a
 * name it generates itself, after checking the property's allowed types,
 * its size limit and executable content.
 *
 * Nothing is uploaded when a file is picked. The content travels with the
 * form's payload when the form is submitted, which is why the field caps the
 * size (`maxSize`, 1 MB by default, the same cap the widget forms use for an
 * inline file). `accept` narrows the picker and is checked again after the
 * pick, because a picker's filter is a suggestion the user can switch off.
 * Both checks are for the person filling in the form. The server still
 * decides what it accepts.
 *
 * A value that is not a `data:` URL (a file the object already holds, as
 * OpenRegister renders it) is shown by its title and passed through
 * untouched until the user replaces or removes it.
 *
 * ```vue
 * <CnFileField
 *   v-model="form.attachment"
 *   :label="t('myapp', 'Attachment')"
 *   accept=".pdf,image/*" />
 * ```
 */
export default {
	name: 'CnFileField',

	components: { NcButton },

	props: {
		/**
		 * The field value. A `data:` URL for a file picked in this form, an
		 * existing file as the server rendered it (an object with a `title`,
		 * `filename`, `name` or `path`), or `null` when there is no file.
		 *
		 * @type {string|object|number|null}
		 */
		modelValue: {
			type: [String, Object, Number],
			default: null,
		},

		/** Visible label. It also names the group the buttons sit in. */
		label: {
			type: String,
			default: '',
		},

		/**
		 * File types the picker offers, in the syntax of the HTML `accept`
		 * attribute: extensions (`.pdf`), MIME types (`application/pdf`) and
		 * wildcards (`image/*`), comma-separated. Empty accepts any type.
		 */
		accept: {
			type: String,
			default: '',
		},

		/**
		 * Largest file the field reads, in bytes. A bigger file is refused with
		 * a message and the value is left as it was.
		 */
		maxSize: {
			type: Number,
			default: FALLBACK_MAX_BYTES,
		},

		/** Whether the field is read-only. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/**
		 * Error message from the surrounding form, for example a failed
		 * `required` rule. Shown in the same alert as the field's own errors.
		 */
		helperText: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue'],

	data() {
		uidCounter += 1
		return {
			/** Stable id tying the visible label to the group. */
			labelId: `cn-file-field-label-${uidCounter}`,
			/** Name of the file picked in this form (a data URL carries none). */
			pickedName: '',
			/** Whether a picked file is still being read. */
			reading: false,
			/** Why the last pick was refused, or '' when it was not. */
			readError: '',
		}
	},

	computed: {
		/**
		 * @return {boolean} Whether the field currently holds a file.
		 */
		hasValue() {
			return this.modelValue !== null && this.modelValue !== undefined && this.modelValue !== ''
		},

		/**
		 * @return {boolean} Whether the value is a file picked in this form.
		 */
		isPickedContent() {
			return typeof this.modelValue === 'string' && this.modelValue.startsWith('data:')
		},

		/**
		 * The name shown under the buttons. A picked file shows its own name;
		 * an existing file shows the title the server gave it.
		 *
		 * @return {string} The name, or '' when there is no file.
		 */
		displayName() {
			if (!this.hasValue) {
				return ''
			}
			if (this.isPickedContent) {
				return this.pickedName || t('nextcloud-vue', 'A file is attached.')
			}
			const v = this.modelValue
			if (v && typeof v === 'object') {
				const name = v.title || v.filename || v.name || (typeof v.path === 'string' ? v.path.split('/').pop() : '')
				if (typeof name === 'string' && name !== '') {
					return name
				}
			}
			return t('nextcloud-vue', 'A file is attached.')
		},

		/**
		 * @return {string} The message the alert shows: the field's own read
		 *   error first, then the surrounding form's `helperText`.
		 */
		shownError() {
			return this.readError || this.helperText || ''
		},
	},

	watch: {
		modelValue(next) {
			// A value set from outside (a reset, a different record) is not
			// the file this form picked, so its name no longer applies.
			if (typeof next !== 'string' || !next.startsWith('data:')) {
				this.pickedName = ''
			}
		},
	},

	methods: {
		t,

		/**
		 * Open the native file picker.
		 *
		 * @return {void}
		 */
		openPicker() {
			if (this.disabled || this.reading) {
				return
			}
			const input = this.$refs.fileInput
			if (input && typeof input.click === 'function') {
				input.click()
			}
		},

		/**
		 * Read the picked file and emit its content. A file that fails the
		 * `accept` or `maxSize` check is refused with a message, and the value
		 * is left as it was.
		 *
		 * @param {Event} event The file input's change event.
		 * @return {Promise<void>} Resolves once the file is read or refused.
		 */
		async onFileChange(event) {
			const input = event && event.target
			const file = input && input.files && input.files[0]
			// Clear the input so picking the same file again still fires change.
			if (input) {
				input.value = ''
			}
			if (!file) {
				return
			}
			this.readError = ''
			if (!this.fileMatchesAccept(file)) {
				this.readError = t('nextcloud-vue', 'This file type is not accepted.')
				return
			}
			if (file.size > this.maxSize) {
				this.readError = t('nextcloud-vue', 'This file is larger than {size}.', { size: this.formatSize(this.maxSize) })
				return
			}
			this.reading = true
			try {
				const dataUrl = await readFileAsDataUrl(file)
				this.pickedName = file.name || ''
				/**
				 * The new value: the picked file as a `data:` URL, or `null`
				 * after Remove file.
				 *
				 * @type {string|null}
				 */
				this.$emit('update:modelValue', dataUrl)
			} catch (e) {
				this.readError = t('nextcloud-vue', 'The file could not be read.')
			} finally {
				this.reading = false
			}
		},

		/**
		 * Remove the file from the field.
		 *
		 * @return {void}
		 */
		clear() {
			this.pickedName = ''
			this.readError = ''
			this.$emit('update:modelValue', null)
		},

		/**
		 * Whether `file` matches the `accept` list. An empty list matches
		 * everything. Extensions compare against the file name, MIME types
		 * against `file.type`, and `type/*` against the part before the slash.
		 *
		 * @param {File} file The picked file.
		 * @return {boolean} True when the file is acceptable.
		 */
		fileMatchesAccept(file) {
			const tokens = String(this.accept || '')
				.split(',')
				.map((s) => s.trim().toLowerCase())
				.filter((s) => s !== '')
			if (tokens.length === 0) {
				return true
			}
			const name = String(file.name || '').toLowerCase()
			const type = String(file.type || '').toLowerCase()
			return tokens.some((token) => {
				if (token.startsWith('.')) {
					return name.endsWith(token)
				}
				if (token.endsWith('/*')) {
					return type !== '' && type.startsWith(token.slice(0, -1))
				}
				return type === token
			})
		},

		/**
		 * Format a byte count for the size message (`1 MB`, `512 KB`).
		 *
		 * @param {number} bytes The byte count.
		 * @return {string} The formatted size.
		 */
		formatSize(bytes) {
			if (!Number.isFinite(bytes) || bytes <= 0) {
				return '0 B'
			}
			const units = ['B', 'KB', 'MB', 'GB']
			const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
			return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`
		},
	},
}
</script>

<style scoped>
.cn-file-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-file-field__label {
	font-weight: bold;
}

.cn-file-field__input {
	display: none;
}

.cn-file-field__row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-file-field__name {
	margin: 0;
	color: var(--color-text-maxcontrast);
	overflow-wrap: anywhere;
}

.cn-file-field__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}
</style>
