<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<form class="cn-settings-form"
		data-testid="cn-settings-form"
		novalidate
		@submit.prevent="save">
		<div class="cn-settings-form__grid" :class="`cn-settings-form__grid--${columns}`">
			<div
				v-for="field in fields"
				:key="field.key"
				class="cn-settings-form__field"
				:class="{ 'cn-settings-form__field--wide': field.wide }"
				:data-testid="`cn-settings-form-field-${field.key}`">
				<NcCheckboxRadioSwitch
					v-if="field.type === 'switch'"
					v-model="form[field.key]"
					type="switch"
					:disabled="field.readOnly">
					{{ field.label }}
				</NcCheckboxRadioSwitch>
				<CnChipsFieldWidget
					v-else-if="field.type === 'chips'"
					:modelValue="form[field.key]"
					:content="chipsContent(field)"
					@update:modelValue="form[field.key] = $event" />
				<template v-else>
					<label class="cn-settings-form__label" :for="inputId(field)">{{ field.label }}</label>
					<div v-if="field.type === 'file'" class="cn-settings-form__file" :data-testid="`cn-settings-form-file-${field.key}`">
						<span
							:id="inputId(field)"
							class="cn-settings-form__control cn-settings-form__control--file"
							:class="{ 'cn-settings-form__control--placeholder': !form[field.key] }">
							{{ form[field.key] ? fileName(form[field.key]) : field.placeholder }}
						</span>
						<NcButton
							v-if="!field.readOnly"
							variant="secondary"
							:aria-describedby="inputId(field)"
							:data-testid="`cn-settings-form-choose-${field.key}`"
							@click="chooseFile(field)">
							{{ field.chooseLabel }}
						</NcButton>
						<NcButton
							v-if="!field.readOnly && form[field.key]"
							variant="tertiary"
							:data-testid="`cn-settings-form-clear-${field.key}`"
							@click="form[field.key] = ''">
							{{ field.clearLabel }}
						</NcButton>
					</div>
					<select
						v-else-if="field.type === 'reference'"
						:id="inputId(field)"
						v-model="form[field.key]"
						class="cn-settings-form__control"
						:disabled="field.readOnly"
						:aria-busy="referenceState[field.key] === 'loading' ? 'true' : null"
						:data-testid="`cn-settings-form-reference-${field.key}`">
						<option v-for="option in referenceChoices(field)" :key="option.value" :value="option.value">
							{{ option.label }}
						</option>
					</select>
					<select
						v-else-if="field.type === 'select'"
						:id="inputId(field)"
						v-model="form[field.key]"
						class="cn-settings-form__control"
						:disabled="field.readOnly">
						<option v-for="option in field.options" :key="String(option.value)" :value="option.value">
							{{ option.label }}
						</option>
					</select>
					<textarea
						v-else-if="field.type === 'textarea'"
						:id="inputId(field)"
						v-model="form[field.key]"
						class="cn-settings-form__control cn-settings-form__control--area"
						:rows="field.rows"
						:placeholder="field.placeholder"
						:readonly="field.readOnly" />
					<input
						v-else
						:id="inputId(field)"
						v-model="form[field.key]"
						class="cn-settings-form__control"
						:type="field.type === 'number' ? 'number' : 'text'"
						:min="field.min"
						:max="field.max"
						:placeholder="field.placeholder"
						:readonly="field.readOnly"
						:aria-invalid="errors[field.key] ? 'true' : null">
				</template>
				<p v-if="errors[field.key]" class="cn-settings-form__error" role="alert">
					{{ errors[field.key] }}
				</p>
				<p v-else-if="field.hint" class="cn-settings-form__hint">
					{{ field.hint }}
				</p>
			</div>
		</div>

		<NcNoteCard v-if="notice" :type="noticeType" data-testid="cn-settings-form-notice">
			{{ notice }}
		</NcNoteCard>

		<div v-if="!readOnly" class="cn-settings-form__actions">
			<NcButton
				variant="primary"
				type="submit"
				:disabled="saving"
				data-testid="cn-settings-form-save">
				{{ saveLabel }}
			</NcButton>
		</div>
	</form>
</template>

