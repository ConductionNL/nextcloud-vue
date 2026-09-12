<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-object-list-widget"
		:class="{ 'cn-object-list-widget--dropping': dropping }"
		@dragenter="onDragEnter"
		@dragover="onDragOver"
		@dragleave="onDragLeave"
		@drop="onDrop">
		<!-- Drop overlay. Rendered only while a drag carrying files is over a
		     widget that declares `content.dropZone`; without the key the drag
		     handlers below all return before touching any state, so a widget
		     that did not ask for a drop zone behaves exactly as before. -->
		<div v-if="dropping" class="cn-object-list-widget__drop-overlay">
			{{ dropLabel }}
		</div>
		<p v-if="waitingForContext" class="cn-object-list-widget__prompt">
			{{ promptText }}
		</p>
		<!-- A fetch failed: show ONE quiet line WITHOUT the raw axios status
		     text ("Request failed with status code 404") — the real error is
		     logged to the console (ADR-062: an error surface is never a leaked
		     stack). Takes precedence over the empty state so the two never
		     stack. -->
		<p v-else-if="error" class="cn-object-list-widget__error">
			{{ loadErrorLabel }}
		</p>
		<!-- Designed empty state. This used to be a bare CnDataTable with no
		     rows, which paints its <thead> — a full-width grey strip floating
		     in the middle of an otherwise blank card, the "strange grey bar"
		     from the review. CnWidgetEmptyState replaces it with something
		     deliberate, and stays `compact` inside a fit-measured cell so it
		     cannot outgrow a short tile (ADR-062). -->
		<CnWidgetEmptyState
			v-else-if="!loading && rows.length === 0"
			:name="resolvedEmptyText"
			:compact="fitRows !== null && fitRows < 3"
			class="cn-object-list-widget__empty">
			<template v-if="allowCreate && !waitingForContext" #action>
				<button type="button" class="cn-object-list-widget__add" @click="openCreate">
					+ {{ addLabel }}
				</button>
			</template>
		</CnWidgetEmptyState>
		<!-- The fetch came back with rows, but the active facet selection
		     matches none of them (all loaded rows have that filter row set
		     empty of a facet-clearable state). Distinct from the "no items at
		     all" state above: an Add button is not the fix here, clearing the
		     filter is. -->
		<CnWidgetEmptyState
			v-else-if="showNoFacetMatchState"
			:name="t('nextcloud-vue', 'No items match this filter')"
			:compact="fitRows !== null && fitRows < 3"
			class="cn-object-list-widget__empty">
			<template #action>
				<button type="button" class="cn-object-list-widget__facet-clear" @click="clearFacet">
					{{ t('nextcloud-vue', 'Clear filter') }}
				</button>
			</template>
		</CnWidgetEmptyState>
		<template v-else>
			<!-- Facet filter (`content.facet`). Chips built from the values
			     actually present on the loaded rows, matching the "keyword
			     filter" pattern this seam was measured against — narrows the
			     rendered rows client-side, no refetch. Absent facet config
			     renders nothing, so an ungrouped/unfiltered widget is unchanged. -->
			<div v-if="facetOptions.length > 0" class="cn-object-list-widget__facet" data-testid="object-list-facet">
				<span class="cn-object-list-widget__facet-label">{{ facetLabel }}</span>
				<button
					v-for="value in facetOptions"
					:key="value"
					type="button"
					class="cn-object-list-widget__facet-chip"
					:class="{ 'cn-object-list-widget__facet-chip--active': facetSelected.includes(value) }"
					:aria-pressed="facetSelected.includes(value)"
					data-testid="object-list-facet-chip"
					@click="toggleFacetValue(value)">
					{{ value }}
				</button>
				<button
					v-if="facetSelected.length > 0"
					type="button"
					class="cn-object-list-widget__facet-clear"
					@click="clearFacet">
					{{ t('nextcloud-vue', 'Clear filter') }}
				</button>
			</div>

			<!-- Bulk-actions bar (`content.selectable` + `content.bulkActions`).
			     Renders only once something is selected, so a selectable widget
			     with nothing picked looks exactly like a non-selectable one. -->
			<div
				v-if="content.selectable && mappedBulkActions.length > 0 && selectedIds.length > 0"
				class="cn-object-list-widget__bulk-bar"
				data-testid="object-list-bulk-bar">
				<span class="cn-object-list-widget__bulk-count">
					{{ t('nextcloud-vue', '{count} selected', { count: selectedIds.length }) }}
				</span>
				<button
					v-for="(action, index) in mappedBulkActions"
					:key="index"
					type="button"
					class="cn-object-list-widget__bulk-action"
					:class="{ 'cn-object-list-widget__bulk-action--destructive': action.destructive }"
					data-testid="object-list-bulk-action"
					@click="action.handler">
					{{ action.label }}
				</button>
				<button type="button" class="cn-object-list-widget__bulk-clear" @click="clearSelection">
					{{ t('nextcloud-vue', 'Clear selection') }}
				</button>
			</div>

			<div v-if="isGrouped" class="cn-object-list-widget__groups">
				<div v-for="group in groupedRows"
					:key="group.key"
					class="cn-object-list-widget__group"
					data-testid="object-list-group">
					<h4 class="cn-object-list-widget__group-heading">
						<!-- `groupLabelResolve` reuses the fkResolve cell for the
						     heading itself: `groupBy` may bucket by a uuid that is
						     ONE MORE hop past what `extend` inlined (e.g. a
						     reference's own reference), which `objectFieldValue`
						     cannot read off the row at all. The live object-store
						     lookup CnDataTable columns already use for a `$ref`
						     column is the same answer for a `$ref` GROUP. -->
						<CnFkResolveCell
							v-if="groupLabelResolveConfig"
							:value="group.key"
							:register="groupLabelResolveConfig.register"
							:schema="groupLabelResolveConfig.schema"
							:label-field="groupLabelResolveConfig.labelField || 'name'" />
						<template v-else>
							{{ group.label }}
						</template>
						({{ group.rows.length }})
					</h4>
					<CnDataTable
						:columns="resolvedColumns"
						:rows="group.rows"
						:loading="loading"
						:empty-text="emptyText"
						:selectable="content.selectable === true"
						:selected-ids="selectedIds"
						:sort-key="localSort.field || null"
						:sort-order="localSort.dir || 'asc'"
						borderless
						@row-click="onRowClick"
						@select="onSelect"
						@sort="onSort">
						<template v-if="mappedRowActions.length > 0" #row-actions="{ row }">
							<CnRowActions :actions="mappedRowActions" :row="row" />
						</template>
					</CnDataTable>
				</div>
			</div>
			<div v-else class="cn-object-list-widget__table">
				<CnDataTable
					:columns="resolvedColumns"
					:rows="facetedRows"
					:loading="loading"
					:empty-text="emptyText"
					:selectable="content.selectable === true"
					:selected-ids="selectedIds"
					:sort-key="localSort.field || null"
					:sort-order="localSort.dir || 'asc'"
					borderless
					@row-click="onRowClick"
					@select="onSelect"
					@sort="onSort">
					<!-- Declarative per-row actions (`content.rowActions`).
					     CnDataTable only paints the trailing actions column
					     when this slot is supplied, so a widget without
					     `rowActions` keeps the column count it had. -->
					<template v-if="mappedRowActions.length > 0" #row-actions="{ row }">
						<CnRowActions :actions="mappedRowActions" :row="row" />
					</template>
				</CnDataTable>
			</div>
			<!--
			  Footer. Two affordances, and they answer different questions.

			  The PAGER walks the rest of the matching objects in place —
			  server-side (`_page`), so "1–5 of 137" is the truth and not a
			  count of what happened to be fetched. It renders only when a
			  whole page fits the cell; on a cell too short for one page the
			  fit-to-cell path below is all there is, because a pager under
			  rows that are themselves clipped would page a lie.

			  VIEW ALL leaves for the full index. It shows whenever there is
			  more than the widget is showing, pager or no pager — a widget is
			  a summary, and the index is where the list actually lives.
			-->
			<CnPagination
				v-if="showPager"
				compact
				class="cn-object-list-widget__pager"
				:current-page="page"
				:total-pages="totalPages"
				:total-items="total"
				:current-page-size="pageSize"
				:min-items-to-show="0"
				@page-changed="onPageChange" />
			<button
				v-if="hiddenCount > 0 && content.viewAllRoute"
				type="button"
				class="cn-object-list-widget__view-all"
				@click="onViewAll">
				{{ viewAllLabel }}
			</button>
			<p v-else-if="hiddenCount > 0 && !showPager" class="cn-object-list-widget__more">
				{{ moreLabel }}
			</p>
		</template>
		<!-- Create affordance (ADR-062): every collection carries its Add at
		     the bottom of the widget; the host card's Actions menu calls the
		     same openCreate() through the public method. Suppressed while the
		     empty state is showing — that renders its own copy in its #action
		     slot, and two Add buttons on one empty card read as a bug. -->
		<button
			v-if="allowCreate && !waitingForContext && !showingEmptyState"
			type="button"
			class="cn-object-list-widget__add"
			@click="openCreate">
			+ {{ addLabel }}
		</button>
		<!-- Upload affordance. A `dropZone` action already accepts a dropped
		     `File[]`; this is the click-to-pick equivalent of the same drop,
		     for the reader who never drags a file. `content.upload: false`
		     opts a drop-only widget out of the button. -->
		<button
			v-if="showUploadButton"
			type="button"
			class="cn-object-list-widget__upload"
			data-testid="object-list-upload"
			@click="triggerUpload">
			{{ uploadLabel }}
		</button>
		<input
			v-if="showUploadButton"
			ref="uploadInput"
			type="file"
			multiple
			:aria-label="uploadLabel"
			class="cn-object-list-widget__upload-input"
			data-testid="object-list-upload-input"
			@change="onUploadFilesSelected">
		<CnFormDialog
			v-if="showCreate && createSchema"
			ref="createDialog"
			:schema="createSchema"
			:item="null"
			:size="formSize"
			:columns="formColumns"
			:include-fields="formIncludeFields"
			:exclude-fields="formExcludeFields"
			:field-overrides="formFieldOverrides"
			@confirm="onCreateConfirm"
			@close="showCreate = false" />
	</div>
</template>

<script>
import CnDataTable from '../CnDataTable/CnDataTable.vue'
import CnFkResolveCell from '../CnFkResolveCell/CnFkResolveCell.vue'
import CnFormDialog from '../CnFormDialog/CnFormDialog.vue'
import CnPagination from '../CnPagination/CnPagination.vue'
import CnWidgetEmptyState from '../CnWidgetEmptyState/CnWidgetEmptyState.vue'
import { CnRowActions } from '../CnRowActions/index.js'
import { translate as t } from '@nextcloud/l10n'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { resolveFilterTokens, hasUnresolvedTokens, dropOptionalUnresolved } from '../../utils/resolveFilterTokens.js'
import { objectFieldValue } from '../../utils/objectName.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'

/**
 * Event-bus channel a page-level refresh is announced on. The page's Actions
 * menu emits it, the manifest `refresh` / `api-call` actions bump it, and an
 * app's own dialog emits it after a successful write.
 */
const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/**
 * CnObjectListWidget — an abstract, manifest-configured object list / table.
 *
 * Queries OpenRegister objects for a `register` + `schema` with a `filter`,
 * `sort`, and `limit`, then renders the chosen `columns` in a `CnDataTable`.
 * Replaces per-app coded list widgets (closing-soon, recently-won-lost,
 * renewals-due, …) — the data, columns, filter and ordering are all editable
 * through the cog modal (ADR-041). Resolved by its registry type key
 * `object-list`; configured via `CnObjectListWidgetForm`.
 *
 * Example content blob:
 * ```js
 * content: {
 *   register: 'pipelinq', schema: 'lead',
 *   filter: { status: 'open' },
 *   sort: { field: 'expectedCloseDate', dir: 'asc' },
 *   limit: 5,
 *   columns: [{ key: 'title', label: 'Deal' }, { key: 'value', label: 'Value' }],
 *   rowRoute: 'leads-detail',
 * }
 * ```
 */
export default {
	name: 'CnObjectListWidget',

	components: { CnDataTable, CnFormDialog, CnPagination, CnWidgetEmptyState, CnRowActions, CnFkResolveCell },

	inject: {
		/**
		 * Detail-page object context (`{ objectId, object, register, schema }`)
		 * provided by CnDetailPage. Enables `@objectId` / `@object.<field>`
		 * filter tokens so a detail-page list can be scoped to the current
		 * object. Null on dashboards (tokens then pass through unresolved).
		 */
		cnObjectContext: { default: null },
		/**
		 * Page-level workspace context (reactive `ref({})`) provided by
		 * CnDashboardPage. Lets `@workspace.<key>` filter tokens resolve so a
		 * list can react to state another widget on the page wrote (e.g. a
		 * client-overview list scoped to the selected client). Null on pages
		 * that don't provide it (tokens then stay unresolved and the list shows
		 * its `promptText`).
		 */
		cnWorkspaceContext: { default: null },
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored `content.emptyText` is run through it for this
		 * component's OWN empty state. Defaults to an identity function so
		 * an untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
		/**
		 * Pre-bound `dispatchAction` provided by CnPageRenderer (router,
		 * registry, handlers and openModal already wired). `rowActions` and
		 * `dropZone` dispatch through it; outside a CnPageRenderer tree the
		 * component falls back to a bare `dispatchAction` call, which reaches
		 * the router-backed types and warns on the registry-backed ones.
		 */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The widget's persisted configuration blob. `limit` is a fetch cap
		 * (default 25) — the rendered row count fits the host cell (ADR-062).
		 * `viewAllRoute` / `viewAllQuery` configure the "View all (N)" footer
		 * navigation; `viewAllQuery` values are token-resolved (`@objectId`).
		 *
		 * `extend` is the OpenRegister `_extend[]` list forwarded on the fetch.
		 * It is what makes a DOTTED column key work: `CnDataTable` reads
		 * `informatieobject.title` as a path into the row, and without
		 * `extend: ['informatieobject']` the row holds a uuid string at that
		 * key, so six columns off one referenced object render as six copies
		 * of the same uuid. `fkResolve` is the one-label answer; `extend` is
		 * the several-fields-off-the-same-reference answer.
		 *
		 * `rowActions` is an array in the unified manifest action shape
		 * (`handler` | `open-modal` | `open-page` | `navigate` | …), rendered
		 * per row through CnRowActions. `dropZone` is one action of that same
		 * shape, dispatched when files are dropped on the widget, with the
		 * dropped `File[]` handed to it. `content.upload: false` hides the
		 * click-to-pick button that otherwise renders alongside a `dropZone`.
		 * Neither carries authorization: OpenRegister RBAC is the only
		 * authority over what a write may do.
		 *
		 * `groupBy` (a row field path, dotted paths read the `extend`-inlined
		 * reference the same way a column does) buckets the fetched rows into
		 * one heading + table per distinct value, in first-seen order.
		 * `groupLabel` is the field path used for the heading text; it
		 * defaults to the raw `groupBy` value when absent. `groupLabelResolve`
		 * (`{register, schema, labelField?}`) is for a `groupBy` whose human
		 * label sits a hop further than `extend` reaches (a reference's own
		 * reference): the heading resolves the raw group key through the
		 * shared object store, the same `fkResolve` cell widget a column uses.
		 *
		 * `selectable` turns on CnDataTable's checkbox column; `bulkActions`
		 * (same action shape as `rowActions`) render as buttons in a bar that
		 * appears once something is selected. A `handler` bulk action receives
		 * the array of selected row objects appended to its `args`; an
		 * `open-modal` bulk action receives them as `props.selectedIds`
		 * (mirroring how a drop hands `props.files` to a modal).
		 *
		 * `sortable` (`true`, or an array of column keys) makes the matching
		 * `CnDataTable` headers clickable; clicking re-fetches with that
		 * field's `_order`, same as the fixed `sort` key but user-driven.
		 *
		 * `facet` (`{ field, label? }`) renders one filter chip per distinct
		 * value of that field across the currently loaded rows (an array
		 * field's entries are flattened) and narrows the rendered rows to
		 * those carrying a selected value. Client-side over the fetched page,
		 * like the rest of this widget's row set.
		 * @type {{register?: string, schema?: string, filter?: object, sort?: {field?: string, dir?: string}, limit?: number, extend?: Array<string>, columns?: Array, rowActions?: Array<object>, dropZone?: object, upload?: boolean, groupBy?: string, groupLabel?: string, groupLabelResolve?: {register: string, schema: string, labelField?: string}, selectable?: boolean, bulkActions?: Array<object>, sortable?: boolean, facet?: {field: string, label?: string}, rowRoute?: string, prompt?: string, emptyText?: string, viewAllRoute?: string, viewAllQuery?: object}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['created', 'row-click', 'view-all', 'files-dropped'],

	data() {
		return {
			rows: [],
			loading: false,
			error: '',
			/** Server-side total for the resolved filter (drives "View all (N)"). */
			total: 0,
			/** Current 1-based page. Paging is SERVER-side (`_page`). */
			page: 1,
			/** Rows that fit the host cell; null = unconstrained (dashboards). */
			fitRows: null,
			/** Whether the create dialog is open. */
			showCreate: false,
			/** Target schema definition fetched for the create dialog. */
			createSchema: null,
			/**
			 * Depth of nested dragenter/dragleave pairs over the widget.
			 * A single counter, because `dragleave` fires when the pointer
			 * crosses into a CHILD element: tracking a boolean instead makes
			 * the overlay flicker off the moment the drag reaches the table.
			 */
			dragDepth: 0,
			/** Selected row ids (`content.selectable`). Shared across groups. */
			selectedIds: [],
			/**
			 * The active sort, seeded from `content.sort` and overwritten by an
			 * interactive header click (`content.sortable`). Kept as component
			 * state rather than read from `content` directly so a click can
			 * override the manifest-declared default without mutating a prop.
			 */
			localSort: { ...(this.content.sort || {}) },
			/** Facet values currently toggled on (`content.facet`). */
			facetSelected: [],
		}
	},

	computed: {
		/**
		 * The unwrapped detail-page object context for token resolution, or null
		 * on surfaces (dashboards) that don't provide one.
		 *
		 * @return {object|null}
		 */
		objectCtx() {
			const c = this.cnObjectContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * The unwrapped workspace context bag (or null). Vue 2.7 `setup`/inject
		 * may hand back a raw ref; unwrap `.value` so token resolution reads the
		 * plain object.
		 *
		 * @return {object|null}
		 */
		workspaceCtx() {
			const c = this.cnWorkspaceContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		/**
		 * Token-resolution context merged from the detail-page object context
		 * and the page-level workspace bag (`@workspace.<key>`).
		 *
		 * @return {object}
		 */
		tokenCtx() {
			const base = this.objectCtx ? { ...this.objectCtx } : {}
			base.workspace = this.workspaceCtx || {}
			return base
		},
		/**
		 * The filter with every `@`-token resolved against `tokenCtx`, then with
		 * any UNRESOLVED OPTIONAL token (`@workspace.<key>?`) dropped — so an
		 * optional queue filter simply shows all rows until a queue is picked,
		 * while a REQUIRED token (`@workspace.selectedClient`) stays to trigger the
		 * prompt.
		 *
		 * @return {object}
		 */
		resolvedFilter() {
			return dropOptionalUnresolved(resolveFilterTokens(this.content.filter || {}, this.tokenCtx))
		},
		/**
		 * Whether a context-dependent filter token (e.g. `@workspace.selectedClient`)
		 * is still unresolved — the page state this list depends on isn't set yet,
		 * so the list renders a prompt instead of fetching the whole register.
		 *
		 * @return {boolean}
		 */
		waitingForContext() {
			return hasUnresolvedTokens(this.resolvedFilter)
		},
		/**
		 * Prompt shown while a context-bound list has an unresolved REQUIRED
		 * token. A `content.prompt` override always wins. Otherwise the default
		 * is context-aware: the "Select an item to see related records"
		 * master-detail copy only fits a DASHBOARD list waiting on a selection —
		 * on a detail page (an object context is present) that copy is wrong, so
		 * fall back to the neutral "Nothing here yet" (ADR-062).
		 *
		 * @return {string}
		 */
		promptText() {
			if (this.content.prompt) return this.content.prompt
			return this.objectCtx
				? t('nextcloud-vue', 'Nothing here yet')
				: t('nextcloud-vue', 'Select an item to see related records')
		},
		/**
		 * Quiet, status-code-free label shown when a fetch fails. The real
		 * axios error is logged to the console, never rendered (ADR-062).
		 *
		 * @return {string}
		 */
		loadErrorLabel() {
			return this.content.errorText || t('nextcloud-vue', 'Could not load these records')
		},
		/**
		 * Column definitions normalised for CnDataTable. A string column becomes
		 * `{ key, label }`; an object column keeps its key/label AND carries the
		 * presentation hints CnDataTable forwards to CnCellRenderer — `format`
		 * (currency / duration / number / percent / date / date-time), `widget`
		 * (badge / link / swatch), `widgetProps`, `formatter`, `align`, and
		 * `width`. Without this pass-through a `relatedCollections` column's
		 * `format: 'currency'` / `'date'` would silently render as plain text.
		 */
		resolvedColumns() {
			const cols = Array.isArray(this.content.columns) ? this.content.columns : []
			const sortableConfig = this.content.sortable
			const mapped = cols.map((c) => {
				if (typeof c === 'string') {
					return { key: c, label: c }
				}
				const out = { key: c.key, label: c.label || c.key }
				for (const k of ['format', 'widget', 'widgetProps', 'formatter', 'align', 'width', 'type', 'enum', 'sortable']) {
					if (c[k] !== undefined) out[k] = c[k]
				}
				// `content.sortable` (bool = every column, array = the listed
				// keys) fills in `sortable` for a column that did not already
				// say so on its own definition — an explicit `sortable: false`
				// on the column still wins, so one header can opt out of an
				// otherwise sortable list.
				if (out.sortable === undefined && sortableConfig !== undefined) {
					out.sortable = sortableConfig === true
						|| (Array.isArray(sortableConfig) && sortableConfig.includes(out.key))
				}
				return out
			})

			// The registry used to default to `[{ key: 'title' }]`, but plenty of schemas
			// have no `title` — a Barn has `name`. Such a widget rendered a table of
			// em-dashes forever, and nothing told the user why.
			//
			// Don't guess the right key from the data: OpenRegister already guessed, and
			// published the answer as `@self.name`. When NOT ONE configured column
			// resolves on any loaded row, fall back to that single display-name column.
			//
			// Only when none resolve: a partly-matching column set is a deliberate choice
			// (a column can be legitimately empty across the current page of rows), and
			// silently replacing it would override the user.
			if (this.rows.length > 0 && mapped.length > 0) {
				const resolves = mapped.some((c) => this.rows.some((r) => objectFieldValue(r, c.key) !== undefined))
				if (resolves === false) {
					return [{ key: 'name', label: t('nextcloud-vue', 'Name') }]
				}
			}
			return mapped
		},
		/**
		 * Declared per-row actions mapped onto the CnRowActions shape. Every
		 * entry keeps its label, icon and `destructive` flag and routes its
		 * click back through `runRowAction`, so the dispatcher decides what a
		 * type means and this component does not grow a second action
		 * vocabulary.
		 *
		 * @return {Array<object>}
		 */
		mappedRowActions() {
			const declared = Array.isArray(this.content.rowActions) ? this.content.rowActions : []
			return declared
				.filter((a) => a && typeof a === 'object')
				.map((action) => ({
					label: action.label,
					icon: action.icon,
					destructive: action.destructive === true,
					handler: (row) => this.runRowAction(action, row),
				}))
		},
		/**
		 * The declared drop-zone action, or null. A widget without the key
		 * takes no part in a drag at all.
		 *
		 * @return {object|null}
		 */
		dropZoneAction() {
			const dz = this.content.dropZone
			return (dz && typeof dz === 'object') ? dz : null
		},
		/** Whether a file drag is currently over a drop-enabled widget. */
		dropping() {
			return this.dropZoneAction !== null && this.dragDepth > 0
		},
		/** Copy shown on the drop overlay (overridable via `dropZone.label`). */
		dropLabel() {
			return (this.dropZoneAction && this.dropZoneAction.label)
				|| t('nextcloud-vue', 'Drop files here')
		},
		/**
		 * Whether the click-to-pick upload button renders: a `dropZone` is
		 * declared and the host has not opted out with `content.upload: false`.
		 *
		 * @return {boolean}
		 */
		showUploadButton() {
			return this.dropZoneAction !== null && this.content.upload !== false
		},
		/** Pre-translated Upload label (overridable via `content.uploadLabel`). */
		uploadLabel() {
			return this.content.uploadLabel || t('nextcloud-vue', 'Upload')
		},
		/**
		 * Declared bulk actions mapped onto the same `{label, icon, destructive,
		 * handler}` shape `mappedRowActions` uses, so CnRowActions and the bulk
		 * bar render identically — the only difference is what `handler` does:
		 * a row action dispatches with one row, a bulk action with the whole
		 * selection.
		 *
		 * @return {Array<object>}
		 */
		mappedBulkActions() {
			const declared = Array.isArray(this.content.bulkActions) ? this.content.bulkActions : []
			return declared
				.filter((a) => a && typeof a === 'object')
				.map((action) => ({
					label: action.label,
					icon: action.icon,
					destructive: action.destructive === true,
					handler: () => this.runBulkAction(action),
				}))
		},
		/**
		 * The currently selected row objects, resolved from `rows` (not just
		 * the visible/faceted slice) so a selection made before a facet filter
		 * narrows the view is not silently dropped from a bulk action.
		 *
		 * @return {Array<object>}
		 */
		selectedRows() {
			return this.rows.filter((row) => this.selectedIds.includes(row.id))
		},
		/**
		 * Distinct values of `content.facet.field` across the currently loaded
		 * rows, flattening an array-valued field (the "keywords across the
		 * dossier" shape this seam was measured against). Sorted for a stable
		 * chip order run to run.
		 *
		 * @return {Array<string>}
		 */
		facetOptions() {
			const facet = this.content.facet
			if (!facet || !facet.field) return []
			const values = new Set()
			for (const row of this.visibleRows) {
				const raw = objectFieldValue(row, facet.field)
				const list = Array.isArray(raw) ? raw : (raw !== undefined && raw !== null && raw !== '' ? [raw] : [])
				for (const v of list) {
					if (v !== undefined && v !== null && v !== '') values.add(v)
				}
			}
			return Array.from(values).sort()
		},
		/** Pre-translated facet label (`content.facet.label`, falls back to a generic "Filter"). */
		facetLabel() {
			const facet = this.content.facet
			return (facet && facet.label) || t('nextcloud-vue', 'Filter')
		},
		/**
		 * Rows narrowed by the selected facet values. A row matches when at
		 * least one of its (possibly array) values at `facet.field` is among
		 * `facetSelected` — no selection means no narrowing at all.
		 *
		 * @return {Array<object>}
		 */
		facetedRows() {
			const facet = this.content.facet
			if (!facet || !facet.field || this.facetSelected.length === 0) return this.visibleRows
			return this.visibleRows.filter((row) => {
				const raw = objectFieldValue(row, facet.field)
				const list = Array.isArray(raw) ? raw : (raw !== undefined && raw !== null ? [raw] : [])
				return list.some((v) => this.facetSelected.includes(v))
			})
		},
		/**
		 * Whether the fetch returned rows but the active facet selection
		 * matches none of them — the "clear filter" empty state, distinct
		 * from "there are no items at all".
		 *
		 * @return {boolean}
		 */
		showNoFacetMatchState() {
			return !this.loading && this.rows.length > 0 && this.facetSelected.length > 0 && this.facetedRows.length === 0
		},
		/** Whether `content.groupBy` is declared, so the template picks the grouped render path. */
		isGrouped() {
			return typeof this.content.groupBy === 'string' && this.content.groupBy !== ''
		},
		/**
		 * `content.groupLabelResolve` (`{register, schema, labelField?}`), or
		 * null. When set, the group heading resolves `group.key` through the
		 * shared object store instead of reading a plain field off the row —
		 * for a `groupBy` whose human label lives a hop further than `extend`
		 * inlined (a reference's own reference, e.g. grouping documents by
		 * type when only the document itself, not its type, was extended).
		 *
		 * @return {{register: string, schema: string, labelField?: string}|null}
		 */
		groupLabelResolveConfig() {
			const cfg = this.content.groupLabelResolve
			return (cfg && typeof cfg === 'object' && cfg.register && cfg.schema) ? cfg : null
		},
		/**
		 * The faceted rows bucketed by `content.groupBy`, one entry per
		 * distinct value in first-seen order (matching how the rows already
		 * arrived — server-sorted). A `$ref` group key that resolves to an
		 * object (an `extend`-inlined reference) groups by its `id`, so
		 * `groupBy: 'informatieobjecttype'` groups the actual referenced
		 * objects rather than one group per string-ified object.
		 *
		 * @return {Array<{key: string, label: string, rows: Array<object>}>}
		 */
		groupedRows() {
			if (!this.isGrouped) return []
			const field = this.content.groupBy
			const labelField = this.content.groupLabel || field
			const order = []
			const byKey = new Map()
			for (const row of this.facetedRows) {
				const rawKey = objectFieldValue(row, field)
				const key = (rawKey && typeof rawKey === 'object')
					? (rawKey.id || JSON.stringify(rawKey))
					: String(rawKey ?? '')
				if (!byKey.has(key)) {
					const rawLabel = objectFieldValue(row, labelField)
					const label = (rawLabel && typeof rawLabel === 'object')
						? (rawLabel.title || rawLabel.name || key)
						: (rawLabel || key || t('nextcloud-vue', 'Ungrouped'))
					byKey.set(key, { key, label, rows: [] })
					order.push(key)
				}
				byKey.get(key).rows.push(row)
			}
			return order.map((key) => byKey.get(key))
		},
		/** Empty-state text (overridable via `content.emptyText`). */
		emptyText() {
			return this.content.emptyText || t('nextcloud-vue', 'No items')
		},
		/**
		 * The empty-state text run through the host translate function. Used
		 * only by this component's OWN empty state — the raw `emptyText`
		 * still goes to CnDataTable, which translates at its own render
		 * boundary, so the string is never translated twice.
		 *
		 * @return {string}
		 */
		resolvedEmptyText() {
			const fn = typeof this.cnTranslate === 'function' ? this.cnTranslate : (k) => k
			return this.emptyText ? fn(this.emptyText) : this.emptyText
		},
		/**
		 * The rows actually rendered: capped to what fits the host grid cell
		 * (ADR-062 — content adapts to the cell, never a nested scrollbar).
		 * Unconstrained on surfaces without a fixed-height cell (dashboards
		 * measure null and render every fetched row, as before).
		 *
		 * @return {Array<object>}
		 */
		visibleRows() {
			return this.fitRows ? this.rows.slice(0, this.fitRows) : this.rows
		},
		/**
		 * Rows per page. This is `content.limit` (the fetch cap) — a FIXED
		 * number, deliberately not the measured `fitRows`: a page size derived
		 * from a post-render measurement would change the pagination under the
		 * reader every time the tile resized, and would need a refetch to
		 * settle.
		 *
		 * @return {number}
		 */
		pageSize() {
			return Number((this.content || {}).limit) || 25
		},
		/**
		 * Total pages for the resolved filter, from the SERVER's total.
		 *
		 * @return {number}
		 */
		totalPages() {
			return Math.max(Math.ceil((this.total || 0) / this.pageSize), 1)
		},
		/**
		 * Whether the compact pager renders.
		 *
		 * Two conditions, and the second is the load-bearing one. There must
		 * be more than one page (otherwise there is nothing to page), AND the
		 * cell must be able to show a whole page — because `visibleRows` clips
		 * the page to what fits, and a pager over clipped rows would claim to
		 * be showing "1–25 of 137" while five rows are on screen. On a cell
		 * that short the existing fit-to-cell "View all" is the honest answer.
		 *
		 * @return {boolean}
		 */
		showPager() {
			if (this.totalPages <= 1) return false
			return this.fitRows === null || this.fitRows >= this.rows.length
		},
		/** Whether the designed empty state is what the widget is showing. */
		showingEmptyState() {
			return !this.waitingForContext && !this.error && !this.loading && this.rows.length === 0
		},
		/**
		 * How many matching objects are NOT rendered (server total minus the
		 * visible slice). Drives the "View all (N)" footer.
		 *
		 * @return {number}
		 */
		hiddenCount() {
			return Math.max((this.total || this.rows.length) - this.visibleRows.length, 0)
		},
		/** Pre-translated "View all (N)" footer label. */
		viewAllLabel() {
			return t('nextcloud-vue', 'View all ({total})', { total: this.total || this.rows.length })
		},
		/** Pre-translated "+N more" footer label (no viewAllRoute configured). */
		moreLabel() {
			return t('nextcloud-vue', '+{count} more', { count: this.hiddenCount })
		},
		/** Whether the create affordance renders (on by default; `content.allowCreate: false` opts out). */
		allowCreate() {
			const c = this.content || {}
			return c.allowCreate !== false && Boolean(c.register) && Boolean(c.schema)
		},

		/**
		 * NcDialog size for the create dialog (`content.formSize`).
		 *
		 * The widget fetches the WHOLE schema to build this form, so a list
		 * scoped to a handful of columns still opened a create dialog asking
		 * every property the schema declares — at `normal` width, in one
		 * column. A case schema with thirty visible properties is unusable
		 * that way, and every consumer that hit it worked around it by
		 * turning the create button off.
		 */
		formSize() {
			const c = this.content || {}
			return c.formSize || 'normal'
		},

		/** How many columns the create dialog flows its fields into (`content.formColumns`). */
		formColumns() {
			const c = this.content || {}
			return c.formColumns === 2 ? 2 : 1
		},

		/** Whitelist of fields the create dialog asks for (`content.formIncludeFields`). Null means all. */
		formIncludeFields() {
			const c = this.content || {}
			return Array.isArray(c.formIncludeFields) ? c.formIncludeFields : null
		},

		/** Fields the create dialog leaves out (`content.formExcludeFields`). */
		formExcludeFields() {
			const c = this.content || {}
			return Array.isArray(c.formExcludeFields) ? c.formExcludeFields : []
		},

		/** Per-field overrides for the create dialog (`content.formFieldOverrides`). */
		formFieldOverrides() {
			const c = this.content || {}
			return (c.formFieldOverrides && typeof c.formFieldOverrides === 'object') ? c.formFieldOverrides : {}
		},
		/** Pre-translated Add label (overridable via `content.addLabel`). */
		addLabel() {
			return this.content.addLabel || t('nextcloud-vue', 'Add')
		},
		/** Stable signature of the query so the watcher only refetches on real change. */
		sourceKey() {
			const c = this.content || {}
			return JSON.stringify({
				register: c.register || '',
				schema: c.schema || '',
				// The RESOLVED filter (workspace + object tokens applied) so the
				// watcher refetches when page-level state a token reads changes.
				filter: this.resolvedFilter,
				// `localSort`, not `c.sort` — an interactive header click
				// (`content.sortable`) overrides the manifest default without
				// touching the prop, and the fetch must follow that override.
				sort: this.localSort || {},
				limit: c.limit || 25,
				objectId: this.objectCtx ? this.objectCtx.objectId : null,
			})
		},
	},

	watch: {
		sourceKey() {
			// The query changed, so page 3 of the OLD result set means nothing
			// against the new one — and an out-of-range `_page` returns an empty
			// list, which would read as "no matches" rather than "wrong page".
			this.page = 1
			this.fetchRows()
		},
	},

	mounted() {
		this.fetchRows()
		// Re-read on a page-level refresh. This list fetches its own rows from
		// OpenRegister and subscribed to nothing, so after a write elsewhere on
		// the page it went on rendering the result set it fetched on mount —
		// values the backend had already changed. The endpoint-bound widgets
		// have answered this channel since Wave 2 (useEndpointSource); the
		// store-backed ones did not.
		//
		// Guarded on `loading`: the channel is a broadcast, and a page whose
		// action fires it more than once (or a dialog that emits alongside the
		// page's own Refresh) must not turn one write into a queue of
		// overlapping reads for one list.
		this._onPageRefresh = () => {
			if (this.loading) return
			this.fetchRows()
		}
		subscribe(PAGE_REFRESH_CHANNEL, this._onPageRefresh)
		// Observe the host grid cell so the visible row count re-fits on
		// resize/layout changes. Only detail-grid cells constrain height;
		// on dashboards the closest() lookup misses and fitRows stays null.
		const cell = this.$el.closest && this.$el.closest('.grid-stack-item-content')
		if (cell && typeof ResizeObserver !== 'undefined') {
			this._fitObserver = new ResizeObserver(() => this.measureFit())
			this._fitObserver.observe(cell)
		}
		this.$nextTick(() => this.measureFit())
	},

	beforeUnmount() {
		if (this._onPageRefresh) {
			unsubscribe(PAGE_REFRESH_CHANNEL, this._onPageRefresh)
			this._onPageRefresh = null
		}
		if (this._fitObserver) this._fitObserver.disconnect()
	},

	methods: {
		/**
		 * Fetch the object rows from OpenRegister. Lazily imports the
		 * axios/router helpers (the library never hard-depends on them at module
		 * load — same pattern as CnStatWidget / CnFilesWidget).
		 *
		 * @return {Promise<void>}
		 */
		async fetchRows() {
			const c = this.content || {}
			if (!c.register || !c.schema) {
				this.rows = []
				this.error = ''
				return
			}
			// A context token this list depends on (e.g. @workspace.selectedClient)
			// isn't set yet — don't fetch the whole register; the prompt shows.
			if (this.waitingForContext) {
				this.rows = []
				this.error = ''
				return
			}
			this.loading = true
			this.error = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{register}/{schema}',
					{ register: c.register, schema: c.schema },
				)
				// `limit` is a FETCH CAP (ADR-062), not a render promise — the
				// visible count fits the cell; fetch enough to fill big cells.
				// It doubles as the PAGE SIZE: one fetch is exactly one page, so
				// the pager's "1–25 of 137" is the server's arithmetic and not a
				// client-side count of an already-capped window.
				const params = { _limit: this.pageSize, _page: this.page }
				if (this.localSort && this.localSort.field) {
					params[`_order[${this.localSort.field}]`] = (this.localSort.dir === 'desc' ? 'desc' : 'asc')
				}
				// `content.extend` → OpenRegister's repeated `_extend[]`. axios
				// serializes an array value as `_extend[]=a&_extend[]=b`, which
				// is the wire form OR reads. This is what turns a dotted column
				// key into a real value: the referenced object is inlined on the
				// row, so `informatieobject.title` resolves instead of reading a
				// uuid string as an object path.
				if (Array.isArray(c.extend)) {
					const extend = c.extend.filter((e) => typeof e === 'string' && e !== '')
					if (extend.length > 0) params._extend = extend
				}
				// The OpenRegister OBJECT-SEARCH endpoint filters on DIRECT field
				// params (`status=open`, `value[gt]=30000`) — unlike the
				// aggregation endpoints which use the nested `filter[...]` shape.
				const filter = this.resolvedFilter
				if (filter && typeof filter === 'object') {
					for (const [k, v] of Object.entries(filter)) {
						if (v && typeof v === 'object') {
							for (const [op, ov] of Object.entries(v)) params[`${k}[${op}]`] = ov
						} else if (v !== '' && v !== null && v !== undefined) {
							params[k] = v
						}
					}
				}
				const res = await axios.get(url, { params })
				this.rows = (res && res.data && res.data.results) || []
				this.total = (res && res.data && typeof res.data.total === 'number') ? res.data.total : this.rows.length
				this.$nextTick(() => this.measureFit())
			} catch (e) {
				// Keep the raw message OUT of the template — log it for
				// debugging, surface only the quiet `loadErrorLabel` line.
				// eslint-disable-next-line no-console
				console.warn('[CnObjectListWidget] failed to load objects:', e)
				this.error = (e && e.message) || 'error'
				this.rows = []
				this.total = 0
			} finally {
				this.loading = false
			}
		},

		/**
		 * Fit the visible row count to the host grid cell (ADR-062 — the cell
		 * is the budget). Measures the cell's remaining height below the table
		 * top, reserves room for the "View all" footer, and derives the row
		 * budget from the first rendered row's height. No-ops (fitRows null =
		 * render all fetched rows) outside a fixed-height cell.
		 *
		 * @return {void}
		 */
		measureFit() {
			const cell = this.$el && this.$el.closest && this.$el.closest('.grid-stack-item-content')
			if (!cell) { this.fitRows = null; return }
			const table = this.$el.querySelector('.cn-object-list-widget__table table')
			if (!table) return
			const cellRect = cell.getBoundingClientRect()
			const tableRect = table.getBoundingClientRect()
			const firstRow = table.querySelector('tbody tr')
			const rowH = (firstRow && firstRow.getBoundingClientRect().height) || 44
			const head = table.querySelector('thead')
			const headH = (head && head.getBoundingClientRect().height) || 40
			// Room for the "View all" footer AND the Add button (ADR-062).
			const footerReserve = 68
			const available = cellRect.bottom - tableRect.top - footerReserve
			const fit = Math.floor((available - headH) / rowH)
			this.fitRows = Math.max(fit, 1)
		},

		/**
		 * Open the create dialog for the list's target schema. PUBLIC — the
		 * host card's Actions-menu "Add" entry calls this through a ref, the
		 * widget's own footer button calls it directly (ADR-062: both
		 * affordances, one dialog).
		 *
		 * @return {Promise<void>}
		 */
		async openCreate() {
			const c = this.content || {}
			if (!c.schema) return
			try {
				if (!this.createSchema) {
					const [{ default: axios }, { generateUrl }] = await Promise.all([
						import('@nextcloud/axios'),
						import('@nextcloud/router'),
					])
					const url = generateUrl('/apps/openregister/api/schemas/{sch}', { sch: c.schema })
					const res = await axios.get(url)
					this.createSchema = (res && res.data) || null
				}
				this.showCreate = true
			} catch (e) {
				this.error = (e && e.message) || 'error'
			}
		},

		/**
		 * Persist the create-dialog form: the resolved scalar filter values
		 * are merged in as defaults (an FK-scoped list creates PRE-LINKED
		 * children — a task added on a case detail already carries the case).
		 *
		 * @param {object} formData Confirmed form values.
		 * @return {Promise<void>}
		 */
		async onCreateConfirm(formData) {
			const c = this.content || {}
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const payload = { ...formData }
				const filter = this.resolvedFilter || {}
				for (const [k, v] of Object.entries(filter)) {
					if (v && typeof v !== 'object' && (payload[k] === undefined || payload[k] === null || payload[k] === '')) {
						payload[k] = v
					}
				}
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', { register: c.register, schema: c.schema })
				await axios.post(url, payload)
				if (this.$refs.createDialog) this.$refs.createDialog.setResult({ success: true })
				/**
				 * @event created Emitted after a successful create with the sent payload.
				 * @type {object}
				 */
				this.$emit('created', payload)
				this.fetchRows()
			} catch (e) {
				if (this.$refs.createDialog) this.$refs.createDialog.setResult({ error: (e && e.message) || 'error' })
			}
		},

		/**
		 * "View all (N)" footer click: emits `view-all` and, when the content
		 * blob names a `viewAllRoute`, navigates there with `viewAllQuery`
		 * (its values token-resolved, so `{"case": "@objectId"}` carries the
		 * current object scope into the target index page).
		 *
		 * @return {void}
		 */
		/**
		 * Pager click — refetch that page from the server. Paging is never
		 * client-side over an already-capped window: that would silently drop
		 * every row past the cap while still displaying a total that counted
		 * them.
		 *
		 * @param {number} next The 1-based page to load.
		 * @return {void}
		 */
		onPageChange(next) {
			const target = Math.min(Math.max(Number(next) || 1, 1), this.totalPages)
			if (target === this.page) return
			this.page = target
			this.fetchRows()
		},

		onViewAll() {
			/**
			 * @event view-all Emitted when the "View all (N)" footer is clicked.
			 * @type {{ total: number }}
			 */
			this.$emit('view-all', { total: this.total })
			const route = this.content.viewAllRoute
			if (route && this.$router) {
				const query = resolveFilterTokens(this.content.viewAllQuery || {}, this.tokenCtx)
				this.$router.push({ name: route, query }).catch(() => {})
			}
		},

		/**
		 * Navigate to a configured detail route on row click (when `rowRoute`
		 * is set and a router is available).
		 *
		 * @param {object} row The clicked object row.
		 * @return {void}
		 */
		onRowClick(row) {
			const route = this.content.rowRoute
			const id = row && (row.id || (row['@self'] && row['@self'].id))
			if (route && id && this.$router) {
				this.$router.push({ name: route, params: { id } }).catch(() => {})
			}
			/**
			 * @event row-click Emitted with the clicked object (for hosts that
			 * want to handle navigation themselves).
			 * @type {object}
			 */
			this.$emit('row-click', row)
		},

		/**
		 * Dispatch one declared action. Non-`handler` types go through as
		 * declared; a `handler` action gets the row appended as its last
		 * argument, the same convention CnWidgetObjectTable uses, so a
		 * registry function reads its row from where it already expects one.
		 *
		 * @param {object} action The declared action.
		 * @param {object|null} row The row the action was triggered on.
		 * @return {void}
		 */
		runRowAction(action, row) {
			this.dispatch(action, [row])
		},

		/**
		 * Dispatch a declared action through the page's pre-bound dispatcher,
		 * falling back to a bare `dispatchAction` when this widget is mounted
		 * outside a CnPageRenderer tree.
		 *
		 * `extraArgs` is appended to a `handler` action's `args`; it is NOT
		 * merged into any other type, because only `handler` has an argument
		 * list. A drop's `File[]` additionally rides an `open-modal` action's
		 * `props.files`, since that is how a modal receives anything at all.
		 *
		 * @param {object} action The declared action.
		 * @param {Array} extraArgs Arguments appended for a `handler` action.
		 * @param {object} extraProps Props merged for an `open-modal` action.
		 * @return {void}
		 */
		dispatch(action, extraArgs = [], extraProps = {}) {
			if (!action || typeof action !== 'object') return
			const type = action.type || 'handler'
			let wrapped = action
			if (type === 'handler') {
				wrapped = { ...action, args: [...(action.args || []), ...extraArgs] }
			} else if (type === 'open-modal' && Object.keys(extraProps).length > 0) {
				wrapped = { ...action, props: { ...(action.props || {}), ...extraProps } }
			}
			if (typeof this.cnDispatchAction === 'function') {
				this.cnDispatchAction(wrapped)
			} else {
				dispatchAction(wrapped, { router: this.$router || null })
			}
		},

		/**
		 * Whether a drag event is carrying files. A drag of text or of a row
		 * from another table is not a file drop and must not paint the
		 * overlay; `dataTransfer.types` is the only thing readable during a
		 * dragover (the items themselves are not).
		 *
		 * @param {DragEvent} event The drag event.
		 * @return {boolean}
		 */
		dragHasFiles(event) {
			const types = event && event.dataTransfer && event.dataTransfer.types
			if (!types) return false
			return Array.prototype.indexOf.call(types, 'Files') !== -1
		},

		/**
		 * @param {DragEvent} event The drag event.
		 * @return {void}
		 */
		onDragEnter(event) {
			if (!this.dropZoneAction || !this.dragHasFiles(event)) return
			event.preventDefault()
			this.dragDepth += 1
		},

		/**
		 * `dragover` must preventDefault or the browser refuses the drop and
		 * navigates to the file instead.
		 *
		 * @param {DragEvent} event The drag event.
		 * @return {void}
		 */
		onDragOver(event) {
			if (!this.dropZoneAction || !this.dragHasFiles(event)) return
			event.preventDefault()
		},

		/**
		 * Leaving one element of the widget. The event is not read: a
		 * `dragleave` fires for the widget AND for every child crossed, so the
		 * counter — not this event — decides whether the drag is still over us.
		 *
		 * @return {void}
		 */
		onDragLeave() {
			if (!this.dropZoneAction) return
			this.dragDepth = Math.max(0, this.dragDepth - 1)
		},

		/**
		 * Hand the dropped files to the declared `dropZone` action. Nothing is
		 * uploaded here: this component reads no file content and calls no
		 * write endpoint, so whoever receives the files decides where they go
		 * — the same split the form file field keeps.
		 *
		 * @param {DragEvent} event The drop event.
		 * @return {void}
		 */
		onDrop(event) {
			if (!this.dropZoneAction) return
			if (!this.dragHasFiles(event)) { this.dragDepth = 0; return }
			event.preventDefault()
			this.dragDepth = 0
			const files = Array.from((event.dataTransfer && event.dataTransfer.files) || [])
			if (files.length === 0) return
			/**
			 * @event files-dropped Emitted with the dropped files, for a host
			 * that wants to handle the drop itself rather than declare an action.
			 * @type {Array<File>}
			 */
			this.$emit('files-dropped', files)
			this.dispatch(this.dropZoneAction, [files], { files })
		},

		/**
		 * Open the native file picker for the click-to-upload button — the
		 * same `dropZoneAction` a drop dispatches, so a reader who never drags
		 * a file reaches the identical outcome.
		 *
		 * @return {void}
		 */
		triggerUpload() {
			if (this.$refs.uploadInput) this.$refs.uploadInput.click()
		},

		/**
		 * Handle files chosen via the upload button's file picker.
		 *
		 * @param {Event} event The change event.
		 * @return {void}
		 */
		onUploadFilesSelected(event) {
			const files = Array.from((event.target && event.target.files) || [])
			if (files.length === 0 || !this.dropZoneAction) return
			this.$emit('files-dropped', files)
			this.dispatch(this.dropZoneAction, [files], { files })
			event.target.value = ''
		},

		/**
		 * CnDataTable's `select` handler — replaces the whole selected-ids
		 * array (it already computed the add/remove/select-all arithmetic).
		 *
		 * @param {Array<string>} ids The new selection.
		 * @return {void}
		 */
		onSelect(ids) {
			this.selectedIds = Array.isArray(ids) ? ids : []
		},

		/**
		 * Clear the current selection. Called after a bulk action fires, and
		 * from the bulk bar's own "Clear selection" button.
		 *
		 * @return {void}
		 */
		clearSelection() {
			this.selectedIds = []
		},

		/**
		 * Dispatch a declared bulk action against the current selection, then
		 * clear it — the action owns its own success/error feedback and page
		 * refresh (same convention as a row action), this widget only owns the
		 * checkbox state.
		 *
		 * @param {object} action The declared bulk action.
		 * @return {void}
		 */
		runBulkAction(action) {
			this.dispatch(action, [this.selectedRows], { selectedIds: [...this.selectedIds] })
			this.clearSelection()
		},

		/**
		 * CnDataTable's `sort` handler for an interactively-sortable column
		 * (`content.sortable`). Overwrites `localSort`, which both the fetch
		 * params and the table's own sort-indicator props read — a cleared
		 * sort (`key: null`, a third click on a two-state header) goes back to
		 * the unordered default rather than sticking on the last field.
		 *
		 * @param {{key: string|null, order: string|null}} payload The new sort.
		 * @return {void}
		 */
		onSort({ key, order }) {
			this.localSort = key ? { field: key, dir: order || 'asc' } : {}
		},

		/**
		 * Toggle one facet value on/off (`content.facet`).
		 *
		 * @param {string} value The facet value clicked.
		 * @return {void}
		 */
		toggleFacetValue(value) {
			const index = this.facetSelected.indexOf(value)
			if (index === -1) {
				this.facetSelected = [...this.facetSelected, value]
			} else {
				this.facetSelected = this.facetSelected.filter((v) => v !== value)
			}
		},

		/**
		 * Clear the facet filter, so every loaded row shows again.
		 *
		 * @return {void}
		 */
		clearFacet() {
			this.facetSelected = []
		},
	},
}
</script>

<style scoped>
/* The widget already lives inside CnWidgetWrapper's padded card chrome. The
   table is rendered `borderless` so CnDataTable drops its own border/shadow/
   background AND its bottom margin (the `.cn-table-container--borderless`
   modifier) — otherwise it reads as a card-in-a-card with dead space below.
   Horizontal overflow is owned by `.cn-table-container` (overflow-x: auto); a
   second scroll container here would produce a nested scrollbar, so this host
   stays plain. */
.cn-object-list-widget {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

/* The overlay covers the widget while a file drag is over it. `position:
   relative` is set only in the dropping state so a widget without a drop zone
   keeps the containing block it had — an unconditional rule here would
   re-parent any absolutely-positioned descendant a host has placed. */
.cn-object-list-widget--dropping {
	position: relative;
}

.cn-object-list-widget__drop-overlay {
	position: absolute;
	inset: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: var(--cn-spacing-m, 12px);
	border: 2px dashed var(--color-primary-element);
	border-radius: var(--border-radius-large, 12px);
	background-color: var(--color-primary-element-light);
	color: var(--color-main-text);
	/* The overlay is a painted state, not a target: letting it swallow the
	   pointer would fire dragleave the instant it appeared under the cursor,
	   and the drop would land on nothing. */
	pointer-events: none;
}

.cn-object-list-widget__table {
	flex: 1 1 auto;
	min-height: 0;
	overflow: hidden;
}

/* The empty state is CnWidgetEmptyState now — it brings its own layout, so
   all this rule still owns is letting it claim the cell's leftover height
   (ADR-062: it fits the cell, it never forces one). */
.cn-object-list-widget__empty {
	flex: 1 1 auto;
	min-height: 0;
}

/* The pager sits flush at the bottom of the card, above "View all". */
.cn-object-list-widget__pager {
	flex-shrink: 0;
}

.cn-object-list-widget__view-all {
	align-self: flex-start;
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	margin-top: 4px;
	padding: 4px;
}

.cn-object-list-widget__view-all:hover,
.cn-object-list-widget__view-all:focus-visible {
	text-decoration: underline;
}

.cn-object-list-widget__more {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 4px 0 0;
	padding: 4px;
}

/* Footer Add — same pattern as the integration leaves' footer action
   ("Open in Calendar"): full-width, centered, divider-topped, pinned to
   the card bottom. */
.cn-object-list-widget__add {
	align-self: stretch;
	background: none;
	border: none;
	border-top: 1px solid var(--color-border);
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	font-weight: 600;
	/* Bleed through the host card's 16px content padding so the divider
	   spans edge-to-edge, exactly like the integration leaves' footer.
	   !important: Nextcloud server ships `#app-content button { margin:
	   3px … }` — an id-selector rule no scoped class can outrank. */
	margin: auto -16px -16px !important;
	padding: 12px 8px;
	text-align: center;
}

.cn-object-list-widget__add:hover,
.cn-object-list-widget__add:focus-visible {
	text-decoration: underline;
}

.cn-object-list-widget__error {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	margin: 4px 0 0;
}

.cn-object-list-widget__prompt {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	padding: 16px 4px;
	margin: 0;
	text-align: center;
}

.cn-object-list-widget__facet {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	padding: 0 4px 8px;
}

.cn-object-list-widget__facet-label {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-weight: 600;
}

.cn-object-list-widget__facet-chip {
	background-color: var(--color-background-hover);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-pill, 16px);
	color: var(--color-main-text);
	cursor: pointer;
	font: inherit;
	font-size: 0.85em;
	padding: 2px 10px;
}

.cn-object-list-widget__facet-chip--active {
	background-color: var(--color-primary-element-light);
	border-color: var(--color-primary-element);
	color: var(--color-primary-element-text, var(--color-main-text));
}

.cn-object-list-widget__facet-clear,
.cn-object-list-widget__bulk-clear {
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	font: inherit;
	font-size: 0.85em;
	padding: 2px 4px;
}

.cn-object-list-widget__facet-clear:hover,
.cn-object-list-widget__bulk-clear:hover {
	text-decoration: underline;
}

.cn-object-list-widget__bulk-bar {
	align-items: center;
	background-color: var(--color-primary-element-light);
	border-radius: var(--border-radius, 8px);
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0 0 8px;
	padding: 6px 10px;
}

.cn-object-list-widget__bulk-count {
	font-weight: 600;
}

.cn-object-list-widget__bulk-action {
	background-color: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 8px);
	cursor: pointer;
	font: inherit;
	padding: 4px 10px;
}

.cn-object-list-widget__bulk-action--destructive {
	border-color: var(--color-error);
	color: var(--color-error);
}

.cn-object-list-widget__groups {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 0;
	overflow: auto;
}

.cn-object-list-widget__group-heading {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	font-weight: 600;
	margin: 0 0 4px;
	text-transform: uppercase;
}

.cn-object-list-widget__upload {
	background-color: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 8px);
	cursor: pointer;
	font: inherit;
	margin: 8px 0 0;
	padding: 6px 12px;
}

.cn-object-list-widget__upload-input {
	display: none;
}
</style>
