<template>
	<div
		class="cn-table-container"
		data-testid="cn-object-list"
		:class="{
			'cn-table-container--board': isBoardLook,
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

		<!-- Active header filters, one removable chip each. -->
		<ul
			v-if="!isLoading && activeColumnFilterChips.length > 0"
			class="cn-data-table__filter-chips"
			:aria-label="activeFiltersLabel"
			data-testid="cn-table-filter-chips">
			<li v-for="chip in activeColumnFilterChips" :key="chip.key" class="cn-data-table__filter-chip">
				<span>{{ chip.text }}</span>
				<button
					type="button"
					class="cn-data-table__filter-chip-remove"
					:aria-label="chip.removeLabel"
					data-testid="cn-table-filter-chip-remove"
					@click="clearColumnFilter(chip.col)">
					×
				</button>
			</li>
		</ul>

		<CnColumnFilterPopover
			v-if="openFilterColumn"
			:key="openFilterKey"
			:def="filterDefFor(openFilterColumn)"
			:state="columnFilterStateFor(openFilterColumn)"
			:label="translateLabel(openFilterColumn.label)"
			:anchorRect="filterAnchorRect"
			:register="filterRegister"
			@apply="(state) => applyColumnFilter(openFilterColumn, state)"
			@close="closeColumnFilter" />

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
						<th
							v-if="selectable"
							class="cn-table-col--checkbox"
							:class="pinClass(0)"
							:style="pinStyle(0)">
							<NcCheckboxRadioSwitch
								:modelValue="allSelected"
								:indeterminate="someSelected && !allSelected"
								:aria-label="selectAllLabel"
								@update:modelValue="toggleSelectAll" />
						</th>

						<!-- Leading icon column (header is intentionally blank) -->
						<th
							v-if="rowIcon"
							class="cn-table-col--icon"
							:class="pinClass(selectable ? 1 : 0)"
							:style="pinStyle(selectable ? 1 : 0)" />

						<!-- Data columns -->
						<th
							v-for="(col, colIndex) in effectiveColumns"
							:key="col.key"
							:class="[
								col.sortable ? 'cn-table-header--sortable' : '',
								col.class || '',
								pinClass(leadingCount + colIndex),
							]"
							:style="{ ...(col.width ? { width: col.width } : {}), ...pinStyle(leadingCount + colIndex) }"
							:tabindex="col.sortable ? 0 : null"
							:aria-sort="ariaSortFor(col)"
							:data-filtered="isColumnFiltered(col) ? 'true' : null"
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
								v-if="col.sortable && sortBadgeFor(col.key) !== null"
								class="cn-table-sort-badge">
								{{ sortBadgeFor(col.key) }}
							</span>
							<!-- Header filter: a real button, so it is reachable with Tab
							     and its click and Enter never also sort the column. -->
							<button
								v-if="filterDefFor(col)"
								:ref="'filterButton-' + col.key"
								type="button"
								class="cn-table-header__filter"
								:class="{ 'cn-table-header__filter--active': isColumnFiltered(col) }"
								:aria-label="filterButtonLabel(col)"
								aria-haspopup="dialog"
								:aria-expanded="openFilterKey === col.key ? 'true' : 'false'"
								data-testid="cn-table-header-filter"
								@click.stop="toggleColumnFilter(col, $event)"
								@keydown.enter.stop>
								<FilterIcon v-if="isColumnFiltered(col)" :size="16" />
								<FilterOutline v-else :size="16" />
							</button>
						</th>

						<!-- Actions column -->
						<th v-if="$slots['row-actions']" class="cn-table-col--actions">
							<!-- The board look names the column for assistive tech; the menu buttons below it are the only thing drawn. -->
							<span v-if="isBoardLook" class="hidden-visually">{{ actionsColumnLabel }}</span>
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
								{{ translateLabel(emptyText) }}
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
							rowLinks[String(row[rowKey])] ? 'cn-table-row--linked' : '',
							isUnreadRow(row) ? 'cn-table-row--unread' : '',
							rowClass ? rowClass(row) : '',
						]"
						@mousedown="onRowMouseDown"
						@click="onRowClick(row, $event)"
						@auxclick="onRowAuxClick(row, $event)"
						@contextmenu="onRowContextMenu(row, $event)">
						<!-- Checkbox -->
						<td v-if="selectable"
							class="cn-table-col--checkbox"
							:class="pinClass(0)"
							:style="pinStyle(0)"
							@click.stop
							@auxclick.stop>
							<NcCheckboxRadioSwitch
								:modelValue="isSelected(row)"
								:aria-label="selectRowLabel"
								@update:modelValue="toggleSelect(row)" />
						</td>

						<!-- Leading icon -->
						<td
							v-if="rowIcon"
							class="cn-table-col--icon"
							:class="pinClass(selectable ? 1 : 0)"
							:style="pinStyle(selectable ? 1 : 0)">
							<CnIcon :name="getRowIcon(row)" :size="20" />
						</td>

						<!-- Data cells -->
						<td
							v-for="(col, colIndex) in effectiveColumns"
							:key="col.key"
							:class="[col.class || '', col.cellClass || '', cellClass ? cellClass(row, col) : '', pinClass(leadingCount + colIndex), colIndex === 0 ? 'cn-table-col--title' : '']"
							:style="{ ...(col.width ? { maxWidth: col.width } : {}), ...pinStyle(leadingCount + colIndex) }"
							@mouseenter="titleWhenClipped">
							<!-- A row with a `rowClickRoute` is a real link: this anchor
							     is stretched over the whole row by CSS, so hovering shows
							     the URL, a middle or ctrl click opens a new tab natively,
							     and the row is reachable with Tab. The row's own click
							     handlers treat it as a nested control and leave it be. -->
							<a v-if="colIndex === 0 && rowLinks[String(row[rowKey])]"
								class="cn-table-row__link"
								:href="rowLinks[String(row[rowKey])].href"
								:aria-label="rowLinkLabel(row, col)"
								draggable="false"
								data-testid="cn-row-link"
								@click="onRowLinkClick(row, $event)" />
							<!-- The padlock rides the FIRST data cell, beside whatever
							     names the row. Deliberately OUTSIDE the #column-<key>
							     slot: a consumer overriding that column's rendering is
							     customising their own data, not opting out of being told
							     the record is locked. It renders nothing when unlocked,
							     so an unlocked table is byte-for-byte what it was. -->
							<CnUnreadMarker
								v-if="colIndex === 0 && isUnreadRow(row)" />
							<CnLockIndicator
								v-if="colIndex === 0"
								:object="row"
								:size="16" />
							<!-- Declared state indicators ride the first data cell
							     beside the padlock. Each one renders as an icon WITH a
							     text alternative and a tooltip, never as colour alone,
							     and an indicator the page did not declare cannot appear
							     however the record is shaped. Past the cap the rest move
							     into the row menu, because a row of nine icons is not a
							     row anyone can triage at a glance. -->
							<span v-if="colIndex === 0 && indicatorsFor(row).shown.length > 0"
								class="cn-table-row-indicators"
								data-testid="cn-row-indicators">
								<span v-for="indicator in indicatorsFor(row).shown"
									:key="indicator.id || indicator.field"
									class="cn-table-row-indicator"
									:title="indicator.tooltip || indicator.text"
									:data-testid="`cn-row-indicator-${indicator.id || indicator.field}`">
									<CnIcon :name="indicator.icon || 'InformationOutline'" :size="16" />
									<span class="hidden-visually">{{ indicator.text }}</span>
								</span>
							</span>
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
									:formatterOptions="col.formatterOptions || null"
									:widget="col.widget || null"
									:widgetProps="col.widgetProps || undefined"
									:format="columnFormat(col)"
									:row="row"
									:rowKey="rowKey" />
							</slot>
							<!-- A second, muted line under the value, from `col.secondary`:
							     a field key, a "{field} · {other}" template, or a function
							     of the row. Lets one column read "title" over "number ·
							     requester" without a custom cell. -->
							<span
								v-if="secondaryValue(row, col)"
								class="cn-table-cell__secondary"
								data-testid="cn-cell-secondary">{{ secondaryValue(row, col) }}</span>
							<!-- A row that entered a file-content search through an attached
							     file names it (OpenRegister `@self.matchedFile`): plain text,
							     file name only, under the first cell. -->
							<span
								v-if="colIndex === 0 && matchedFileOf(row)"
								class="cn-table-cell__secondary cn-table-cell__matched-file"
								data-testid="cn-row-matched-file">{{ matchedFileLabel(row) }}</span>
						</td>

						<!-- Row actions -->
						<td v-if="$slots['row-actions']"
							class="cn-table-col--actions"
							:class="[cellClass ? cellClass(row, { key: 'actions' }) : '']"
							@click.stop
							@auxclick.stop>
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
		     no slot is given, the built-in "View all" control (folded from the
		     retired CnTableWidget) is shown for a `limit`-ed subset.

		     The control is a real link (with an href) when the router resolves
		     `viewAllRoute` to a URL, and a real button otherwise. An `<a>`
		     without an href has no link role and is not keyboard focusable
		     (WCAG 2.1.1, 4.1.2), so it is never rendered. -->
		<div
			v-if="$slots.footer || (viewAllRoute && totalRowCount > effectiveRows.length)"
			class="cn-data-table__footer">
			<!-- @slot Custom footer content, scoped with { total, shown } (defaults to the built-in "View all" link). -->
			<slot name="footer" :total="totalRowCount" :shown="effectiveRows.length">
				<a
					v-if="viewAllHref"
					class="cn-data-table__view-all"
					:href="viewAllHref"
					@click="onViewAll">
					{{ viewAllLabel }}
				</a>
				<button
					v-else
					type="button"
					class="cn-data-table__view-all"
					@click="onViewAll">
					{{ viewAllLabel }}
				</button>
			</slot>
		</div>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import FilterIcon from 'vue-material-design-icons/Filter.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import CnColumnFilterPopover from './CnColumnFilterPopover.vue'
