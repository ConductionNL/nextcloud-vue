<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-row-mark-list" data-testid="cn-row-mark-list">
		<h2 v-if="heading" class="cn-row-mark-list__heading" data-testid="cn-row-mark-list-heading">
			{{ heading }}
		</h2>
		<div v-if="loading" class="cn-row-mark-list__state" role="status">
			<NcLoadingIcon :size="20" />
			<span>{{ t('nextcloud-vue', 'Loading…') }}</span>
		</div>
		<NcNoteCard v-else-if="loadError" type="error" data-testid="cn-row-mark-list-load-error">
			{{ loadError }}
		</NcNoteCard>

		<template v-else>
			<div v-if="shownControls.length > 0" class="cn-row-mark-list__controls">
				<template v-for="control in shownControls" :key="control.param">
					<NcSelect
						v-if="control.type === 'select'"
						class="cn-row-mark-list__control"
						:inputLabel="control.label"
						:options="control.options"
						:clearable="false"
						:modelValue="control.selected"
						:data-testid="`cn-row-mark-list-control-${control.param}`"
						@update:modelValue="(option) => choose(control, option && option.value)" />
					<div v-else-if="control.type === 'date'" class="cn-row-mark-list__control cn-row-mark-list__date">
						<label :for="controlId(control)">{{ control.label }}</label>
						<input
							:id="controlId(control)"
							type="date"
							:value="control.value"
							:max="control.max || null"
							:data-testid="`cn-row-mark-list-control-${control.param}`"
							@change="choose(control, $event.target.value)">
						<NcButton
							v-if="control.today && control.value !== control.today"
							variant="tertiary"
							@click="choose(control, control.today)">
							{{ t('nextcloud-vue', 'Today') }}
						</NcButton>
					</div>
				</template>
			</div>

			<NcNoteCard
				v-for="notice in shownNotices"
				:key="notice.key"
				:type="notice.type"
				data-testid="cn-row-mark-list-notice">
				{{ notice.text }}
			</NcNoteCard>

			<p class="cn-row-mark-list__counts" aria-live="polite" data-testid="cn-row-mark-list-counts">
				{{ countsText }}
			</p>
			<p v-if="editable && rows.length > 0" :id="hintId" class="cn-row-mark-list__hint">
				{{ keysHint }}
			</p>

			<p v-if="rows.length === 0" class="cn-row-mark-list__empty" data-testid="cn-row-mark-list-empty">
				{{ emptyText }}
			</p>

			<form v-else @submit.prevent="save">
				<ul class="cn-row-mark-list__rows">
					<li
						v-for="(row, index) in rows"
						:key="row.key"
						ref="rowEls"
						class="cn-row-mark-list__row"
						:class="`cn-row-mark-list__row--${row.state}`"
						tabindex="0"
						:aria-label="rowAriaLabel(row)"
						:aria-describedby="editable ? hintId : null"
						:data-testid="`cn-row-mark-list-row-${row.key}`"
						@keydown="onKey($event, index)">
						<div class="cn-row-mark-list__who">
							<span class="cn-row-mark-list__name">{{ row.label }}</span>
							<span
								v-for="(badge, b) in rowBadges(row)"
								:key="b"
								class="cn-row-mark-list__badge">
								{{ badge }}
							</span>
						</div>

						<div
							class="cn-row-mark-list__states"
							role="group"
							:aria-label="t('nextcloud-vue', 'Mark for {name}', { name: row.label })">
							<button
								v-for="state in states"
								:key="state.value"
								type="button"
								class="cn-row-mark-list__state-button"
								:class="{ 'cn-row-mark-list__state-button--on': row.state === state.value }"
								:aria-pressed="row.state === state.value ? 'true' : 'false'"
								:disabled="!editable"
								:data-testid="`cn-row-mark-list-mark-${row.key}-${state.value}`"
								@click="mark(index, state.value)">
								{{ state.label }}
							</button>
						</div>

						<div
							v-for="field in fieldsFor(row)"
							:key="field.field"
							class="cn-row-mark-list__detail">
							<template v-if="field.type === 'number'">
								<span class="cn-row-mark-list__detail-label">{{ field.label }}</span>
								<button
									v-for="quick in field.quick"
									:key="quick"
									type="button"
									class="cn-row-mark-list__chip"
									:class="{ 'cn-row-mark-list__chip--on': Number(row.values[field.field]) === quick }"
									:aria-pressed="Number(row.values[field.field]) === quick ? 'true' : 'false'"
									:disabled="!editable"
									@click="setValue(index, field.field, quick)">
									{{ quick }}
								</button>
								<label class="cn-row-mark-list__other">
									<span>{{ field.otherLabel }}</span>
									<input
										type="number"
										:min="field.min"
										:max="field.max"
										step="1"
										inputmode="numeric"
										:value="row.values[field.field]"
										:disabled="!editable"
										@input="setValue(index, field.field, $event.target.value === '' ? '' : Number($event.target.value))">
								</label>
							</template>
							<label v-else-if="field.type === 'select'" class="cn-row-mark-list__select">
								<span>{{ field.label }}</span>
								<select
									:value="row.values[field.field]"
									:disabled="!editable"
									@change="setValue(index, field.field, $event.target.value)">
									<option
										v-for="option in field.options"
										:key="option.value"
										:value="option.value">
										{{ option.label }}
									</option>
								</select>
							</label>
							<label v-else class="cn-row-mark-list__text">
								<span>{{ field.label }}</span>
								<input
									type="text"
									:maxlength="field.maxlength"
									:value="row.values[field.field]"
									:disabled="!editable"
									@input="setValue(index, field.field, $event.target.value)">
							</label>
						</div>
					</li>
				</ul>

				<div class="cn-row-mark-list__save">
					<NcNoteCard v-if="saveError" type="error" data-testid="cn-row-mark-list-save-error">
						{{ saveError }}
					</NcNoteCard>
					<NcNoteCard v-if="saved" type="success" data-testid="cn-row-mark-list-saved">
						{{ savedText }}
					</NcNoteCard>
					<NcButton
						type="submit"
						variant="primary"
						:disabled="!editable || saving"
						data-testid="cn-row-mark-list-save">
						{{ saving ? t('nextcloud-vue', 'Saving…') : saveLabel }}
					</NcButton>
				</div>
			</form>
		</template>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

