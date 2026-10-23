<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-field-list-widget" data-testid="cn-field-list-widget">
		<div v-if="canAdd && addTrigger && addPlacement === 'header'" class="cn-field-list-widget__toolbar">
			<NcButton
				variant="secondary"
				:disabled="busy !== ''"
				data-testid="cn-field-list-open-add"
				@click="adding = !adding">
				+ {{ addLabel }}
			</NcButton>
		</div>
		<form
			v-if="canAdd && addTrigger && addAtTop && adding"
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
				<NcCheckboxRadioSwitch
					v-else-if="field.type === 'checkbox'"
					v-model="draft[field.key]">
					{{ field.label }}
				</NcCheckboxRadioSwitch>
				<NcTextField
					v-else
					v-model="draft[field.key]"
					:label="field.label"
					:error="Boolean(errors[field.key])"
					:helperText="errors[field.key] || ''" />
			</div>
			<NcButton type="submit"
				variant="primary"
				:disabled="busy !== ''"
				data-testid="cn-field-list-submit">
				{{ editingKey !== null ? saveLabel : addLabel }}
			</NcButton>
			<NcButton
				v-if="editingKey !== null"
				variant="tertiary"
				data-testid="cn-field-list-cancel-edit"
				@click="cancelEdit">
				{{ tr('Cancel') }}
			</NcButton>
		</form>
		<p v-if="lead" class="cn-field-list-widget__lead" data-testid="cn-field-list-lead">
			{{ lead }}
		</p>
		<p v-if="rows.length === 0" class="cn-field-list-widget__empty" data-testid="cn-field-list-empty">
			{{ emptyLabel }}
		</p>
		<div v-else-if="isTable" class="cn-field-list-widget__table-wrap">
			<table class="cn-field-list-widget__table" data-testid="cn-field-list-table">
				<thead>
					<tr>
						<th
							v-for="column in tableColumns"
							:key="column.key"
							scope="col"
							class="cn-field-list-widget__th">
							{{ column.header }}
						</th>
						<th v-if="hasMenu" scope="col" class="cn-field-list-widget__th cn-field-list-widget__th--menu">
							<span class="cn-field-list-widget__sr">{{ tr('Actions') }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in rows"
						:key="row.key"
						class="cn-field-list-widget__tr"
						:data-testid="`cn-field-list-row-${row.key}`">
						<td
							v-for="(column, index) in tableColumns"
							:key="column.key"
							class="cn-field-list-widget__td">
							<CnStatusBadge
								v-if="column.pill && row.cells[index].pill"
								:label="row.cells[index].pill.label"
								:variant="row.cells[index].pill.variant"
								size="small" />
							<strong v-else-if="column.strong">{{ row.cells[index].text }}</strong>
							<code v-else-if="column.code" class="cn-field-list-widget__code">{{ row.cells[index].text }}</code>
							<template v-else>
								{{ row.cells[index].text }}
							</template>
						</td>
						<td v-if="hasMenu" class="cn-field-list-widget__td cn-field-list-widget__td--menu">
							<NcButton
								v-for="action in inlineActions(row)"
								:key="action.id"
								variant="secondary"
								:disabled="busy !== ''"
								:aria-label="action.ariaLabel || undefined"
								:data-testid="`cn-field-list-action-${action.id}-${row.key}`"
								@click="runAction(action, row)">
								{{ action.label }}
							</NcButton>
							<NcActions
								v-if="menuItems(row).length > 0"
								:forceMenu="true"
								:disabled="busy !== ''"
								:ariaLabel="`${tr('More actions')}: ${row.title}`"
								:data-testid="`cn-field-list-menu-${row.key}`">
								<NcActionButton
									v-for="item in menuItems(row)"
									:key="item.id"
									:data-testid="`cn-field-list-menu-${item.id}-${row.key}`"
									@click="item.run">
									{{ item.label }}
								</NcActionButton>
							</NcActions>
						</td>
					</tr>
				</tbody>
			</table>
			<div
				v-for="row in bandRows"
				:key="row.key"
				class="cn-field-list-widget__band"
				role="note"
				:data-testid="`cn-field-list-band-${row.key}`">
				<span class="cn-field-list-widget__band-text">{{ row.detail }}</span>
				<NcButton
					v-for="copy in row.copies"
					:key="`copy-${copy.path}`"
					variant="tertiary"
					:data-testid="`cn-field-list-copy-${copy.path}-${row.key}`"
					@click="copyValue(copy)">
					{{ copy.label }}
				</NcButton>
				<NcButton
					v-for="action in row.bandActions"
					:key="action.id"
					variant="secondary"
					:disabled="busy !== ''"
					:data-testid="`cn-field-list-band-action-${action.id}-${row.key}`"
					@click="runAction(action, row)">
					{{ action.label }}
				</NcButton>
			</div>
		</div>
		<ul v-else class="cn-field-list-widget__rows">
			<li
				v-for="row in rows"
				:key="row.key"
				class="cn-field-list-widget__row"
				:data-testid="`cn-field-list-row-${row.key}`">
				<div class="cn-field-list-widget__line">
					<span v-if="row.initials" class="cn-field-list-widget__avatar" aria-hidden="true">{{ row.initials }}</span>
					<span class="cn-field-list-widget__main">
						<a
							v-if="row.href"
							class="cn-field-list-widget__title"
							:href="row.href"
							v-bind="row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}">{{ row.title }}</a>
						<span v-else class="cn-field-list-widget__title">{{ row.title }}</span>
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
						v-if="canEdit"
						variant="tertiary"
						:disabled="busy !== ''"
						:aria-label="`${editLabel}: ${row.title}`"
						:data-testid="`cn-field-list-edit-${row.index}`"
						@click="startEdit(row)">
						{{ editLabel }}
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
				<div v-if="row.detail && row.copies.length > 0" class="cn-field-list-widget__copies">
					<NcButton
						v-for="copy in row.copies"
						:key="`copy-${copy.path}`"
						variant="tertiary"
						:data-testid="`cn-field-list-copy-${copy.path}-${row.key}`"
						@click="copyValue(copy)">
						{{ copy.label }}
					</NcButton>
				</div>
			</li>
		</ul>

		<p v-if="hint" class="cn-field-list-widget__hint">
			{{ hint }}
		</p>

		<div v-if="canAdd && addTrigger && addPlacement === 'footer' && !adding" class="cn-field-list-widget__toolbar">
			<NcButton
				variant="secondary"
				:disabled="busy !== ''"
				data-testid="cn-field-list-open-add"
				@click="adding = true">
				+ {{ addLabel }}
			</NcButton>
		</div>
		<form
			v-if="canAdd && !(addTrigger && addAtTop) && (!addTrigger || adding)"
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
				<NcCheckboxRadioSwitch
					v-else-if="field.type === 'checkbox'"
					v-model="draft[field.key]">
					{{ field.label }}
				</NcCheckboxRadioSwitch>
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
				{{ editingKey !== null ? saveLabel : addLabel }}
			</NcButton>
			<NcButton
				v-if="editingKey !== null"
				variant="tertiary"
				data-testid="cn-field-list-cancel-edit"
				@click="cancelEdit">
				{{ tr('Cancel') }}
			</NcButton>
		</form>

		<span class="cn-field-list-widget__sr" aria-live="polite" data-testid="cn-field-list-copied">{{ copied }}</span>
		<NcNoteCard v-if="notice" :type="noticeType" data-testid="cn-field-list-notice">
			{{ notice }}
		</NcNoteCard>
	</div>
</template>

<script>
import { NcActionButton, NcActions, NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
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
/**
 * A link a row title may carry: http(s) or root-relative, '' otherwise.
 *
 * @param {unknown} value The candidate.
 * @return {string} The link.
 */
function safeRowHref(value) {
	const text = typeof value === 'string' ? value.trim() : ''
	return /^(\/(?!\/)|https?:\/\/)/i.test(text) ? text : ''
}

/**
 * The link of a row title: a path to a safe link, or `{ path, scheme }` for
 * a `mailto:` or `tel:` link to the value.
 *
 * @param {object} entry The row entry.
 * @param {string|{path: string, scheme: string}} spec The `row.href` config.
 * @return {string} The link, '' for none.
 */
function rowHref(entry, spec) {
	if (spec && typeof spec === 'object') {
		const value = readPath(entry, spec.path)
		const text = typeof value === 'string' ? value.trim() : ''
		if (text === '' || !['mailto', 'tel'].includes(spec.scheme)) {
			return ''
		}
		return `${spec.scheme}:${spec.scheme === 'tel' ? text.replace(/[^\d+]/g, '') : encodeURIComponent(text).replace(/%40/g, '@')}`
	}
	return safeRowHref(readPath(entry, spec))
}

export default {
	name: 'CnFieldListWidget',

	components: { CnStatusBadge, NcActionButton, NcActions, NcButton, NcCheckboxRadioSwitch, NcNoteCard, NcSelect, NcTextField },

	inject: {
		cnTranslate: { default: () => (key) => key },
		/** Opens a registered modal (CnAppRoot), for a row action with `dialog`. */
		cnOpenModal: { default: null },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `field` (required) — the object field holding the array.
		 * - `key` — the item field that identifies an entry (default: the item itself for strings).
		 * - `row` — `{ title, titleFallback?, avatar?, meta?: [paths|{ path, map?, format? }], pill?: { path, map?, variantMap? }, aside?: { path, format?, prefix?, fallback? }, detail?: { template, when?, copy?: [{ path, label }] } }`. `detail.copy` puts a copy button beside the detail line for each named value of the row (an empty value gets none), such as a DNS record's name and value.
		 * - `add` — `{ label?, fields: [{ key, label, type?: 'text'|'select', options?, required?, pattern?, patternMessage? }], unique?, defaults? }`.
		 * - `remove` — `{ label? }`; omitted = no remove.
		 * - `rowActions` — `[{ id, label, ariaLabel?, when?, placement?: 'band'|'inline', request: { method?, url, payload? } }]`, or `{ id, label, dialog, props }` to open a modal registered in the app registry with filled props (shown in `readOnly` too, since it writes nothing, and only when every token in `props` fills); tokens `@object.<field>`, `@objectId`, `@row.<field>`, `@index`. In the table variant `placement: 'inline'` draws the action as a button in the row instead of in the "..." menu; `ariaLabel` is a template filled from the row.
		 * - `when` (row actions, `detail`) — `{ field: value }`, every field equal; or per field `{ eq?, neq?, set? }`, where a value `@row.<field>` (or `@<field>`) is another field of the same row: `{ deliveredRef: { set: true, neq: '@originalRef' } }`.
		 * - `rowSource` — `{ url, path?, key }`: live per-row state merged by key.
		 * - `variant: 'table'` + `columns` — `[{ header, path, map?, format?, strong?, pill?, variantMap? }]`: rows as a table; a per-row "..." menu holds the row actions and remove; `detail` lines become a warning band under the table, with the row actions that have `placement: 'band'`.
		 * - `add.trigger: 'button'`, `add.placement: 'header' | 'title' | 'footer'` — the add form opens from a button; `title` reports the button for the card's title row on the `header` event.
		 * - `readOnly`, `hint`, `emptyText`.
		 * - `row.href` — the path of a link for the row title; only http(s) and root-relative links, an absolute one opens in a new tab.
		 * - `lead` — a line above the rows, translated, with `{path}` filled from the object.
		 * - `edit` — `true` or `{ label?, saveLabel? }`: an Edit button per row opens the form prefilled and saves the entry in place.
		 * - `add.fields[].type: 'checkbox'`; `add.exclusive` — flags only one entry holds; `add.requireOneOf` (+ `requireOneOfMessage`) — keys of which one must be filled.
		 * - `row.href` may be `{ path, scheme: 'mailto'|'tel' }`.
		 * - `afterSave` — `{ url, method?, body?, failureText? }`: called after every save that went through, with `@objectId` / `@object.<field>` tokens; when it fails the save stands and `failureText` shows.
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

	emits: ['saved', 'header'],

	data() {
		return {
			/** The list as last saved by this widget; null = read it off objectData. */
			saved: null,
			/** Live per-row state from `rowSource`, by key. */
			live: {},
			draft: {},
			/** Whether the add form is open (only with `add.trigger: 'button'`). */
			adding: false,
			/** The key of the entry the form edits; null while it adds. */
			editingKey: null,
			errors: {},
			busy: '',
			notice: '',
			noticeType: 'error',
			// What the last copy button put on the clipboard, said to a screen reader.
			copied: '',
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
				const href = spec.href ? rowHref(entry, spec.href) : ''
				return {
					key,
					index,
					item,
					entry,
					title,
					href,
					external: /^https?:\/\//i.test(href),
					initials: spec.avatar ? this.initials(title) : '',
					meta,
					pill: this.pillOf(entry, spec.pill),
					aside: spec.aside ? this.asideOf(entry, spec.aside) : '',
					detail: spec.detail && this.matches(entry, spec.detail.when) ? this.fill(spec.detail.template, entry) : '',
					copies: spec.detail && this.matches(entry, spec.detail.when) ? this.copiesOf(entry, spec.detail.copy) : [],
					actions: this.actionsFor(entry, index),
					cells: this.isTable ? this.cellsOf(entry) : [],
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

		/** Whether entries can be edited in place (`edit`). */
		canEdit() {
			return !this.readOnly && Boolean(this.content.edit) && Boolean(this.content.field) && this.addFields.length > 0
		},

		/** @return {string} The edit button's label. */
		editLabel() {
			const edit = this.content.edit
			return this.tr((edit && typeof edit === 'object' && edit.label) || 'Edit')
		},

		/** @return {string} The submit label while editing. */
		saveLabel() {
			const edit = this.content.edit
			return this.tr((edit && typeof edit === 'object' && edit.saveLabel) || 'Save')
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

		/** Whether the rows are drawn as a table (`variant: 'table'`). */
		isTable() {
			return this.content.variant === 'table' && this.tableColumns.length > 0
		},

		/**
		 * The table columns, headers translated.
		 *
		 * @return {Array<object>}
		 */
		tableColumns() {
			return (Array.isArray(this.content.columns) ? this.content.columns : [])
				.filter((column) => column && column.path)
				.map((column, index) => ({ ...column, key: `${column.path}-${index}`, header: this.tr(column.header || '') }))
		},

		/** Whether each row has an actions cell: inline row actions, or a "more actions" menu (row actions not placed in the band, and remove). */
		hasMenu() {
			return this.isTable && (this.canRemove || this.rows.some((row) => this.menuItems(row).length > 0 || this.inlineActions(row).length > 0))
		},

		/** Rows with a detail line: in the table variant it is a warning band under the table. */
		bandRows() {
			return this.rows
				.filter((row) => row.detail !== '')
				.map((row) => ({ ...row, bandActions: row.actions.filter((action) => action.placement === 'band') }))
		},

		/** Whether the add form opens from a button (`add.trigger: 'button'`). */
		addTrigger() {
			return Boolean(this.content.add && this.content.add.trigger === 'button')
		},

		/**
		 * Where the add button sits: `header` (above the rows), `title` (the
		 * card's title row, reported on the `header` event) or `footer` (default).
		 */
		addPlacement() {
			const placement = this.content.add && this.content.add.placement
			return placement === 'header' || placement === 'title' ? placement : 'footer'
		},

		/** Whether the add form opens above the rows. */
		addAtTop() {
			return this.addPlacement === 'header' || this.addPlacement === 'title'
		},

		/**
		 * The card title row's actions: the add button with `add.placement: "title"`.
		 *
		 * @return {Array<{label: string, icon: string, run: () => void}>} The actions.
		 */
		titleActions() {
			if (!(this.canAdd && this.addTrigger && this.addPlacement === 'title')) {
				return []
			}
			const run = () => {
				this.adding = !this.adding
			}
			return [{ label: this.addLabel, icon: 'Plus', run }]
		},

		addLabel() {
			return this.tr((this.content.add && this.content.add.label) || 'Add')
		},

		removeLabel() {
			return this.tr((this.content.remove && this.content.remove.label) || 'Remove')
		},

		/**
		 * The line above the rows, filled from the object.
		 *
		 * @spec openspec/changes/field-list-links-lead-after-save/specs/field-list/spec.md#requirement-a-field-list-links-its-rows-leads-with-the-object-and-calls-after-a-save
		 * @return {string}
		 */
		lead() {
			if (!this.content.lead) {
				return ''
			}
			return this.tr(this.content.lead).replace(/\{([\w.]+)\}/g, (m, path) => {
				const value = readPath(this.objectData || {}, path)
				return value === undefined || value === null ? '' : String(value)
			})
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
		titleActions: {
			immediate: true,
			handler(actions) {
				/**
				 * @event header The card's title-row actions, `{ actions }`, for the host to draw.
				 */
				this.$emit('header', { actions })
			},
		},

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
		 * The cells of one table row, one per column.
		 *
		 * @param {object} entry The entry.
		 * @return {Array<{text: string, pill: object|null}>}
		 */
		cellsOf(entry) {
			return this.tableColumns.map((column) => ({
				text: this.text(entry, column),
				pill: column.pill ? this.pillOf(entry, column) : null,
			}))
		},

		/**
		 * The items of a row's menu in the table variant: the row actions not
		 * placed in the band, then remove.
		 *
		 * @param {object} row The row.
		 * @return {Array<{id: string, label: string, run: Function}>}
		 */
		menuItems(row) {
			const items = row.actions
				.filter((action) => action.placement !== 'band' && action.placement !== 'inline')
				.map((action) => ({ id: action.id, label: action.label, run: () => this.runAction(action, row) }))
			if (this.canRemove) {
				items.push({ id: 'remove', label: this.removeLabel, run: () => this.remove(row) })
			}
			return items
		},

		/**
		 * The row actions drawn as buttons in a table row (`placement: 'inline'`).
		 *
		 * @param {object} row The row.
		 * @return {Array<object>}
		 */
		inlineActions(row) {
			return row.actions.filter((action) => action.placement === 'inline')
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
				// No value: the optional `fallback` label, translated, instead of an empty aside.
				return this.tr(spec.fallback)
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
				if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
					return this.matchesOperators(entry, actual, expected)
				}
				if (expected === false) {
					return actual === false || actual === undefined || actual === null || actual === ''
				}
				return String(actual) === String(expected)
			})
		},

		/**
		 * Whether a value passes `{ eq?, neq?, set? }`. An operand `@row.<field>`
		 * or `@<field>` is that field of the same entry.
		 *
		 * @param {object} entry The entry.
		 * @param {unknown} actual The value tested.
		 * @param {object} ops The operators.
		 * @return {boolean}
		 */
		matchesOperators(entry, actual, ops) {
			const empty = (v) => v === undefined || v === null || v === ''
			const operand = (v) => {
				if (typeof v === 'string' && v.startsWith('@')) {
					const path = v.startsWith('@row.') ? v.slice('@row.'.length) : v.slice(1)
					return readPath(entry, path)
				}
				return v
			}
			const same = (a, b) => (empty(a) && empty(b)) || (!empty(a) && !empty(b) && String(a) === String(b))
			if (ops.set !== undefined && Boolean(ops.set) !== !empty(actual)) {
				return false
			}
			if (Object.hasOwn(ops, 'eq') && !same(actual, operand(ops.eq))) {
				return false
			}
			if (Object.hasOwn(ops, 'neq') && same(actual, operand(ops.neq))) {
				return false
			}
			return true
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

		/**
		 * The row actions an entry offers: request actions unless the list is
		 * read-only, and dialog actions always, when their props all fill.
		 *
		 * @param {object} entry The entry.
		 * @param {number} index Its position.
		 * @return {Array<object>}
		 */
		actionsFor(entry, index) {
			const actions = Array.isArray(this.content.rowActions) ? this.content.rowActions : []
			return actions
				.filter((action) => action && action.id && this.matches(entry, action.when))
				.filter((action) => (action.dialog
					? this.dialogPropsOf(action, entry, index) !== null
					: !this.readOnly && action.request && action.request.url))
				.map((action) => ({
					...action,
					label: this.tr(action.label || action.id),
					ariaLabel: action.ariaLabel ? this.fill(action.ariaLabel, entry) : '',
				}))
		},

		/**
		 * A dialog action's props with their tokens filled, `/apps/` paths made
		 * absolute; null when a token stays empty, so the dialog is not offered
		 * with half an address.
		 *
		 * @param {object} action The action.
		 * @param {object} entry The entry.
		 * @param {number} index Its position.
		 * @return {object|null}
		 */
		dialogPropsOf(action, entry, index) {
			const out = {}
			for (const [name, value] of Object.entries(action.props || {})) {
				if (typeof value !== 'string') {
					out[name] = value
					continue
				}
				let missing = false
				const object = this.objectData || {}
				const filled = value
					.replace(/@index\b/g, () => String(index))
					.replace(/@objectId\b/g, () => {
						const id = String(this.objectId || object.id || '')
						missing = missing || id === ''
						return encodeURIComponent(id)
					})
					.replace(/@(row|object)\.([\w.@]+)/g, (m, scope, path) => {
						const v = readPath((scope === 'row' ? entry : object) || {}, path)
						missing = missing || v === undefined || v === null || v === ''
						return encodeURIComponent(String(v ?? ''))
					})
				if (missing) {
					return null
				}
				out[name] = filled.startsWith('/apps/') ? prefixUrl(filled) : filled
			}
			return out
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
				const empty = field.type === 'checkbox' ? false : ''
				const first = field.type === 'select' && field.options.length > 0 ? field.options[0].value : empty
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
				/**
				 * @event saved The list was saved: one PATCH of the field succeeded.
				 * @type {{field: string, value: Array}}
				 */
				this.$emit('saved', { field: this.content.field, value: this.saved })
				await this.runAfterSave(axios)
				return true
			} catch (e) {
				this.notify(e && e.userMessage ? e.userMessage : serverErrorMessage(e))
				return false
			} finally {
				this.busy = ''
			}
		},

		/**
		 * Call `afterSave` once a save went through. A failure leaves the save
		 * standing and shows `failureText`.
		 *
		 * @spec openspec/changes/field-list-links-lead-after-save/specs/field-list/spec.md#requirement-a-field-list-links-its-rows-leads-with-the-object-and-calls-after-a-save
		 * @param {object} axios The HTTP client.
		 * @return {Promise<void>}
		 */
		async runAfterSave(axios) {
			const after = this.content.afterSave
			if (!after || typeof after.url !== 'string' || after.url === '') {
				return
			}
			try {
				const method = String(after.method || 'POST').toLowerCase()
				const url = prefixUrl(this.resolve(after.url, {}))
				if (method === 'get') {
					await axios.get(url)
				} else {
					await axios[method](url, this.resolve(after.body || {}, {}))
				}
			} catch {
				if (after.failureText) {
					this.notify(this.tr(after.failureText), 'warning')
				}
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
			const oneOf = Array.isArray(this.content.add?.requireOneOf) ? this.content.add.requireOneOf : []
			if (oneOf.length > 0 && oneOf.every((key) => String(this.draft[key] ?? '').trim() === '')) {
				errors[oneOf[0]] = this.tr(this.content.add.requireOneOfMessage || 'Fill this in.')
			}
			this.errors = errors
			if (Object.keys(errors).length > 0) {
				return
			}
			const entry = this.newEntry()
			const scalar = typeof entry !== 'object'
			const unique = this.content.add && this.content.add.unique
			const editing = this.editingKey
			const saved = await this.save((stored) => {
				const others = stored.filter((item, index) => editing === null || this.keyOf(item, index) !== editing)
				const duplicate = scalar
					? (unique && others.some((item) => String(item) === String(entry)))
					: (unique && others.some((item) => item && String(readPath(item, unique)) === String(entry[unique])))
				if (duplicate) {
					const error = new Error('duplicate')
					error.userMessage = this.tr('This is already in the list.')
					throw error
				}
				const next = editing === null
					? [...stored, entry]
					: stored.map((item, index) => (this.keyOf(item, index) === editing ? (scalar ? entry : { ...item, ...entry }) : item))
				return this.withExclusive(next, editing === null ? next.length - 1 : next.findIndex((item, index) => this.keyOf(stored[index], index) === editing))
			}, '*')
			if (saved) {
				this.resetDraft()
				this.adding = false
				this.editingKey = null
				this.loadLive()
			}
		},

		/**
		 * Keep an `add.exclusive` flag on one entry: when the entry at `index`
		 * has it, every other entry loses it (one primary address).
		 *
		 * @param {Array<object>} list The list to save.
		 * @param {number} index The entry just added or edited.
		 * @return {Array<object>} The list.
		 * @spec openspec/changes/field-list-edit/specs/field-list/spec.md#requirement-a-field-list-entry-can-be-edited-and-one-entry-can-be-the-primary
		 */
		withExclusive(list, index) {
			const flags = Array.isArray(this.content.add?.exclusive) ? this.content.add.exclusive : []
			const chosen = list[index]
			if (!chosen || typeof chosen !== 'object') {
				return list
			}
			return list.map((item, i) => {
				if (i === index || !item || typeof item !== 'object') {
					return item
				}
				const cleared = { ...item }
				for (const flag of flags) {
					if (chosen[flag] === true && cleared[flag] === true) {
						cleared[flag] = false
					}
				}
				return cleared
			})
		},

		/**
		 * Open an entry in the form, prefilled.
		 *
		 * @param {object} row The row.
		 * @return {void}
		 * @spec openspec/changes/field-list-edit/specs/field-list/spec.md#requirement-a-field-list-entry-can-be-edited-and-one-entry-can-be-the-primary
		 */
		startEdit(row) {
			const draft = {}
			for (const [index, field] of this.addFields.entries()) {
				const scalarValue = this.content.add?.scalar === true && index === 0 ? row.item : undefined
				const value = row.item && typeof row.item === 'object' ? readPath(row.item, field.key) : scalarValue
				draft[field.key] = value === undefined || value === null ? (field.type === 'checkbox' ? false : '') : value
			}
			this.draft = draft
			this.errors = {}
			this.editingKey = row.key
			this.adding = true
		},

		/** Close the form without saving the edit. */
		cancelEdit() {
			this.editingKey = null
			this.adding = false
			this.resetDraft()
		},

		/**
		 * The entry the add form describes: an object of the filled add fields
		 * over `add.defaults`, or, with `add.scalar`, the trimmed value of the
		 * first add field itself (a list of strings such as `enumValues`).
		 *
		 * @return {object|string} The entry.
		 * @spec openspec/changes/side-card-follows-row/specs/side-card-follows-row/spec.md#requirement-a-field-list-adds-plain-values
		 */
		newEntry() {
			const add = this.content.add || {}
			const trimmed = (value) => (typeof value === 'string' ? value.trim() : value)
			if (add.scalar === true) {
				const first = this.addFields[0]
				return first ? trimmed(this.draft[first.key]) : ''
			}
			const entry = { ...(add.defaults || {}) }
			for (const field of this.addFields) {
				const value = this.draft[field.key]
				if (value !== undefined && value !== null && String(value).trim() !== '') {
					entry[field.key] = trimmed(value)
				}
			}
			return entry
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
		/**
		 * The copy buttons of a row's detail line: one per named value that is not empty.
		 *
		 * @param {object} entry The entry.
		 * @param {Array<{path: string, label?: string}>|undefined} declared The `detail.copy` list.
		 * @return {Array<{path: string, label: string, value: string}>}
		 */
		copiesOf(entry, declared) {
			return (Array.isArray(declared) ? declared : [])
				.filter((copy) => copy && typeof copy.path === 'string' && copy.path !== '')
				.map((copy) => ({
					path: copy.path,
					label: this.tr(copy.label || 'Copy'),
					value: String(readPath(entry, copy.path) ?? ''),
				}))
				.filter((copy) => copy.value !== '')
		},

		/**
		 * Put one value on the clipboard and say so; a browser that refuses says that instead.
		 *
		 * @param {{label: string, value: string}} copy The copy button.
		 * @return {Promise<void>}
		 */
		async copyValue(copy) {
			this.copied = ''
			try {
				await navigator.clipboard.writeText(copy.value)
				this.copied = `${this.tr('Copied')}: ${copy.label}`
			} catch {
				this.notify(this.tr('Copying did not work. Select the text and copy it yourself.'))
			}
		},

		async runAction(action, row) {
			if (action.dialog) {
				const props = this.dialogPropsOf(action, row.entry, row.index)
				if (props !== null && typeof this.cnOpenModal === 'function') {
					this.cnOpenModal(action.dialog, props)
				}
				return
			}
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

.cn-field-list-widget__lead {
	margin: 0;
	font-weight: bold;
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
.cn-field-list-widget__copies {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

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

.cn-field-list-widget__toolbar {
	display: flex;
	justify-content: flex-end;
}

.cn-field-list-widget__table-wrap {
	display: flex;
	flex-direction: column;
	gap: 12px;
	overflow-x: auto;
}

.cn-field-list-widget__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-field-list-widget__th {
	padding: 8px 12px;
	text-align: start;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
	background: var(--color-background-hover);
}

.cn-field-list-widget__th--menu,
.cn-field-list-widget__code {
	font-size: 0.85em;
	word-break: break-all;
}

.cn-field-list-widget__td--menu {
	width: 1%;
	text-align: end;
}

.cn-field-list-widget__tr {
	border-top: 1px solid var(--cn-board-hairline, var(--color-border));
}

.cn-field-list-widget__td {
	padding: 10px 12px;
	vertical-align: middle;
	overflow-wrap: anywhere;
}

.cn-field-list-widget__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
}

.cn-field-list-widget__band {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 12px;
	padding: 12px 14px;
	border: 1px solid var(--color-warning);
	border-radius: 10px;
	background: color-mix(in srgb, var(--color-warning) 14%, var(--color-main-background));
	font-size: 14px;
}
</style>
