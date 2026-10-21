<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-matrix-widget" data-testid="cn-matrix-widget">
		<p v-if="hint" class="cn-matrix-widget__hint">
			{{ hint }}
		</p>

		<NcNoteCard v-if="loadError" type="error">
			{{ loadError }}
		</NcNoteCard>
		<NcNoteCard v-if="incomplete" type="warning">
			{{ incompleteText }}
		</NcNoteCard>

		<div v-if="loading" class="cn-matrix-widget__loading">
			<NcLoadingIcon :size="20" />
		</div>

		<CnDataMatrix v-else-if="!loadError"
			:rows="rows"
			:columns="columns"
			rowIdKey="id"
			rowLabelKey="label"
			:rowHeader="rowHeader"
			:readOnly="readOnly"
			:emptyLabel="emptyLabel"
			:showRowTotals="totals.rows === true"
			:showColumnTotals="totals.columns === true"
			:rowTotalsLabel="totalsLabel"
			:columnTotalsLabel="totalsLabel"
			:groupKey="groupBy ? 'group' : ''"
			:normRow="normRow"
			:rowActionsHeader="rowActionsHeader"
			@cellEdit="onCellEdit">
			<template v-if="rowActions.length > 0" #row-actions="{ row }">
				<NcButton v-for="action in actionsFor(row)"
					:key="action.id"
					variant="tertiary"
					:aria-label="actionName(action, row)"
					:disabled="busy !== ''"
					@click="runRowAction(action, row)">
					{{ action.label }}
				</NcButton>
			</template>
		</CnDataMatrix>

		<NcNoteCard v-if="notice" :type="noticeType">
			{{ notice }}
		</NcNoteCard>

		<section v-if="bulk && !loading && !loadError" class="cn-matrix-widget__bulk">
			<NcSelect v-if="bulk.perColumn"
				v-model="bulkColumn"
				:options="columnOptions"
				:inputLabel="columnPickLabel"
				:clearable="false"
				class="cn-matrix-widget__bulk-column" />
			<NcButton v-if="!confirming && !running"
				variant="primary"
				:disabled="bulkTargetList.length === 0 || busy !== ''"
				@click="confirming = true">
				{{ bulkButtonLabel }}
			</NcButton>
			<div v-if="confirming"
				class="cn-matrix-widget__confirm"
				role="group"
				:aria-label="bulk.label">
				<p>{{ confirmText }}</p>
				<NcButton variant="primary" @click="runBulk">
					{{ confirmLabel }}
				</NcButton>
				<NcButton variant="tertiary" @click="confirming = false">
					{{ cancelLabel }}
				</NcButton>
			</div>
			<p v-if="running" role="status" class="cn-matrix-widget__progress">
				{{ progressText }}
			</p>
			<div v-if="report" role="status" class="cn-matrix-widget__report">
				<p>{{ report.summary }}</p>
				<ul v-if="report.refused.length > 0" class="cn-matrix-widget__refusals">
					<li v-for="(refusal, index) in report.refused" :key="index">
						{{ refusal }}
					</li>
				</ul>
			</div>
		</section>
	</div>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard, NcSelect } from '@nextcloud/vue'
