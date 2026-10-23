<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-slot-grid" data-testid="cn-slot-grid">
		<div v-if="addEntry" class="cn-slot-grid__toolbar">
			<NcButton variant="primary" data-testid="cn-slot-grid-add" @click="addEntry.run()">
				{{ addLabel }}
			</NcButton>
		</div>

		<div v-if="loading" class="cn-slot-grid__state" role="status">
			<NcLoadingIcon :size="20" />
			<span>{{ t('nextcloud-vue', 'Loading…') }}</span>
		</div>
		<NcNoteCard v-else-if="error" type="error" data-testid="cn-slot-grid-error">
			{{ error }}
		</NcNoteCard>
		<p v-else-if="rows.length === 0" class="cn-slot-grid__empty" data-testid="cn-slot-grid-empty">
			{{ emptyText }}
		</p>
		<div v-else class="cn-slot-grid__scroll">
			<table class="cn-slot-grid__table">
				<caption v-if="caption" class="hidden-visually">
					{{ caption }}
				</caption>
				<thead>
					<tr>
						<th scope="col">
							{{ rowHeader }}
						</th>
						<th v-for="column in columns" :key="column.value" scope="col">
							{{ column.label }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.key" :data-testid="`cn-slot-grid-row-${row.key}`">
						<th scope="row">
							{{ row.label }}
						</th>
						<td
							v-for="column in columns"
							:key="column.value"
							:data-testid="`cn-slot-grid-cell-${row.key}-${column.value}`">
							<ul class="cn-slot-grid__items">
								<li v-for="item in row.cells[column.value]" :key="item.id" class="cn-slot-grid__item">
									<span>{{ itemLabel(item) }}</span>
									<NcButton
										v-if="removeAction"
										variant="tertiary"
										:aria-label="removeLabel(item)"
										:data-testid="`cn-slot-grid-remove-${item.id}`"
										@click="askRemove(item)">
										<template #icon>
											<Close :size="20" />
										</template>
									</NcButton>
								</li>
							</ul>
							<NcButton
								v-if="cellEntry(row, column)"
								variant="tertiary"
								:aria-label="cellLabel(row, column)"
								:data-testid="`cn-slot-grid-add-${row.key}-${column.value}`"
								@click="cellEntry(row, column).run()">
								<template #icon>
									<Plus :size="20" />
								</template>
							</NcButton>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<CnActionButtons
			v-if="formActions.length > 0"
			:actions="formActions"
			display="menu"
			@entries="onEntries"
			@created="load" />

		<CnConfirmDialog
			v-if="removing"
			ref="confirmDialog"
			:dialogTitle="removeTitle"
			:message="removeMessage"
			variant="error"
			:confirmLabel="t('nextcloud-vue', 'Remove')"
			@confirm="remove"
			@close="removing = null" />
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import CnActionButtons from '../CnActionButtons/CnActionButtons.vue'
import { objectUrlOf } from '../../utils/objectWrite.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'
import { userDisplayName } from '../../utils/userDisplayName.js'

const PAGE_SIZE = 200

/**
 * CnSlotGrid lays the objects of one schema out as a grid: one row per value
 * of the row fields (a time window), one column per value of the column field
 * (a weekday), and the objects that fall in each cell listed in it. A cell
 * has an add button that opens the schema's create form seeded with the
 * cell's row and column values; each item can be removed after a confirm.
 * Use it for standby hours, shift rosters and on-call grids.
 *
 * Every object of the source is read, page by page, so no cap hides an item.
 * Resolved by its registry type key `slot-grid`.
 *
 * ```json
 * {
 *   "type": "slot-grid",
 *   "content": {
 *     "source": { "register": "learniq", "schema": "standby-slot" },
 *     "rowFields": ["startsAt", "endsAt"],
 *     "rowLabel": "{startsAt} to {endsAt}",
 *     "columnField": "weekday",
 *     "columns": [{ "value": "monday", "label": "Monday" }, { "value": "tuesday", "label": "Tuesday" }],
 *     "skipWhenField": "date",
 *     "itemLabelField": "teacherId",
 *     "itemLabelKind": "user",
 *     "cellAction": { "label": "Add standby on {column} at {startsAt}" },
 *     "addAction": { "label": "Add standby" },
 *     "removeAction": { "label": "Remove {item} from standby" }
 *   }
 * }
 * ```
 *
 * @spec openspec/changes/slot-grid/specs/slot-grid/spec.md#requirement-objects-are-laid-out-by-two-fields-and-added-per-cell
 */
export default {
	name: 'CnSlotGrid',

	components: { Close, CnActionButtons, CnConfirmDialog, NcButton, NcLoadingIcon, NcNoteCard, Plus },

	inject: {
		/** Host translate function provided by CnAppRoot: `(text, vars) => string`. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `source` — `{ register, schema, filter? }`: the objects laid out.
		 * - `rowFields` — the fields whose values make a row (a time window); rows sort by them.
		 * - `rowLabel` — the row's header, `{field}` placeholders from `rowFields`; `rowHeader` names the column.
		 * - `columnField`, `columns` — the field that picks the column, and the columns `[{ value, label }]`
		 *   in their order. An object whose value is not a column is left out.
		 * - `skipWhenField` — objects holding a value in this field are left out (a one-off date).
		 * - `itemLabelField`, `itemLabelKind` — what an item shows; `user` shows a Nextcloud user's name.
		 * - `cellAction` — `{ label, includeFields?, excludeFields?, fieldOverrides? }`: the add button of a
		 *   cell, opening the schema's create form seeded with the cell's row and column values. The label
		 *   reads `{column}` and the row fields.
		 * - `addAction` — `{ label, props? }`: one add button above the grid, unseeded.
		 * - `removeAction` — `{ label, title?, message? }`: remove an item after a confirm; `{item}` is its label.
		 * - `emptyText`, `caption`.
		 *
		 * @type {object}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			loading: true,
			error: '',
			items: [],
			entries: {},
			removing: null,
		}
	},

	computed: {
		source() {
			return this.content.source || {}
		},

		rowFields() {
			return Array.isArray(this.content.rowFields) ? this.content.rowFields : []
		},

		columns() {
			return (Array.isArray(this.content.columns) ? this.content.columns : [])
				.filter((column) => column && column.value !== undefined)
				.map((column) => ({ value: String(column.value), label: this.tr(column.label || String(column.value)) }))
		},

		/**
		 * The grid rows: one per distinct row-field value, sorted, each with
		 * its items per column.
		 *
		 * @return {Array<{key: string, label: string, values: object, cells: object}>}
		 */
		rows() {
			const columnField = this.content.columnField || ''
			const known = new Set(this.columns.map((column) => column.value))
			const rows = new Map()
			for (const item of this.items) {
				if (this.content.skipWhenField && this.present(item[this.content.skipWhenField])) {
					continue
				}
				const column = String(item[columnField] ?? '')
				if (!known.has(column)) {
					continue
				}
				const values = Object.fromEntries(this.rowFields.map((field) => [field, item[field] ?? '']))
				const key = this.rowFields.map((field) => String(values[field])).join('|')
				if (!rows.has(key)) {
					rows.set(key, { key, values, label: this.fill(this.tr(this.content.rowLabel || ''), values) || key, cells: Object.fromEntries(this.columns.map((c) => [c.value, []])) })
				}
				rows.get(key).cells[column].push(item)
			}
			return [...rows.values()].sort((a, b) => a.key.localeCompare(b.key))
		},

		/**
		 * The create-form actions CnActionButtons owns: one per cell, plus the
		 * unseeded add action.
		 *
		 * @return {Array<object>}
		 */
		formActions() {
			const actions = []
			const base = { type: 'open-form', register: this.source.register, schema: this.source.schema }
			const cell = this.content.cellAction
			if (cell) {
				const narrow = {}
				for (const key of ['includeFields', 'excludeFields', 'fieldOverrides']) {
					if (cell[key]) {
						narrow[key] = cell[key]
					}
				}
				for (const row of this.rows) {
					for (const column of this.columns) {
						actions.push({ ...base, ...narrow, id: this.cellId(row, column), label: this.cellLabel(row, column), props: { ...row.values, [this.content.columnField]: column.value } })
					}
				}
			}
			if (this.content.addAction) {
				actions.push({ ...base, id: 'add', label: this.addLabel, props: { ...(this.content.addAction.props || {}) } })
			}
			return actions
		},

		addEntry() {
			return this.content.addAction ? (this.entries.add || null) : null
		},

		addLabel() {
			return this.tr((this.content.addAction && this.content.addAction.label) || '') || t('nextcloud-vue', 'Add')
		},

		removeAction() {
			return this.content.removeAction || null
		},

		removeTitle() {
			return this.tr((this.removeAction && this.removeAction.title) || '') || t('nextcloud-vue', 'Remove')
		},

		removeMessage() {
			const item = this.removing ? this.itemLabel(this.removing) : ''
			const message = this.removeAction && this.removeAction.message
			return message ? this.tr(message, { item }) : t('nextcloud-vue', 'Remove {item}?', { item })
		},

		rowHeader() {
			return this.tr(this.content.rowHeader || '')
		},

		emptyText() {
			return this.content.emptyText ? this.tr(this.content.emptyText) : t('nextcloud-vue', 'Nothing planned yet.')
		},

		caption() {
			return this.tr(this.content.caption || '')
		},
	},

	created() {
		this.load()
	},

	methods: {
		t,

		/**
		 * A manifest text through the host's translations, placeholders filled.
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
			return vars ? this.fill(translated, vars) : translated
		},

		fill(text, vars) {
			return String(text || '').replace(/\{(\w+)\}/g, (match, key) => (Object.hasOwn(vars, key) ? String(vars[key]) : match))
		},

		present(value) {
			return value !== null && value !== undefined && value !== ''
		},

		/**
		 * Read every object of the source, page by page.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/slot-grid/specs/slot-grid/spec.md#requirement-objects-are-laid-out-by-two-fields-and-added-per-cell
		 */
		async load() {
			if (!this.source.register || !this.source.schema) {
				this.loading = false
				return
			}
			this.loading = true
			this.error = ''
			const url = generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(this.source.register)}/${encodeURIComponent(this.source.schema)}`)
			try {
				const items = []
				for (let page = 1; ; page++) {
					const { data } = await axios.get(url, { params: { ...(this.source.filter || {}), _limit: PAGE_SIZE, _page: page } })
					const results = Array.isArray(data) ? data : (data && (data.results || data.objects)) || []
					items.push(...results.map((item) => ({ ...item, id: String(item.id || item.uuid || readPath(item, '@self.id') || '') })))
					const pages = Number(data && data.pages) || 1
					if (Array.isArray(data) || page >= pages || results.length === 0) {
						break
					}
				}
				this.items = items
			} catch (error) {
				this.error = serverErrorMessage(error)
			} finally {
				this.loading = false
			}
		},

		onEntries(entries) {
			this.entries = Object.fromEntries((entries || []).map((entry) => [entry.id, entry]))
		},

		cellId(row, column) {
			return `cell:${row.key}:${column.value}`
		},

		cellEntry(row, column) {
			return this.content.cellAction ? (this.entries[this.cellId(row, column)] || null) : null
		},

		cellLabel(row, column) {
			return this.tr(this.content.cellAction.label || '', { ...row.values, column: column.label }) || t('nextcloud-vue', 'Add')
		},

		itemLabel(item) {
			const value = item[this.content.itemLabelField || 'title']
			if (this.content.itemLabelKind === 'user') {
				return userDisplayName(value) || String(value ?? '')
			}
			return String(value ?? '')
		},

		removeLabel(item) {
			const label = this.removeAction.label
			return label ? this.tr(label, { item: this.itemLabel(item) }) : t('nextcloud-vue', 'Remove {item}', { item: this.itemLabel(item) })
		},

		askRemove(item) {
			this.removing = item
		},

		/**
		 * Remove the confirmed item and read the grid again.
		 *
		 * @return {Promise<void>}
		 */
		async remove() {
			const item = this.removing
			const dialog = this.$refs.confirmDialog
			try {
				await axios.delete(generateUrl(objectUrlOf(this.source.register, this.source.schema, item.id)))
				if (dialog && typeof dialog.setResult === 'function') {
					dialog.setResult({ success: true })
				}
				await this.load()
			} catch (error) {
				if (dialog && typeof dialog.setResult === 'function') {
					dialog.setResult({ error: serverErrorMessage(error) })
				}
			}
		},
	},
}
</script>

<style scoped>
.cn-slot-grid__toolbar {
	display: flex;
	justify-content: flex-end;
	margin-bottom: calc(var(--default-grid-baseline, 4px) * 3);
}

.cn-slot-grid__state,
.cn-slot-grid__empty {
	color: var(--color-text-maxcontrast);
}

.cn-slot-grid__scroll {
	overflow-x: auto;
}

.cn-slot-grid__table {
	border-collapse: collapse;
	width: 100%;
}

.cn-slot-grid__table th,
.cn-slot-grid__table td {
	padding: var(--default-grid-baseline, 4px) calc(var(--default-grid-baseline, 4px) * 2);
	border: 1px solid var(--color-border);
	vertical-align: top;
	text-align: start;
}

.cn-slot-grid__items {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-slot-grid__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--default-grid-baseline, 4px);
}
</style>