let uid = 0

/**
 * CnRowMarkList gives every row of a list one of a few marks (present, late,
 * absent; attended, excused; yes, no, abstain) and saves the whole list in one
 * request. Use it for a register, a roll call, a vote count or a quorum list.
 *
 * Rows come from `load`, an endpoint whose answer also carries the controls'
 * choices (a group, a day, a session), notices and whether the list may be
 * changed. Each row starts in its stored mark, else `defaultState`. A mark is
 * one tap, or one key while the row has focus; arrow keys move between rows.
 * A mark can ask for details (`detailFields`): a number with quick picks, a
 * choice or a note, each shown only for the marks it belongs to, filled with
 * its `default` when the row takes such a mark and cleared when it leaves.
 * Required details are checked before the save, naming the rows that miss
 * one. `save` sends one request with every row's key, mark and visible
 * details; the answer is shown as the new list.
 *
 * The keys are translated like every other label, so a language can choose
 * its own letters. Resolved by its registry type key `row-mark-list`.
 *
 * ```json
 * {
 *   "type": "row-mark-list",
 *   "content": {
 *     "load": { "url": "/apps/myapp/api/register" },
 *     "save": { "url": "/apps/myapp/api/register", "body": { "groupId": "groupId", "date": "date" }, "rowsKey": "marks" },
 *     "rowsPath": "people", "rowKey": "userId", "labelField": "name", "stateField": "status",
 *     "defaultState": "present",
 *     "states": [
 *       { "value": "present", "label": "Present", "key": "P" },
 *       { "value": "late", "label": "Late", "key": "L", "countLabel": "{n} late" }
 *     ],
 *     "detailFields": [
 *       { "field": "lateMinutes", "label": "Minutes late", "type": "number", "states": ["late"], "quick": [5, 10, 15], "min": 1, "max": 600, "required": true, "default": 5 }
 *     ],
 *     "controls": [
 *       { "param": "groupId", "type": "select", "label": "Group", "optionsPath": "groups", "optionValue": "id", "optionLabel": "name", "valuePath": "groupId" },
 *       { "param": "date", "type": "date", "label": "Day", "valuePath": "date", "maxPath": "today", "todayPath": "today" }
 *     ],
 *     "editablePath": "editable"
 *   }
 * }
 * ```
 *
 * @spec openspec/changes/row-mark-list/specs/row-mark-list/spec.md#requirement-a-list-of-rows-is-marked-and-saved-in-one-request
 */
