<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<component
		:is="bare ? 'div' : 'CnSettingsSection'"
		v-bind="bare ? { class: 'cn-settings-fields-section--bare' } : sectionProps"
		data-testid="cn-settings-fields-section">
		<template v-if="bare">
			<NcLoadingIcon v-if="loading" :size="24" data-testid="cn-settings-fields-loading" />
			<NcNoteCard v-else-if="loadError !== ''" type="error" data-testid="cn-settings-fields-load-error">
				{{ loadError }}
			</NcNoteCard>
		</template>
		<form v-if="!loading && loadError === ''"
			class="cn-settings-fields"
			novalidate
			@submit.prevent="save">
			<div v-if="hintsToggle" class="cn-settings-fields__hints-toggle">
				<NcButton
					variant="tertiary"
					:aria-expanded="showHints ? 'true' : 'false'"
					data-testid="cn-settings-fields-hints-toggle"
					@click="showHints = !showHints">
					{{ showHints ? t('nextcloud-vue', 'Hide the explanations') : t('nextcloud-vue', 'Show the explanations') }}
				</NcButton>
			</div>
			<div class="cn-settings-fields__grid" :class="`cn-settings-fields__grid--${columnCount}`">
				<CnSettingsField
					v-for="field in visibleFields"
					:key="field.key"
					class="cn-settings-fields__field"
					:class="{ 'cn-settings-fields__field--wide': field.wide || isFullWidth(field) }"
					:field="field"
					:modelValue="form[field.key]"
					:error="errors[field.key] || unreadable[field.key] || ''"
					:hint="field.hint"
					@update:modelValue="setValue(field, $event)"
					@uploaded="onUploaded(field, $event)"
					@clear="setClearing(field, $event)"
					@action="runAction(field)" />
			</div>

			<NcNoteCard v-if="notice"
				:type="notice.type"
				:role="notice.type === 'error' ? 'alert' : 'status'"
				data-testid="cn-settings-fields-notice">
				{{ notice.text }}
			</NcNoteCard>

			<div v-if="!autoSave && hasInputs" class="cn-settings-section__save cn-settings-fields__save">
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
	</component>
</template>

<script>
import axios from '@nextcloud/axios'
import { showConfirmation } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'
import { CnSettingsField } from '../CnSettingsField/index.js'
import { CnSettingsSection } from '../CnSettingsSection/index.js'

/**
 * A value by key: the key as written when the object holds it (a flat map
 * with dotted keys such as `integration.brk.mode`), else as a dotted path.
 *
 * @param {object} data The object.
 * @param {string} key The key or dotted path.
 * @return {unknown}
 */
function literalFirst(data, key) {
	if (data && typeof data === 'object' && Object.hasOwn(data, key)) {
		return data[key]
	}
	return readPath(data, key)
}

/**
 * The request options for a target: an OCS endpoint (`/ocs/...`) needs the
 * `OCS-APIRequest` header; `prefixUrl` already serves it outside index.php.
 *
 * @param {string} url The target.
 * @return {object}
 */
function ocsConfig(url) {
	return /^\/ocs\//.test(String(url)) ? { headers: { 'OCS-APIRequest': 'true' } } : {}
}

/** Types that hold no value of their own: never read into the form's dirty state, checked or saved. */
const VALUELESS_TYPES = ['heading', 'status', 'action']

/** Types whose value is a list of choices (a `select` with `multiple` too). */
const LIST_TYPES = ['checkboxes']

/** Types drawn across the whole grid. */
const FULL_WIDTH_TYPES = ['heading', 'status']

/**
 * Whether a stored value reads as on: a boolean, or `1`, `true`, `yes` or `on`.
 *
 * @param {unknown} value The stored value.
 * @return {boolean}
 */
function isOn(value) {
	if (typeof value === 'boolean') {
		return value
	}
	return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase())
}

/**
 * @param {unknown} value A value.
 * @return {boolean} Whether it is null, undefined or an empty string.
 */
function isEmpty(value) {
	return value === null || value === undefined || value === ''
}

/**
 * Put `{name}` placeholders' values in a text; an unknown name stays as written.
 *
 * @param {string} text The text.
 * @param {(name: string) => unknown} lookup The value of a name.
 * @return {string}
 */
