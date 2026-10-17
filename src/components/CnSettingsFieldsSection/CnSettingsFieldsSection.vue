<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnSettingsSection
		:name="name"
		:description="description"
		:docUrl="docUrl"
		:wide="wide"
		:loading="loading"
		:error="loadError !== ''"
		:errorMessage="loadError"
		:onRetry="load"
		data-testid="cn-settings-fields-section">
		<form v-if="!loading && loadError === ''"
			class="cn-settings-fields"
			novalidate
			@submit.prevent="save">
			<div class="cn-settings-fields__grid" :class="`cn-settings-fields__grid--${columnCount}`">
				<CnSettingsField
					v-for="field in resolvedFields"
					:key="field.key"
					class="cn-settings-fields__field"
					:class="{ 'cn-settings-fields__field--wide': field.wide }"
					:field="field"
					:modelValue="form[field.key]"
					:error="errors[field.key] || unreadable[field.key] || ''"
					:hint="field.hint"
					@update:modelValue="setValue(field, $event)"
					@uploaded="onUploaded(field, $event)" />
			</div>

			<NcNoteCard v-if="notice"
				:type="notice.type"
				:role="notice.type === 'error' ? 'alert' : 'status'"
				data-testid="cn-settings-fields-notice">
				{{ notice.text }}
			</NcNoteCard>

			<div class="cn-settings-section__save cn-settings-fields__save">
				<span v-if="dirty" class="cn-settings-fields__dirty" data-testid="cn-settings-fields-dirty">
					{{ t('nextcloud-vue', 'Unsaved changes') }}
				</span>
				<NcButton
					variant="primary"
					type="submit"
					:disabled="saving || !dirty"
					data-testid="cn-settings-fields-save">
					<template v-if="saving" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ resolvedSaveLabel }}
				</NcButton>
			</div>
		</form>
	</CnSettingsSection>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'
import { CnSettingsField } from '../CnSettingsField/index.js'
import { CnSettingsSection } from '../CnSettingsSection/index.js'

/**
 * Up to two initials of a name, for an image field without an image.
 *
 * @param {unknown} name The name.
 * @return {string}
 */
function initialsOf(name) {
	return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('')
}

/**
 * CnSettingsFieldsSection - a settings section declared as fields: it reads
 * the app's settings, draws the fields in one to three columns, and saves
 * them with ONE Save button for the section.
 *
 * It reads `GET url` (default `/apps/<appId>/api/settings`) and writes the
 * section's fields with `PUT saveUrl` (default the same url). The Save button
 * is on while something changed ("Unsaved changes"); a save checks the
 * fields first (required, pattern, min, max) and marks each failing field,
 * then says it saved or why it did not. A `secret` field never shows the
 * stored value: it says a value is stored, and is sent only when something
 * was typed.
 *
 * It renders inside CnAdminSettingsShell and CnSettingsPage, in the default
 * and the board look.
 *
 * ```vue
 * <CnSettingsFieldsSection
 *   app-id="myapp"
 *   name="Connection"
 *   :columns="2"
 *   :fields="[
 *     { key: 'baseUrl', label: 'Server address', required: true, pattern: '^https://', patternMessage: 'Starts with https://' },
 *     { key: 'apiKey', label: 'API key', type: 'secret' },
 *     { key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'live', label: 'Live' }, { value: 'test', label: 'Test' }] },
 *     { key: 'enabled', label: 'Enabled', type: 'switch', hint: 'Off stops every call.' },
 *   ]" />
 * ```
 */