import { useClickDragGuard } from '../../composables/useClickDragGuard.js'
import { normalizeLook } from '../../composables/useLook.js'
import { clearedColumnFilterParams, columnFilterDef, columnFilterParams, columnFilterState, isColumnFilterActive, isColumnSortable } from '../../utils/columnFilters.js'
import { followLinkClick, openRowTarget, resolveHref } from '../../utils/linkNavigation.js'
import { nextSortState } from '../../utils/multiColumnSort.js'
import { isNewTabClick, isNewTabHandled, isRowMiddleClick, markNewTabHandled, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { DEFAULT_ROW_INDICATOR_CAP, resolveRowIndicators } from '../../utils/rowIndicators.js'
import { columnsFromSchema } from '../../utils/schema.js'
import { CnCellRenderer } from '../CnCellRenderer/index.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnLockIndicator } from '../CnLockIndicator/index.js'
import { CnUnreadMarker } from '../CnUnreadMarker/index.js'

// CnDataTable has no scoped styles of its own — its entire look lives in the
// shared table stylesheet. Import it here so the table is styled even when the
// consuming app does not pull in the library's global css/index.css.
import '../../css/table.css'

/**
 * Fill a `secondary` template such as `"{identifier} · {requester}"`.
 *
 * A field without a value takes its separator with it: the text between two
 * fields belongs to the field after it, so an empty requester leaves
 * "2026-0002", not "2026-0002 ·", and an empty first field does not leave a
 * leading separator either. Text before the first field and after the last
 * one is kept as written. A template whose fields all have values fills
 * exactly as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-empty-field-takes-its-separator-with-it
 * @param {string} template The template, with `{field}` placeholders.
 * @param {(key: string) => string} valueOf The text of a field ('' when empty).
 * @return {string} The filled template.
 */
function fillSecondaryTemplate(template, valueOf) {
	// split() with a capture group alternates literal, field, literal, …
	const parts = template.split(/\{([^}]+)\}/)
	const lead = parts[0]
	const tail = parts[parts.length - 1]
	let body = ''
	for (let i = 1; i < parts.length; i += 2) {
		const value = valueOf(parts[i].trim())
		if (value === '') {
			continue
		}
		// The literal before this field: the separator, unless nothing has
		// been written yet (then there is nothing to separate from).
		const separator = i === 1 ? '' : parts[i - 1]
		body += (body === '' ? '' : separator) + value
	}
	return lead + body + tail
}

