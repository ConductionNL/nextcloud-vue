<template>
	<div
		class="cn-table-container"
		data-testid="cn-object-list"
		:class="{
			'cn-table-container--scrollable': scrollable,
			'cn-table-container--borderless': borderless,
			'cn-table-container--fill': fillHeight,
		}">
		<!-- Optional card header (folded from the retired CnTableWidget): a title
		     + total-count badge. Only rendered when `title` is set; bare table
		     usage is unchanged. -->
		<div v-if="title" class="cn-data-table__header">
			<h3 class="cn-data-table__title">
				{{ title }}
			</h3>
			<span v-if="totalRowCount > 0" class="cn-data-table__count">
				{{ totalRowCount }}
			</span>
		</div>

		<!-- Loading State -->
		<div v-if="isLoading" class="cn-table-loading" data-testid="cn-object-list-loading">
			<!-- Decorative: the adjacent <p> already carries the accessible
			     name (loadingText), so the spinner is hidden from the
			     accessibility tree rather than exposed as an unlabelled
			     role="img" (WCAG 1.1.1 / axe "role-img-alt"). -->
			<NcLoadingIcon :size="32" aria-hidden="true" />
			<p>{{ loadingText }}</p>
		</div>

		<!-- Table. The horizontal scroll lives on this wrapper, NOT on
		     `.cn-table-container`: `overflow-x: auto` on the container coerces
		     its `overflow-y` from `visible` to `auto` (CSS forbids mixing
		     `visible` with a non-visible value), which silently made the
		     container the nearest scrollport. The sticky footer then anchored
		     to a container that never scrolls, so "View all" scrolled away with
		     the rows instead of pinning to the bottom of the enclosing widget. -->
		<!-- The horizontal scrollport must be reachable by keyboard: a region
		     that scrolls but cannot take focus gives a keyboard-only user no
		     way to reach the columns past the fold (axe
		     `scrollable-region-focusable`, serious; WCAG 2.1.1).

		     Gated on ACTUAL overflow rather than applied unconditionally, for
		     two reasons. A table that fits needs no scrolling, so a permanent
		     tab stop would put every table in the fleet on the keyboard path
		     for nothing. And the axe rule itself only applies to elements that
		     really are scrollable, so the conditional attribute is present in
		     exactly the cases the rule evaluates.

		     `role="group"`, NOT `role="region"`: this element is nested inside
		     `.cn-widget-wrapper__content[role="region"]` on the dashboard-widget
		     path, and a second landmark there would surface as a duplicate.
		     `group` is nameable but is not a landmark. A name is required
		     rather than optional — `aria-label` is PROHIBITED on a role-less
		     generic element, so a bare `tabindex` div would trade this
		     violation for `aria-prohibited-attr` plus an unlabelled mystery
		     stop in the tab order. -->
		<div
			v-else
			ref="scrollEl"
			class="cn-data-table__scroll"
			:tabindex="isScrollable ? 0 : undefined"
			:role="isScrollable ? 'group' : undefined"
			:aria-label="isScrollable ? scrollRegionLabel : undefined">
			<table
				class="cn-data-table"
				:class="{ 'cn-data-table--fixed': fixedLayout }"
				data-testid="cn-object-list-table">
				<thead v-if="!hideHeader">
					<tr>
						<!-- Checkbox column -->
						<th v-if="selectable" class="cn-table-col--checkbox">
							<NcCheckboxRadioSwitch
								:model-value="allSelected"
								:indeterminate="someSelected && !allSelected"
								:aria-label="selectAllLabel"
								@update:model-value="toggleSelectAll" />
						</th>

						<!-- Leading icon column (header is intentionally blank) -->
						<th v-if="rowIcon" class="cn-table-col--icon" />

						<!-- Data columns -->
						<th
							v-for="col in effectiveColumns"
							:key="col.key"
							:class="[
								col.sortable ? 'cn-table-header--sortable' : '',
								col.class || '',
							]"
							:style="col.width ? { width: col.width } : {}"
							:tabindex="col.sortable ? 0 : null"
							:aria-sort="ariaSortFor(col)"
							:title="translateLabel(col.description) || null"
							@click="col.sortable ? onHeaderClick(col.key, $event) : null"
							@keydown.enter="col.sortable ? onHeaderKeydown(col.key, $event) : null">
							<span :class="col.description ? 'cn-table-header--described' : ''">
								{{ translateLabel(col.label) }}
							</span>
							<span
								v-if="col.sortable && sortKeyIndex(col.key) !== -1"
								class="cn-table-sort-indicator">
								{{ effectiveSortKeys[sortKeyIndex(col.key)].order === 'asc' ? '▲' : '▼' }}
							</span>
							<span
								v-if="col.sortable && effectiveSortKeys.length > 1 && sortKeyIndex(col.key) !== -1"
								class="cn-table-sort-badge">
								{{ sortKeyIndex(col.key) + 1 }}
							</span>
						</th>

						<!-- Actions column -->
						<th v-if="$slots['row-actions']" class="cn-table-col--actions">
							<!-- @slot Header cell content above the row-actions column (blank by default). -->
							<slot name="actions-header" />
						</th>
					</tr>
				</thead>

				<tbody>
					<!-- Empty state -->
					<tr v-if="effectiveRows.length === 0" class="cn-table-empty" data-testid="cn-object-list-empty">
						<td :colspan="totalColumns">
							<!-- @slot Empty-state content shown when there are no rows (defaults to `emptyText`). -->
							<slot name="empty">
								{{ emptyText }}
							</slot>
						</td>
					</tr>

					<!-- Data rows -->
					<tr
						v-for="row in effectiveRows"
						v-else
						:key="row[rowKey]"
						class="cn-table-row"
						data-testid="cn-object-row"
						:data-testid-row-id="row[rowKey]"
						:class="[
							isSelected(row) ? 'cn-table-row--selected' : '',
							rowClass ? rowClass(row) : '',
						]"
						@mousedown="onPointerDown"
						@click="onRowClick(row, $event)"
						@contextmenu.prevent="onRowContextMenu(row, $event)">
						<!-- Checkbox -->
						<td v-if="selectable" class="cn-table-col--checkbox" @click.stop>
							<NcCheckboxRadioSwitch
								:model-value="isSelected(row)"
								:aria-label="selectRowLabel"
								@update:model-value="toggleSelect(row)" />
						</td>

						<!-- Leading icon -->
						<td v-if="rowIcon" class="cn-table-col--icon">
							<CnIcon :name="getRowIcon(row)" :size="20" />
						</td>

						<!-- Data cells -->
						<td
							v-for="col in effectiveColumns"
							:key="col.key"
							:class="[col.class || '', col.cellClass || '', cellClass ? cellClass(row, col) : '']"
							:style="col.width ? { maxWidth: col.width } : {}">
							<!-- @slot Per-column cell override (`#column-<key>`), scoped with { row, value }. Wins over CnCellRenderer. -->
							<slot :name="'column-' + col.key" :row="row" :value="cellValue(row, col)">
								<!-- Every column renders through CnCellRenderer: it resolves
							     col.formatter / col.widget against the injected registries
							     (cnFormatters / cnCellWidgets), uses the schema property when
							     one is available (else {}) for type-aware rendering, and
							     falls back to formatValue(). Columns with `aggregate` get a
							     count of related objects (see cellValue/loadAggregates). The
							     #column-{key} slot still wins. -->
								<CnCellRenderer
									:value="cellValue(row, col)"
									:property="columnProperty(col)"
									:formatter="col.formatter || null"
									:formatter-options="col.formatterOptions || null"
									:widget="col.widget || null"
									:widget-props="col.widgetProps || undefined"
									:format="columnFormat(col)"
									:row="row"
									:row-key="rowKey" />
							</slot>
						</td>

						<!-- Row actions -->
						<td v-if="$slots['row-actions']" :class="['cn-table-col--actions', cellClass ? cellClass(row, { key: 'actions' }) : '']" @click.stop>
							<!-- @slot Per-row actions menu (e.g. a CnRowActions), scoped with { row }. Supplying it adds the trailing actions column. -->
							<slot name="row-actions" :row="row" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Optional footer. A `#footer` scoped slot lets a host render its own
		     footer link (e.g. a "+ New" create action or an always-shown
		     "View all") with its own click handler — useful when the widget runs
		     outside a vue-router context (the built-in link uses $router). When
		     no slot is given, the built-in "View all" link (folded from the
		     retired CnTableWidget) is shown for a `limit`-ed subset. -->
		<div
			v-if="$slots.footer || (viewAllRoute && totalRowCount > effectiveRows.length)"
			class="cn-data-table__footer">
			<!-- @slot Custom footer content, scoped with { total, shown } (defaults to the built-in "View all" link). -->
			<slot name="footer" :total="totalRowCount" :shown="effectiveRows.length">
				<a
					class="cn-data-table__view-all"
					@click.prevent="onViewAll">
					{{ viewAllLabel }}
				</a>
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { columnsFromSchema } from '../../utils/schema.js'
import { useClickDragGuard } from '../../composables/useClickDragGuard.js'
import { nextSortState } from '../../utils/multiColumnSort.js'
// CnDataTable has no scoped styles of its own — its entire look lives in the
// shared table stylesheet. Import it here so the table is styled even when the
// consuming app does not pull in the library's global css/index.css.
import '../../css/table.css'