import CnDataMatrix from '../CnDataMatrix/CnDataMatrix.vue'
import { performTransition, transitionError } from '../../composables/useLifecycleTransitions.js'
import { prefixUrl } from '../../utils/headers.js'
import {
	bulkTargets,
	cellIndex,
	cellKey,
	columnsFrom,
	fieldRows,
	itemId,
	itemLabel,
	matchesWhen,
	matrixRows,
	parseCellInput,
	withFieldCell,
} from '../../utils/matrixModel.js'
import { readPath } from '../../utils/readPath.js'
import { hasUnresolvedDeepTokens, resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

/** Objects read per request while reading a whole source. */
const PAGE_SIZE = 500

/** Ids per lookup request. */
const LOOKUP_CHUNK = 200

/**
 * Unwrap a provided ref.
 *
 * @param {unknown} value A ref or a plain value.
 * @return {unknown} The value.
 */
function unwrap(value) {
	return value && typeof value === 'object' && 'value' in value ? value.value : value
}

/**
 * The OpenRegister objects URL of a schema, or of one object.
 *
 * @param {string} register The register slug.
 * @param {string} schema The schema slug.
 * @param {string} [id] The object id.
 * @return {string} The URL.
 */
function objectsUrl(register, schema, id) {
	const base = `/apps/openregister/api/objects/${encodeURIComponent(register)}/${encodeURIComponent(schema)}`
	return prefixUrl(id ? `${base}/${encodeURIComponent(id)}` : base)
}

/**
 * The object in a single-object response.
 *
 * @param {object} data The response body.
 * @return {object} The object.
 */
function oneObject(data) {
	return data && typeof data === 'object' && data.object && typeof data.object === 'object' ? data.object : (data || {})
}

/**
 * CnMatrixWidget — the `matrix` widget: a rows-by-columns grid drawn and
 * edited from configuration, over CnDataMatrix.
 *
 * Read mode pivots the objects of `cells` into rows and columns by their
 * `rowKey` and `columnKey` fields. Rows and columns come from a static list, an
 * array field of the page object, the objects of a source, or an array field of
 * one source object. With `write.cells` a typed value patches the cell object
 * or creates it; with `write.endpoint` it goes to that endpoint. With `field`
 * the grid is one array field of the page object, saved as ONE PATCH after
 * re-reading the stored value. `totals`, `norms`, `rowActions` (lifecycle
 * transitions on the row object) and one `bulkAction` (a transition on every
 * matching cell or row object, with a confirm and a refusal report) complete it.
 *
 * The server decides who may write: a refusal shows the server's words and the
 * stored value stays.
 *
 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md
 */
export default {
	name: 'CnMatrixWidget',

	components: { CnDataMatrix, NcButton, NcLoadingIcon, NcNoteCard, NcSelect },

	inject: {
		cnTranslate: { default: () => (key) => key },
		cnObjectContext: { default: null },
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * The widget configuration.
		 *
		 * - `rows` — `{ from?, source?, key?, label?, groupBy?, lookup?, header? }`. `from` is an array field of the
		 *   page object; `source` is `{ register, schema, filter? }` (every object) or `{ register, schema, id, path }`
		 *   (an array field of one object). `key` and `label` read an object item (`label` may be a `{path}` template).
		 *   `lookup` `{ register, schema, match, label, filter? }` labels id items from the objects whose `match` field
		 *   holds the id. `groupBy` draws a group row per value. `header` heads the label column.
		 * - `columns` — `{ list?, from?, source?, key?, label?, type?: 'number'|'text'|'string', readOnly?, markBelow?, markLabel?, aggregate? }`.
		 * - `cells` — `{ register, schema, filter?, rowKey, columnKey, value?, valueMap? }`: the objects placed in the grid.
		 * - `write` — `{ cells?: { values?, lockedWhen?, lockedText? } }` writes cell objects;
		 *   `{ endpoint: { method?, url, body? } }` sends `{ row, column, value }` instead; `{row}` and `{column}` in the URL are filled.
		 * - `field` — `{ name, rowKey, label?, valueKey?, groupBy?, header? }`: rows are the entries of that array field of the page object.
		 * - `totals` — `{ columns?, rows?, label? }`. `norms` — `{ label, values? | from?, key?, value? }`.
		 * - `rowActions` — `[{ id, label, transition, when? }]` on row objects.
		 * - `bulkAction` — `{ label, transition, scope?: 'cells'|'rows', when?, perColumn? }`.
		 * - `readOnly`, `hint`, `emptyText`, `maxRows` (default 5000).
		 *
		 * Page tokens (`@objectId`, `@object.<field>`, `@page.<key>`) resolve in every filter, id and value.
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
			loading: false,
			loadError: '',
			incomplete: false,
			rowItems: [],
			columnItems: [],
			cellObjects: [],
			labels: {},
			fieldList: null,
			busy: '',
			notice: '',
			noticeType: 'error',
			bulkColumn: null,
			confirming: false,
			running: false,
			progress: { done: 0, total: 0 },
			report: null,
		}
	},

	computed: {
		/** The token context: the page object and the workspace. */
		tokenCtx() {
			const injected = unwrap(this.cnObjectContext) || {}
			return {
				...injected,
				objectId: this.objectId || injected.objectId || this.objectData?.id || null,
				object: this.page || injected.object || null,
				workspace: unwrap(this.cnWorkspaceContext) || {},
			}
		},

		/** The page object. */
		page() {
			return this.objectData || null
		},

		rowsConfig() {
			return this.content.rows || {}
		},

		columnsConfig() {
			return this.content.columns || {}
		},

		cellsConfig() {
			return this.content.cells || null
		},

		fieldConfig() {
			return this.content.field && this.content.field.name ? this.content.field : null
		},

		groupBy() {
			return (this.fieldConfig && this.fieldConfig.groupBy) || this.rowsConfig.groupBy || ''
		},

		/**
		 * The columns CnDataMatrix draws.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
		 */
		columns() {
			const c = this.columnsConfig
			const list = Array.isArray(c.list) ? c.list : this.columnItems
			return columnsFrom(list, { key: Array.isArray(c.list) ? (c.key || 'key') : c.key, label: Array.isArray(c.list) ? (c.label || 'label') : c.label })
				.map((column) => {
					const own = (Array.isArray(c.list) && c.list.find((entry) => entry && typeof entry === 'object' && String(entry.key) === column.key)) || {}
					const type = own.type || c.type || 'number'
					const out = {
						key: column.key,
						label: this.tr(column.label),
						type,
						readOnly: Boolean(own.readOnly || c.readOnly),
						aggregate: own.aggregate || c.aggregate || (type === 'number' ? 'sum' : 'none'),
					}
					const below = own.markBelow ?? c.markBelow
					if (below !== undefined && below !== null) {
						out.markBelow = Number(below)
						out.markLabel = this.tr(own.markLabel || c.markLabel || '')
					}
					return out
				})
		},

		/**
		 * The rows CnDataMatrix draws.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
		 */
		rows() {
			if (this.fieldConfig) {
				return fieldRows(this.fieldList ?? readPath(this.page || {}, this.fieldConfig.name), this.fieldConfig, this.columns)
			}
			const cells = this.cellsConfig || {}
			return matrixRows({
				items: this.rowItems,
				rowKey: this.rowsConfig.key,
				rowLabel: this.rowsConfig.label,
				labels: this.labels,
				groupBy: this.rowsConfig.groupBy,
				columns: this.columns,
				index: cellIndex(this.cellObjects, { rowKey: cells.rowKey || 'rowId', columnKey: cells.columnKey || 'columnId' }),
				cells,
			})
		},

		/**
		 * The norm row: configured values, or values read from the page object.
		 *
		 * @return {{label: string, values: object}|null}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-shows-totals-and-checks-them-against-norms
		 */
		normRow() {
			const norms = this.content.norms
			if (!norms || typeof norms !== 'object') {
				return null
			}
			let values = norms.values && typeof norms.values === 'object' ? norms.values : {}
			if (norms.from) {
				const read = readPath(this.page || {}, norms.from)
				if (Array.isArray(read)) {
					values = {}
					for (const entry of read) {
						const key = itemId(entry, norms.key || 'key')
						if (key !== '') {
							values[key] = readPath(entry, norms.value || 'value')
						}
					}
				} else if (read && typeof read === 'object') {
					values = read
				}
			}
			return { label: norms.label ? this.tr(norms.label) : t('nextcloud-vue', 'Norm'), values }
		},

		totals() {
			return this.content.totals && typeof this.content.totals === 'object' ? this.content.totals : {}
		},

		totalsLabel() {
			return this.totals.label ? this.tr(this.totals.label) : t('nextcloud-vue', 'Total')
		},

		readOnly() {
			return this.content.readOnly === true || (!this.fieldConfig && !(this.content.write && (this.content.write.cells || this.content.write.endpoint)))
		},

		rowHeader() {
			const own = this.rowsConfig.header || (this.fieldConfig && this.fieldConfig.header)
			return own ? this.tr(own) : t('nextcloud-vue', 'Name')
		},

		hint() {
			return this.content.hint ? this.tr(this.content.hint) : ''
		},

		emptyLabel() {
			return this.content.emptyText ? this.tr(this.content.emptyText) : t('nextcloud-vue', 'Nothing to show yet')
		},

		maxRows() {
			const max = Number(this.content.maxRows)
			return Number.isFinite(max) && max > 0 ? max : 5000
		},

		incompleteText() {
			return t('nextcloud-vue', 'Only the first {count} records are shown. Narrow the selection to see them all.', { count: this.maxRows })
		},

		/** The configured row actions, labels translated. */
		rowActions() {
			return (Array.isArray(this.content.rowActions) ? this.content.rowActions : [])
				.filter((action) => action && action.id && action.transition)
				.map((action) => ({ ...action, label: this.tr(action.label || action.id) }))
		},

		rowActionsHeader() {
			return this.rowActions.length > 0 ? t('nextcloud-vue', 'Actions') : ''
		},

		/** The bulk action, or null. */
		bulk() {
			const bulk = this.content.bulkAction
			return bulk && bulk.transition ? { ...bulk, label: this.tr(bulk.label || bulk.transition) } : null
		},

		columnOptions() {
			return this.columns.map((column) => ({ id: column.key, label: column.label }))
		},

		columnPickLabel() {
			return t('nextcloud-vue', 'Column')
		},

		/**
		 * The objects the bulk action would run on now.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-runs-row-actions-and-one-bulk-transition
		 */
		bulkTargetList() {
			if (!this.bulk) {
				return []
			}
			if (this.bulk.scope === 'rows') {
				return bulkTargets(this.rowItems.filter((item) => item && typeof item === 'object'), { when: this.bulk.when })
			}
			const column = this.bulk.perColumn && this.bulkColumn ? this.bulkColumn.id : ''
			return bulkTargets(this.cellObjects, { when: this.bulk.when, column, columnKey: this.cellsConfig && this.cellsConfig.columnKey })
		},

		bulkButtonLabel() {
			return `${this.bulk.label} (${this.bulkTargetList.length})`
		},

		confirmText() {
			return n('nextcloud-vue', '{action}: %n record. Continue?', '{action}: %n records. Continue?', this.bulkTargetList.length, { action: this.bulk.label })
		},

		confirmLabel() {
			return t('nextcloud-vue', 'Confirm')
		},

		cancelLabel() {
			return t('nextcloud-vue', 'Cancel')
		},

		progressText() {
			return t('nextcloud-vue', '{done} of {total} done', this.progress)
		},
	},

	watch: {
		objectData() {
			this.fieldList = null
			this.load()
		},

		content: {
			deep: true,
			handler() {
				this.load()
			},
		},

		bulkColumn() {
			this.confirming = false
			this.report = null
		},
	},

	created() {
		this.load()
	},

	methods: {
		/**
		 * Translate a configured string.
		 *
		 * @param {string} key The string.
		 * @return {string}
		 */
		tr(key) {
			return typeof key === 'string' && key !== '' ? this.cnTranslate(key) : (key || '')
		},

		async http() {
			const { default: axios } = await import('@nextcloud/axios')
			return axios
		},

		/**
		 * Resolve page tokens in a value; null when a required token has no value yet.
		 *
		 * @param {unknown} value The configured value.
		 * @return {unknown} The resolved value, or null.
		 */
		resolved(value) {
			const out = resolveDeepTokens(value ?? {}, this.tokenCtx)
			return hasUnresolvedDeepTokens(out) ? null : out
		},

		/**
		 * Every object of a schema matching a filter, read page by page. Sets
		 * `incomplete` and stops past `maxRows`.
		 *
		 * @param {{register: string, schema: string, filter?: object}} source The source.
		 * @return {Promise<Array<object>|null>} The objects, or null while a token is unresolved.
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
		 */
		async readAll(source) {
			const filter = this.resolved(source.filter)
			if (filter === null) {
				return null
			}
			const axios = await this.http()
			const out = []
			for (let page = 1; ; page++) {
				const { data } = await axios.get(objectsUrl(source.register, source.schema), { params: { ...filter, _limit: PAGE_SIZE, _page: page } })
				const results = Array.isArray(data && data.results) ? data.results : []
				out.push(...results)
				const total = Number(data && data.total)
				if (out.length > this.maxRows) {
					this.incomplete = true
					return out.slice(0, this.maxRows)
				}
				if (results.length < PAGE_SIZE || (Number.isFinite(total) && out.length >= total)) {
					return out
				}
			}
		},

		/**
		 * A list for rows or columns: an array field of the page object, the
		 * objects of a source, or an array field of one source object.
		 *
		 * @param {object} config The rows or columns configuration.
		 * @return {Promise<Array<unknown>|null>} The list, or null while a token is unresolved.
		 */
		async readList(config) {
			if (config.from) {
				const list = readPath(this.page || {}, config.from)
				return Array.isArray(list) ? list : []
			}
			const source = config.source
			if (!source || !source.register || !source.schema) {
				return []
			}
			if (source.id) {
				const id = this.resolved({ id: source.id })
				if (id === null || !id.id) {
					return null
				}
				const axios = await this.http()
				const { data } = await axios.get(objectsUrl(source.register, source.schema, String(id.id)))
				const list = readPath(oneObject(data), source.path)
				return Array.isArray(list) ? list : []
			}
			return this.readAll(source)
		},

		/**
		 * Labels for id rows from the lookup source, matched on `lookup.match`.
		 *
		 * @param {Array<unknown>} items The row items.
		 * @return {Promise<object>} Labels by id.
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-pivots-objects-into-rows-and-columns
		 */
		async readLabels(items) {
			const lookup = this.rowsConfig.lookup
			if (!lookup || !lookup.register || !lookup.schema || !lookup.match) {
				return {}
			}
			const ids = items.filter((item) => item !== null && typeof item !== 'object').map(String)
			const labels = {}
			for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
				const found = await this.readAll({ ...lookup, filter: { ...(lookup.filter || {}), [lookup.match]: ids.slice(i, i + LOOKUP_CHUNK) } })
				for (const object of found || []) {
					const id = readPath(object, lookup.match)
					const label = itemLabel(object, lookup.label, '')
					if (id !== undefined && id !== null && label !== '') {
						labels[String(id)] = label
					}
				}
			}
			return labels
		},

		/**
		 * Read rows, columns, cells and labels.
		 *
		 * @return {Promise<void>}
		 */
		async load() {
			const run = this.loadRun = (this.loadRun || 0) + 1
			this.loadError = ''
			this.incomplete = false
			if (this.fieldConfig) {
				this.columnItems = Array.isArray(this.columnsConfig.list) ? [] : ((await this.safeList(this.columnsConfig)) || [])
				return
			}
			this.loading = true
			try {
				const [rows, columns, cells] = await Promise.all([
					this.readList(this.rowsConfig),
					Array.isArray(this.columnsConfig.list) ? [] : this.readList(this.columnsConfig),
					this.cellsConfig && this.cellsConfig.register && this.cellsConfig.schema ? this.readAll(this.cellsConfig) : [],
				])
				const labels = rows ? await this.readLabels(rows) : {}
				if (run !== this.loadRun) {
					return
				}
				this.rowItems = rows || []
				this.columnItems = columns || []
				this.cellObjects = cells || []
				this.labels = labels
			} catch (e) {
				if (run === this.loadRun) {
					this.loadError = t('nextcloud-vue', 'This grid could not be loaded: {reason}', { reason: serverErrorMessage(e) })
				}
			} finally {
				if (run === this.loadRun) {
					this.loading = false
				}
			}
		},

		/**
		 * {@link readList}, with a failure shown and an empty list returned.
		 *
		 * @param {object} config The configuration.
		 * @return {Promise<Array<unknown>>}
		 */
		async safeList(config) {
			try {
				return await this.readList(config)
			} catch (e) {
				this.loadError = t('nextcloud-vue', 'This grid could not be loaded: {reason}', { reason: serverErrorMessage(e) })
				return []
			}
		},

		/**
		 * Show a notice.
		 *
		 * @param {string} text The text.
		 * @param {string} [type] The NcNoteCard type.
		 * @return {void}
		 */
		say(text, type = 'error') {
			this.notice = text
			this.noticeType = type
		},

		/**
		 * Save one typed cell.
		 *
		 * @param {{rowId: string, colKey: string, raw: string, row: object}} edit The edit from CnDataMatrix.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-writes-one-cell-at-a-time
		 */
		async onCellEdit({ rowId, colKey, raw, row }) {
			const column = this.columns.find((c) => c.key === colKey) || {}
			const parsed = parseCellInput(raw, column)
			if (!parsed.ok) {
				this.say(t('nextcloud-vue', 'Type a number in {column}.', { column: column.label || colKey }))
				return
			}
			const current = row ? row[colKey] : undefined
			if ((current ?? null) === parsed.value || (current === undefined && parsed.value === '')) {
				return
			}
			this.notice = ''
			this.busy = cellKey(rowId, colKey)
			try {
				if (this.fieldConfig) {
					await this.saveField(rowId, colKey, parsed.value)
				} else if (this.content.write && this.content.write.endpoint) {
					await this.saveThroughEndpoint(rowId, colKey, parsed.value, row)
				} else {
					await this.saveCell(rowId, colKey, parsed.value, row)
				}
			} catch (e) {
				this.say(serverErrorMessage(e))
			} finally {
				this.busy = ''
			}
		},

		/**
		 * Patch the cell object, or create it.
		 *
		 * @param {string} rowId The row id.
		 * @param {string} colKey The column key.
		 * @param {unknown} value The value.
		 * @param {object} row The matrix row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-writes-one-cell-at-a-time
		 */
		async saveCell(rowId, colKey, value, row) {
			const cells = this.cellsConfig
			const write = (this.content.write && this.content.write.cells) || {}
			const existing = row && row.cells ? row.cells[colKey] : undefined
			const valuePath = cells.value || 'value'
			if (existing && write.lockedWhen && matchesWhen(existing, write.lockedWhen)) {
				this.say(write.lockedText ? this.tr(write.lockedText) : t('nextcloud-vue', 'This value can no longer be changed here.'), 'warning')
				return
			}
			const axios = await this.http()
			if (existing) {
				const { data } = await axios.patch(objectsUrl(cells.register, cells.schema, itemId(existing)), { [valuePath]: value })
				this.replaceCell(existing, { ...existing, [valuePath]: value, ...oneObject(data) })
			} else {
				const values = this.resolved(write.values || {})
				if (values === null) {
					return
				}
				const body = { ...values, [cells.rowKey]: rowId, [cells.columnKey]: colKey, [valuePath]: value }
				const { data } = await axios.post(objectsUrl(cells.register, cells.schema), body)
				this.cellObjects = [...this.cellObjects, { ...body, ...oneObject(data) }]
			}
			this.$emit('saved')
		},

		/**
		 * Send the cell to the configured endpoint. A cell object in the answer
		 * replaces the stored one; otherwise the grid is read again.
		 *
		 * @param {string} rowId The row id.
		 * @param {string} colKey The column key.
		 * @param {unknown} value The value.
		 * @param {object} row The matrix row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-writes-one-cell-at-a-time
		 */
		async saveThroughEndpoint(rowId, colKey, value, row) {
			const endpoint = this.content.write.endpoint
			const url = String(endpoint.url || '')
				.replace(/\{row\}/g, encodeURIComponent(rowId))
				.replace(/\{column\}/g, encodeURIComponent(colKey))
			const resolvedUrl = this.resolved({ url })
			const body = this.resolved(endpoint.body || {})
			if (resolvedUrl === null || body === null) {
				return
			}
			const axios = await this.http()
			const method = String(endpoint.method || 'post').toLowerCase()
			const { data } = await axios[method](prefixUrl(resolvedUrl.url), { ...body, row: rowId, column: colKey, value })
			const returned = oneObject(data)
			const existing = row && row.cells ? row.cells[colKey] : undefined
			if (existing && returned && itemId(returned) === itemId(existing)) {
				this.replaceCell(existing, returned)
			} else {
				await this.load()
			}
			this.$emit('saved')
		},

		/**
		 * Write one cell of the page object's array field: re-read, change, one PATCH.
		 *
		 * @param {string} rowId The row id.
		 * @param {string} colKey The column key.
		 * @param {unknown} value The value.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-can-edit-one-array-field-of-the-page-object
		 */
		async saveField(rowId, colKey, value) {
			const id = this.objectId || (this.objectData && this.objectData.id)
			if (!id || typeof this.register !== 'string' || typeof this.schema !== 'string' || !this.register || !this.schema) {
				return
			}
			const name = this.fieldConfig.name
			const axios = await this.http()
			const url = objectsUrl(this.register, this.schema, String(id))
			const { data: stored } = await axios.get(url)
			const next = withFieldCell(readPath(oneObject(stored), name), this.fieldConfig, rowId, colKey, value)
			const { data } = await axios.patch(url, { [name]: next })
			const saved = readPath(oneObject(data), name)
			this.fieldList = Array.isArray(saved) ? saved : next
			this.$emit('saved')
		},

		/**
		 * Replace a cell object in place.
		 *
		 * @param {object} old The stored object.
		 * @param {object} next Its new state.
		 * @return {void}
		 */
		replaceCell(old, next) {
			this.cellObjects = this.cellObjects.map((cell) => (cell === old ? next : cell))
		},

		/**
		 * The row actions that apply to a row.
		 *
		 * @param {object} row The matrix row.
		 * @return {Array<object>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-runs-row-actions-and-one-bulk-transition
		 */
		actionsFor(row) {
			const item = row.item
			if (!item || typeof item !== 'object' || itemId(item) === '') {
				return []
			}
			return this.rowActions.filter((action) => matchesWhen(item, action.when))
		},

		/**
		 * The accessible name of a row action button.
		 *
		 * @param {object} action The action.
		 * @param {object} row The matrix row.
		 * @return {string}
		 */
		actionName(action, row) {
			return t('nextcloud-vue', '{action}: {row}', { action: action.label, row: row.label })
		},

		/**
		 * Run a row's transition, then read the grid again.
		 *
		 * @param {object} action The action.
		 * @param {object} row The matrix row.
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-runs-row-actions-and-one-bulk-transition
		 */
		async runRowAction(action, row) {
			this.notice = ''
			this.busy = `action:${row.id}`
			try {
				await performTransition(itemId(row.item), action.transition)
				await this.load()
				this.$emit('saved')
			} catch (e) {
				this.say(t('nextcloud-vue', '{row}: {reason}', { row: row.label, reason: transitionError(e, t('nextcloud-vue', 'The server refused this.')) }))
			} finally {
				this.busy = ''
			}
		},

		/**
		 * Where a bulk target sits, for the refusal report.
		 *
		 * @param {object} target A cell or row object.
		 * @return {string}
		 */
		targetName(target) {
			if (this.bulk.scope === 'rows') {
				const row = this.rows.find((r) => r.item === target)
				return row ? row.label : itemId(target)
			}
			const cells = this.cellsConfig || {}
			const rowId = String(readPath(target, cells.rowKey))
			const colKey = String(readPath(target, cells.columnKey))
			const row = this.rows.find((r) => r.id === rowId)
			const column = this.columns.find((c) => c.key === colKey)
			return `${row ? row.label : rowId}, ${column ? column.label : colKey}`
		},

		/**
		 * Run the bulk transition on every target, one by one, and report.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/abstract-matrix-widget/specs/matrix-widget/spec.md#requirement-a-matrix-runs-row-actions-and-one-bulk-transition
		 */
		async runBulk() {
			const targets = [...this.bulkTargetList]
			this.confirming = false
			this.running = true
			this.report = null
			this.progress = { done: 0, total: targets.length }
			const refused = []
			for (const target of targets) {
				try {
					await performTransition(itemId(target), this.bulk.transition)
				} catch (e) {
					refused.push(t('nextcloud-vue', '{row}: {reason}', { row: this.targetName(target), reason: transitionError(e, t('nextcloud-vue', 'The server refused this.')) }))
				}
				this.progress = { ...this.progress, done: this.progress.done + 1 }
			}
			const done = targets.length - refused.length
			this.report = {
				summary: n('nextcloud-vue', '%n record done.', '%n records done.', done)
					+ (refused.length > 0 ? ' ' + n('nextcloud-vue', '%n refused:', '%n refused:', refused.length) : ''),

				refused,
			}
			this.running = false
			await this.load()
			this.$emit('saved')
		},
	},
}
</script>

<style scoped>
.cn-matrix-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-matrix-widget__hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-matrix-widget__loading {
	display: flex;
	justify-content: center;
	padding: 16px;
}

.cn-matrix-widget__bulk {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
}

.cn-matrix-widget__bulk-column {
	min-width: 200px;
}

.cn-matrix-widget__confirm {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	flex-basis: 100%;
}

.cn-matrix-widget__confirm p,
.cn-matrix-widget__progress,
.cn-matrix-widget__report p {
	margin: 0;
}

.cn-matrix-widget__report {
	flex-basis: 100%;
}

.cn-matrix-widget__refusals {
	margin: 4px 0 0;
	padding-inline-start: 20px;
	list-style: disc;
}
</style>
