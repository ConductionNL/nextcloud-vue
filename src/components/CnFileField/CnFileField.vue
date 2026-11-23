<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div
		class="cn-file-field"
		:class="{ 'cn-file-field--dragging': dragging }"
		role="group"
		:aria-labelledby="labelId"
		data-testid="cn-file-field"
		@dragover.prevent="onDragOver"
		@dragleave="dragging = false"
		@drop.prevent="onDrop">
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
			:accept="acceptAttribute"
			:multiple="multiple"
			:capture="capture || null"
			:disabled="disabled"
			data-testid="cn-file-field-input"
			@change="onFileChange">

		<div class="cn-file-field__row">
			<NcButton
				variant="secondary"
				:disabled="disabled || reading"
				data-testid="cn-file-field-choose"
				@click="openPicker">
				{{ chooseLabel }}
			</NcButton>
			<NcButton
				v-if="canTakePhoto && !cameraOpen"
				variant="secondary"
				:disabled="disabled || reading"
				data-testid="cn-file-field-take-photo"
				@click="cameraOpen = true">
				{{ t('nextcloud-vue', 'Take photo') }}
			</NcButton>
			<NcButton
				v-if="!multiple && hasValue && !disabled"
				variant="tertiary"
				:disabled="reading"
				data-testid="cn-file-field-remove"
				@click="clear">
				{{ t('nextcloud-vue', 'Remove file') }}
			</NcButton>
		</div>

		<p v-if="droppable" class="cn-file-field__hint">
			{{ t('nextcloud-vue', 'Or drop files here.') }}
		</p>

		<CnCameraCapture
			v-if="cameraOpen"
			:facing="capture === 'user' ? 'user' : 'environment'"
			@capture="onCaptured"
			@close="cameraOpen = false" />

		<ul v-if="multiple && items.length > 0" class="cn-file-field__list" data-testid="cn-file-field-list">
			<li v-for="(item, index) in items"
				:key="index"
				class="cn-file-field__item"
				data-testid="cn-file-field-item">
				<span class="cn-file-field__item-name">{{ item.name }}</span>
				<span v-if="item.size" class="cn-file-field__item-size">{{ formatSize(item.size) }}</span>
				<span v-if="item.held" class="cn-file-field__item-note">{{ t('nextcloud-vue', 'Uploads when saved') }}</span>
				<NcButton
					v-if="!disabled"
					variant="tertiary"
					:aria-label="t('nextcloud-vue', 'Remove {name}', { name: item.name })"
					data-testid="cn-file-field-remove-item"
					@click="removeAt(index)">
					{{ t('nextcloud-vue', 'Remove') }}
				</NcButton>
			</li>
		</ul>

		<p v-if="!multiple && displayName" class="cn-file-field__name" data-testid="cn-file-field-name">
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
import CnCameraCapture from '../CnCameraCapture/CnCameraCapture.vue'
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
 * With `multiple` the value is a list: each file shows its name and size with
 * a remove button, and files can be dropped on the field as well as picked.
 * With `inlineMax`, a file bigger than that (but within `maxSize`) is not read
 * into the payload; the field holds the `File` itself, and the form uploads it
 * to the saved object's files (see `useHeldFileUpload`). With `capture` the
 * input opens a phone's camera, and a device with a webcam gets Take photo.
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

	components: { CnCameraCapture, NcButton },

	props: {
		/**
		 * The field value. A `data:` URL for a file picked in this form, an
		 * existing file as the server rendered it (an object with a `title`,
		 * `filename`, `name` or `path`), or `null` when there is no file.
		 *
		 * @type {string|object|number|null}
		 */
		modelValue: {
			type: null,
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

		/** Whether the field takes several files. The value is then an array. */
		multiple: {
			type: Boolean,
			default: false,
		},

		/**
		 * Opens the device camera: `environment` (rear) or `user` (front). The
		 * picker then accepts images unless `accept` narrows it.
		 *
		 * @type {''|'environment'|'user'}
		 */
		capture: {
			type: String,
			default: '',
		},

		/**
		 * Largest file carried inline, in bytes. 0 (default) means every file up
		 * to `maxSize` is inline. Above it, up to `maxSize`, the file is held as a
		 * `File` for the form to upload after save.
		 */
		inlineMax: {
			type: Number,
			default: 0,
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
			/** Name and size of each entry of a `multiple` value, same order. */
			meta: [],
			/** Whether a file is being dragged over the field. */
			dragging: false,
			/** Whether the webcam surface is open. */
			cameraOpen: false,
		}
	},

	computed: {
		/**
		 * @return {boolean} Whether the field currently holds a file.
		 */
		hasValue() {
			if (Array.isArray(this.modelValue)) {
				return this.modelValue.length > 0
			}
			return this.modelValue !== null && this.modelValue !== undefined && this.modelValue !== ''
		},

		/**
		 * @return {boolean} Whether the value is a file picked in this form.
		 */
		isPickedContent() {
			return (typeof this.modelValue === 'string' && this.modelValue.startsWith('data:')) || this.isHeld(this.modelValue)
		},

		/** @return {string|null} The `accept` attribute: the field's own, or images for a camera field. */
		acceptAttribute() {
			return this.accept || (this.capture ? 'image/*' : null)
		},

		/** @return {string} The `accept` list the pick is checked against. */
		effectiveAccept() {
			return this.accept || (this.capture ? 'image/*' : '')
		},

		/** @return {boolean} Whether files can be dropped on the field. */
		droppable() {
			return this.multiple && !this.disabled
		},

		/** @return {string} Label of the picker button. */
		chooseLabel() {
			if (this.multiple) {
				return t('nextcloud-vue', 'Add files')
			}
			return this.hasValue ? t('nextcloud-vue', 'Replace file') : t('nextcloud-vue', 'Choose file')
		},

		/**
		 * Take photo shows where the input's `capture` does nothing (a laptop)
		 * and the browser has a camera API.
		 *
		 * @return {boolean} Whether to offer the webcam.
		 */
		canTakePhoto() {
			if (!this.capture || this.disabled || typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
				return false
			}
			const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
			return !coarse
		},

		/** @return {Array<{name: string, size: number, held: boolean}>} The entries of a `multiple` value. */
		items() {
			const list = Array.isArray(this.modelValue) ? this.modelValue : []
			return list.map((entry, index) => {
				if (this.isHeld(entry)) {
					return { name: entry.name, size: entry.size, held: true }
				}
				const meta = this.meta[index]
				if (typeof entry === 'string' && entry.startsWith('data:')) {
					return { name: (meta && meta.name) || t('nextcloud-vue', 'A file is attached.'), size: (meta && meta.size) || 0, held: false }
				}
				const name = entry && typeof entry === 'object'
					? (entry.title || entry.filename || entry.name || (typeof entry.path === 'string' ? entry.path.split('/').pop() : ''))
					: ''
				return { name: name || t('nextcloud-vue', 'A file is attached.'), size: Number(entry && entry.size) || 0, held: false }
			})
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
			if (this.isHeld(this.modelValue)) {
				return this.modelValue.name
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
			if (!Array.isArray(next)) {
				this.meta = []
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
		 * Whether a value is a file held for upload after save.
		 *
		 * @param {unknown} value The value or list entry.
		 * @return {boolean} True for a `File` object.
		 */
		isHeld(value) {
			return typeof File !== 'undefined' && value instanceof File
		},

		/**
		 * Take the files from the picker. A file that fails the `accept` or
		 * `maxSize` check is refused with a message and nothing else changes.
		 *
		 * @param {Event} event The file input's change event.
		 * @return {Promise<void>} Resolves once the files are read or refused.
		 */
		async onFileChange(event) {
			const input = event && event.target
			const files = input && input.files ? [...input.files] : []
			// Clear the input so picking the same file again still fires change.
			if (input) {
				input.value = ''
			}
			await this.addFiles(files)
		},

		/**
		 * Take dropped files.
		 *
		 * @param {DragEvent} event The drop.
		 * @return {Promise<void>} Resolves once the files are read or refused.
		 */
		async onDrop(event) {
			this.dragging = false
			if (this.disabled || this.reading) {
				return
			}
			await this.addFiles([...((event.dataTransfer && event.dataTransfer.files) || [])])
		},

		onDragOver() {
			this.dragging = this.droppable
		},

		/**
		 * A photo from the webcam is a file like any picked one.
		 *
		 * @param {File} file The photo.
		 * @return {Promise<void>} Resolves once the photo is added or refused.
		 */
		async onCaptured(file) {
			await this.addFiles([file])
		},

		/**
		 * Check, read (or hold) and emit the files.
		 *
		 * @param {File[]} files The files to take.
		 * @return {Promise<void>} Resolves once done.
		 */
		async addFiles(files) {
			if (files.length === 0) {
				return
			}
			this.readError = ''
			const taken = this.multiple ? files : files.slice(0, 1)
			const values = []
			const metas = []
			this.reading = true
			try {
				for (const file of taken) {
					if (!this.fileMatchesAccept(file)) {
						this.readError = t('nextcloud-vue', 'This file type is not accepted.')
						return
					}
					if (file.size > this.maxSize) {
						this.readError = t('nextcloud-vue', 'This file is larger than {size}.', { size: this.formatSize(this.maxSize) })
						return
					}
					if (this.inlineMax > 0 && file.size > this.inlineMax) {
						values.push(file)
					} else {
						values.push(await readFileAsDataUrl(file))
					}
					metas.push({ name: file.name || '', size: file.size })
				}
			} catch {
				this.readError = t('nextcloud-vue', 'The file could not be read.')
				return
			} finally {
				this.reading = false
			}
			if (this.multiple) {
				const current = Array.isArray(this.modelValue) ? this.modelValue : []
				const known = current.map((_, i) => this.meta[i] || null)
				this.meta = [...known, ...metas]
				this.$emit('update:modelValue', [...current, ...values])
				return
			}
			this.pickedName = metas[0].name
			/**
			 * The new value: the picked file as a `data:` URL (or a `File` held for
			 * upload after save), a list of them with `multiple`, or `null` after
			 * Remove file.
			 *
			 * @type {string|File|Array<string|File|object>|null}
			 */
			this.$emit('update:modelValue', values[0])
		},

		/**
		 * Remove one entry of a `multiple` value.
		 *
		 * @param {number} index The entry's position.
		 * @return {void}
		 */
		removeAt(index) {
			const current = Array.isArray(this.modelValue) ? this.modelValue : []
			this.meta = this.meta.filter((_, i) => i !== index)
			this.$emit('update:modelValue', current.filter((_, i) => i !== index))
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
			const tokens = String(this.effectiveAccept || '')
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

.cn-file-field--dragging {
	outline: 2px dashed var(--color-primary-element);
	outline-offset: 4px;
}

.cn-file-field__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-file-field__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-file-field__item {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	padding: 2px 0;
}

.cn-file-field__item-name {
	overflow-wrap: anywhere;
}

.cn-file-field__item-size,
.cn-file-field__item-note {
	color: var(--color-text-maxcontrast);
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