/**
 * CnDataTable — Generic sortable data table for list views.
 *
 * Replaces the copy-pasted `<table class="viewTable">` HTML pattern found in
 * every list view across OpenRegister, Pipelinq, and Dossiq. Supports sorting,
 * row selection, custom cell rendering via scoped slots, loading states,
 * and empty states.
 *
 * Sorting: a plain click on a sortable header is single-sort (cycle asc → desc → cleared), unchanged from before.
 * Shift+click (or Shift+Enter on a focused header) appends the column as a secondary/tertiary sort key, capped at 3, with numbered priority badges (1, 2, 3) once two or more rendered, sortable columns are sorted.
 * A sort key whose column is not rendered, or not sortable, still sorts, but is not counted or numbered, and `aria-sort` goes to the first sort key whose column is rendered and sortable.
 * Pass `sortKeys: [{key, order}, ...]` for multi-sort (falls back to the legacy `sortKey`/`sortOrder` props when empty).
 * The `sort` event payload is extended, not replaced: `{key, order}` still mirrors the primary key exactly as before; a new `keys` field carries the full ordered list.
 * See `src/utils/multiColumnSort.js` for the state machine.
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
		CnColumnFilterPopover,
		CnIcon,
		CnLockIndicator,
		CnUnreadMarker,
		FilterIcon,
		FilterOutline,
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
		/** The look CnAppRoot provides. Under `board` the table is the white card of the screens. */
		cnLook: { default: 'nextcloud' },
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
		 *
		 * `secondary` draws a second, muted line under the cell's value: a field
		 * key (`"number"`), a template with `{field}` placeholders
		 * (`"{number} · {requester}"`, dotted paths allowed), or a function of
		 * the row. Empty fields leave their placeholder blank; a line that
		 * resolves to nothing is not drawn.
		 *
		 * @type {Array<{key: string, label: string, description: string, sortable: boolean, width: string, class: string, cellClass: string, secondary: (string|((row: object) => string))}|string>}
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
		 *
		 * @type {string | ((row: object) => string) | null}
		 */
		rowIcon: {
			type: [String, Function],
			default: null,
		},

		/**
		 * State indicators a page declares for its rows. Each entry is
		 * `{ id, field, equals?, in?, icon, text, tooltip? }`: `field` is a
		 * dotted path on the row, the condition is `equals`, `in`, or plain
		 * truthiness when neither is given, `icon` is a CnIcon name, and `text`
		 * is the text alternative. An entry without `text` does not render,
		 * because an icon with no text is colour and shape alone.
		 *
		 * The page declares which indicators exist. A record cannot add one the
		 * page has not declared, however it is shaped. A page declaring none
		 * renders its rows exactly as before.
		 *
		 * @type {Array<{id?: string, field: string, equals?: (string|number|boolean|null), in?: Array, icon?: string, text: string, tooltip?: string}>}
		 */
		rowIndicators: {
			type: Array,
			default: () => [],
		},

		/**
		 * How many declared indicators render on the row itself. The rest are
		 * available from `indicatorsFor(row).overflow` for the row menu.
		 *
		 * @type {number}
		 */
		rowIndicatorCap: {
			type: Number,
			default: DEFAULT_ROW_INDICATOR_CAP,
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
		 *
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
			default: () => t('nextcloud-vue', 'Loading…'),
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
		 * How many data columns are pinned to the start of the table. They (and the
		 * selection and icon columns, which are pinned whenever any column is) stay
		 * in view when the table scrolls sideways.
		 */
		pinnedCount: {
			type: Number,
			default: 0,
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
		 *
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
		 *
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
		 *
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
		 *
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
		 *
		 * @type {object|null}
		 */
		fetchParams: {
			type: Object,
			default: null,
		},

		/**
		 * Convenience navigation (folded from CnTableWidget): a function that
		 * receives a row and returns the vue-router route it opens. When set,
		 * each row renders as a real link to that route, stretched over the
		 * row: a click navigates there (the `row-click` event still fires), and
		 * a ctrl/cmd/shift or middle click opens it in a new tab. A table whose
		 * row click selects (`selectable` without `rowClickToView`) gets no link.
		 *
		 * @type {((row: object) => object)|null}
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
		 *
		 * @type {boolean}
		 */
		rowClickToView: {
			type: Boolean,
			default: false,
		},

		/**
		 * Show a filter button in every header whose column can filter (see
		 * `columnFilterDef`): enum, boolean, text, number, date and reference
		 * columns backed by a schema property. A column opts out with
		 * `filterable: false`. Applying a filter emits `column-filter`; the
		 * host owns the filter state and passes it back as `activeFilters`.
		 *
		 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-every-backed-column-filters-from-its-header
		 */
		filterable: {
			type: Boolean,
			default: false,
		},

		/**
		 * The active filter map, `{ paramKey: values[] }`: the same map the
		 * facet sidebar writes, so a header filter and a sidebar filter on one
		 * field show the same state.
		 */
		activeFilters: {
			type: Object,
			default: () => ({}),
		},

		/** Register slug a reference column's filter searches in when the column names none. */
		filterRegister: {
			type: String,
			default: '',
		},
	},

	emits: ['row-click', 'row-aux-click', 'row-context-menu', 'select', 'select-all', 'sort', 'view-all', 'column-filter'],

	setup() {
		// Tell a deliberate row click apart from a text-selection drag.
		return useClickDragGuard()
	},

	data() {
		return {
			/** Left offsets (px) of the leading pinned cells, measured from the header. */
			pinOffsets: [],
			/** Key of the column whose filter panel is open, or ''. */
			openFilterKey: '',
			/** The open filter button's bounding rect, to place the panel. */
			filterAnchorRect: null,
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
		 * Whether the table is drawn as the board look's white card.
		 *
		 * @return {boolean}
		 */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * The accessible name of the row-actions column.
		 *
		 * @return {string}
		 */
		actionsColumnLabel() {
			return t('nextcloud-vue', 'Actions')
		},

		/** @return {number} Leading cells before the data columns (selection, icon). */
		leadingCount() {
			return (this.selectable ? 1 : 0) + (this.rowIcon ? 1 : 0)
		},

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
			if (this.rows && this.rows.length > 0) {
				return this.rows
			}
			if (this.register !== null && this.register !== undefined && this.schemaId !== null && this.schemaId !== undefined) {
				return this.fetchedRows
			}
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
		 * The URL the router resolves `viewAllRoute` to, or `null` when there is
		 * no route or no router (a widget mounted outside a vue-router context).
		 * Decides whether the "View all" footer renders as a link or a button.
		 *
		 * @return {string|null}
		 */
		viewAllHref() {
			if (!this.viewAllRoute || !this.$router || typeof this.$router.resolve !== 'function') {
				return null
			}
			try {
				const resolved = this.$router.resolve(this.viewAllRoute)
				return (resolved && resolved.href) || null
			} catch {
				return null
			}
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
			// Every column backed by a schema property sorts unless it says
			// `sortable: false`; object columns from a manifest used to need an
			// explicit flag and so could not sort at all.
			const withSort = (c) => (c && typeof c === 'object' ? { ...c, sortable: isColumnSortable(c, this.schema) } : c)
			if (!(cols || []).some((c) => typeof c === 'string')) {
				return (cols || []).map(withSort)
			}
			const schemaCols = this.schema
				? columnsFromSchema(this.schema, { overrides: this.columnOverrides })
				: []
			const byKey = new Map(schemaCols.map((c) => [c.key, c]))
			return (cols || []).map((c) => {
				if (typeof c !== 'string') {
					return withSort(c)
				}
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
		/**
		 * The link each row opens, keyed by row key: the `rowClickRoute`
		 * location and its href. Empty when rows have no route, or when a row
		 * click selects instead of navigating.
		 *
		 * @return {{[key: string]: {target: object, href: string}}}
		 */
		rowLinks() {
			const links = {}
			if (!this.rowClickRoute || !this.$router || (this.selectable && !this.rowClickToView)) {
				return links
			}
			for (const row of this.effectiveRows) {
				const route = this.rowClickRoute(row)
				if (!route) {
					continue
				}
				const target = typeof route === 'string' ? { path: route } : route
				const href = resolveHref(target, this.$router)
				if (href) {
					links[String(row[this.rowKey])] = { target, href }
				}
			}
			return links
		},

		/**
		 * The column whose filter panel is open, or null.
		 *
		 * @return {object|null}
		 */
		openFilterColumn() {
			if (!this.openFilterKey) {
				return null
			}
			return this.effectiveColumns.find((c) => c && c.key === this.openFilterKey && this.filterDefFor(c)) || null
		},

		/**
		 * One chip per column with an active header filter.
		 *
		 * @return {Array<{key: string, col: object, text: string, removeLabel: string}>}
		 */
		activeColumnFilterChips() {
			if (!this.filterable) {
				return []
			}
			return this.effectiveColumns
				.filter((c) => c && this.isColumnFiltered(c))
				.map((col) => {
					const label = this.translateLabel(col.label)
					const text = t('nextcloud-vue', '{column}: {value}', { column: label, value: this.columnFilterSummary(col) })
					return { key: col.key, col, text, removeLabel: t('nextcloud-vue', 'Remove filter {column}', { column: label }) }
				})
		},

		activeFiltersLabel() {
			return t('nextcloud-vue', 'Active filters')
		},

		effectiveSortKeys() {
			if (this.sortKeys && this.sortKeys.length > 0) {
				return this.sortKeys
			}
			if (this.sortKey) {
				return [{ key: this.sortKey, order: this.sortOrder || 'asc' }]
			}
			return []
		},

		/**
		 * The active sort keys whose column renders a sort indicator, in priority order and deduplicated by first occurrence. Only these are counted and numbered by the priority badge.
		 *
		 * @return {Array<{key: string, order: 'asc'|'desc'}>}
		 */
		renderedSortKeys() {
			const shown = new Set(this.effectiveColumns.filter((c) => c && c.sortable).map((c) => c.key))
			const seen = new Set()
			return this.effectiveSortKeys.filter((k) => {
				if (!k || !shown.has(k.key) || seen.has(k.key)) {
					return false
				}
				seen.add(k.key)
				return true
			})
		},

		totalColumns() {
			let count = this.effectiveColumns.length
			if (this.selectable) {
				count++
			}
			if (this.rowIcon) {
				count++
			}
			if (this.$slots['row-actions']) {
				count++
			}
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
			handler() {
				this.loadAggregates()
			},
		},

		effectiveColumns: {
			handler() {
				this.loadAggregates()
			},

			deep: false,
		},

		/**
		 * Re-run the self-fetch when its inputs (register, schemaId, or the
		 * host-driven `fetchParams`) change — a token-resolved filter (e.g.
		 * `@workspace.*`) can change after mount. External rows still win.
		 */
		selfFetchKey() {
			if ((!this.rows || this.rows.length === 0) && this.register !== null && this.register !== undefined && this.schemaId !== null && this.schemaId !== undefined) {
				this.fetchData()
			}
		},
	},

	mounted() {
		this.loadAggregates()
		// Self-fetch mode: pull rows from OpenRegister when register + schemaId
		// are given and no external rows were passed (folded from CnTableWidget).
		if ((!this.rows || this.rows.length === 0) && this.register !== null && this.register !== undefined && this.schemaId !== null && this.schemaId !== undefined) {
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
		 * Whether a row's record changed since the user last looked
		 * (`@self.unread`). A row without the marker renders as it always did.
		 *
		 * @param {object} row The row.
		 * @return {boolean} True when the row is unread.
		 */
		isUnreadRow(row) {
			return !!(row && row['@self'] && row['@self'].unread === true)
		},

		/**
		 * The attached file a row was found through in a file-content search.
		 *
		 * @param {object} row The row.
		 * @return {string} The file name, or '' when the row matched on a field.
		 */
		matchedFileOf(row) {
			const name = row && row['@self'] && row['@self'].matchedFile
			return typeof name === 'string' ? name : ''
		},

		/**
		 * The "Found in {file}" line for a row found through an attached file.
		 *
		 * @param {object} row The row.
		 * @return {string} The translated line.
		 */
		matchedFileLabel(row) {
			return t('nextcloud-vue', 'Found in {file}', { file: this.matchedFileOf(row) })
		},

		/**
		 * The declared indicators that apply to one row, split into the ones
		 * that fit on the row and the ones that go to the row menu.
		 *
		 * @param {object} row The row.
		 * @return {{shown: Array<object>, overflow: Array<object>}}
		 * @spec openspec/changes/working-list-row-actions/specs/index-page/spec.md
		 */
		indicatorsFor(row) {
			return resolveRowIndicators(this.rowIndicators, row, this.rowIndicatorCap)
		},

		/**
		 * Give a cell its full text on hover, and only when it is cut short.
		 *
		 * Cells are one line with an ellipsis, so a long value is readable only
		 * as far as the column goes. A `title` on every cell would answer that,
		 * and would also put a tooltip on the cells that need none — repeating
		 * back what is already on screen.
		 *
		 * Read on ENTER rather than on render: `scrollWidth > clientWidth` forces
		 * layout, and doing it per cell per paint would cost a reflow for a
		 * tooltip almost none of them want. On enter it is one read of one cell,
		 * and it is re-read every time, so a column resized since the last hover
		 * answers for its new width rather than its old one.
		 *
		 * @param {MouseEvent} event The enter event.
		 *
		 * @return {void}
		 */
		titleWhenClipped(event) {
			const el = event.currentTarget
			if (!el) {
				return
			}

			// 1px of tolerance, as the scrollport check uses: sub-pixel rounding
			// otherwise reports a cell that visually fits as clipped.
			if (el.scrollWidth - el.clientWidth > 1) {
				el.setAttribute('title', (el.textContent || '').trim())
			} else {
				el.removeAttribute('title')
			}
		},

		/**
		 * Whether the cell at this position (selection, icon, then data columns)
		 * is pinned. Position 0 is the first cell of the row.
		 *
		 * @param {number} index The cell's position in the row.
		 * @return {boolean} True for a pinned cell.
		 */
		isPinnedAt(index) {
			return this.pinnedCount > 0 && index < this.leadingCount + this.pinnedCount
		},

		/**
		 * CSS classes of a pinned cell; the last pinned one gets the edge.
		 *
		 * @param {number} index The cell's position in the row.
		 * @return {object} The class map.
		 */
		pinClass(index) {
			const pinned = this.isPinnedAt(index)
			return {
				'cn-table-col--pinned': pinned,
				'cn-table-col--pinned-last': pinned && index === this.leadingCount + this.pinnedCount - 1,
			}
		},

		/**
		 * Sticky offset of a pinned cell: the summed width of the cells before it.
		 *
		 * @param {number} index The cell's position in the row.
		 * @return {object} The inline style, empty for a cell that scrolls.
		 */
		pinStyle(index) {
			if (!this.isPinnedAt(index)) {
				return {}
			}
			return { left: `${this.pinOffsets[index] || 0}px` }
		},

		/**
		 * Measure the pinned cells so each sticky offset is the width of those
		 * before it. Cheap when nothing is pinned.
		 *
		 * @return {void}
		 */
		measurePins() {
			if (this.pinnedCount <= 0) {
				if (this.pinOffsets.length > 0) {
					this.pinOffsets = []
				}
				return
			}
			const row = this.$el && this.$el.querySelector ? this.$el.querySelector('thead tr, tbody tr') : null
			if (!row) {
				return
			}
			const count = this.leadingCount + this.pinnedCount
			const offsets = []
			let left = 0
			for (let i = 0; i < count && i < row.children.length; i++) {
				offsets.push(left)
				left += row.children[i].offsetWidth || 0
			}
			if (offsets.join() !== this.pinOffsets.join()) {
				this.pinOffsets = offsets
			}
		},

		/**
		 * Start watching the scrollport for horizontal overflow.
		 *
		 * @return {void}
		 */
		observeScrollOverflow() {
			this.measureScrollOverflow()
			if (typeof ResizeObserver === 'undefined') {
				return
			}
			this._scrollObserver = new ResizeObserver(() => this.measureScrollOverflow())
			const el = this.$refs.scrollEl
			if (el) {
				this._scrollObserver.observe(el)
				// The table itself, not just the port: a column widening pushes
				// the content past the fold without the port changing size.
				const table = el.querySelector('table')
				if (table) {
					this._scrollObserver.observe(table)
				}
			}
		},

		/**
		 * Recompute whether the scrollport overflows horizontally.
		 *
		 * @return {void}
		 */
		measureScrollOverflow() {
			this.measurePins()
			const el = this.$refs.scrollEl
			// 1px of tolerance: sub-pixel layout rounding otherwise reports a
			// table that visually fits as scrollable, which would put a tab
			// stop on it for no reachable content.
			const next = !!el && (el.scrollWidth - el.clientWidth) > 1
			if (next !== this.isScrollable) {
				this.isScrollable = next
			}
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
			if (!label) {
				return ''
			}
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
			} catch {
				this.fetchedRows = []
			} finally {
				this.selfFetchLoading = false
			}
		},

		/**
		 * Activate the "View all" footer control: emit `view-all`, then push
		 * `viewAllRoute` through the router when there is one. A plain left
		 * click on the link is handled in-app; a modified click (ctrl/cmd/
		 * shift/middle) is left to the browser so "open in new tab" keeps
		 * working on the real href.
		 *
		 * @param {MouseEvent} [event] The click event, when triggered by one.
		 * @return {void}
		 */
		onViewAll(event) {
			const modified = Boolean(event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button))
			if (event && !modified) {
				event.preventDefault()
			}
			/** @event view-all Emitted when the built-in "View all" footer control is activated. Payload: the `viewAllRoute` object. */
			this.$emit('view-all', this.viewAllRoute)
			if (modified) {
				return
			}
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
		 * @return {unknown} The cell value
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
		 * `enum`/`enumLabels` hints. Lets synthesized columns that have no
		 * schema property (e.g. metadata fields with `format: 'date-time'` /
		 * `'uri'`, or a dotted path into a reference this table was never
		 * handed a `:schema` for at all) still get type-aware rendering.
		 * `enumLabels` rides with `enum` rather than getting its own `if`
		 * branch: a column can't usefully declare labels without also
		 * declaring the codes they label.
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
					...(col.enum ? { enum: col.enum, enumLabels: col.enumLabels || base.enumLabels } : {}),
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
		 * @return {unknown} The value handed to the slot / CnCellRenderer.
		 */
		/**
		 * The secondary line of a cell, from `col.secondary`: a function is
		 * called with the row; a string with `{field}` placeholders is a
		 * template filled from the row (dotted paths allowed); any other
		 * string is a field key. Returns '' when there is nothing to draw.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-table-column-carries-a-secondary-line
		 * @param {object} row The row.
		 * @param {object} col The column definition.
		 * @return {string} The secondary text, or ''.
		 */
		secondaryValue(row, col) {
			const spec = col?.secondary
			if (typeof spec === 'function') {
				const out = spec(row)
				return out === null || out === undefined ? '' : String(out)
			}
			if (typeof spec !== 'string' || spec === '') {
				return ''
			}
			const asText = (v) => (v === null || v === undefined ? '' : String(v))
			if (spec.includes('{')) {
				const filled = fillSecondaryTemplate(spec, (key) => asText(this.getCellValue(row, key)))
				// A template whose every field is empty leaves only separators:
				// nothing worth a line.
				return /[\p{L}\p{N}]/u.test(filled) ? filled.trim() : ''
			}
			return asText(this.getCellValue(row, spec))
		},

		cellValue(row, col) {
			if (col && col.aggregate) {
				const cached = this.aggregateValues[String(row[this.rowKey])]
				const v = cached ? cached[col.key] : undefined
				if (v === undefined) {
					return this.aggregateLoading ? '…' : '—'
				}
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
				if (Object.keys(this.aggregateValues).length > 0) {
					this.aggregateValues = {}
				}
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
					if (!agg.register || !agg.schema) {
						continue
					}
					const where = this.resolveAggregateWhere(agg.where, row)
					jobs.push(axios.get(generateUrl(`/apps/openregister/api/objects/${agg.register}/${agg.schema}`), {
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
						}))
				}
			}
			await Promise.all(jobs)
			if (id !== this.aggregateRequestId) {
				return
			}
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
			if (this.wasDrag(event)) {
				return
			}
			if (this.selectable && !this.rowClickToView) {
				this.toggleSelect(row)
				return
			}
			this.emitRowClick(row, event)
		},

		/**
		 * Row mousedown: record the press for the drag guard, and on a row a
		 * middle click opens, keep the browser from starting autoscroll.
		 *
		 * @param {MouseEvent} event The mousedown event.
		 */
		onRowMouseDown(event) {
			this.onPointerDown(event)
			if (!this.selectable || this.rowClickToView) {
				preventMiddleClickAutoscroll(event)
			}
		},

		/**
		 * Row-body middle click: emits `row-aux-click`, not `row-click`, so an
		 * existing `row-click` listener that navigates never moves the current
		 * tab away; `rowClickRoute` still opens the row in a new tab. Ignored
		 * for other buttons, nested controls, drags and select-on-click tables.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent} event The originating auxclick event.
		 */
		onRowAuxClick(row, event) {
			if (!isRowMiddleClick(event) || this.wasDrag(event)) {
				return
			}
			if (this.selectable && !this.rowClickToView) {
				return
			}
			/**
			 * @event row-aux-click Emitted on a row-body middle click, under the same conditions as `row-click`, so a host can open the row in a new tab (see `openRowTarget`). Payload: `(row, event)` — the clicked row object and the native auxclick event.
			 * @type {object} The clicked row object.
			 */
			this.$emit('row-aux-click', row, event)
			this.followRowClickRoute(row, event)
		},

		/**
		 * Emit `row-click` and follow `rowClickRoute` when set.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent} [event] The originating click event.
		 */
		emitRowClick(row, event) {
			/**
			 * @event row-click Emitted on a row-body click for navigation. Fires when `selectable` is false, OR when `rowClickToView` is set (selection then happens via the checkbox column). Payload: `(row, event)` — the clicked row object and the native click event, so a host can open the row in a new tab on a ctrl/cmd/shift click (see `openRowTarget`). A middle click emits `row-aux-click` instead.
			 * @type {object} The clicked row object.
			 */
			this.$emit('row-click', row, event)
			this.followRowClickRoute(row, event)
		},

		/**
		 * Follow `rowClickRoute` for a row click: in place, or in a new tab on
		 * a ctrl/cmd/shift or middle click.
		 *
		 * @param {object} row The clicked row object
		 * @param {MouseEvent} [event] The originating click or auxclick event.
		 */
		followRowClickRoute(row, event) {
			// A new-tab click opens the route in a new tab, unless a listener
			// already did.
			if (this.rowClickRoute && this.$router && !isNewTabHandled(event)) {
				const route = this.rowClickRoute(row)
				if (route) {
					markNewTabHandled(event, openRowTarget(event, typeof route === 'string' ? { path: route } : route, this.$router))
				}
			}
		},

		/**
		 * A plain or alt click on a row link routes in place; a new-tab click
		 * is left to the browser, which opens the href itself.
		 *
		 * @param {object} row The row the link belongs to.
		 * @param {MouseEvent} event The click event.
		 */
		onRowLinkClick(row, event) {
			const link = this.rowLinks[String(row[this.rowKey])]
			if (!link) {
				return
			}
			// Alt-click on a link downloads it; a row opens like a plain click.
			if (event.altKey && !isNewTabClick(event) && !event.defaultPrevented) {
				event.preventDefault()
				this.$router.push(link.target).catch(() => {})
				return
			}
			followLinkClick(event, link.target, this.$router)
		},

		/**
		 * The row link's accessible name: the row's first cell when it holds
		 * plain text, else a generic name.
		 *
		 * @param {object} row The row.
		 * @param {object} col The first data column.
		 * @return {string}
		 */
		rowLinkLabel(row, col) {
			const value = this.cellValue(row, col)
			if (['string', 'number'].includes(typeof value) && String(value).trim() !== '') {
				return String(value)
			}
			return t('nextcloud-vue', 'Open row')
		},

		/**
		 * Row right-click: forward the row + originating event so a host can
		 * open a context menu. The browser menu is prevented, except on a row
		 * link when no host listens, so its link actions stay available.
		 *
		 * @param {object} row The right-clicked row object.
		 * @param {MouseEvent} event The originating contextmenu event.
		 */
		onRowContextMenu(row, event) {
			const fromRowLink = event.target?.closest?.('.cn-table-row__link')
			// `$.vnode.props`, not `$attrs`: a declared emit is stripped from `$attrs`.
			if (!fromRowLink || this.$.vnode.props?.onRowContextMenu) {
				event.preventDefault()
			}
			/**
			 * @event row-context-menu Emitted on a row right-click (contextmenu) for hosts that render a context menu.
			 * @type {{ row: object, event: MouseEvent }}
			 */
			this.$emit('row-context-menu', { row, event })
		},

		/**
		 * Index of `key` within `effectiveSortKeys`, or -1 when not active.
		 * Used by the template for the arrow.
		 *
		 * @param {string} key Column key.
		 * @return {number}
		 */
		sortKeyIndex(key) {
			return this.effectiveSortKeys.findIndex((k) => k && k.key === key)
		},

		/**
		 * The 1-based priority badge for `key` among the rendered sort keys, or null when fewer than two rendered columns are sorted or `key` is not one of them.
		 *
		 * @param {string} key Column key.
		 * @return {number|null}
		 */
		sortBadgeFor(key) {
			if (this.renderedSortKeys.length < 2) {
				return null
			}
			const index = this.renderedSortKeys.findIndex((k) => k.key === key)
			return index === -1 ? null : index + 1
		},

		/**
		 * `aria-sort` value for a column header: `'ascending'`/`'descending'` for the first rendered sort key only, per WCAG guidance that `aria-sort` describes single-column sort state.
		 * `null` omits the attribute entirely (unsorted, not sortable, or not the first rendered sort key).
		 *
		 * @param {object} col Column definition.
		 * @return {string|null}
		 */
		ariaSortFor(col) {
			if (!col.sortable) {
				return null
			}
			const primary = this.renderedSortKeys[0]
			if (!primary || primary.key !== col.key) {
				return null
			}
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
		/**
		 * The filter definition for a column, or null when it does not filter
		 * (header filters off, `filterable: false`, or nothing to filter on).
		 *
		 * @param {object} col The column.
		 * @return {object|null}
		 */
		filterDefFor(col) {
			if (!this.filterable || !col) {
				return null
			}
			return columnFilterDef(col, this.schema)
		},

		columnFilterStateFor(col) {
			return columnFilterState(this.filterDefFor(col), this.activeFilters)
		},

		isColumnFiltered(col) {
			const def = this.filterDefFor(col)
			return !!def && isColumnFilterActive(def, this.activeFilters)
		},

		filterButtonLabel(col) {
			const column = this.translateLabel(col.label)
			return this.isColumnFiltered(col)
				? t('nextcloud-vue', 'Filter {column}, active', { column })
				: t('nextcloud-vue', 'Filter {column}', { column })
		},

		/**
		 * Short text for an active filter: the picked labels, or the range.
		 *
		 * @param {object} col The column.
		 * @return {string}
		 */
		columnFilterSummary(col) {
			const def = this.filterDefFor(col)
			const state = this.columnFilterStateFor(col)
			if (!def) {
				return ''
			}
			if (def.kind === 'enum') {
				const labels = Object.fromEntries((def.options || []).map((o) => [o.value, o.label]))
				return state.values.map((v) => this.translateLabel(labels[v] || v)).join(', ')
			}
			if (def.kind === 'reference') {
				return n('nextcloud-vue', '{count} selected', '{count} selected', state.values.length, { count: state.values.length })
			}
			if (def.kind === 'number' || def.kind === 'date') {
				if (state.from && state.to) {
					return t('nextcloud-vue', '{from} to {to}', { from: state.from, to: state.to })
				}
				return state.from
					? t('nextcloud-vue', 'from {value}', { value: state.from })
					: t('nextcloud-vue', 'up to {value}', { value: state.to })
			}
			if (def.kind === 'boolean') {
				return state.value === 'true' ? t('nextcloud-vue', 'Yes') : t('nextcloud-vue', 'No')
			}
			return state.value
		},

		/**
		 * Open or close a column's filter panel under its button.
		 *
		 * @param {object} col The column.
		 * @param {Event} event The click.
		 * @return {void}
		 */
		toggleColumnFilter(col, event) {
			if (this.openFilterKey === col.key) {
				this.closeColumnFilter()
				return
			}
			const target = event && event.currentTarget
			this.filterAnchorRect = target && typeof target.getBoundingClientRect === 'function'
				? target.getBoundingClientRect()
				: null
			this.openFilterKey = col.key
		},

		/**
		 * Close the open panel and give focus back to its button.
		 *
		 * @return {void}
		 */
		closeColumnFilter() {
			const key = this.openFilterKey
			this.openFilterKey = ''
			if (!key) {
				return
			}
			this.$nextTick(() => {
				const ref = this.$refs['filterButton-' + key]
				const button = Array.isArray(ref) ? ref[0] : ref
				if (button && typeof button.focus === 'function') {
					button.focus()
				}
			})
		},

		/**
		 * Apply a panel's state: emit the query parameters it stands for.
		 *
		 * @param {object} col The column.
		 * @param {object} state The panel state.
		 * @return {void}
		 * @spec openspec/changes/table-header-sort-and-filter/specs/cn-data-table/spec.md#requirement-a-header-filter-speaks-the-sidebars-query-language
		 */
		applyColumnFilter(col, state) {
			const def = this.filterDefFor(col)
			if (def) {
				/**
				 * @event column-filter A header filter was applied or cleared.
				 * @type {{ key: string, params: object }} `params` maps each query parameter the column owns to its values; an empty list clears it.
				 */
				this.$emit('column-filter', { key: col.key, params: columnFilterParams(def, state) })
			}
			this.closeColumnFilter()
		},

		clearColumnFilter(col) {
			const def = this.filterDefFor(col)
			if (def) {
				this.$emit('column-filter', { key: col.key, params: clearedColumnFilterParams(def) })
			}
		},

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
			if (event.key !== 'Enter') {
				return
			}
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