<script>
import { FilePickerClosed, getFilePickerBuilder } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcNoteCard } from '@nextcloud/vue'
import CnChipsFieldWidget from '../CnChipsFieldWidget/CnChipsFieldWidget.vue'
import { pickRefLabel } from '../../composables/useRefLabels.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { prefixUrl } from '../../utils/headers.js'
import { changedFields, objectUrlOf, writeFields } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

// The native file-picker modal ships its chrome styles here; without this the
// spawned picker renders unstyled. Rules are scoped to the picker/dialog classes.
import '@nextcloud/dialogs/style.css'

const TYPES = ['text', 'textarea', 'select', 'switch', 'number', 'file', 'chips', 'reference']

let uid = 0

/**
 * CnSettingsFormWidget — the `settings-form` widget: fields of the CURRENT
 * object as a one- or two-column grid of framed inputs with light labels and
 * hints, saved by ONE PATCH of the fields that changed since the last save.
 *
 * "Last save" is the baseline this widget keeps: a save moves it forward, so
 * editing a field back to the value the page loaded with, after a save, still
 * counts as a change (comparing against the loaded object skipped that PATCH).
 *
 * @spec openspec/changes/abstract-settings-form/specs/settings-form/spec.md
 */
export default {
	name: 'CnSettingsFormWidget',

	components: { CnChipsFieldWidget, NcButton, NcCheckboxRadioSwitch, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `fields` (required) — `[{ key, label, type?: 'text'|'textarea'|'select'|'switch'|'number'|'file'|'chips'|'reference', register?, schema?, labelField?, valueTemplate?, filter?, limit?, emptyLabel?, default?, minItems?, required?, minItemsMessage?, lowercase?, addLabel?, confirmLabel?, removeLabel?, picker?: { title?, mimeTypes?, startAt?, valueTemplate? }, chooseLabel?, clearLabel?, hint?, placeholder?, options?: [{ value, label }], required?, pattern?, patternMessage?, min?, max?, rows?, wide?, readOnly? }]`; `key` is a field of the object, a top-level name or a dot-path.
		 * - `save` — `{ url, method?, payload? }`, write through an app endpoint (tokens `{value}`, `{field}`, `{changes}`, `{object.<path>}`).
		 * - `columns` — 1 or 2 (default 2).
		 * - `saveLabel`, `savedText`, `readOnly`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The current detail-page object. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The current object id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** OpenRegister register slug of the surface. */
		register: {
			type: [String, Object],
			default: '',
		},

		/** OpenRegister schema slug of the surface. */
		schema: {
			type: [String, Object],
			default: '',
		},
	},

	emits: ['saved'],

	data() {
		uid += 1
		return {
			uid,
			form: {},
			baseline: {},
			loaded: {},
			// `reference` fields: the objects to choose from and the read's state (`loading`, `ready`, `error`), by field key.
			referenceOptions: {},
			referenceState: {},
			errors: {},
			saving: false,
			notice: '',
			noticeType: 'success',
		}
	},

	computed: {
		/**
		 * The configured fields, normalised and translated.
		 *
		 * @return {Array<object>}
		 */
		fields() {
			const list = Array.isArray(this.content.fields) ? this.content.fields : []
			return list
				.filter((field) => field && field.key)
				.map((field) => ({
					...field,
					type: TYPES.includes(field.type) ? field.type : 'text',
					label: this.tr(field.label || field.key),
					hint: this.tr(field.hint || ''),
					placeholder: this.tr(field.placeholder || ''),
					chooseLabel: this.tr(field.chooseLabel || 'Choose a file'),
					clearLabel: this.tr(field.clearLabel || 'Remove'),
					rows: field.rows || 3,
					wide: field.wide === true || field.type === 'textarea',
					readOnly: this.readOnly || field.readOnly === true,
					options: (Array.isArray(field.options) ? field.options : []).map((option) => (
						typeof option === 'object' && option !== null
							? { value: option.value, label: this.tr(String(option.label ?? option.value)) }
							: { value: option, label: this.tr(String(option)) }
					)),
				}))
		},

		columns() {
			return this.content.columns === 1 ? 1 : 2
		},

		readOnly() {
			return this.content.readOnly === true
		},

		saveLabel() {
			return this.tr(this.content.saveLabel || 'Save')
		},

		/** The object URL the form is saved to, or '' when it is not known. */
		objectUrl() {
			return objectUrlOf(this.register, this.schema, this.objectId || (this.objectData && this.objectData.id))
		},
	},

	watch: {
		objectData() {
			this.adopt()
		},
	},

	created() {
		this.adopt(true)
		this.loadReferences()
	},

	methods: {
		/**
		 * Read the objects each `reference` field chooses from: one list read
		 * per field of its `register` and `schema` (`filter` as query
		 * parameters, at most `limit`, 100 by default). A failed read leaves the
		 * field with its stored value only, and says so in the hint's place.
		 *
		 * @spec openspec/changes/screens-settings-form-reference/specs/settings-form/spec.md#requirement-a-settings-form-field-can-pick-an-object
		 * @return {Promise<void>}
		 */
		async loadReferences() {
			const fields = this.fields.filter((field) => field.type === 'reference' && typeof field.register === 'string' && field.register !== '' && typeof field.schema === 'string' && field.schema !== '')
			if (fields.length === 0) {
				return
			}
			const { default: axios } = await import('@nextcloud/axios')
			await Promise.all(fields.map(async (field) => {
				this.referenceState = { ...this.referenceState, [field.key]: 'loading' }
				try {
					const url = `/apps/openregister/api/objects/${encodeURIComponent(field.register)}/${encodeURIComponent(field.schema)}`
					const params = { ...(field.filter && typeof field.filter === 'object' ? field.filter : {}), _limit: Number(field.limit) > 0 ? Number(field.limit) : 100 }
					const { data } = await axios.get(prefixUrl(url), { params })
					const rows = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
					const options = []
					for (const row of rows) {
						const id = row && (row.id ?? row.uuid ?? (row['@self'] && row['@self'].id))
						if (id === undefined || id === null || id === '') {
							continue
						}
						const scope = { ...row, id, register: field.register, schema: field.schema }
						const value = fillTemplate(typeof field.valueTemplate === 'string' && field.valueTemplate !== '' ? field.valueTemplate : '{id}', scope)
						if (value !== '') {
							options.push({ value, label: pickRefLabel(row, field.labelField) || String(id) })
						}
					}
					this.referenceOptions = { ...this.referenceOptions, [field.key]: options }
					this.referenceState = { ...this.referenceState, [field.key]: 'ready' }
				} catch {
					this.referenceOptions = { ...this.referenceOptions, [field.key]: [] }
					this.referenceState = { ...this.referenceState, [field.key]: 'error' }
					this.errors = { ...this.errors, [field.key]: this.tr('The list to choose from could not be loaded.') }
				}
			}))
		},

		/**
		 * The choices of a `reference` field: "none" (unless required), the
		 * objects read, and the value the form holds when it is not one of
		 * them (a free string such as a URL stays selectable, as it is stored).
		 *
		 * @param {object} field The field.
		 * @return {Array<{value: string, label: string}>}
		 */
		referenceChoices(field) {
			const options = this.referenceOptions[field.key] || []
			const current = this.form[field.key]
			const choices = field.required ? [] : [{ value: '', label: this.tr(field.emptyLabel || 'None') }]
			if (typeof current === 'string' && current !== '' && !options.some((option) => option.value === current)) {
				choices.push({ value: current, label: current })
			}
			return [...choices, ...options]
		},

		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		inputId(field) {
			return `cn-settings-form-${this.uid}-${field.key}`
		},

		/**
		 * The name shown for a stored file value: its last path segment.
		 *
		 * @param {string} value The stored value.
		 * @return {string}
		 */
		fileName(value) {
			const text = String(value)
			return text.split('/').filter(Boolean).pop() || text
		},

		/**
		 * Open the Nextcloud file picker and take the chosen file as the value.
		 * `field.picker` = `{ title?, mimeTypes?, startAt?, valueTemplate? }`; the
		 * template's `{path}`, `{fileid}` and `{name}` are filled from the chosen
		 * node (default `{path}`).
		 *
		 * @param {object} field The field.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-settings-form-file/specs/settings-form/spec.md#requirement-a-file-field-takes-a-file-from-the-nextcloud-picker
		 */
		async chooseFile(field) {
			const picker = field.picker || {}
			let builder = getFilePickerBuilder(this.tr(picker.title || field.label))
				.setMultiSelect(false)
				.allowDirectories(false)
				.startAt(picker.startAt || '/')
				.addButton({ label: t('nextcloud-vue', 'Choose'), type: 'primary', callback: () => {} })
			if (Array.isArray(picker.mimeTypes) && picker.mimeTypes.length > 0) {
				builder = builder.setMimeTypeFilter(picker.mimeTypes)
			}
			try {
				const nodes = await builder.build().pickNodes()
				const node = Array.isArray(nodes) ? nodes[0] : nodes
				if (!node) {
					return
				}
				this.form[field.key] = String(picker.valueTemplate || '{path}').replace(/\{(path|fileid|name)\}/g, (match, part) => {
					const value = part === 'name' ? (node.basename || this.fileName(node.path)) : node[part]
					return value === undefined || value === null ? '' : String(value)
				})
			} catch (e) {
				if (e instanceof FilePickerClosed) {
					return
				}
				this.noticeType = 'error'
				this.notice = this.tr('The file picker could not be opened.')
			}
		},

		/**
		 * The stored value of a field as the input holds it.
		 *
		 * @param {object} field The field.
		 * @return {unknown}
		 */
		stored(field) {
			const value = readPath(this.objectData || {}, field.key)
			if (field.type === 'switch') {
				return value === true
			}
			if (field.type === 'chips') {
				return Array.isArray(value) ? value.map((item) => String(item)) : []
			}
			return value === undefined || value === null ? '' : value
		},

		/**
		 * The value the input shows for a field: the stored one, else the field's
		 * `default` when nothing is stored. The baseline stays the stored value, so
		 * a default that was never saved counts as a change and the next Save writes it.
		 *
		 * @param {object} field The field.
		 * @return {unknown}
		 */
		shown(field) {
			const value = this.stored(field)
			const absent = readPath(this.objectData || {}, field.key) === undefined || readPath(this.objectData || {}, field.key) === null || value === '' || (field.type === 'chips' && value.length === 0)
			if (absent && field.default !== undefined) {
				return field.type === 'chips' && Array.isArray(field.default) ? [...field.default] : field.default
			}
			return value
		},

		/**
		 * Take the object's values as the new baseline; a field the person has
		 * not touched follows it, a touched one keeps the typed value.
		 *
		 * @param {boolean} [first] Whether this is the first read.
		 */
		adopt(first = false) {
			const baseline = {}
			const loaded = {}
			const form = {}
			for (const field of this.fields) {
				baseline[field.key] = this.stored(field)
				loaded[field.key] = this.shown(field)
				const untouched = first || JSON.stringify(this.form[field.key]) === JSON.stringify(this.loaded[field.key])
				form[field.key] = untouched ? loaded[field.key] : this.form[field.key]
			}
			this.baseline = baseline
			this.loaded = loaded
			this.form = form
		},

		/**
		 * The configuration of the embedded chips widget for a `chips` field.
		 *
		 * @param {object} field The field.
		 * @return {object}
		 */
		chipsContent(field) {
			return {
				label: field.label,
				hint: field.hint,
				placeholder: field.placeholder,
				addLabel: field.addLabel,
				confirmLabel: field.confirmLabel,
				removeLabel: field.removeLabel,
				pattern: field.pattern,
				patternMessage: field.patternMessage,
				lowercase: field.lowercase,
				options: field.options,
				minItems: field.minItems,
				required: field.required,
				minItemsMessage: field.minItemsMessage,
				readOnly: field.readOnly,
			}
		},

		/**
		 * The value to send for a field: numbers as numbers, an empty value as null.
		 *
		 * @param {object} field The field.
		 * @return {unknown}
		 */
		outgoing(field) {
			const value = this.form[field.key]
			if (field.type === 'number') {
				return value === '' || value === null || value === undefined ? null : Number(value)
			}
			if (field.type === 'switch') {
				return value === true
			}
			if (field.type === 'chips') {
				return Array.isArray(value) ? [...value] : []
			}
			if (typeof value === 'string') {
				return value.trim() === '' ? null : value.trim()
			}
			return value
		},

		/**
		 * Check required, number range and pattern before any write.
		 *
		 * @return {object} Error text by field key.
		 */
		validate() {
			const errors = {}
			for (const field of this.fields) {
				if (field.type === 'switch' || field.readOnly) {
					continue
				}
				const value = this.outgoing(field)
				if (field.type === 'chips') {
					const least = Number(field.minItems) > 0 ? Number(field.minItems) : (field.required ? 1 : 0)
					if (value.length < least) {
						errors[field.key] = this.tr(field.minItemsMessage || 'Keep at least {count}.').replace('{count}', String(least))
					}
					continue
				}
				const empty = value === null || value === undefined || value === ''
				if (empty) {
					if (field.required) {
						errors[field.key] = this.tr('Fill this in.')
					}
					continue
				}
				if (field.type === 'number') {
					if (Number.isNaN(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) {
						errors[field.key] = this.tr('This number is not valid.')
					}
				} else if (field.pattern && !new RegExp(field.pattern).test(String(value))) {
					errors[field.key] = this.tr(field.patternMessage || 'This value is not valid.')
				}
			}
			return errors
		},

		/**
		 * Save: PATCH the fields that differ from the last saved values.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-settings-form/specs/settings-form/spec.md#requirement-a-settings-form-saves-only-what-changed
		 */
		async save() {
			this.errors = this.validate()
			this.notice = ''
			if (Object.keys(this.errors).length > 0) {
				return
			}
			if (!this.objectUrl && !(this.content.save && this.content.save.url)) {
				this.noticeType = 'error'
				this.notice = this.tr('This form cannot be saved here.')
				return
			}
			const next = {}
			const compare = {}
			for (const field of this.fields) {
				if (!field.readOnly) {
					next[field.key] = this.outgoing(field)
					compare[field.key] = this.baseline[field.key] === '' ? null : this.baseline[field.key]
				}
			}
			const patch = changedFields(compare, next)
			this.saving = true
			try {
				if (Object.keys(patch).length > 0) {
					const data = await writeFields(this.objectUrl, patch, { save: this.content.save, object: this.objectData })
					const baseline = { ...this.baseline }
					const loaded = { ...this.loaded }
					const form = { ...this.form }
					for (const key of Object.keys(patch)) {
						const field = this.fields.find((candidate) => candidate.key === key)
						const answered = readPath(data, key)
						const written = answered !== undefined ? answered : patch[key]
						baseline[key] = field.type === 'switch' ? written === true : (written === null ? (field.type === 'chips' ? [] : '') : written)
						form[key] = baseline[key]
						loaded[key] = baseline[key]
					}
					this.baseline = baseline
					this.loaded = loaded
					this.form = form
				}
				this.noticeType = 'success'
				this.notice = this.tr(this.content.savedText || 'Saved.')
				/**
				 * @event saved The changed fields were written.
				 * @type {{patch: object}}
				 */
				this.$emit('saved', { patch })
			} catch (e) {
				this.noticeType = 'error'
				this.notice = serverErrorMessage(e)
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-settings-form {
	display: flex;
	flex-direction: column;
	gap: 14px;
	min-width: 0;
}

.cn-settings-form__grid {
	display: grid;
	gap: 14px 16px;
	grid-template-columns: minmax(0, 1fr);
}

.cn-settings-form__grid--2 {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cn-settings-form__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-settings-form__field--wide {
	grid-column: 1 / -1;
}

.cn-settings-form__label {
	font-size: 13px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-settings-form__control {
	width: 100%;
	box-sizing: border-box;
	height: var(--cn-board-control-height, 40px);
	padding: 0 12px;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--cn-board-control-radius, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font: inherit;
}

.cn-settings-form__file {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-settings-form__control--file {
	display: inline-flex;
	align-items: center;
	width: auto;
	min-width: 120px;
	flex: 0 1 auto;
	overflow-wrap: anywhere;
}

.cn-settings-form__control--placeholder {
	color: var(--color-text-maxcontrast);
}

.cn-settings-form__control--area {
	height: auto;
	padding: 10px 12px;
	resize: vertical;
}

.cn-settings-form__control:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 1px;
}

.cn-settings-form__hint,
.cn-settings-form__error {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-settings-form__error {
	color: var(--color-error-text);
}

.cn-settings-form__actions {
	display: flex;
	justify-content: flex-start;
}

@media (max-width: 640px) {
	.cn-settings-form__grid--2 {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