function interpolate(text, lookup) {
	return String(text || '').replace(/\{([A-Za-z0-9_.-]+)\}/g, (whole, name) => {
		const value = lookup(name)
		return isEmpty(value) || typeof value === 'object' ? whole : String(value)
	})
}

/**
 * A random value of `bytes` bytes as hexadecimal, from the browser's
 * cryptographic random source.
 *
 * @param {number} bytes How many bytes.
 * @return {string}
 */
function randomHex(bytes) {
	const values = new Uint8Array(Math.max(1, Number(bytes) || 32))
	globalThis.crypto.getRandomValues(values)
	return Array.from(values, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * The text of a lines field: one entry per line, from a list or a JSON list.
 *
 * @param {unknown} raw The stored value.
 * @return {string}
 */
function linesText(raw) {
	let list = raw
	if (typeof raw === 'string') {
		try {
			list = JSON.parse(raw)
		} catch {
			return raw
		}
	}
	return Array.isArray(list) ? list.map((entry) => String(entry).trim()).filter(Boolean).join('\n') : ''
}

/**
 * The entries of a lines field's text, trimmed, without empty lines or repeats.
 *
 * @param {unknown} text The text.
 * @return {Array<string>}
 */
function linesList(text) {
	return [...new Set(String(text || '').split('\n').map((line) => line.trim()).filter(Boolean))]
}

/**
 * A multi-choice value as a list: a list, a JSON list, or comma text.
 *
 * @param {unknown} raw The stored value.
 * @return {Array}
 */
function choiceList(raw) {
	if (Array.isArray(raw)) {
		return raw
	}
	if (typeof raw !== 'string' || raw.trim() === '') {
		return []
	}
	try {
		const parsed = JSON.parse(raw)
		if (Array.isArray(parsed)) {
			return parsed
		}
	} catch {
		// Not JSON: comma text.
	}
	return raw.split(',').map((entry) => entry.trim()).filter(Boolean)
}

/**
 * An object stored as an object or as JSON text, and whether it was text.
 *
 * @param {unknown} raw The stored value.
 * @return {{object: object, text: boolean}}
 */
function storedObject(raw) {
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw || '{}')
			return { object: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}, text: true }
		} catch {
			return { object: {}, text: true }
		}
	}
	return { object: raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}, text: false }
}

/**
 * A field's `path` split into the setting that holds JSON and the key inside it.
 *
 * @param {object} field The field.
 * @return {{root: string, rest: string}|null}
 */
function pathParts(field) {
	const path = typeof field.path === 'string' ? field.path : ''
	const dot = path.indexOf('.')
	return dot > 0 ? { root: path.slice(0, dot), rest: path.slice(dot + 1) } : null
}

/**
 * The sentence a refused request came back with: the body's `message` when
 * there is one (a refusal names its rule under `error` and says it under
 * `message`), else the clearest message available.
 *
 * @param {unknown} error The rejected value.
 * @return {string}
 */
