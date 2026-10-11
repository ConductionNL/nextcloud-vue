<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-field-list-widget" data-testid="cn-field-list-widget">
		<p v-if="rows.length === 0" class="cn-field-list-widget__empty" data-testid="cn-field-list-empty">
			{{ emptyLabel }}
		</p>
		<ul v-else class="cn-field-list-widget__rows">
			<li
				v-for="row in rows"
				:key="row.key"
				class="cn-field-list-widget__row"
				:data-testid="`cn-field-list-row-${row.key}`">
				<div class="cn-field-list-widget__line">
					<span v-if="row.initials" class="cn-field-list-widget__avatar" aria-hidden="true">{{ row.initials }}</span>
					<span class="cn-field-list-widget__main">
						<span class="cn-field-list-widget__title">{{ row.title }}</span>
						<span v-if="row.meta" class="cn-field-list-widget__meta">{{ row.meta }}</span>
					</span>
					<CnStatusBadge
						v-if="row.pill"
						:label="row.pill.label"
						:variant="row.pill.variant"
						size="small" />
					<span v-if="row.aside" class="cn-field-list-widget__aside">{{ row.aside }}</span>
					<NcButton
						v-for="action in row.actions"
						:key="action.id"
						variant="tertiary"
						:disabled="busy !== ''"
						:data-testid="`cn-field-list-action-${action.id}-${row.key}`"
						@click="runAction(action, row)">
						{{ action.label }}
					</NcButton>
					<NcButton
						v-if="canRemove"
						variant="tertiary"
						:disabled="busy !== ''"
						:aria-label="removeAriaLabel(row)"
						:data-testid="`cn-field-list-remove-${row.key}`"
						@click="remove(row)">
						{{ removeLabel }}
					</NcButton>
				</div>
				<p v-if="row.detail" class="cn-field-list-widget__detail">
					{{ row.detail }}
				</p>
			</li>
		</ul>

		<p v-if="hint" class="cn-field-list-widget__hint">
			{{ hint }}
		</p>

		<form
			v-if="canAdd"
			class="cn-field-list-widget__add"
			data-testid="cn-field-list-add"
			@submit.prevent="add">
			<div
				v-for="field in addFields"
				:key="field.key"
				class="cn-field-list-widget__field"
				:data-testid="`cn-field-list-input-${field.key}`">
				<NcSelect
					v-if="field.type === 'select'"
					v-model="draft[field.key]"
					:inputLabel="field.label"
					:options="field.options"
					:reduce="(option) => option.value"
					:clearable="false"
					label="label" />
				<NcTextField
					v-else
					v-model="draft[field.key]"
					:label="field.label"
					:error="Boolean(errors[field.key])"
					:helperText="errors[field.key] || ''" />
			</div>
			<NcButton type="submit"
				variant="secondary"
				:disabled="busy !== ''"
				data-testid="cn-field-list-submit">
				{{ addLabel }}
			</NcButton>
		</form>

		<NcNoteCard v-if="notice" :type="noticeType" data-testid="cn-field-list-notice">
			{{ notice }}
		</NcNoteCard>
	</div>
</template>