export default {
	name: 'CnSettingsFieldsSection',

	components: { CnSettingsField, CnSettingsSection, NcButton, NcLoadingIcon, NcNoteCard },

	inject: {
		/** The app's translate function; identity outside CnAppRoot. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The section title. */
		name: {
			type: String,
			required: true,
		},

		/** The line under the title. */
		description: {
			type: String,
			default: '',
		},

		/** A documentation link beside the title. */
		docUrl: {
			type: String,
			default: '',
		},

		/** Span the whole settings grid in the board look. */
		wide: {
			type: Boolean,
			default: false,
		},

		/**
		 * The fields: `[{ key, label, type?, hint?, placeholder?, required?,
		 * pattern?, patternMessage?, min?, max?, rows?, options?, optionsUrl?,
		 * optionsPath?, optionLabel?, optionValue?, default?, readOnly?, wide?,
		 * url?, valuePath?, saveUrl?, saveMethod?, saveKey?, uploadUrl?,
		 * uploadField?, uploadParams?, uploadValuePath?, initials?, initialsFrom? }]`.
		 * `type` is `text` (default), `textarea`, `number`, `switch`, `select`,
		 * `secret` or `image`. `key` names the setting; a dotted key reads a
		 * nested value and is written as written. A field with its own `url`
		 * is read there (at `valuePath`, default its key) and saved to its
		 * `saveUrl` (default that `url`) with `saveMethod` (default POST) under
		 * `saveKey` (default its key), so one section can hold the settings of
		 * several apps. An `image` uploads at once to `uploadUrl`. Labels,
		 * hints, placeholders and messages go through the app's translate
		 * function.
		 *
		 * @type {Array<object>}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-section-declared-as-fields-reads-and-saves-the-apps-settings
		 */
		fields: {
			type: Array,
			required: true,
		},

		/** Columns of the field grid: 1, 2 or 3. A narrow card stacks them. */
		columns: {
			type: Number,
			default: 1,
			validator: (value) => [1, 2, 3].includes(value),
		},

		/** The app id, for the default url `/apps/<appId>/api/settings`. */
		appId: {
			type: String,
			default: '',
		},

		/** Where the settings are read (`GET`); app-absolute or a full URL. */
		url: {
			type: String,
			default: '',
		},

		/** Where the section saves; defaults to `url`. */
		saveUrl: {
			type: String,
			default: '',
		},

		/** The method of the save request. */
		saveMethod: {
			type: String,
			default: 'PUT',
			validator: (value) => ['PUT', 'POST', 'PATCH'].includes(String(value).toUpperCase()),
		},

		/** A dotted path to the values in the GET answer; empty reads the answer itself. */
		valuesPath: {
			type: String,
			default: '',
		},

		/** The Save button's label. Defaults to "Save". */
		saveLabel: {
			type: String,
			default: '',
		},
	},

	emits: ['saved', 'save-error'],

	data() {
		return {
			form: {},
			baseline: {},
			storedSecrets: {},
			// Field key to the message of a read target that failed.
			unreadable: {},
			errors: {},
			loading: true,
			loadError: '',
			saving: false,
			notice: null,
		}
	},

	computed: {
		/** @return {number} The column count, 1 to 3. */
		columnCount() {
			return [1, 2, 3].includes(this.columns) ? this.columns : 1
		},

		/** @return {string} Where the settings are read: `url`, else the app's settings endpoint. */
		readTarget() {
			return this.url || (this.appId ? `/apps/${this.appId}/api/settings` : '')
		},

		/** @return {string} Where the section saves: `saveUrl`, else the read target. */
		writeTarget() {
			return this.saveUrl || this.readTarget
		},

		/**
		 * The declared fields with their text translated and a secret's stored state.
		 *
		 * @return {Array<object>}
		 */
		resolvedFields() {
			return (Array.isArray(this.fields) ? this.fields : [])
				.filter((field) => field && typeof field.key === 'string' && field.key !== '')
				.map((field) => ({
					...field,
					label: this.tr(field.label || field.key),
					hint: this.tr(field.hint || ''),
					placeholder: this.tr(field.placeholder || ''),
					secretSet: field.type === 'secret' ? !!this.storedSecrets[field.key] : undefined,
					initials: field.type === 'image' ? initialsOf(field.initialsFrom ? this.form[field.initialsFrom] : field.initials) : undefined,
					readOnly: field.readOnly || !!this.unreadable[field.key],
				}))
		},

		/**
		 * Whether something changed since the last load or save.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-one-save-per-section-with-a-dirty-state
		 */
		dirty() {
			return this.resolvedFields.some((field) => field.type !== 'image' && !this.same(this.form[field.key], this.baseline[field.key]))
		},

		/** @return {string} The Save button's label. */
		resolvedSaveLabel() {
			return this.saveLabel ? this.tr(this.saveLabel) : t('nextcloud-vue', 'Save')
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,

		/**
		 * @param {string} value A declared string.
		 * @return {string} It through the app's translate function.
		 */
		tr(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : (value || '')
		},

		/**
		 * @param {unknown} a A value.
		 * @param {unknown} b Another.
		 * @return {boolean} Whether they count as the same setting.
		 */
		same(a, b) {
			const empty = (v) => v === null || v === undefined || v === ''
			if (empty(a) && empty(b)) {
				return true
			}
			return JSON.stringify(a) === JSON.stringify(b)
		},

		/**
		 * Change a field's value; its error goes until the next save.
		 *
		 * @param {object} field The field.
		 * @param {unknown} value The value.
		 * @return {void}
		 */
		setValue(field, value) {
			this.form = { ...this.form, [field.key]: value }
			if (this.errors[field.key]) {
				const { [field.key]: _gone, ...rest } = this.errors
				this.errors = rest
			}
			this.notice = null
		},

		/**
		 * Read the settings and fill the fields; a secret's value is never put
		 * in the form, only whether one is stored.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.loadError = ''
			try {
				// One GET per distinct read target; the section's own target must
				// answer, a field's own target may fail on its own.
				const targets = [...new Set(this.fields
					.filter((field) => field && field.key)
					.map((field) => this.readUrlOf(field))
					.filter(Boolean))]
				const answers = {}
				const failures = {}
				await Promise.all(targets.map(async (target) => {
					try {
						const response = await axios.get(prefixUrl(target))
						answers[target] = response?.data ?? {}
					} catch (error) {
						failures[target] = error
					}
				}))
				if (this.readTarget && failures[this.readTarget]) {
					throw failures[this.readTarget]
				}
				const form = {}
				const stored = {}
				const unreadable = {}
				for (const field of this.fields || []) {
					if (!field || !field.key) {
						continue
					}
					const target = this.readUrlOf(field)
					if (target && failures[target]) {
						unreadable[field.key] = t('nextcloud-vue', 'This value could not be loaded: {reason}', { reason: serverErrorMessage(failures[target]) })
					}
					const raw = this.readValue(field, target ? answers[target] : null)
					if (field.type === 'secret') {
						stored[field.key] = raw !== null && raw !== undefined && raw !== '' && raw !== false
						form[field.key] = ''
						continue
					}
					form[field.key] = raw === undefined ? (field.default ?? (field.type === 'switch' ? false : '')) : raw
				}
				this.form = form
				this.baseline = { ...form }
				this.storedSecrets = stored
				this.unreadable = unreadable
				this.errors = {}
			} catch (error) {
				this.loadError = t('nextcloud-vue', 'The settings could not be loaded: {reason}', { reason: serverErrorMessage(error) })
			} finally {
				this.loading = false
			}
		},

		/**
		 * Where a field is read: its own `url`, else the section's.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-field-can-read-and-save-elsewhere
		 */
		readUrlOf(field) {
			return field.url || this.readTarget
		},

		/**
		 * A field's value in its read answer: at its `valuePath` (a field with its
		 * own `url`), else at the section's `valuesPath`, then its `key`.
		 *
		 * @param {object} field The field.
		 * @param {object|null} data The answer of the field's read target.
		 * @return {unknown}
		 */
		readValue(field, data) {
			if (!data || typeof data !== 'object') {
				return undefined
			}
			if (field.url) {
				return readPath(data, field.valuePath || field.key)
			}
			const values = (this.valuesPath ? readPath(data, this.valuesPath) : data) || {}
			return Object.hasOwn(values, field.key) ? values[field.key] : readPath(values, field.key)
		},

		/**
		 * Check the fields: required, pattern, and a number's min and max.
		 *
		 * @return {object} Field key to message; empty when all pass.
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-failing-field-says-why
		 */
		validate() {
			const errors = {}
			for (const field of this.resolvedFields) {
				const value = this.form[field.key]
				const empty = value === null || value === undefined || value === ''
				if (field.type === 'switch' || field.type === 'image' || this.unreadable[field.key]) {
					continue
				}
				if (field.required && empty && !(field.type === 'secret' && field.secretSet)) {
					errors[field.key] = t('nextcloud-vue', '{field} is required.', { field: field.label })
					continue
				}
				if (empty) {
					continue
				}
				if (field.pattern && !new RegExp(field.pattern).test(String(value))) {
					errors[field.key] = field.patternMessage ? this.tr(field.patternMessage) : t('nextcloud-vue', '{field} is not in the right form.', { field: field.label })
					continue
				}
				if (field.type === 'number') {
					const number = Number(value)
					if (Number.isNaN(number)) {
						errors[field.key] = t('nextcloud-vue', '{field} must be a number.', { field: field.label })
					} else if (field.min !== undefined && number < field.min) {
						errors[field.key] = t('nextcloud-vue', '{field} must be at least {min}.', { field: field.label, min: field.min })
					} else if (field.max !== undefined && number > field.max) {
						errors[field.key] = t('nextcloud-vue', '{field} must be at most {max}.', { field: field.label, max: field.max })
					}
				}
			}
			return errors
		},

		/**
		 * Save the section's fields in one request, after checking them. A
		 * secret is sent only when something was typed.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-one-save-per-section-with-a-dirty-state
		 */
		async save() {
			if (this.saving) {
				return
			}
			this.errors = this.validate()
			const failing = Object.keys(this.errors)
			if (failing.length > 0) {
				this.notice = { type: 'error', text: t('nextcloud-vue', 'Check the marked fields.') }
				this.$nextTick(() => {
					const el = this.$el?.querySelector?.('[aria-invalid="true"], .cn-settings-field__error')
					const control = el?.closest?.('.cn-settings-field')?.querySelector?.('input, textarea, [role="combobox"]')
					control?.focus?.()
				})
				return
			}
			// The changed fields, one request per save target, each carrying its
			// own fields under their `saveKey`. A secret goes only when typed; an
			// image is uploaded on its own; a field that could not be read is left out.
			const groups = new Map()
			for (const field of this.resolvedFields) {
				const value = this.form[field.key]
				if (field.type === 'image' || this.unreadable[field.key] || this.same(value, this.baseline[field.key])) {
					continue
				}
				if (field.type === 'secret' && (value === '' || value === null || value === undefined)) {
					continue
				}
				const url = field.saveUrl || (field.url ? field.url : this.writeTarget)
				const method = String(field.saveMethod || (field.saveUrl || field.url ? 'POST' : this.saveMethod)).toLowerCase()
				const id = `${method} ${url}`
				if (!groups.has(id)) {
					groups.set(id, { url, method, fields: [], data: {} })
				}
				const group = groups.get(id)
				group.fields.push(field)
				group.data[field.saveKey || field.key] = value
			}
			this.saving = true
			this.notice = null
			const failed = []
			const sent = {}
			for (const group of groups.values()) {
				try {
					await axios.request({ url: prefixUrl(group.url), method: group.method, data: group.data })
					Object.assign(sent, group.data)
					this.acceptSaved(group.fields)
				} catch (error) {
					failed.push({ group, error })
				}
			}
			this.saving = false
			if (failed.length === 0) {
				this.notice = { type: 'success', text: t('nextcloud-vue', 'Saved.') }
				/**
				 * @event saved The section saved. Payload: what was sent, by save key.
				 */
				this.$emit('saved', sent)
				return
			}
			const reasons = failed.map(({ group, error }) => (groups.size > 1
				? t('nextcloud-vue', '{fields}: {reason}', { fields: group.fields.map((field) => field.label).join(', '), reason: serverErrorMessage(error) })
				: serverErrorMessage(error)))
			this.notice = { type: 'error', text: t('nextcloud-vue', 'The settings could not be saved: {reason}', { reason: reasons.join('; ') }) }
			/**
			 * @event save-error A save request failed. Payload: the first error.
			 */
			this.$emit('save-error', failed[0].error)
		},

		/**
		 * Take saved fields as the new baseline; a saved secret reads as stored.
		 *
		 * @param {Array<object>} fields The fields that saved.
		 * @return {void}
		 */
		acceptSaved(fields) {
			const form = { ...this.form }
			const baseline = { ...this.baseline }
			const stored = { ...this.storedSecrets }
			for (const field of fields) {
				if (field.type === 'secret') {
					stored[field.key] = true
					form[field.key] = ''
				}
				baseline[field.key] = form[field.key]
			}
			this.form = form
			this.baseline = baseline
			this.storedSecrets = stored
		},

		/**
		 * An image field uploaded a file: its new value is the baseline too.
		 *
		 * @param {object} field The field.
		 * @param {string} value The new image url.
		 * @return {void}
		 */
		onUploaded(field, value) {
			this.form = { ...this.form, [field.key]: value }
			this.baseline = { ...this.baseline, [field.key]: value }
			this.notice = { type: 'success', text: t('nextcloud-vue', 'Saved.') }
		},
	},
}
</script>

<style scoped>
.cn-settings-fields {
	display: flex;
	flex-direction: column;
	gap: 16px;
	container-type: inline-size;
}

.cn-settings-fields__grid {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 16px 20px;
}

/* Two or three columns where the card is wide enough; stacked otherwise. */
@container (min-width: 520px) {
	.cn-settings-fields__grid--2,
	.cn-settings-fields__grid--3 {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@container (min-width: 780px) {
	.cn-settings-fields__grid--3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

.cn-settings-fields__field--wide {
	grid-column: 1 / -1;
}

.cn-settings-fields__save {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
}

.cn-settings-fields__dirty {
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}
</style>