/**
 * CnDataTable — Generic sortable data table for list views.
 *
 * Replaces the copy-pasted `<table class="viewTable">` HTML pattern found in
 * every list view across OpenRegister, Pipelinq, and Dossiq. Supports sorting,
 * row selection, custom cell rendering via scoped slots, loading states,
 * and empty states.
 *
 * Sorting: a plain click on a sortable header is single-sort (cycle asc →
 * desc → cleared), unchanged from before. Shift+click (or Shift+Enter on a
 * focused header) appends the column as a secondary/tertiary sort key —
 * capped at 3 — with numbered priority badges (1, 2, 3) once more than one
 * key is active. Pass `sortKeys: [{key, order}, ...]` for multi-sort (falls
 * back to the legacy `sortKey`/`sortOrder` props when empty). The `sort`
 * event payload is extended, not replaced: `{key, order}` still mirrors the
 * primary key exactly as before; a new `keys` field carries the full
 * ordered list. See `src/utils/multiColumnSort.js` for the state machine.
 *
 * When a `schema` prop is provided, columns are auto-generated from schema
 * properties and cells render through CnCellRenderer for type-aware formatting
 * (dates, booleans, UUIDs, enums, etc.). Scoped slots still override individual
 * columns when needed.
 *
 * Manual columns (backwards compatible)
 * ```vue
 * <CnDataTable
 *   :columns="[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *   ]"
 *   :rows="clients"
 *   @row-click="openClient" />
 * ```
 *
 * Schema-driven (auto columns)
 * ```vue
 * <CnDataTable :schema="schema" :rows="objects" />
 * ```
 *
 * Schema with overrides and custom cell
 * ```vue
 * <CnDataTable
 *   :schema="schema"
 *   :exclude-columns="['description']"
 *   :column-overrides="{ status: { width: '200px' } }"
 *   :rows="objects">
 *   <template #column-status="{ row, value }">
 *     <QuickStatusDropdown :case-obj="row" />
 *   </template>
 * </CnDataTable>
 * ```
 */
