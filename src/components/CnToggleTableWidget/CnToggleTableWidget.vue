<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-toggle-table" data-testid="cn-toggle-table">
		<p v-if="rows.length === 0" class="cn-toggle-table__empty" data-testid="cn-toggle-table-empty">
			{{ emptyLabel }}
		</p>
		<table v-else class="cn-toggle-table__table">
			<thead v-if="showHeader">
				<tr>
					<th scope="col" class="cn-toggle-table__head">
						{{ titleHeader }}
					</th>
					<th
						v-for="column in columns"
						:key="column.path"
						scope="col"
						class="cn-toggle-table__head">
						{{ column.header }}
					</th>
					<th scope="col" class="cn-toggle-table__head cn-toggle-table__head--toggle">
						{{ toggleHeader }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="row in rows"
					:key="row.key"
					class="cn-toggle-table__row"
					:data-testid="`cn-toggle-table-row-${row.key}`">
					<td class="cn-toggle-table__cell cn-toggle-table__cell--main">
						<span class="cn-toggle-table__title">{{ row.title }}</span>
						<span v-if="row.hint" class="cn-toggle-table__hint">{{ row.hint }}</span>
					</td>
					<td
						v-for="column in columns"
						:key="column.path"
						class="cn-toggle-table__cell">
						{{ cell(row, column) }}
					</td>
					<td class="cn-toggle-table__cell cn-toggle-table__cell--toggle">
						<NcCheckboxRadioSwitch
							:key="`${row.key}-${undone[row.key] || 0}`"
							:modelValue="isOn(row)"
							type="switch"
							:disabled="readOnly || busy === row.key"
							:aria-label="row.title"
							@update:modelValue="toggle(row, $event)" />
					</td>
				</tr>
			</tbody>
		</table>
		<NcNoteCard v-if="notice" type="error" data-testid="cn-toggle-table-notice">
			{{ notice }}
		</NcNoteCard>
	</div>
</template>

<script>
import { NcCheckboxRadioSwitch, NcNoteCard } from '@nextcloud/vue'
import { prefixUrl } from '../../utils/headers.js'
import { objectUrlOf, writeFields } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

/**
 * CnToggleTableWidget — the `toggle-table` widget: rows from a configured list
 * (`rows`) or read from a source (`source`), each with a switch bound to the
 * CURRENT object, and optional extra columns read off the row. A switch is
 * stored in one of two ways:
 *
 * - `bind.mode: 'flag'` — each row names its own boolean field of the object
 *   (`row.field`); the switch is that field.
 * - `bind.mode: 'list'` — ONE array field of the object (`bind.field`) holds
 *   the keys of the rows that are in it; the switch is on when the row's key is
 *   in the list, or NOT in it with `bind.invert` (a list of hidden items shown
 *   as "visible" switches).
 *
 * A toggle saves at once with ONE PATCH of that field; a refused PATCH puts the
 * switch back and shows the server's words.
 *
 * @spec openspec/changes/abstract-toggle-table/specs/toggle-table/spec.md
 */
export default {
	name: 'CnToggleTableWidget',

	components: { NcCheckboxRadioSwitch, NcNoteCard },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `bind` — `{ mode: 'flag' }` (default) or `{ mode: 'list', field, invert? }`.
		 * - `rows` — static rows `[{ key, label, hint?, field?, ...extra }]`.
		 * - `source` — `{ url, path?, key, label, hint? }`: rows read from an endpoint (tokens `@objectId`, `@object.<field>`), in addition to `rows`.
		 * - `columns` — extra columns `[{ header, path, map? }]` read off each row.
		 * - `titleHeader`, `toggleHeader`, `emptyText`, `readOnly`.
		 * - `save` — `{ url, method?, payload? }`, write through an app endpoint (tokens `{value}`, `{field}`, `{changes}`, `{object.<path>}`).
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
			/** Rows read from `source`. */
			sourced: [],
			/** What the object holds, by field: the flags and the list, as last saved. */
			saved: {},
			busy: '',
			notice: '',
			/** Per row, how often a refused toggle forced the switch to be drawn again from the stored value. */
			undone: {},
		}
	},

	computed: {
		bind() {
			const bind = this.content.bind || {}
			return bind.mode === 'list' ? { mode: 'list', field: bind.field, invert: bind.invert === true } : { mode: 'flag' }
		},

		/** The drawn rows: configured first, then sourced, each with a key, title and hint. */
		rows() {
			const configured = (Array.isArray(this.content.rows) ? this.content.rows : [])
				.filter((row) => row && row.key !== undefined)
				.map((row) => ({ ...row, key: String(row.key), title: this.tr(row.label || String(row.key)), hint: this.tr(row.hint || '') }))
			return [...configured, ...this.sourced]
		},

		columns() {
			return (Array.isArray(this.content.columns) ? this.content.columns : [])
				.filter((column) => column && column.path)
				.map((column) => ({ ...column, header: this.tr(column.header || '') }))
		},

		showHeader() {
			return this.columns.length > 0 || Boolean(this.content.titleHeader || this.content.toggleHeader)
		},

		titleHeader() {
			return this.tr(this.content.titleHeader || '')
		},

		toggleHeader() {
			return this.tr(this.content.toggleHeader || '')
		},

		emptyLabel() {
			return this.tr(this.content.emptyText || 'Nothing listed yet')
		},

		readOnly() {
			return this.content.readOnly === true
		},

		objectUrl() {
			return objectUrlOf(this.register, this.schema, this.objectId || (this.objectData && this.objectData.id))
		},
	},

	watch: {
		objectData() {
			this.saved = {}
			this.loadSource()
		},
	},

	created() {
		this.loadSource()
	},

	methods: {
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * The stored value of a field: what this widget last saved, else the object's.
		 *
		 * @param {string} field The field.
		 * @return {unknown}
		 */
		stored(field) {
			return Object.hasOwn(this.saved, field) ? this.saved[field] : readPath(this.objectData || {}, field)
		},

		/**
		 * Whether a row's switch is on.
		 *
		 * @param {object} row The row.
		 * @return {boolean}
		 */
		isOn(row) {
			if (this.bind.mode === 'list') {
				const list = this.stored(this.bind.field)
				const inList = Array.isArray(list) && list.map(String).includes(row.key)
				return this.bind.invert ? !inList : inList
			}
			return row.field ? this.stored(row.field) === true : false
		},

		/**
		 * The text of an extra column for a row.
		 *
		 * @param {object} row The row.
		 * @param {object} column The column.
		 * @return {string}
		 */
		cell(row, column) {
			const raw = readPath(row, column.path)
			if (raw === undefined || raw === null || raw === '') {
				return ''
			}
			if (column.map && Object.hasOwn(column.map, String(raw))) {
				return this.tr(column.map[String(raw)])
			}
			return typeof raw === 'object' ? '' : String(raw)
		},

		/** Read the rows of `source`, resolving tokens in its url. */
		async loadSource() {
			const source = this.content.source
			if (!source || !source.url || !source.key) {
				return
			}
			const object = this.objectData || {}
			const url = String(source.url)
				.replace(/@objectId/g, () => encodeURIComponent(String(this.objectId || object.id || '')))
				.replace(/@object\.([\w.@]+)/g, (m, path) => encodeURIComponent(String(readPath(object, path) ?? '')))
			try {
				const { default: axios } = await import('@nextcloud/axios')
				const { data } = await axios.get(prefixUrl(url))
				const list = source.path ? readPath(data, source.path) : data
				this.sourced = (Array.isArray(list) ? list : [])
					.filter((item) => item && readPath(item, source.key) !== undefined)
					.map((item) => ({
						...item,
						key: String(readPath(item, source.key)),
						title: String(readPath(item, source.label || source.key) ?? readPath(item, source.key)),
						hint: source.hint ? String(readPath(item, source.hint) ?? '') : '',
					}))
			} catch (e) {
				this.notice = serverErrorMessage(e)
			}
		},

		/**
		 * Flip one switch and save that one field.
		 *
		 * @param {object} row The row.
		 * @param {boolean} on The new switch state.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-toggle-table/specs/toggle-table/spec.md#requirement-a-toggle-saves-one-field
		 */
		async toggle(row, on) {
			const field = this.bind.mode === 'list' ? this.bind.field : row.field
			if ((!this.objectUrl && !(this.content.save && this.content.save.url)) || !field) {
				this.notice = this.tr('This switch cannot be saved here.')
				return
			}
			let next
			if (this.bind.mode === 'list') {
				const list = (Array.isArray(this.stored(field)) ? this.stored(field) : []).map(String)
				const wantInList = this.bind.invert ? !on : on
				next = wantInList ? (list.includes(row.key) ? list : [...list, row.key]) : list.filter((key) => key !== row.key)
			} else {
				next = on
			}
			this.notice = ''
			this.busy = row.key
			try {
				const data = await writeFields(this.objectUrl, { [field]: next }, { save: this.content.save, object: this.objectData })
				const answered = readPath(data, field)
				const written = answered !== undefined ? answered : next
				this.saved = { ...this.saved, [field]: written }
				/**
				 * @event saved A switch was written.
				 * @type {{field: string, value: unknown}}
				 */
				this.$emit('saved', { field, value: written })
			} catch (e) {
				this.notice = serverErrorMessage(e)
				this.undone = { ...this.undone, [row.key]: (this.undone[row.key] || 0) + 1 }
			} finally {
				this.busy = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-toggle-table {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.cn-toggle-table__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-toggle-table__head {
	padding: 8px 12px;
	text-align: start;
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
	background: var(--color-background-hover);
}

.cn-toggle-table__head--toggle,
.cn-toggle-table__cell--toggle {
	width: 1%;
	white-space: nowrap;
	text-align: end;
}

.cn-toggle-table__row {
	border-top: 1px solid var(--cn-board-hairline, var(--color-border));
}

.cn-toggle-table__cell {
	padding: 10px 12px;
	vertical-align: middle;
	overflow-wrap: anywhere;
}

.cn-toggle-table__title {
	display: block;
	font-weight: 600;
}

.cn-toggle-table__hint {
	display: block;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-toggle-table__empty {
	margin: 0;
	color: var(--color-text-maxcontrast);
}
</style>