function refusalMessage(error) {
	const message = error?.response?.data?.message
	return typeof message === 'string' && message.trim() !== '' && message.length <= 400 && !/^\s*</.test(message)
		? message.trim()
		: serverErrorMessage(error)
}

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
 * Besides value fields a section can hold a `heading`, a read-only `status`
 * note (static `text`, or `textMap` by the value read at its key, with `tone`
 * or `toneMap`) and an `action` button (it posts to its `url`, or with `fill`
 * puts a random value in another field, and shows the server's sentence). A
 * field with `visibleWhen` shows only while its condition holds. With
 * `hintsToggle` the hints fold away behind one button.
 *
 * It renders inside CnAdminSettingsShell and CnSettingsPage, in the default
 * and the board look; with `bare` it draws no card of its own (for a host
 * that already gives the section its title, such as a settings dialog).
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

		/** A longer explanation in its own block under the title. */
		detailedDescription: {
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
		 * pattern?, patternMessage?, min?, max?, integer?, rows?, options?, optionsUrl?,
		 * optionsPath?, optionLabel?, optionValue?, default?, readOnly?, wide?,
		 * url?, valuePath?, saveUrl?, saveMethod?, saveKey?, saveParams?, uploadUrl?,
		 * uploadField?, uploadParams?, uploadValuePath?, initials?, initialsFrom?,
		 * visibleWhen?, trueValue?, falseValue?, setKey?, saveAs?, text?, textMap?,
		 * tone?, toneMap?, method?, send?, resultPath?, okPath?, successText?, failureText?, fill?,
		 * multiple?, keyLabel?, valueLabel?, valueType?, valueAbove?, valueMessage?, addLabel?,
		 * path?, scope? }]`.
		 * `type` is `text` (default), `textarea`, `number`, `switch`, `select`,
		 * `radio`, `checkboxes`, `pairs`, `lines`, `secret`, `image`, `heading`,
		 * `status` or `action`. A `checkboxes` field (or a `select` with
		 * `multiple`) saves its choices as a list, or with `saveAs` `json` or
		 * `csv` as JSON or comma text. A `pairs` field edits key-to-value rows
		 * and saves them as one object (JSON text with `saveAs: 'json'`); its
		 * `pattern` checks each key and `valueAbove` each value. A
		 * field with `path: 'setting.key'` edits one key inside a JSON-valued
		 * setting and saves the whole setting back. A field with `scope: true`
		 * is never saved: its value fills `{key}` in the urls, and a change
		 * reads the section again.
		 * `default` stands in for a value that is missing or empty. A switch
		 * reads `1`/`true`/`yes`/`on` as on and saves `trueValue`/`falseValue`
		 * when declared. A secret says it is stored from `setKey` when the
		 * server answers that under another key. A `lines` field edits a list
		 * one entry per line and saves it as a list, or as JSON text with
		 * `saveAs: 'json'`. `visibleWhen` is `{ key, equals?, notEquals?, in?,
		 * empty? }` (or a list of them, all of which must hold) over the form
		 * and the values read; a hidden field is not checked. An action posts
		 * the `send` fields to `url` with `method` (default POST) and shows the
		 * answer at `resultPath` (default `message`), as an error when `okPath`
		 * reads false; without a sentence there it says `successText` (or
		 * `failureText` when `okPath` reads false), `{name}` filled from the
		 * answer; with `fill: { key, bytes }` it puts a random value in
		 * that field instead. `key` names the setting; a dotted key reads a
		 * nested value and is written as written. A field with its own `url`
		 * is read there (at `valuePath`, default its key) and saved to its
		 * `saveUrl` (default that `url`) with `saveMethod` (default POST) under
		 * `saveKey` (default its key), with `saveParams` merged into the body,
		 * so one section can hold the settings of several apps. A target under
		 * `/ocs/` is sent the `OCS-APIRequest` header. An `image` uploads at once to `uploadUrl`. Labels,
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

		/**
		 * The note after a save. `{name}` takes the value of that field or of
		 * that key in the values read. Defaults to "Saved.".
		 */
		savedMessage: {
			type: String,
			default: '',
		},

		/** Read the values again after a save, for status notes the server works out. */
		reloadAfterSave: {
			type: Boolean,
			default: false,
		},

		/**
		 * Send every field of the section on a save, not only the changed ones,
		 * for an endpoint that replaces the whole record.
		 */
		saveAll: {
			type: Boolean,
			default: false,
		},

		/**
		 * Fold the hints, and status notes marked `foldable`, away behind one
		 * "Show the explanations" button, for a long form.
		 */
		hintsToggle: {
			type: Boolean,
			default: false,
		},

		/** Save each change at once (a typed value after a pause), with no Save button. */
		autoSave: {
			type: Boolean,
			default: false,
		},

		/** Draw no card, title or description: the host already gives the section its own. */
		bare: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['saved', 'save-error'],

	data() {
		return {
			form: {},
			baseline: {},
			storedSecrets: {},
			// Secret key to true while the admin asked to remove its stored value.
			clearSecrets: {},
			// Field key to the message of a read target that failed.
			unreadable: {},
			errors: {},
			loading: true,
			loadError: '',
			saving: false,
			notice: null,
			// The values the section's own read target answered, for status
			// notes, visibleWhen and placeholders that name a key no field holds.
			values: {},
			actionStates: {},
			showHints: false,
		}
	},

	computed: {
		/** @return {number} The column count, 1 to 3. */
		columnCount() {
			return [1, 2, 3].includes(this.columns) ? this.columns : 1
		},

		/** @return {object} The props of the card around the form. */
		sectionProps() {
			return {
				name: this.name,
				description: this.description,
				detailedDescription: this.detailedDescription,
				docUrl: this.docUrl,
				wide: this.wide,
				loading: this.loading,
				error: this.loadError !== '',
				errorMessage: this.loadError,
				onRetry: this.load,
			}
		},

		/** @return {string} Where the settings are read: `url`, else the app's settings endpoint. */
		readTarget() {
			return this.resolveUrl(this.url || (this.appId ? `/apps/${this.appId}/api/settings` : ''))
		},

		/** @return {string} Where the section saves: `saveUrl`, else the read target. */
		writeTarget() {
			return this.saveUrl ? this.resolveUrl(this.saveUrl) : this.readTarget
		},

		/**
		 * The values of the scope fields: the form's, else their `default`.
		 *
		 * @return {object}
		 */
		scopeValues() {
			const values = {}
			for (const field of Array.isArray(this.fields) ? this.fields : []) {
				if (field && field.scope && field.key) {
					values[field.key] = isEmpty(this.form[field.key]) ? field.default : this.form[field.key]
				}
			}
			return values
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
					hint: this.hintsToggle && !this.showHints ? '' : this.tr(field.hint || ''),
					placeholder: this.tr(field.placeholder || ''),
					options: Array.isArray(field.options) ? field.options.map((option) => this.translateOption(option)) : field.options,
					secretSet: field.type === 'secret' ? !!this.storedSecrets[field.key] : undefined,
					clearing: field.type === 'secret' ? !!this.clearSecrets[field.key] : undefined,
					initials: field.type === 'image' ? initialsOf(field.initialsFrom ? this.form[field.initialsFrom] : field.initials) : undefined,
					readOnly: field.readOnly || !!this.unreadable[field.key],
					...(field.type === 'status' ? this.statusOf(field) : {}),
					...(field.type === 'action' ? { actionBusy: !!this.actionStates[field.key]?.busy, actionResult: this.actionStates[field.key]?.result || null } : {}),
				}))
		},

		/**
		 * The fields shown now: their `visibleWhen` holds, and a status note has text.
		 *
		 * @return {Array<object>}
		 */
		visibleFields() {
			return this.resolvedFields.filter((field) => this.isVisible(field)
				&& !(field.type === 'status' && field.text === '')
				&& !(field.foldable && this.hintsToggle && !this.showHints))
		},

		/** @return {boolean} Whether the section holds a field with a value to save. */
		hasInputs() {
			return this.resolvedFields.some((field) => !VALUELESS_TYPES.includes(field.type) && !field.scope)
		},

		/**
		 * Whether something changed since the last load or save.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-one-save-per-section-with-a-dirty-state
		 */
		dirty() {
			return Object.values(this.clearSecrets).some(Boolean) || this.resolvedFields.some((field) => field.type !== 'image' && !field.scope && !VALUELESS_TYPES.includes(field.type) && !this.same(this.form[field.key], this.baseline[field.key]))
		},

		/** @return {string} The Save button's label. */
		resolvedSaveLabel() {
			return this.saveLabel ? this.tr(this.saveLabel) : t('nextcloud-vue', 'Save')
		},
	},

	mounted() {
		this.load()
	},

	beforeUnmount() {
		clearTimeout(this.autoSaveTimer)
	},

	methods: {
		t,

		/**
		 * @param {object} field A field.
		 * @return {boolean} Whether it spans the whole grid.
		 */
		isFullWidth(field) {
			return FULL_WIDTH_TYPES.includes(field.type)
		},

		/**
		 * A url with its `{key}` tokens filled from the scope fields.
		 *
		 * @param {string} url The declared url.
		 * @return {string}
		 * @spec openspec/changes/settings-fields-lists/specs/settings-fields-section/spec.md#requirement-a-scope-field-fills-the-url
		 */
		resolveUrl(url) {
			if (!url || !String(url).includes('{')) {
				return url || ''
			}
			const scope = this.scopeValues
			return interpolate(url, (name) => (Object.hasOwn(scope, name) ? encodeURIComponent(String(scope[name] ?? '')) : undefined))
		},

		/**
		 * @param {object} field A field.
		 * @return {boolean} Whether its value is a list of choices.
		 */
		isList(field) {
			return LIST_TYPES.includes(field.type) || (field.type === 'select' && field.multiple === true)
		},

		/**
		 * @param {object|string|number} option A declared option.
		 * @return {object|string|number} It with its label and description translated.
		 */
		translateOption(option) {
			if (!option || typeof option !== 'object') {
				return option
			}
			return {
				...option,
				...(typeof option.label === 'string' ? { label: this.tr(option.label) } : {}),
				...(typeof option.description === 'string' ? { description: this.tr(option.description) } : {}),
			}
		},

		/**
		 * A value by name: the field's form value, else the value read at that key.
		 *
		 * @param {string} key The field key or a key in the values read.
		 * @return {unknown}
		 */
		valueOf(key) {
			return Object.hasOwn(this.form, key) ? this.form[key] : literalFirst(this.values, key)
		},

		/**
		 * Whether a field's `visibleWhen` holds; a field without one is always shown.
		 *
		 * @param {object} field The field.
		 * @return {boolean}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-field-can-depend-on-another
		 */
		isVisible(field) {
			const conditions = Array.isArray(field.visibleWhen) ? field.visibleWhen : (field.visibleWhen ? [field.visibleWhen] : [])
			return conditions.every((condition) => {
				const value = this.valueOf(condition.key)
				if ('equals' in condition) {
					return typeof condition.equals === 'boolean' ? isOn(value) === condition.equals : String(value ?? '') === String(condition.equals)
				}
				if ('notEquals' in condition) {
					return typeof condition.notEquals === 'boolean' ? isOn(value) !== condition.notEquals : String(value ?? '') !== String(condition.notEquals)
				}
				if (Array.isArray(condition.in)) {
					return condition.in.map(String).includes(String(value ?? ''))
				}
				if ('empty' in condition) {
					return isEmpty(value) === !!condition.empty
				}
				return !isEmpty(value) && value !== false
			})
		},

		/**
		 * A status note's text and tone: its static `text`, else its `textMap`
		 * entry for the value read at its key (`*` for any other value), with
		 * `{name}` placeholders filled; an empty text hides the note.
		 *
		 * @param {object} field The status field.
		 * @return {{text: string, tone: string}}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-status-note-and-an-action-sit-between-the-fields
		 */
		statusOf(field) {
			const value = this.form[field.key]
			const key = isEmpty(value) ? '' : String(value)
			const map = field.textMap && typeof field.textMap === 'object' ? field.textMap : null
			let text = field.text ?? ''
			if (!field.text && map) {
				text = Object.hasOwn(map, key) ? map[key] : (map['*'] ?? '')
			} else if (!field.text) {
				text = key
			}
			const tones = field.toneMap && typeof field.toneMap === 'object' ? field.toneMap : {}
			return {
				text: interpolate(this.tr(text), (name) => (name === 'value' ? value : this.valueOf(name))),
				tone: field.tone || (Object.hasOwn(tones, key) ? tones[key] : tones['*']) || 'info',
			}
		},

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
			if (field.scope) {
				this.load(true)
				return
			}
			if (this.autoSave) {
				clearTimeout(this.autoSaveTimer)
				const typed = ['text', 'textarea', 'lines', 'number', 'secret', 'password', undefined].includes(field.type)
				this.autoSaveTimer = setTimeout(() => this.save(), typed ? 600 : 0)
			}
		},

		/**
		 * Run an action field: put a random value in its `fill` field, or post
		 * its `send` fields to its `url` and show the answer's sentence.
		 *
		 * @param {object} field The action field.
		 * @return {Promise<void>}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-status-note-and-an-action-sit-between-the-fields
		 */
		async runAction(field) {
			const setState = (state) => {
				this.actionStates = { ...this.actionStates, [field.key]: state }
			}
			if (field.fill && field.fill.key) {
				const target = this.fields.find((candidate) => candidate && candidate.key === field.fill.key)
				if (target) {
					this.setValue(target, randomHex(field.fill.bytes))
				}
				setState({ busy: false, result: field.successText ? { type: 'success', text: this.tr(field.successText) } : null })
				return
			}
			if (!field.url) {
				return
			}
			if (field.confirm && !(await this.confirmAction(field))) {
				return
			}
			setState({ busy: true, result: null })
			const data = { ...(field.params && typeof field.params === 'object' ? field.params : {}) }
			for (const key of Array.isArray(field.send) ? field.send : []) {
				const sent = this.fields.find((candidate) => candidate && candidate.key === key)
				if (!(sent?.type === 'secret' && isEmpty(this.form[key]))) {
					data[key] = this.form[key]
				}
			}
			try {
				const url = this.resolveUrl(field.url)
				const response = await axios.request({ url: prefixUrl(url), method: String(field.method || 'POST').toLowerCase(), data, ...ocsConfig(url) })
				const answer = response?.data ?? {}
				const said = literalFirst(answer, field.resultPath || 'message')
				const ok = field.okPath ? isOn(literalFirst(answer, field.okPath)) : true
				const fallback = !ok && field.failureText ? field.failureText : field.successText
				const text = typeof said === 'string' && said !== ''
					? said
					: (interpolate(this.tr(fallback || ''), (name) => literalFirst(answer, name)) || t('nextcloud-vue', 'Done.'))
				setState({ busy: false, result: { type: ok ? 'success' : 'error', text } })
			} catch (error) {
				setState({ busy: false, result: { type: 'error', text: refusalMessage(error) } })
			}
		},

		/**
		 * Read the settings and fill the fields; a secret's value is never put
		 * in the form, only whether one is stored.
		 *
		 * @param {boolean} quiet Read again without the loading state, keeping the form on screen.
		 * @return {Promise<void>}
		 */
		async load(quiet = false) {
			if (quiet !== true) {
				this.loading = true
			}
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
						const response = await axios.get(prefixUrl(target), ocsConfig(target))
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
				const scope = this.scopeValues
				const own = this.readTarget ? answers[this.readTarget] : null
				this.values = (own && this.valuesPath ? literalFirst(own, this.valuesPath) : own) || {}
				for (const field of this.fields || []) {
					if (!field || !field.key || field.type === 'heading' || field.type === 'action') {
						continue
					}
					if (field.scope) {
						form[field.key] = scope[field.key] ?? ''
						continue
					}
					const target = this.readUrlOf(field)
					if (target && failures[target]) {
						unreadable[field.key] = t('nextcloud-vue', 'This value could not be loaded: {reason}', { reason: serverErrorMessage(failures[target]) })
					}
					const answer = target ? answers[target] : null
					const raw = this.readValue(field, answer)
					if (field.type === 'secret') {
						const flag = field.setKey ? this.readValue({ ...field, key: field.setKey, valuePath: field.setKey }, answer) : raw
						stored[field.key] = field.setKey ? isOn(flag) : !isEmpty(flag) && flag !== false
						form[field.key] = ''
						continue
					}
					form[field.key] = this.formValue(field, raw)
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
		 * A stored value as the field edits it: `default` for a missing or empty
		 * value, a switch as on or off, a list as one entry per line.
		 *
		 * @param {object} field The field.
		 * @param {unknown} raw The stored value.
		 * @return {unknown}
		 */
		formValue(field, raw) {
			const value = isEmpty(raw) && field.default !== undefined ? field.default : raw
			if (field.type === 'switch' || field.type === 'boolean') {
				return isEmpty(value) ? false : isOn(value)
			}
			if (field.type === 'lines') {
				return linesText(value)
			}
			if (this.isList(field)) {
				return choiceList(value)
			}
			if (field.type === 'pairs') {
				return Object.entries(storedObject(value).object).map(([key, entry]) => ({ key, value: entry }))
			}
			return value === undefined ? '' : value
		},

		/**
		 * A form value as it is saved: a switch as its `trueValue`/`falseValue`,
		 * a lines field as a list (or JSON text with `saveAs: 'json'`).
		 *
		 * @param {object} field The field.
		 * @param {unknown} value The form value.
		 * @return {unknown}
		 */
		savedValue(field, value) {
			if ((field.type === 'switch' || field.type === 'boolean') && (field.trueValue !== undefined || field.falseValue !== undefined)) {
				return value ? (field.trueValue ?? true) : (field.falseValue ?? false)
			}
			if (field.type === 'lines') {
				const list = linesList(value)
				return field.saveAs === 'json' ? JSON.stringify(list) : list
			}
			if (this.isList(field)) {
				const list = Array.isArray(value) ? value : []
				if (field.saveAs === 'json') {
					return JSON.stringify(list)
				}
				return field.saveAs === 'csv' ? list.join(',') : list
			}
			if (field.type === 'pairs') {
				const object = {}
				for (const row of Array.isArray(value) ? value : []) {
					const key = String(row?.key ?? '').trim()
					if (key !== '') {
						object[key] = field.valueType === 'number' && !isEmpty(row.value) ? Number(row.value) : row.value
					}
				}
				return field.saveAs === 'json' ? JSON.stringify(object) : object
			}
			return value
		},

		/**
		 * Where a field is read: its own `url`, else the section's.
		 *
		 * @param {object} field The field.
		 * @return {string}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-a-field-can-read-and-save-elsewhere
		 */
		readUrlOf(field) {
			return field.url ? this.resolveUrl(field.url) : this.readTarget
		},

		/**
		 * A field's value in its read answer: at its `valuePath` (a field with its
		 * own `url`), else at the section's `valuesPath`, then its `key`. A key
		 * the answer holds as written wins over reading it as a dotted path.
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
				return literalFirst(data, field.valuePath || field.key)
			}
			const values = (this.valuesPath ? literalFirst(data, this.valuesPath) : data) || {}
			const parts = pathParts(field)
			if (parts) {
				return readPath(storedObject(literalFirst(values, parts.root)).object, parts.rest)
			}
			return literalFirst(values, field.key)
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
				const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
				if (['switch', 'boolean', 'image', ...VALUELESS_TYPES].includes(field.type) || field.scope || this.unreadable[field.key] || !this.isVisible(field)) {
					continue
				}
				if (field.required && empty && !(field.type === 'secret' && field.secretSet)) {
					errors[field.key] = t('nextcloud-vue', '{field} is required.', { field: field.label })
					continue
				}
				if (empty) {
					continue
				}
				if (field.type === 'pairs') {
					const rows = value.filter((row) => String(row?.key ?? '').trim() !== '')
					const keys = rows.map((row) => String(row.key).trim())
					const twice = keys.find((key, at) => keys.indexOf(key) !== at)
					const badKey = field.pattern ? keys.find((key) => !new RegExp(field.pattern).test(key)) : undefined
					const badValue = field.valueAbove !== undefined
						? rows.find((row) => isEmpty(row.value) || Number.isNaN(Number(row.value)) || Number(row.value) <= field.valueAbove)
						: undefined
					if (twice) {
						errors[field.key] = t('nextcloud-vue', '{field} holds {key} twice.', { field: field.label, key: twice })
					} else if (badKey !== undefined) {
						errors[field.key] = field.patternMessage ? this.tr(field.patternMessage) : t('nextcloud-vue', '{field} is not in the right form.', { field: field.label })
					} else if (badValue) {
						errors[field.key] = field.valueMessage ? this.tr(field.valueMessage) : t('nextcloud-vue', 'The value for {key} must be above {min}.', { key: String(badValue.key).trim(), min: field.valueAbove })
					}
					continue
				}
				if (this.isList(field)) {
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
					} else if (field.integer && !Number.isInteger(number)) {
						errors[field.key] = t('nextcloud-vue', '{field} must be a whole number.', { field: field.label })
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
				const clearing = field.type === 'secret' && this.clearSecrets[field.key] === true
				if (field.type === 'image' || field.scope || VALUELESS_TYPES.includes(field.type) || this.unreadable[field.key] || (!clearing && !this.saveAll && this.same(value, this.baseline[field.key]))) {
					continue
				}
				if (field.type === 'secret' && !clearing && (value === '' || value === null || value === undefined)) {
					continue
				}
				const url = this.resolveUrl(field.saveUrl || field.url) || this.writeTarget
				const method = String(field.saveMethod || (field.saveUrl || field.url ? 'POST' : this.saveMethod)).toLowerCase()
				const id = `${method} ${url}`
				if (!groups.has(id)) {
					groups.set(id, { url, method, fields: [], data: {} })
				}
				const group = groups.get(id)
				group.fields.push(field)
				Object.assign(group.data, field.saveParams || {})
				const parts = pathParts(field)
				if (parts) {
					group.data[parts.root] = this.jsonSettingWith(parts.root)
					continue
				}
				if (clearing) {
					group.data[field.clearKey || field.saveKey || field.key] = field.clearKey ? true : ''
					continue
				}
				group.data[field.saveKey || field.key] = this.savedValue(field, value)
			}
			this.saving = true
			this.notice = null
			const failed = []
			const sent = {}
			for (const group of groups.values()) {
				try {
					await axios.request({ url: prefixUrl(group.url), method: group.method, data: group.data, ...ocsConfig(group.url) })
					Object.assign(sent, group.data)
					this.keepJsonSettings(group)
					this.acceptSaved(group.fields)
				} catch (error) {
					failed.push({ group, error })
				}
			}
			if (failed.length === 0 && groups.size > 0 && this.reloadAfterSave) {
				await this.load(true)
			}
			this.saving = false
			if (failed.length === 0) {
				if (groups.size === 0) {
					return
				}
				this.notice = { type: 'success', text: this.savedMessage ? interpolate(this.tr(this.savedMessage), (name) => this.valueOf(name)) : t('nextcloud-vue', 'Saved.') }
				/**
				 * @event saved The section saved. Payload: what was sent, by save key.
				 */
				this.$emit('saved', sent)
				return
			}
			const reasons = failed.map(({ group, error }) => (groups.size > 1
				? t('nextcloud-vue', '{fields}: {reason}', { fields: group.fields.map((field) => field.label).join(', '), reason: refusalMessage(error) })
				: refusalMessage(error)))
			this.notice = { type: 'error', text: t('nextcloud-vue', 'The settings could not be saved: {reason}', { reason: reasons.join('; ') }) }
			/**
			 * @event save-error A save request failed. Payload: the first error.
			 */
			this.$emit('save-error', failed[0].error)
		},

		/**
		 * Keep the JSON-valued settings a save sent as the values read, so the
		 * next save starts from them.
		 *
		 * @param {{fields: Array<object>, data: object}} group The saved request.
		 * @return {void}
		 */
		keepJsonSettings(group) {
			const roots = group.fields.map((field) => pathParts(field)?.root).filter(Boolean)
			if (roots.length === 0) {
				return
			}
			const values = { ...this.values }
			for (const root of roots) {
				values[root] = group.data[root]
			}
			this.values = values
		},

		/**
		 * A JSON-valued setting as it is saved: the value read, with every
		 * field whose `path` lies inside it set from the form; JSON text when
		 * it was read as text.
		 *
		 * @param {string} root The setting's key.
		 * @return {object|string}
		 * @spec openspec/changes/settings-fields-lists/specs/settings-fields-section/spec.md#requirement-a-field-can-edit-one-key-of-a-json-setting
		 */
		jsonSettingWith(root) {
			const stored = storedObject(literalFirst(this.values, root))
			const object = JSON.parse(JSON.stringify(stored.object))
			for (const field of this.resolvedFields) {
				const parts = pathParts(field)
				if (!parts || parts.root !== root) {
					continue
				}
				const keys = parts.rest.split('.')
				let node = object
				for (const key of keys.slice(0, -1)) {
					node[key] = node[key] && typeof node[key] === 'object' ? node[key] : {}
					node = node[key]
				}
				node[keys[keys.length - 1]] = this.savedValue(field, this.form[field.key])
			}
			return stored.text ? JSON.stringify(object) : object
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
			const clearing = { ...this.clearSecrets }
			for (const field of fields) {
				if (field.type === 'secret') {
					stored[field.key] = clearing[field.key] !== true
					delete clearing[field.key]
					form[field.key] = ''
				}
				baseline[field.key] = form[field.key]
			}
			this.form = form
			this.baseline = baseline
			this.storedSecrets = stored
			this.clearSecrets = clearing
		},

		/**
		 * Mark a stored secret for removal on the next save, or keep it.
		 *
		 * @param {object} field The secret field.
		 * @param {boolean} on Whether to remove the stored value.
		 * @return {void}
		 */
		setClearing(field, on) {
			const next = { ...this.clearSecrets }
			if (on) {
				next[field.key] = true
				this.form = { ...this.form, [field.key]: '' }
			} else {
				delete next[field.key]
			}
			this.clearSecrets = next
			this.notice = null
		},

		/**
		 * Ask before an action with `confirm`; closing the question is a no.
		 *
		 * @param {object} field The action field.
		 * @return {Promise<boolean>} Whether to go on.
		 */
		async confirmAction(field) {
			try {
				return (await showConfirmation({
					name: field.label,
					text: this.tr(field.confirm),
					labelConfirm: this.tr(field.confirmLabel || '') || field.label,
					labelReject: t('nextcloud-vue', 'Cancel'),
				})) === true
			} catch {
				return false
			}
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

.cn-settings-fields__hints-toggle {
	display: flex;
	justify-content: flex-end;
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