export default {
	name: 'CnDataTable',

	components: {
		NcLoadingIcon,
		NcCheckboxRadioSwitch,
		CnCellRenderer,
		CnIcon,
	},

	inject: {
		/**
		 * Consumer translation function, provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id, e.g.
		 * `t.bind(null, 'docudesk')`). Column headers come from schema
		 * property titles, which are authored in English as the canonical
		 * source (API predictability); the visible label is resolved through
		 * this function so it follows the user's language, with the English
		 * source key living in each app's l10n files. Defaults to identity
		 * when the table is used standalone (no CnAppRoot ancestor).
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * Column definitions (manual mode).
		 * Not required when `schema` is provided.
		 * Each entry may be a full column object OR a bare string key; bare strings
		 * are normalised to `{ key, label }` by `effectiveColumns` so manifest-driven
		 * pages that pass `config.columns` as a string array work without extra mapping.
		 *
		 * `description` renders as the header cell's tooltip and marks the label with a
		 * dotted underline, so a column whose meaning is not obvious from its name (a
		 * maturity level, a computed score, a domain term) can explain itself where the
		 * reader is looking. `columnsFromSchema` fills it from the JSON Schema property
		 * description automatically, so schema-driven tables get it for free.
		 * @type {Array<{key: string, label: string, description: string, sortable: boolean, width: string, class: string, cellClass: string}|string>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},
		/**
		 * Optional leading icon shown at the start of every row. Either a static
		 * MDI icon name (PascalCase, e.g. `'FileDocumentOutline'`) applied to all
		 * rows, or a function `(row) => iconName` to vary it per row. The icon is
		 * resolved through the shared CnIcon registry. Unset = no icon column.
		 * @type {string | ((row: object) => string) | null}
		 */
		rowIcon: {
			type: [String, Function],
			default: null,
		},
		/**
		 * Schema object with `properties` field (schema-driven mode).
		 * When provided, columns are auto-generated from schema properties.
		 */
		schema: {
			type: Object,
			default: null,
		},
		/** Per-column overrides when using schema mode: { key: { width, label, sortable, ... } } */
		columnOverrides: {
			type: Object,
			default: () => ({}),
		},
		/** Column keys to exclude when using schema mode */
		excludeColumns: {
			type: Array,
			default: () => [],
		},
		/** Column keys to include when using schema mode (whitelist) */
		includeColumns: {
			type: Array,
			default: null,
		},
		/** Row data array. Each row should have a unique identifier (see rowKey). */
		rows: {
			type: Array,
			default: () => [],
		},
		/** Whether data is loading (shows loading spinner) */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Current sort column key */
		sortKey: {
			type: String,
			default: null,
		},
		/** Current sort order: 'asc', 'desc', or null (no sort) */
		sortOrder: {
			type: String,
			default: 'asc',
			validator: (v) => v === null || ['asc', 'desc'].includes(v),
		},
		/**
		 * Ordered multi-column sort state: `[{ key, order }, ...]` (priority
		 * order, 0 to 3 entries). Optional — when empty (the default), the
		 * table falls back to the legacy `sortKey`/`sortOrder` props, so
		 * single-sort hosts are completely unaffected. Shift+click a
		 * sortable header to append/cycle a secondary or tertiary key (see
		 * `src/utils/multiColumnSort.js`).
		 * @type {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		sortKeys: {
			type: Array,
			default: () => [],
		},
		/** Whether rows can be selected with checkboxes */
		selectable: {
			type: Boolean,
			default: false,
		},
		/** Array of currently selected row IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},
		/** Property name used as unique row identifier */
		rowKey: {
			type: String,
			default: 'id',
		},
		/** Text shown when there are no rows */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No items found'),
		},
		/** Function returning CSS class(es) for a row: (row) => string|object */
		rowClass: {
			type: Function,
			default: null,
		},
		/** Function returning CSS class(es) for a data cell: (row, col) => string|object */
		cellClass: {
			type: Function,
			default: null,
		},
		/** Whether to constrain table height and make it scrollable */
		scrollable: {
			type: Boolean,
			default: false,
		},
		/** Text shown while loading */
		loadingText: {
			type: String,
			default: () => t('nextcloud-vue', 'Loading...'),
		},
		/**
		 * Accessible name for the select-all checkbox in the header row.
		 * Used as the checkbox's `aria-label` so screen readers announce a
		 * named control (WCAG 4.1.2). Defaults to the lib's translation of
		 * "Select all rows".
		 */
		selectAllLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Select all rows'),
		},
		/**
		 * Accessible name for a per-row select checkbox. Used as the
		 * checkbox's `aria-label` so screen readers announce a named control
		 * (WCAG 4.1.2). Defaults to the lib's translation of "Select row".
		 */
		selectRowLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Select row'),
		},
		/**
		 * Optional card title rendered in a header above the table. When set, the
		 * table reads as a self-contained card (the container's own border/radius
		 * is the card chrome). Folded in from the retired CnTableWidget.
		 */
		title: {
			type: String,
			default: '',
		},
		/**
		 * Drop the container's card chrome (border, radius, shadow) so the table
		 * sits flush inside a parent that already provides a card (e.g. a
		 * CnWidgetWrapper dashboard slot). Folded in from CnTableWidget.
		 */
		borderless: {
			type: Boolean,
			default: false,
		},
		/**
		 * Fill the height of the parent (a flex-column card / widget content
		 * area) so the optional `#footer` is pushed to the bottom instead of
		 * floating directly under a short list. When the list is long enough to
		 * overflow, the footer stays pinned via its sticky rule. No-op outside a
		 * height-constrained parent. Opt-in so ordinary in-flow tables are
		 * unaffected.
		 */
		fillHeight: {
			type: Boolean,
			default: false,
		},
		/**
		 * Hide the column-header row (`<thead>`). Useful for compact dashboard
		 * list widgets that want a plain bordered-row list without column labels.
		 */
		hideHeader: {
			type: Boolean,
			default: false,
		},
		/**
		 * Switch the table to `table-layout: fixed`, making each column's `width`
		 * authoritative instead of a hint the browser may override. Opt in when a
		 * column's content would otherwise dictate the layout — a long unbreakable
		 * value (a PHP FQCN, a UUID) widens its column under the default auto
		 * layout and can render past the cell box into its neighbour, while any
		 * column left unsized soaks up all remaining width. Cells also break long
		 * words rather than overflowing. Columns with no `width` share whatever
		 * space is left, so size every column when you want exact control.
		 * @type {boolean}
		 */
		fixedLayout: {
			type: Boolean,
			default: false,
		},
		/**
		 * Max number of rows to display. When the total exceeds it, only the first
		 * `limit` render and the "View all" footer appears (with `viewAllRoute`).
		 * 0 = show all. Folded in from CnTableWidget.
		 */
		limit: {
			type: Number,
			default: 0,
		},
		/**
		 * vue-router route object for the "View all" footer link. The footer only
		 * shows when set AND the rows are a `limit`-ed subset. Folded in from CnTableWidget.
		 * @type {object|null}
		 */
		viewAllRoute: {
			type: Object,
			default: null,
		},
		/** Pre-translated "View all" footer label. */
		viewAllLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'View all'),
		},
		/**
		 * Self-fetch mode (folded from CnTableWidget): the OpenRegister register
		 * id/slug. When `register` + `schemaId` are set and no `rows` are passed,
		 * the table fetches `/apps/openregister/api/objects/{register}/{schemaId}`.
		 * @type {string|number|null}
		 */
		register: {
			type: [String, Number],
			default: null,
		},
		/**
		 * Self-fetch mode (folded from CnTableWidget): the OpenRegister schema
		 * id used together with `register`. (Distinct from the `schema` prop,
		 * which is a JSON Schema object for column generation.)
		 * @type {string|number|null}
		 */
		schemaId: {
			type: [String, Number],
			default: null,
		},
		/**
		 * Extra query parameters sent with the self-fetch request (register +
		 * schemaId mode) — e.g. a resolved filter map, `_order[field]` ordering,
		 * or `_limit`. Changing it re-triggers the self-fetch, so a host widget
		 * (CnWidgetObjectTable's declarative `source`) can drive filtering and
		 * ordering without re-implementing the fetch. Ignored when external
		 * `rows` are supplied.
		 * @type {object|null}
		 */
		fetchParams: {
			type: Object,
			default: null,
		},
		/**
		 * Convenience navigation (folded from CnTableWidget): a function that
		 * receives the clicked row and returns a vue-router route to push. When
		 * set, a row click navigates there (the `row-click` event still fires).
		 * @type {Function|null}
		 */
		rowClickRoute: {
			type: Function,
			default: null,
		},
		/**
		 * When true, a row-body click emits `row-click` (for navigation) even
		 * while `selectable` — selection then happens only via the checkbox
		 * column. Lets "click row = open, tick box = select" coexist. Default
		 * false keeps the legacy behaviour (selectable rows select on body click).
		 * @type {boolean}
		 */
		rowClickToView: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['row-click', 'row-context-menu', 'select', 'select-all', 'sort'],

	setup() {
		// Tell a deliberate row click apart from a text-selection drag.
		return useClickDragGuard()
	},

	data() {
		return {
			/**
			 * Resolved aggregate-column values, keyed by `String(row[rowKey])`
			 * then by column key. Populated by `loadAggregates()` for columns
			 * that declare `aggregate` (see CnIndexPage's manifest config).
			 *
			 * @type {{[rowId: string]: {[colKey: string]: number}}}
			 */
			aggregateValues: {},
			/**
			 * Whether the table currently overflows its scrollport horizontally.
			 * Drives the keyboard tab stop on `.cn-data-table__scroll`; see the
			 * comment on that element.
			 *
			 * @type {boolean}
			 */
			isScrollable: false,
			/** True while a batch of aggregate-count requests is in flight. */
			aggregateLoading: false,
			/** Monotonic id used to discard a stale aggregate batch when `rows` changes mid-flight. */
			aggregateRequestId: 0,
			/** Rows fetched in self-fetch mode (register + schemaId). */
			fetchedRows: [],
			/** True while a self-fetch request is in flight. */
			selfFetchLoading: false,
		}
	},

	computed: {
		/**
		 * Accessible name for the horizontal scrollport when it becomes a tab
		 * stop. Prefers the table's own `title` so the announcement identifies
		 * WHICH table the user has landed in — several can share a dashboard.
		 *
		 * @return {string}
		 */
		scrollRegionLabel() {
			return this.title
				? t('nextcloud-vue', '{title} — scrollable table', { title: this.title })
				: t('nextcloud-vue', 'Scrollable table')
		},
		/**
		 * The row source: external `rows` when provided, else the self-fetched
		 * rows (register + schemaId mode). External rows always win.
		 *
		 * @return {Array<object>}
		 */
		sourceRows() {
			if (this.rows && this.rows.length > 0) return this.rows
			if (this.register != null && this.schemaId != null) return this.fetchedRows
			return this.rows
		},

		/**
		 * The rows actually rendered — `sourceRows` capped to `limit` (0 = all).
		 *
		 * @return {Array<object>}
		 */
		effectiveRows() {
			return this.limit > 0 ? this.sourceRows.slice(0, this.limit) : this.sourceRows
		},

		/**
		 * Total row count before the `limit` cap (drives the count badge + the
		 * "View all" footer condition).
		 *
		 * @return {number}
		 */
		totalRowCount() {
			return this.sourceRows.length
		},

		/**
		 * Whether to show the loading state — the external `loading` prop OR a
		 * self-fetch in flight.
		 *
		 * @return {boolean}
		 */
		isLoading() {
			return this.loading || this.selfFetchLoading
		},
		/**
		 * Effective columns: schema-generated or manually provided.
		 * Schema columns take precedence when schema is provided and no manual columns given.
		 */
		effectiveColumns() {
			const cols = (this.schema && this.columns.length === 0)
				? columnsFromSchema(this.schema, {
					exclude: this.excludeColumns,
					include: this.includeColumns,
					overrides: this.columnOverrides,
				})
				: this.columns
			if (!(cols || []).some((c) => typeof c === 'string')) {
				return cols || []
			}
			const schemaCols = this.schema
				? columnsFromSchema(this.schema, { overrides: this.columnOverrides })
				: []
			const byKey = new Map(schemaCols.map((c) => [c.key, c]))
			return (cols || []).map((c) => {
				if (typeof c !== 'string') return c
				return byKey.get(c) || { key: c, label: c, sortable: true }
			})
		},

		/**
		 * The active ordered sort-key list: the `sortKeys` prop when non-empty,
		 * else a single-entry list derived from the legacy `sortKey`/`sortOrder`
		 * props (empty when neither is active). Every header/badge/aria-sort
		 * computation reads this so single-sort hosts (no `sortKeys` passed)
		 * render exactly as before.
		 *
		 * @return {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		effectiveSortKeys() {
			if (this.sortKeys && this.sortKeys.length > 0) return this.sortKeys
			if (this.sortKey) return [{ key: this.sortKey, order: this.sortOrder || 'asc' }]
			return []
		},

		totalColumns() {
			let count = this.effectiveColumns.length
			if (this.selectable) count++
			if (this.rowIcon) count++
			if (this.$slots['row-actions']) count++
			return count
		},

		/**
		 * Stable signature of the self-fetch inputs so the watcher refetches
		 * only on a real change (register / schemaId / fetchParams).
		 *
		 * @return {string}
		 */
		selfFetchKey() {
			return JSON.stringify({
				register: this.register,
				schemaId: this.schemaId,
				fetchParams: this.fetchParams || null,
			})
		},

		allSelected() {
			return this.effectiveRows.length > 0
				&& this.effectiveRows.every((row) => this.selectedIds.includes(row[this.rowKey]))
		},

		someSelected() {
			return this.effectiveRows.some((row) => this.selectedIds.includes(row[this.rowKey]))
		},
	},

	watch: {
		rows: {
			handler() { this.loadAggregates() },
		},
		effectiveColumns: {
			handler() { this.loadAggregates() },
			deep: false,
		},
		/**
		 * Re-run the self-fetch when its inputs (register, schemaId, or the
		 * host-driven `fetchParams`) change — a token-resolved filter (e.g.
		 * `@workspace.*`) can change after mount. External rows still win.
		 */
		selfFetchKey() {
			if ((!this.rows || this.rows.length === 0) && this.register != null && this.schemaId != null) {
				this.fetchData()
			}
		},
	},

	mounted() {
		this.loadAggregates()
		// Self-fetch mode: pull rows from OpenRegister when register + schemaId
		// are given and no external rows were passed (folded from CnTableWidget).
		if ((!this.rows || this.rows.length === 0) && this.register != null && this.schemaId != null) {
			this.fetchData()
		}
		this.observeScrollOverflow()
	},

	updated() {
		// Columns and rows can change after mount (self-fetch resolving, a
		// column toggled), and either can flip the table between fitting and
		// overflowing. ResizeObserver alone would miss a change that alters
		// content width without resizing the box.
		this.measureScrollOverflow()
	},

	beforeUnmount() {
		this.disconnectScrollOverflow()
	},

	methods: {
		/**
		 * Start watching the scrollport for horizontal overflow.
		 *
		 * @return {void}
		 */
		observeScrollOverflow() {
			this.measureScrollOverflow()
			if (typeof ResizeObserver === 'undefined') return
			this._scrollObserver = new ResizeObserver(() => this.measureScrollOverflow())
			const el = this.$refs.scrollEl
			if (el) {
				this._scrollObserver.observe(el)
				// The table itself, not just the port: a column widening pushes
				// the content past the fold without the port changing size.
				const table = el.querySelector('table')
				if (table) this._scrollObserver.observe(table)
			}
		},

		/**
		 * Recompute whether the scrollport overflows horizontally.
		 *
		 * @return {void}
		 */
		measureScrollOverflow() {
			const el = this.$refs.scrollEl
			// 1px of tolerance: sub-pixel layout rounding otherwise reports a
			// table that visually fits as scrollable, which would put a tab
			// stop on it for no reachable content.
			const next = !!el && (el.scrollWidth - el.clientWidth) > 1
			if (next !== this.isScrollable) this.isScrollable = next
		},

		/**
		 * Tear down the overflow observer.
		 *
		 * @return {void}
		 */
		disconnectScrollOverflow() {
			if (this._scrollObserver) {
				this._scrollObserver.disconnect()
				this._scrollObserver = null
			}
		},

		/**
		 * Resolve a column header label through the consumer's translation
		 * function. Column labels originate from schema property titles
		 * (English canonical source); this makes the rendered header follow
		 * the user's language when the host app provides `cnTranslate`, and
		 * returns the label unchanged when it does not.
		 *
		 * @param {string} label The English source label (schema property title).
		 * @return {string} The translated label, or the input unchanged.
		 */
		translateLabel(label) {
			if (!label) return ''
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
			return fn(label)
		},
		/**
		 * Self-fetch rows from OpenRegister (register + schemaId mode). Best-effort:
		 * any failure leaves the fetched rows empty. Folded from CnTableWidget.
		 *
		 * @return {Promise<void>}
		 */
		async fetchData() {
			this.selfFetchLoading = true
			try {
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schemaId}', {
					register: String(this.register),
					schemaId: String(this.schemaId),
				})
				const { data } = await axios.get(url, {
					headers: { 'OCS-APIREQUEST': 'true' },
					...(this.fetchParams ? { params: this.fetchParams } : {}),
				})
				this.fetchedRows = (data && data.results) || (Array.isArray(data) ? data : [])
			} catch (e) {
				this.fetchedRows = []
			} finally {
				this.selfFetchLoading = false
			}
		},

		/**
		 * Navigate to the "View all" footer route.
		 *
		 * @return {void}
		 */
		onViewAll() {
			if (this.viewAllRoute && this.$router) {
				this.$router.push(this.viewAllRoute).catch(() => {})
			}
		},
		/**
		 * Resolve the leading-row icon name for a row. Returns the static
		 * `rowIcon` string, or the result of the `rowIcon(row)` function.
		 *
		 * @param {object} row The row object.
		 * @return {string} The MDI icon name (PascalCase).
		 */
		getRowIcon(row) {
			return typeof this.rowIcon === 'function' ? this.rowIcon(row) : this.rowIcon
		},

		/**
		 * Get a cell value from a row using dot-notation key.
		 *
		 * OpenRegister system/metadata fields (created, updated, owner, uri,
		 * size, register, schema, ...) live under the object's `@self` block.
		 * For a flat key we fall back to `@self` when the top level has no
		 * value, so sidebar-enabled metadata columns resolve. Top-level fields
		 * always win, keeping existing behaviour unchanged.
		 *
		 * @param {object} row The row data
		 * @param {string} key The column key (supports dot notation: 'address.city')
		 * @return {*} The cell value
		 */
		getCellValue(row, key) {
			if (typeof key !== 'string') {
				return undefined
			}
			if (key.includes('.')) {
				return key.split('.').reduce((obj, k) => obj?.[k], row)
			}
			if (row?.[key] === undefined && row?.['@self'] && typeof row['@self'] === 'object') {
				return row['@self'][key]
			}
			return row?.[key]
		},

		/**
		 * Get the schema property definition for a column key, or `{}` when
		 * there is no schema (manual mode) or no matching property. The result
		 * is handed to `CnCellRenderer` for type-aware rendering; an empty
		 * object makes it fall back to `formatValue()` (plain truncated text).
		 *
		 * @param {string} key Column key
		 * @return {object} Property definition (possibly empty).
		 */
		getSchemaProperty(key) {
			return this.schema?.properties?.[key] || {}
		},

		/**
		 * Effective property definition handed to CnCellRenderer for a column:
		 * the schema property augmented with the column's own `type`/`format`/
		 * `enum` hints. Lets synthesized columns that have no schema property
		 * (e.g. metadata fields with `format: 'date-time'` / `'uri'`) still get
		 * type-aware rendering.
		 *
		 * @param {object} col Column definition.
		 * @return {object} Property definition for CnCellRenderer.
		 */
		columnProperty(col) {
			const base = this.getSchemaProperty(col.key)
			if (col && (col.format || col.type || col.enum)) {
				return {
					...base,
					...(col.type ? { type: col.type } : {}),
					...(col.format ? { format: col.format } : {}),
					...(col.enum ? { enum: col.enum } : {}),
				}
			}
			return base
		},

		/**
		 * Declarative cell-format spec handed to CnCellRenderer's `format` prop
		 * (an object: `{ style, currency, decimals, ... }`). `col.format` is
		 * overloaded — for schema-derived columns it is the schema format STRING
		 * (`'date'`, `'uri'`, ...), which is NOT a declarative spec and drives
		 * type-aware rendering via `columnProperty()` instead. Only forward an
		 * object here, so a string schema-format no longer trips CnCellRenderer's
		 * `Object`-typed `format` prop (Vue prop-type warning).
		 *
		 * @param {object} col Column definition.
		 * @return {object|null} The declarative format spec, or null.
		 */
		columnFormat(col) {
			return (col && typeof col.format === 'object') ? col.format : null
		},

		/**
		 * Value to render in a cell. For a column that declares `aggregate`
		 * (a count of related objects), returns the cached count once
		 * `loadAggregates()` has resolved it (or `'…'` while pending, `'—'`
		 * if it failed / there's nothing to count). Otherwise the row's
		 * property value via `getCellValue`.
		 *
		 * @param {object} row The row data.
		 * @param {object} col The column definition.
		 * @return {*} The value handed to the slot / CnCellRenderer.
		 */
		cellValue(row, col) {
			if (col && col.aggregate) {
				const cached = this.aggregateValues[String(row[this.rowKey])]
				const v = cached ? cached[col.key] : undefined
				if (v === undefined) return this.aggregateLoading ? '…' : '—'
				return v
			}
			return this.getCellValue(row, col.key)
		},

		/**
		 * Interpolate a column's `aggregate.where` map for one row: any string
		 * value of the form `"@self.<path>"` is replaced with
		 * `getCellValue(row, path)`; everything else is passed through.
		 *
		 * @param {object} where The `aggregate.where` map (may be undefined).
		 * @param {object} row The parent row.
		 * @return {object} The resolved filter map.
		 */
		resolveAggregateWhere(where, row) {
			const out = {}
			for (const [k, v] of Object.entries(where || {})) {
				if (typeof v === 'string' && v.startsWith('@self.')) {
					out[k] = this.getCellValue(row, v.slice('@self.'.length))
				} else {
					out[k] = v
				}
			}
			return out
		},

		/**
		 * For every column that declares `aggregate` (currently `op: "count"`),
		 * issue one `_limit=0` count request per visible row against the related
		 * OpenRegister collection and cache the totals in `aggregateValues`.
		 * Batched with `Promise.all`; a per-request failure degrades that one
		 * cell to `'—'` (logged), never the page. A monotonic request id
		 * discards a stale batch when `rows` / columns change mid-flight.
		 *
		 * @return {Promise<void>}
		 */
		async loadAggregates() {
			const aggCols = this.effectiveColumns.filter((c) => c && c.aggregate && c.aggregate.op === 'count')
			if (aggCols.length === 0) {
				if (Object.keys(this.aggregateValues).length > 0) this.aggregateValues = {}
				this.aggregateLoading = false
				return
			}
			const id = ++this.aggregateRequestId
			this.aggregateLoading = true
			const next = {}
			const jobs = []
			for (const row of this.rows) {
				const rowKey = String(row[this.rowKey])
				next[rowKey] = {}
				for (const col of aggCols) {
					const agg = col.aggregate
					if (!agg.register || !agg.schema) continue
					const where = this.resolveAggregateWhere(agg.where, row)
					jobs.push(
						axios.get(generateUrl(`/apps/openregister/api/objects/${agg.register}/${agg.schema}`), {
							params: { ...where, _limit: 0 },
						})
							.then((res) => {
								const d = res && res.data
								next[rowKey][col.key] = (d && (d.total ?? (Array.isArray(d.results) ? d.results.length : undefined))) ?? 0
							})
							.catch((e) => {
								// eslint-disable-next-line no-console
								console.warn(`[CnDataTable] aggregate "${col.key}" count failed for row ${rowKey}`, e)
								next[rowKey][col.key] = undefined
							}),
					)
				}
			}
			await Promise.all(jobs)
			if (id !== this.aggregateRequestId) return
			this.aggregateValues = next
			this.aggregateLoading = false
		},

		isSelected(row) {
			return this.selectedIds.includes(row[this.rowKey])
		},

		/**
		 * Row-body click: toggles selection when `selectable` (ignoring drags),
		 * otherwise emits `row-click` for navigation.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent} [event] The originating click event.
		 */
		onRowClick(row, event) {
			if (this.wasDrag(event)) return
			if (this.selectable && !this.rowClickToView) {
				this.toggleSelect(row)
				return
			}
			/**
			 * @event row-click Emitted on a row-body click for navigation. Fires when `selectable` is false, OR when `rowClickToView` is set (selection then happens via the checkbox column).
			 * @type {object} The clicked row object.
			 */
			this.$emit('row-click', row)
			// Convenience navigation folded from CnTableWidget: a rowClickRoute
			// function maps the row to a route to push (the event still fires).
			if (this.rowClickRoute && this.$router) {
				const route = this.rowClickRoute(row)
				if (route) this.$router.push(route).catch(() => {})
			}
		},

		/**
		 * Row right-click: forward the row + originating event so a host can
		 * open a context menu (the browser default is prevented).
		 *
		 * @param {object} row The right-clicked row object.
		 * @param {MouseEvent} event The originating contextmenu event.
		 */
		onRowContextMenu(row, event) {
			/**
			 * @event row-context-menu Emitted on a row right-click (contextmenu) for hosts that render a context menu.
			 * @type {{ row: object, event: MouseEvent }}
			 */
			this.$emit('row-context-menu', { row, event })
		},

		/**
		 * Index of `key` within `effectiveSortKeys`, or -1 when not active.
		 * Used by the template for the arrow, the numbered badge, and aria-sort.
		 *
		 * @param {string} key Column key.
		 * @return {number}
		 */
		sortKeyIndex(key) {
			return this.effectiveSortKeys.findIndex((k) => k && k.key === key)
		},

		/**
		 * `aria-sort` value for a column header: `'ascending'`/`'descending'`
		 * for the PRIMARY (index 0) active sort key only — secondary/tertiary
		 * keys carry the visible numbered badge instead, per WCAG guidance
		 * that `aria-sort` describes single-column sort state. `null` omits
		 * the attribute entirely (unsorted / not sortable).
		 *
		 * @param {object} col Column definition.
		 * @return {string|null}
		 */
		ariaSortFor(col) {
			if (!col.sortable) return null
			const primary = this.effectiveSortKeys[0]
			if (!primary || primary.key !== col.key) return null
			return primary.order === 'asc' ? 'ascending' : 'descending'
		},

		/**
		 * Header click: plain click = single-sort (existing behavior,
		 * unchanged); shift+click appends/cycles the column as a secondary or
		 * tertiary sort key. See `src/utils/multiColumnSort.js`.
		 *
		 * @param {string} key Column key.
		 * @param {MouseEvent} [event] The originating click event.
		 */
		onHeaderClick(key, event) {
			this.applySort(key, !!(event && event.shiftKey))
		},

		/**
		 * Header keydown: `Enter` = plain click, `Shift+Enter` = shift+click.
		 *
		 * @param {string} key Column key.
		 * @param {KeyboardEvent} event The originating keydown event.
		 */
		onHeaderKeydown(key, event) {
			if (event.key !== 'Enter') return
			event.preventDefault()
			this.applySort(key, !!event.shiftKey)
		},

		/**
		 * Compute and emit the next sort state for a header interaction.
		 *
		 * @param {string} key Column key.
		 * @param {boolean} append `true` for a shift+click/shift+Enter (append/cycle a secondary key).
		 */
		applySort(key, append) {
			const keys = nextSortState(this.effectiveSortKeys, key, { append })
			const primary = keys[0] || null
			/**
			 * @event sort Emitted when a sortable column header is clicked (plain click) or shift-clicked (multi-sort).
			 * @type {{ key: string|null, order: 'asc'|'desc'|null, keys: Array<{key: string, order: 'asc'|'desc'}> }}
			 * `key`/`order` mirror the PRIMARY (first) active sort key exactly as the pre-multi-sort single-key
			 * contract did (`null`/`null` when cleared) — existing listeners destructuring `{ key, order }` are
			 * unaffected. `keys` is new: the full ordered list (0 to 3 entries) for multi-sort-aware hosts.
			 */
			this.$emit('sort', {
				key: primary ? primary.key : null,
				order: primary ? primary.order : null,
				keys,
			})
		},

		toggleSelect(row) {
			const id = row[this.rowKey]
			const newIds = this.isSelected(row)
				? this.selectedIds.filter((i) => i !== id)
				: [...this.selectedIds, id]
			/** @event select Emitted when row selection changes. Payload: array of selected IDs. */
			this.$emit('select', newIds)
		},

		toggleSelectAll() {
			if (this.allSelected) {
				// Remove only current page IDs, preserving cross-page selections
				const currentPageIds = new Set(this.rows.map((row) => row[this.rowKey]))
				this.$emit('select', this.selectedIds.filter((id) => !currentPageIds.has(id)))
			} else {
				// Add current page IDs to existing selections
				const merged = new Set([...this.selectedIds, ...this.rows.map((row) => row[this.rowKey])])
				this.$emit('select', [...merged])
			}
			/** @event select-all Emitted when select-all checkbox is toggled. */
			this.$emit('select-all', !this.allSelected)
		},
	},
}
</script>