<script>
import { NcButton, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import CnStatusBadge from '../CnStatusBadge/CnStatusBadge.vue'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { formatBoardDate } from '../../utils/boardDate.js'
import { parseDateValue } from '../../utils/dateVariant.js'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

/**
 * CnFieldListWidget — the `field-list` widget: a list stored INSIDE one field
 * of the current object (a portal's `domains[]`, its `editors[]`), shown as
 * rows and edited in place.
 *
 * Rows are drawn from configuration (title, meta line, pill, aside, a detail
 * line); a small form adds an entry, a button removes one, and each change is
 * saved as ONE PATCH of that field on the object, after re-reading the stored
 * value so a concurrent change to the same list is not overwritten with a
 * stale copy. Optional row actions call a configured endpoint (a "check
 * again"), and an optional `rowSource` merges live per-row state read from an
 * endpoint by key without writing it back.
 *
 * The server decides who may write: a refused PATCH shows the server's words
 * and leaves the list as stored.
 *
 * @spec openspec/changes/abstract-field-list/specs/field-list/spec.md
 */
export default {
	name: 'CnFieldListWidget',

	components: { CnStatusBadge, NcButton, NcNoteCard, NcSelect, NcTextField },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `field` (required) — the object field holding the array.
		 * - `key` — the item field that identifies an entry (default: the item itself for strings).
		 * - `row` — `{ title, titleFallback?, avatar?, meta?: [paths|{ path, map?, format? }], pill?: { path, map?, variantMap? }, aside?: { path, format?, prefix? }, detail?: { template, when? } }`.
		 * - `add` — `{ label?, fields: [{ key, label, type?: 'text'|'select', options?, required?, pattern?, patternMessage? }], unique?, defaults? }`.
		 * - `remove` — `{ label? }`; omitted = no remove.
		 * - `rowActions` — `[{ id, label, when?, request: { method?, url, payload? } }]`; tokens `@object.<field>`, `@objectId`, `@row.<field>`.
		 * - `rowSource` — `{ url, path?, key }`: live per-row state merged by key.
		 * - `readOnly`, `hint`, `emptyText`.
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
		return {
			/** The list as last saved by this widget; null = read it off objectData. */
			saved: null,
			/** Live per-row state from `rowSource`, by key. */
			live: {},
			draft: {},
			errors: {},
			busy: '',
			notice: '',
			noticeType: 'error',
		}
	},

	computed: {
		/**
		 * The stored list.
		 *
		 * @return {Array}
		 */
		items() {
			const list = this.saved !== null ? this.saved : readPath(this.objectData || {}, this.content.field)
			return Array.isArray(list) ? list : []
		},

		/**
		 * The rows to draw.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-draws-the-entries-of-one-object-field
		 */
		rows() {
			const spec = this.content.row || {}
			return this.items.map((item, index) => {
				const key = this.keyOf(item, index)
				const entry = item && typeof item === 'object'
					? { ...item, ...(this.live[key] || {}) }
					: { value: item, ...(this.live[key] || {}) }
				const title = this.text(entry, spec.title) || this.text(entry, spec.titleFallback) || (typeof item === 'string' ? item : key)
				const meta = (Array.isArray(spec.meta) ? spec.meta : [])
					.map((part) => this.text(entry, part))
					.filter((part) => part !== '')
					.join(' · ')
				return {
					key,
					item,
					entry,
					title,
					initials: spec.avatar ? this.initials(title) : '',
					meta,
					pill: this.pillOf(entry, spec.pill),
					aside: spec.aside ? this.asideOf(entry, spec.aside) : '',
					detail: spec.detail && this.matches(entry, spec.detail.when) ? this.fill(spec.detail.template, entry) : '',
					actions: this.actionsFor(entry),
				}
			})
		},

		/** Whether the list is read-only. */
		readOnly() {
			return this.content.readOnly === true
		},

		/** Whether entries can be added. */
		canAdd() {
			return !this.readOnly && this.addFields.length > 0 && Boolean(this.content.field)
		},

		/** Whether entries can be removed. */
		canRemove() {
			return !this.readOnly && Boolean(this.content.remove) && Boolean(this.content.field)
		},

		/**
		 * The add form's fields, labels translated, select options translated.
		 *
		 * @return {Array<object>}
		 */
		addFields() {
			const fields = this.content.add && Array.isArray(this.content.add.fields) ? this.content.add.fields : []
			return fields
				.filter((field) => field && field.key)
				.map((field) => ({
					...field,
					label: this.tr(field.label || field.key),
					options: (Array.isArray(field.options) ? field.options : []).map((option) => (
						typeof option === 'object' ? { value: option.value, label: this.tr(option.label || String(option.value)) } : { value: option, label: this.tr(String(option)) }
					)),
				}))
		},

		addLabel() {
			return this.tr((this.content.add && this.content.add.label) || 'Add')
		},

		removeLabel() {
			return this.tr((this.content.remove && this.content.remove.label) || 'Remove')
		},

		hint() {
			return this.tr(this.content.hint || '')
		},

		emptyLabel() {
			return this.tr(this.content.emptyText || 'Nothing listed yet')
		},

		/** The object URL the list is saved to, or '' when it is not known. */
		objectUrl() {
			const id = this.objectId || (this.objectData && this.objectData.id)
			if (!this.register || !this.schema || !id || typeof this.register !== 'string' || typeof this.schema !== 'string') {
				return ''
			}
			return `/apps/openregister/api/objects/${encodeURIComponent(this.register)}/${encodeURIComponent(this.schema)}/${encodeURIComponent(String(id))}`
		},
	},

	watch: {
		objectData() {
			this.saved = null
			this.loadLive()
		},
	},

	created() {
		this.resetDraft()
		this.loadLive()
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The identity of an entry.
		 *
		 * @param {unknown} item The entry.
		 * @param {number} index Its position.
		 * @return {string}
		 */
		keyOf(item, index) {
			if (item === null || typeof item !== 'object') {
				return String(item)
			}
			const key = this.content.key ? readPath(item, this.content.key) : undefined
			return key === undefined || key === null || key === '' ? `item-${index}` : String(key)
		},

		/**
		 * A display text off an entry: a path, or `{ path, map?, format? }`.
		 *
		 * @param {object} entry The entry.
		 * @param {string|object} spec The spec.
		 * @return {string}
		 */
		text(entry, spec) {
			if (!spec) {
				return ''
			}
			const def = typeof spec === 'string' ? { path: spec } : spec
			const raw = readPath(entry, def.path)
			if (raw === null || raw === undefined || raw === '') {
				return ''
			}
			if (def.format === 'date' || def.format === 'date-long') {
				const date = parseDateValue(raw)
				if (date === null) {
					return ''
				}
				return def.format === 'date-long' ? formatBoardDate(date, new Date(date.getFullYear() + 1, 0, 1)) : formatBoardDate(date)
			}
			if (def.map && Object.hasOwn(def.map, String(raw))) {
				return this.tr(def.map[String(raw)])
			}
			return typeof raw === 'object' ? '' : String(raw)
		},

		pillOf(entry, spec) {
			if (!spec || !spec.path) {
				return null
			}
			const raw = readPath(entry, spec.path)
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const label = this.text(entry, spec)
			const variant = spec.variantMap && spec.variantMap[String(raw)]
			return { label, variant: isBadgeVariant(variant) ? variant : 'default' }
		},

		asideOf(entry, spec) {
			const value = this.text(entry, spec)
			if (value === '') {
				return ''
			}
			return spec.prefix ? `${this.tr(spec.prefix)} ${value}` : value
		},

		/**
		 * Whether an entry matches a `{ field: value }` condition (every field equal).
		 *
		 * @param {object} entry The entry.
		 * @param {object|undefined} when The condition.
		 * @return {boolean}
		 */
		matches(entry, when) {
			if (!when || typeof when !== 'object') {
				return true
			}
			return Object.entries(when).every(([field, expected]) => {
				const actual = readPath(entry, field)
				if (expected === false) {
					return actual === false || actual === undefined || actual === null || actual === ''
				}
				return String(actual) === String(expected)
			})
		},

		/**
		 * Fill `{path}` placeholders from an entry; '' when one stays empty.
		 *
		 * @param {string} template The template, translated first.
		 * @param {object} entry The entry.
		 * @return {string}
		 */
		fill(template, entry) {
			if (typeof template !== 'string') {
				return ''
			}
			let missing = false
			const out = this.tr(template).replace(/\{([\w.@]+)\}/g, (match, path) => {
				const value = readPath(entry, path)
				if (value === undefined || value === null || value === '') {
					missing = true
					return match
				}
				return String(value)
			})
			return missing ? '' : out
		},

		actionsFor(entry) {
			if (this.readOnly) {
				return []
			}
			const actions = Array.isArray(this.content.rowActions) ? this.content.rowActions : []
			return actions
				.filter((action) => action && action.id && action.request && action.request.url && this.matches(entry, action.when))
				.map((action) => ({ ...action, label: this.tr(action.label || action.id) }))
		},

		initials(name) {
			return String(name || '').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
		},

		removeAriaLabel(row) {
			return `${this.removeLabel}: ${row.title}`
		},

		resetDraft() {
			const draft = {}
			for (const field of this.addFields) {
				const first = field.type === 'select' && field.options.length > 0 ? field.options[0].value : ''
				draft[field.key] = field.default !== undefined ? field.default : first
			}
			this.draft = draft
			this.errors = {}
		},

		/**
		 * Resolve `@objectId`, `@object.<field>` and `@row.<field>` inside a string or a payload.
		 *
		 * @param {unknown} value The value.
		 * @param {object} entry The row entry.
		 * @return {unknown}
		 */
		resolve(value, entry) {
			if (Array.isArray(value)) {
				return value.map((v) => this.resolve(v, entry))
			}
			if (value && typeof value === 'object') {
				return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.resolve(v, entry)]))
			}
			if (typeof value !== 'string') {
				return value
			}
			const object = this.objectData || {}
			const read = (source, path) => {
				const v = readPath(source || {}, path)
				return v === undefined || v === null ? '' : v
			}
			const whole = value.match(/^@(row|object)\.([\w.@]+)$/)
			if (whole) {
				return read(whole[1] === 'row' ? entry : object, whole[2])
			}
			return value
				.replace(/@objectId/g, () => encodeURIComponent(String(this.objectId || object.id || '')))
				.replace(/@(row|object)\.([\w.@]+)/g, (m, scope, path) => encodeURIComponent(String(read(scope === 'row' ? entry : object, path))))
		},

		async http() {
			const { default: axios } = await import('@nextcloud/axios')
			return { axios }
		},

		/**
		 * Read live per-row state from `rowSource` and keep it by key.
		 *
		 * @return {Promise<void>}
		 */
		async loadLive() {
			const source = this.content.rowSource
			if (!source || !source.url || !source.key || !this.objectData) {
				return
			}
			try {
				const { axios } = await this.http()
				const response = await axios.get(prefixUrl(this.resolve(source.url, {})))
				const data = response && response.data
				const list = source.path ? readPath(data, source.path) : data
				const live = {}
				for (const item of Array.isArray(list) ? list : []) {
					const key = item && readPath(item, source.key)
					if (key !== undefined && key !== null) {
						live[String(key)] = item
					}
				}
				this.live = live
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnFieldListWidget] rowSource could not be read:', e?.message || e)
			}
		},

		/**
		 * Save a new list: re-read the stored value, apply the change to it, and
		 * PATCH that one field.
		 *
		 * @param {(stored: Array) => Array} change Builds the next list from the stored one, or throws an Error with a `userMessage`.
		 * @param {string} busyKey What is busy.
		 * @return {Promise<boolean>} Whether it saved.
		 * @spec openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-saves-one-field-with-one-patch
		 */
		async save(change, busyKey) {
			if (!this.objectUrl) {
				this.notify(this.tr('This list cannot be saved here.'))
				return false
			}
			this.busy = busyKey
			this.notice = ''
			try {
				const { axios } = await this.http()
				const { data: stored } = await axios.get(prefixUrl(this.objectUrl))
				const current = readPath(stored || {}, this.content.field)
				const next = change(Array.isArray(current) ? current : [])
				const { data } = await axios.patch(prefixUrl(this.objectUrl), { [this.content.field]: next })
				const written = readPath(data || {}, this.content.field)
				this.saved = Array.isArray(written) ? written : next
				this.$emit('saved', { field: this.content.field, value: this.saved })
				return true
			} catch (e) {
				this.notify(e && e.userMessage ? e.userMessage : serverErrorMessage(e))
				return false
			} finally {
				this.busy = ''
			}
		},

		notify(message, type = 'error') {
			this.notice = message
			this.noticeType = type
		},

		/**
		 * Validate the draft and add it.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-adds-and-removes-entries
		 */
		async add() {
			const errors = {}
			for (const field of this.addFields) {
				const value = this.draft[field.key]
				const empty = value === undefined || value === null || String(value).trim() === ''
				if (field.required && empty) {
					errors[field.key] = this.tr('Fill this in.')
				} else if (!empty && field.pattern && !new RegExp(field.pattern).test(String(value).trim())) {
					errors[field.key] = this.tr(field.patternMessage || 'This value is not valid.')
				}
			}
			this.errors = errors
			if (Object.keys(errors).length > 0) {
				return
			}
			const entry = { ...((this.content.add && this.content.add.defaults) || {}) }
			for (const field of this.addFields) {
				const value = this.draft[field.key]
				if (value !== undefined && value !== null && String(value).trim() !== '') {
					entry[field.key] = typeof value === 'string' ? value.trim() : value
				}
			}
			const unique = this.content.add && this.content.add.unique
			const saved = await this.save((stored) => {
				if (unique && stored.some((item) => item && String(readPath(item, unique)) === String(entry[unique]))) {
					const error = new Error('duplicate')
					error.userMessage = this.tr('This is already in the list.')
					throw error
				}
				return [...stored, entry]
			}, '*')
			if (saved) {
				this.resetDraft()
				this.loadLive()
			}
		},

		/**
		 * Remove an entry by its key.
		 *
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 */
		async remove(row) {
			await this.save((stored) => stored.filter((item, index) => this.keyOf(item, index) !== row.key), row.key)
		},

		/**
		 * Run a row action's request, then re-read the live state.
		 *
		 * @param {object} action The action.
		 * @param {object} row The row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-row-can-run-a-configured-request
		 */
		async runAction(action, row) {
			this.busy = row.key
			this.notice = ''
			try {
				const { axios } = await this.http()
				const method = String(action.request.method || 'POST').toLowerCase()
				const payload = this.resolve(action.request.payload || {}, row.entry)
				const response = method === 'get'
					? await axios.get(prefixUrl(this.resolve(action.request.url, row.entry)))
					: await axios[method](prefixUrl(this.resolve(action.request.url, row.entry)), payload)
				const message = response && response.data && typeof response.data.message === 'string' ? response.data.message : ''
				if (message) {
					this.notify(message, 'info')
				}
				await this.loadLive()
			} catch (e) {
				this.notify(serverErrorMessage(e))
			} finally {
				this.busy = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-field-list-widget {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

.cn-field-list-widget__rows {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.cn-field-list-widget__row {
	padding: 10px 0;
	border-top: 1px solid var(--color-border);
}

.cn-field-list-widget__row:first-child {
	border-top: none;
	padding-top: 0;
}

.cn-field-list-widget__line {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.cn-field-list-widget__avatar {
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
	font-size: 12px;
	font-weight: 700;
}

.cn-field-list-widget__main {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-field-list-widget__title {
	font-weight: 600;
	overflow-wrap: anywhere;
}

.cn-field-list-widget__meta,
.cn-field-list-widget__aside,
.cn-field-list-widget__detail,
.cn-field-list-widget__hint,
.cn-field-list-widget__empty {
	color: var(--color-text-maxcontrast);
}

.cn-field-list-widget__meta,
.cn-field-list-widget__aside,
.cn-field-list-widget__detail {
	font-size: 13px;
}

.cn-field-list-widget__aside {
	white-space: nowrap;
}

.cn-field-list-widget__detail,
.cn-field-list-widget__hint,
.cn-field-list-widget__empty {
	margin: 4px 0 0;
	overflow-wrap: anywhere;
}

.cn-field-list-widget__add {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px 12px;
}

.cn-field-list-widget__add > * {
	flex: 1 1 180px;
}

.cn-field-list-widget__add > button {
	flex: 0 0 auto;
}
</style>