export default {
	name: 'CnRowMarkList',

	components: { NcButton, NcLoadingIcon, NcNoteCard, NcSelect },

	inject: {
		/** Host translate function provided by CnAppRoot: `(text, vars) => string`. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `load` — `{ url, params? }`: GET; the controls' values are added as query parameters.
		 * - `save` — `{ url, method?, body?, rowsKey? }`: one request; `body` maps each body key to a
		 *   path in the loaded answer, and the rows go under `rowsKey` (default `rows`).
		 * - `rowsPath`, `rowKey`, `labelField`, `stateField` — where the rows are and what each holds.
		 * - `states` — `[{ value, label, key?, countLabel? }]`; `countLabel` carries `{n}`.
		 * - `defaultState` — the mark of a row that has none (default: the first state).
		 * - `detailFields` — `[{ field, label, type: 'number'|'select'|'text', states?, notStates?,
		 *   quick?, min?, max?, otherLabel?, options?, maxlength?, required?, default? }]`.
		 * - `badges` — `[{ path, equals?, notEquals?, missing?, text, vars? }]`: a line on the row when
		 *   the rule holds; `vars` maps a placeholder to a path in the row, any other `{a.b}` reads the row.
		 * - `controls` — `[{ param, type: 'select'|'date', label, valuePath, optionsPath?, optionValue?,
		 *   optionLabel?, maxPath?, todayPath?, resets? }]`: choices sent with `load` and kept in the
		 *   page's query, so a link can open the list on them. `resets` names params a change clears.
		 * - `notices` — `[{ path, equals?, notEquals?, missing?, type?, text }]`: shown when the rule holds
		 *   on the answer.
		 * - `heading`, `headingPath` — a heading above the list, followed by the answer's value at
		 *   `headingPath` (a group's name).
		 * - `editablePath` — a boolean in the answer; without it the list is editable.
		 * - Texts: `emptyText`, `saveLabel`, `savedText`, `incompleteText` (`{names}`), `loadErrorText`,
		 *   `saveErrorText`, `rowLabel` (`{name}` and `{state}`).
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['saved'],

	data() {
		uid += 1
		return {
			hintId: `cn-row-mark-list-hint-${uid}`,
			loading: true,
			loadError: '',
			answer: {},
			rows: [],
			choices: {},
			saving: false,
			saveError: '',
			saved: false,
		}
	},

	computed: {
		/**
		 * The marks with their translated labels and keys.
		 *
		 * @return {Array<{value: string, label: string, key: string, countLabel: string}>}
		 */
		states() {
			return (Array.isArray(this.content.states) ? this.content.states : [])
				.filter((state) => state && typeof state.value === 'string')
				.map((state) => ({
					value: state.value,
					label: this.tr(state.label || state.value),
					key: this.tr(state.key || '').toLowerCase(),
					countLabel: state.countLabel || '',
				}))
		},

		defaultState() {
			return this.content.defaultState || (this.states[0] && this.states[0].value) || ''
		},

		detailFields() {
			return (Array.isArray(this.content.detailFields) ? this.content.detailFields : [])
				.filter((field) => field && typeof field.field === 'string')
				.map((field) => ({
					...field,
					type: field.type || 'text',
					label: this.tr(field.label || field.field),
					otherLabel: field.otherLabel ? this.tr(field.otherLabel) : t('nextcloud-vue', 'Another value'),
					quick: Array.isArray(field.quick) ? field.quick : [],
					options: (Array.isArray(field.options) ? field.options : []).map((option) => ({ value: option.value, label: this.tr(option.label || String(option.value)) })),
				}))
		},

		editable() {
			if (!this.content.editablePath) {
				return true
			}
			return readPath(this.answer, this.content.editablePath) === true
		},

		/**
		 * The controls to draw, with their options and current values. A select
		 * with one option or none is not drawn.
		 *
		 * @return {Array<object>}
		 */
		shownControls() {
			return (Array.isArray(this.content.controls) ? this.content.controls : [])
				.filter((control) => control && control.param)
				.map((control) => {
					const value = this.controlValue(control)
					const base = { ...control, label: this.tr(control.label || control.param), value }
					if (control.type === 'date') {
						return { ...base, max: control.maxPath ? readPath(this.answer, control.maxPath) : '', today: control.todayPath ? readPath(this.answer, control.todayPath) : '' }
					}
					const options = (readPath(this.answer, control.optionsPath || '') || []).map((option) => ({
						value: String(readPath(option, control.optionValue || 'id') ?? ''),
						label: String(readPath(option, control.optionLabel || 'name') ?? ''),
					}))
					return { ...base, type: 'select', options, selected: options.find((option) => option.value === value) || null }
				})
				.filter((control) => control.type !== 'select' || control.options.length > 1)
		},

		shownNotices() {
			return (Array.isArray(this.content.notices) ? this.content.notices : [])
				.map((notice, index) => ({ ...notice, key: index }))
				.filter((notice) => this.matches(this.answer, notice))
				.map((notice) => ({ key: notice.key, type: notice.type || 'info', text: this.tr(notice.text || '') }))
		},

		/**
		 * One sentence with how many rows hold each mark.
		 *
		 * @return {string}
		 */
		countsText() {
			const counts = {}
			for (const row of this.rows) {
				counts[row.state] = (counts[row.state] || 0) + 1
			}
			return this.states
				.map((state) => {
					const n = counts[state.value] || 0
					if (state.countLabel) {
						return this.tr(state.countLabel, { n })
					}
					return `${n} ${state.label}`
				})
				.join(', ')
		},

		/**
		 * The keyboard hint, from the translated keys and labels.
		 *
		 * @return {string}
		 */
		keysHint() {
			const keys = this.states
				.filter((state) => state.key)
				.map((state) => `${state.key.toUpperCase()} ${state.label}`)
				.join(', ')
			if (keys === '') {
				return t('nextcloud-vue', 'Arrow keys go to the next row.')
			}
			return t('nextcloud-vue', 'Keys on a row: {keys}. Arrow keys go to the next row.', { keys })
		},

		heading() {
			const text = this.tr(this.content.heading || '')
			const suffix = this.content.headingPath ? readPath(this.answer, this.content.headingPath) : ''
			if (text && suffix) {
				return `${text} · ${suffix}`
			}
			return text
		},

		emptyText() {
			return this.text('emptyText', t('nextcloud-vue', 'Nothing to mark.'))
		},

		saveLabel() {
			return this.text('saveLabel', t('nextcloud-vue', 'Save'))
		},

		savedText() {
			return this.text('savedText', t('nextcloud-vue', 'Saved.'))
		},
	},

	watch: {
		/**
		 * Load again when the page's query changes a control's value.
		 *
		 * @return {void}
		 */
		'$route.query': {
			handler(next, previous) {
				const params = this.controlParams()
				if (params.some((param) => (next || {})[param] !== (previous || {})[param])) {
					this.load()
				}
			},
		},
	},

	created() {
		this.load()
	},

	methods: {
		/**
		 * A manifest text through the host's translations, else as written.
		 *
		 * @param {string} text The text.
		 * @param {object} [vars] Placeholders.
		 * @return {string}
		 */
		tr(text, vars) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			const translated = typeof this.cnTranslate === 'function' ? this.cnTranslate(text, vars) : text
			if (!vars || typeof translated !== 'string') {
				return translated
			}
			return translated.replace(/\{(\w+)\}/g, (match, key) => (Object.hasOwn(vars, key) ? String(vars[key]) : match))
		},

		/**
		 * A configurable text: the manifest's, translated, else the library default.
		 *
		 * @param {string} key The content key.
		 * @param {string} fallback The translated default.
		 * @param {object} [vars] Placeholders for the manifest's text.
		 * @return {string}
		 */
		text(key, fallback, vars) {
			return this.content[key] ? this.tr(this.content[key], vars) : fallback
		},

		t,

		controlId(control) {
			return `${this.hintId}-${control.param}`
		},

		controlParams() {
			return (Array.isArray(this.content.controls) ? this.content.controls : []).map((control) => control.param).filter(Boolean)
		},

		/**
		 * A control's value: chosen here, else in the page's query, else in the answer.
		 *
		 * @param {object} control The control.
		 * @return {string}
		 */
		controlValue(control) {
			if (Object.hasOwn(this.choices, control.param)) {
				return this.choices[control.param]
			}
			const query = (this.$route && this.$route.query) || {}
			if (typeof query[control.param] === 'string' && query[control.param] !== '') {
				return query[control.param]
			}
			const answered = control.valuePath ? readPath(this.answer, control.valuePath) : ''
			return answered === null || answered === undefined ? '' : String(answered)
		},

		/**
		 * Whether a rule holds on `data`: the value at `rule.path` equals
		 * `equals`, differs from `notEquals` while present, is missing or empty
		 * (`missing: true`), or else is present.
		 *
		 * @param {object} data The object read.
		 * @param {object} rule `{ path, equals?, notEquals?, missing? }`.
		 * @return {boolean}
		 */
		matches(data, rule) {
			if (!rule || !rule.path) {
				return false
			}
			const value = readPath(data, rule.path)
			const present = value !== null && value !== undefined && value !== '' && value !== false
				&& !(Array.isArray(value) && value.length === 0)
			if (Object.hasOwn(rule, 'equals')) {
				return value === rule.equals
			}
			if (Object.hasOwn(rule, 'notEquals')) {
				return present && value !== rule.notEquals
			}
			if (rule.missing === true) {
				return !present
			}
			return present
		},

		/**
		 * Read the list with the controls' values.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/row-mark-list/specs/row-mark-list/spec.md#requirement-a-list-of-rows-is-marked-and-saved-in-one-request
		 */
		async load() {
			const load = this.content.load || {}
			if (!load.url) {
				this.loading = false
				return
			}
			this.loading = true
			this.loadError = ''
			this.saved = false
			this.saveError = ''
			const params = { ...(load.params || {}) }
			const query = (this.$route && this.$route.query) || {}
			for (const param of this.controlParams()) {
				const value = Object.hasOwn(this.choices, param) ? this.choices[param] : query[param]
				if (typeof value === 'string' && value !== '') {
					params[param] = value
				}
			}
			try {
				const response = await axios.get(generateUrl(load.url), { params })
				this.apply(response.data)
			} catch (error) {
				this.loadError = this.text('loadErrorText', t('nextcloud-vue', 'The list could not be loaded.'))
				const message = error && error.response ? serverErrorMessage(error) : ''
				if (message && !/^Request failed/.test(message)) {
					this.loadError = message
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Show an answer: its rows, each in its stored mark or the default one.
		 *
		 * @param {object} data The endpoint's answer.
		 * @return {void}
		 */
		apply(data) {
			this.answer = data && typeof data === 'object' ? data : {}
			this.choices = {}
			const keyField = this.content.rowKey || 'id'
			const labelField = this.content.labelField || 'name'
			const stateField = this.content.stateField || 'state'
			const list = readPath(this.answer, this.content.rowsPath || 'rows')
			this.rows = (Array.isArray(list) ? list : []).map((source) => {
				const state = typeof source[stateField] === 'string' && source[stateField] !== '' ? source[stateField] : this.defaultState
				const values = {}
				for (const field of this.detailFields) {
					values[field.field] = source[field.field] ?? ''
				}
				return { key: String(source[keyField]), label: String(source[labelField] ?? source[keyField]), state, values, source }
			})
		},

		/**
		 * Change a control: kept in the page's query when there is a router,
		 * which loads the list again; else loaded at once.
		 *
		 * @param {object} control The control.
		 * @param {string} value The chosen value.
		 * @return {void}
		 */
		choose(control, value) {
			if (typeof value !== 'string' || value === '') {
				return
			}
			const resets = Array.isArray(control.resets) ? control.resets : []
			if (this.$router && this.$route) {
				const query = { ...this.$route.query, [control.param]: value }
				for (const param of resets) {
					delete query[param]
				}
				this.$router.replace({ path: this.$route.path, query }).catch(() => {})
				return
			}
			this.choices = { ...this.choices, [control.param]: value }
			for (const param of resets) {
				this.choices = { ...this.choices, [param]: '' }
			}
			this.load()
		},

		/**
		 * The detail fields a row shows for its mark.
		 *
		 * @param {object} row The row.
		 * @return {Array<object>}
		 */
		fieldsFor(row) {
			return this.detailFields.filter((field) => this.fieldShown(field, row.state))
		},

		fieldShown(field, state) {
			if (Array.isArray(field.states)) {
				return field.states.includes(state)
			}
			if (Array.isArray(field.notStates)) {
				return !field.notStates.includes(state)
			}
			return true
		},

		/**
		 * Give a row a mark: details the mark shows get their default when
		 * empty, details it does not show are cleared.
		 *
		 * @param {number} index The row.
		 * @param {string} state The mark.
		 * @return {void}
		 * @spec openspec/changes/row-mark-list/specs/row-mark-list/spec.md#requirement-a-list-of-rows-is-marked-and-saved-in-one-request
		 */
		mark(index, state) {
			if (!this.editable) {
				return
			}
			const row = this.rows[index]
			const values = { ...row.values }
			for (const field of this.detailFields) {
				if (!this.fieldShown(field, state)) {
					values[field.field] = ''
				} else if ((values[field.field] === '' || values[field.field] === null || values[field.field] === undefined) && field.default !== undefined) {
					values[field.field] = field.default
				}
			}
			this.rows.splice(index, 1, { ...row, state, values })
			this.saved = false
		},

		setValue(index, field, value) {
			const row = this.rows[index]
			this.rows.splice(index, 1, { ...row, values: { ...row.values, [field]: value } })
			this.saved = false
		},

		/**
		 * The keyboard on a row: a state's key marks it, the arrows move.
		 *
		 * @param {KeyboardEvent} event The key event.
		 * @param {number} index The row.
		 * @return {void}
		 */
		onKey(event, index) {
			if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) {
				return
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()
				const rows = this.$refs.rowEls || []
				const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)]
				if (next) {
					next.focus()
				}
				return
			}
			const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
			const state = key ? this.states.find((s) => s.key === key) : null
			if (state) {
				event.preventDefault()
				this.mark(index, state.value)
			}
		},

		/**
		 * The badge lines of a row. `vars` maps a placeholder to a path in the
		 * row; any other `{a.b}` in the text reads the row directly.
		 *
		 * @param {object} row The row.
		 * @return {string[]}
		 */
		rowBadges(row) {
			const read = (path) => {
				const value = readPath(row.source, path)
				return value === null || value === undefined ? '' : String(value)
			}
			return (Array.isArray(this.content.badges) ? this.content.badges : [])
				.filter((badge) => this.matches(row.source, badge))
				.map((badge) => {
					const vars = {}
					for (const [name, path] of Object.entries(badge.vars || {})) {
						vars[name] = read(path)
					}
					return this.tr(badge.text || '', vars).replace(/\{([\w.]+)\}/g, (match, path) => read(path))
				})
		},

		/**
		 * What a screen reader hears on a row: the name, the mark and the
		 * details the mark shows that hold a value.
		 *
		 * @param {object} row The row.
		 * @return {string}
		 */
		rowAriaLabel(row) {
			const state = this.states.find((s) => s.value === row.state)
			const vars = { name: row.label, state: state ? state.label : row.state }
			const details = this.fieldsFor(row)
				.filter((field) => row.values[field.field] !== '' && row.values[field.field] !== null && row.values[field.field] !== undefined)
				.map((field) => {
					const option = field.options.find((o) => o.value === row.values[field.field])
					return `${field.label} ${option ? option.label : row.values[field.field]}`
				})
			return [this.text('rowLabel', t('nextcloud-vue', '{name}: {state}', vars), vars), ...details].join(', ')
		},

		/**
		 * The rows that miss a required detail for their mark.
		 *
		 * @return {Array<object>}
		 */
		incompleteRows() {
			return this.rows.filter((row) => this.fieldsFor(row).some((field) => {
				if (field.required !== true) {
					return false
				}
				const value = row.values[field.field]
				if (field.type === 'number') {
					const number = Number(value)
					return value === '' || value === null || !Number.isFinite(number)
						|| (field.min !== undefined && number < field.min)
						|| (field.max !== undefined && number > field.max)
				}
				if (field.type === 'select') {
					return !field.options.some((option) => option.value === value)
				}
				return typeof value !== 'string' || value.trim() === ''
			}))
		},

		/**
		 * One row as saved: key, mark and the details its mark shows, empty
		 * text left out.
		 *
		 * @param {object} row The row.
		 * @return {object}
		 */
		rowToSave(row) {
			const out = {
				[this.content.rowKey || 'id']: row.source[this.content.rowKey || 'id'],
				[this.content.stateField || 'state']: row.state,
			}
			for (const field of this.fieldsFor(row)) {
				let value = row.values[field.field]
				if (field.type === 'number' && value !== '' && value !== null) {
					value = Number(value)
				}
				if (typeof value === 'string') {
					value = value.trim()
				}
				if (value === '' || value === null || value === undefined) {
					continue
				}
				out[field.field] = value
			}
			return out
		},

		/**
		 * Save every row in one request.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/row-mark-list/specs/row-mark-list/spec.md#requirement-a-list-of-rows-is-marked-and-saved-in-one-request
		 */
		async save() {
			this.saveError = ''
			this.saved = false
			const incomplete = this.incompleteRows()
			if (incomplete.length > 0) {
				const names = incomplete.map((row) => row.label).join(', ')
				this.saveError = this.text('incompleteText', t('nextcloud-vue', 'Complete the details of: {names}.', { names }), { names })
				return
			}
			const save = this.content.save || {}
			if (!save.url) {
				return
			}
			const body = {}
			for (const [key, path] of Object.entries(save.body || {})) {
				const value = readPath(this.answer, path)
				body[key] = value === undefined || value === '' ? null : value
			}
			body[save.rowsKey || 'rows'] = this.rows.map((row) => this.rowToSave(row))
			this.saving = true
			try {
				const method = String(save.method || 'POST').toLowerCase()
				const response = await axios[method](generateUrl(save.url), body)
				this.apply(response.data)
				this.saved = true
				this.$emit('saved', response.data)
			} catch (error) {
				const message = error && error.response ? serverErrorMessage(error) : ''
				this.saveError = message && !/^Request failed/.test(message)
					? message
					: this.text('saveErrorText', t('nextcloud-vue', 'The list could not be saved. Try again.'))
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-row-mark-list__heading {
	margin: 0 0 calc(var(--default-grid-baseline, 4px) * 3);
}

.cn-row-mark-list__controls {
	display: flex;
	flex-wrap: wrap;
	gap: calc(var(--default-grid-baseline, 4px) * 3);
	align-items: flex-end;
	margin-bottom: calc(var(--default-grid-baseline, 4px) * 3);
}

.cn-row-mark-list__date {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline, 4px);
}

.cn-row-mark-list__state,
.cn-row-mark-list__counts,
.cn-row-mark-list__hint,
.cn-row-mark-list__empty {
	color: var(--color-text-maxcontrast);
}

.cn-row-mark-list__rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
}

.cn-row-mark-list__row {
	display: flex;
	flex-wrap: wrap;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
	align-items: center;
	padding: calc(var(--default-grid-baseline, 4px) * 2);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
}

.cn-row-mark-list__row:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-row-mark-list__who {
	display: flex;
	flex-direction: column;
	min-width: 12em;
	flex: 1 1 12em;
}

.cn-row-mark-list__name {
	font-weight: bold;
}

.cn-row-mark-list__badge {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
}

.cn-row-mark-list__states {
	display: flex;
	flex-wrap: wrap;
	gap: var(--default-grid-baseline, 4px);
}

.cn-row-mark-list__state-button,
.cn-row-mark-list__chip {
	min-height: var(--default-clickable-area, 34px);
	padding: 0 calc(var(--default-grid-baseline, 4px) * 3);
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-element, var(--border-radius-large));
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-row-mark-list__state-button--on,
.cn-row-mark-list__chip--on {
	background: var(--color-primary-element);
	border-color: var(--color-primary-element);
	color: var(--color-primary-element-text);
}

.cn-row-mark-list__state-button:disabled,
.cn-row-mark-list__chip:disabled {
	cursor: default;
	opacity: 0.7;
}

.cn-row-mark-list__detail {
	display: flex;
	flex-wrap: wrap;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
	align-items: center;
	flex-basis: 100%;
}

.cn-row-mark-list__other,
.cn-row-mark-list__select,
.cn-row-mark-list__text {
	display: flex;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
	align-items: center;
}

.cn-row-mark-list__save {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: calc(var(--default-grid-baseline, 4px) * 2);
	margin-top: calc(var(--default-grid-baseline, 4px) * 3);
}
</style>
