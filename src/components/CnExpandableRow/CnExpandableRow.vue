<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnExpandableRow — one index row that opens to a sub-table.

  Closed, the row shows the object's title, an optional badge, its
  description, a list field as chips joined by a separator, and a meta line.
  Open, the chips give way to the same list as a table, with an optional note
  and a footer action under it. Header buttons and the footer action emit
  `action` with their id; the host runs them (CnIndexPage `expandableRows`).
-->
<template>
	<section class="cn-expandable-row" :class="{ 'cn-expandable-row--open': isOpen }" data-testid="cn-expandable-row">
		<div class="cn-expandable-row__head">
			<button
				type="button"
				class="cn-expandable-row__toggle"
				:aria-expanded="isOpen ? 'true' : 'false'"
				:aria-label="toggleLabel"
				data-testid="cn-expandable-row-toggle"
				@click="isOpen = !isOpen">
				<ChevronDown :size="20" class="cn-expandable-row__chevron" />
			</button>
			<div class="cn-expandable-row__main">
				<div class="cn-expandable-row__title-line">
					<h3 class="cn-expandable-row__title" data-testid="cn-expandable-row-title">
						{{ title }}
					</h3>
					<CnStatusBadge
						v-if="badge"
						class="cn-expandable-row__badge"
						:label="badge"
						variant="primary"
						data-testid="cn-expandable-row-badge" />
				</div>
				<p v-if="description" class="cn-expandable-row__description" data-testid="cn-expandable-row-description">
					{{ description }}
				</p>
				<div v-if="!isOpen && chips.length > 0" class="cn-expandable-row__chips" data-testid="cn-expandable-row-chips">
					<template v-for="(chip, index) in chips" :key="chip.key">
						<span v-if="index > 0" class="cn-expandable-row__separator" aria-hidden="true">
							<ChevronRight :size="16" />
						</span>
						<CnStatusBadge class="cn-expandable-row__chip" :label="chip.label" :variant="chip.variant" />
					</template>
				</div>
				<p v-if="meta" class="cn-expandable-row__meta" data-testid="cn-expandable-row-meta">
					{{ meta }}
				</p>
			</div>
			<div class="cn-expandable-row__actions">
				<NcButton
					v-for="button in buttons"
					:key="button.action"
					variant="secondary"
					:data-testid="`cn-expandable-row-button-${button.action}`"
					@click="emitAction(button.action)">
					<template v-if="button.icon" #icon>
						<CnIcon :name="button.icon" :size="16" />
					</template>
					{{ tr(button.label || button.action) }}
				</NcButton>
				<!-- @slot actions Extra controls after the header buttons. Scope: `{ row }`. -->
				<slot name="actions" :row="object" />
			</div>
		</div>
		<div v-if="isOpen && table" class="cn-expandable-row__body">
			<table class="cn-expandable-row__table" data-testid="cn-expandable-row-table">
				<thead>
					<tr>
						<th v-if="reorder" scope="col" class="cn-expandable-row__handle-head">
							<span class="hidden-visually">{{ t('nextcloud-vue', 'Move') }}</span>
						</th>
						<th
							v-for="(column, c) in table.columns"
							:key="c"
							scope="col"
							:aria-sort="sortIndex === c ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined">
							<span v-if="sortableAt(c) || filterableAt(c)" class="cn-expandable-row__th">
								<button
									v-if="sortableAt(c)"
									type="button"
									class="cn-expandable-row__sort"
									:class="{ 'cn-expandable-row__sort--active': sortIndex === c, 'cn-expandable-row__sort--desc': sortIndex === c && sortDir === 'desc' }"
									data-testid="cn-expandable-row-sort"
									@click="toggleSort(c)">
									{{ tr(column.label || '') }}
									<ChevronDown :size="14" class="cn-expandable-row__sort-icon" />
								</button>
								<template v-else>{{ tr(column.label || '') }}</template>
								<span v-if="filterableAt(c)" class="cn-expandable-row__filter-anchor">
									<button
										type="button"
										class="cn-expandable-row__filter"
										:class="{ 'cn-expandable-row__filter--active': isFiltered(c) }"
										aria-haspopup="dialog"
										:aria-expanded="filterOpen === c ? 'true' : 'false'"
										:aria-pressed="isFiltered(c) ? 'true' : 'false'"
										:aria-label="t('nextcloud-vue', 'Filter on {name}', { name: tr(column.label || '') })"
										:title="t('nextcloud-vue', 'Filter on {name}', { name: tr(column.label || '') })"
										data-testid="cn-expandable-row-filter"
										@click="filterOpen = filterOpen === c ? null : c">
										<FilterOutline :size="14" />
									</button>
									<span
										v-if="filterOpen === c"
										role="dialog"
										class="cn-expandable-row__filter-panel"
										:aria-label="t('nextcloud-vue', 'Filter on {name}', { name: tr(column.label || '') })"
										@keydown.esc="filterOpen = null">
										<label
											v-for="value in valuesOf(c)"
											:key="value"
											class="cn-expandable-row__filter-option"
											data-testid="cn-expandable-row-filter-option">
											<input
												type="checkbox"
												:checked="isChosen(c, value)"
												@change="toggleValue(c, value, $event.target.checked)">
											{{ value === '' ? t('nextcloud-vue', '(empty)') : value }}
										</label>
										<button
											type="button"
											class="cn-expandable-row__filter-clear"
											data-testid="cn-expandable-row-filter-clear"
											@click="clearFilter(c)">
											{{ t('nextcloud-vue', 'Clear filter') }}
										</button>
									</span>
								</span>
							</span>
							<template v-else>
								{{ tr(column.label || '') }}
							</template>
						</th>
						<th v-if="entryAction" scope="col" class="cn-expandable-row__entry-action-head">
							<span class="hidden-visually">{{ tr(entryAction.label) }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="item in viewRows"
						:key="item.index"
						:draggable="canReorder ? 'true' : undefined"
						:class="{ 'cn-expandable-row__tr--drop': dropIndex === item.index }"
						@dragstart="onDragStart(item.index, $event)"
						@dragover="onDragOver(item.index, $event)"
						@dragleave="dropIndex = null"
						@drop="onDrop(item.index, $event)"
						@dragend="dragIndex = null; dropIndex = null">
						<td v-if="reorder" class="cn-expandable-row__cell--handle">
							<button
								type="button"
								class="cn-expandable-row__handle"
								:disabled="!canReorder"
								:aria-label="t('nextcloud-vue', 'Move {name}', { name: entryName(item.entry) })"
								:title="t('nextcloud-vue', 'Drag, or use the arrow keys, to move')"
								data-testid="cn-expandable-row-handle"
								@keydown.up.prevent="moveBy(item.index, -1)"
								@keydown.down.prevent="moveBy(item.index, 1)">
								<DragVertical :size="18" />
							</button>
						</td>
						<td v-for="(column, c) in table.columns" :key="c" :class="`cn-expandable-row__cell--${column.as || 'text'}`">
							<span v-if="column.as === 'order'" class="cn-expandable-row__order">{{ item.index + 1 }}</span>
							<span v-else-if="column.as === 'bar'" class="cn-expandable-row__bar">
								<span class="cn-expandable-row__bar-track">
									<span class="cn-expandable-row__bar-fill" :style="{ width: percent(item.entry, column) + '%' }" />
								</span>
								<span class="cn-expandable-row__bar-value">{{ percent(item.entry, column) }}%</span>
							</span>
							<span v-else-if="column.as === 'check'" class="cn-expandable-row__check">
								<template v-if="readPath(item.entry, column.key)">
									<Check :size="16" />
									{{ tr(column.text || '') }}
								</template>
							</span>
							<template v-else-if="column.as === 'yesNo'">
								{{ readPath(item.entry, column.key) ? t('nextcloud-vue', 'Yes') : t('nextcloud-vue', 'No') }}
							</template>
							<CnStatusBadge
								v-else-if="column.as === 'pill' && pillOf(item.entry, column)"
								:label="pillOf(item.entry, column).label"
								:variant="pillOf(item.entry, column).variant" />
							<strong v-else-if="column.strong">{{ cellText(item.entry, column) }}</strong>
							<template v-else-if="column.as !== 'pill'">
								{{ cellText(item.entry, column) }}
							</template>
						</td>
						<td v-if="entryAction" class="cn-expandable-row__cell--entry-action">
							<button
								type="button"
								class="cn-expandable-row__entry-action"
								:aria-label="`${tr(entryAction.label)} ${entryName(item.entry)}`.trim()"
								:title="`${tr(entryAction.label)} ${entryName(item.entry)}`.trim()"
								data-testid="cn-expandable-row-entry-action"
								@click="emitAction(entryAction.id, item.entry)">
								<CnIcon :name="entryAction.icon || 'Pencil'" :size="18" />
							</button>
						</td>
					</tr>
				</tbody>
			</table>
			<div v-if="table.note || table.action" class="cn-expandable-row__foot">
				<p v-if="table.note" class="cn-expandable-row__note" data-testid="cn-expandable-row-note">
					{{ tr(table.note) }}
				</p>
				<NcButton
					v-if="table.action"
					variant="secondary"
					class="cn-expandable-row__foot-action"
					data-testid="cn-expandable-row-footer-action"
					@click="emitAction(table.action.id)">
					<template #icon>
						<Plus :size="18" />
					</template>
					{{ tr(table.action.label || table.action.id) }}
				</NcButton>
			</div>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { isBadgeVariant } from '../../utils/badgeVariants.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnStatusBadge } from '../CnStatusBadge/index.js'

/**
 * The first tone whose condition the entry meets.
 *
 * @param {Array<object>|undefined} tones `[{ when, variant, text? }]`.
 * @param {object} entry The list entry.
 * @return {object|undefined} The tone.
 */
function toneOf(tones, entry) {
	return Array.isArray(tones)
		? tones.find((tone) => tone && tone.when && evaluateVisibleWhenLocal(tone.when, entry || {}))
		: undefined
}

/**
 * Numbers by value, everything else by locale.
 *
 * @param {number|string} a One value.
 * @param {number|string} b The other.
 * @return {number} The order.
 */
function compareValues(a, b) {
	if (typeof a === 'number' && typeof b === 'number') {
		return a - b
	}
	return String(a).localeCompare(String(b), undefined, { numeric: true })
}

export default {
	name: 'CnExpandableRow',

	components: { Check, ChevronDown, ChevronRight, CnIcon, CnStatusBadge, DragVertical, FilterOutline, NcButton, Plus },

	inject: {
		cnTranslate: { default: null },
	},

	props: {
		/** The row's object. */
		object: {
			type: Object,
			required: true,
		},

		/**
		 * What the row draws: `{ title, badge?: { when, label }, description?,
		 * chips?: { field, each, tones? }, meta?: Array<string>, table?: { field,
		 * columns, note?, action?: { id, label } }, buttons?: Array<{ action, label?, icon? }> }`.
		 * A button's `icon` is a CnIcon name drawn before its label.
		 * A table column is `{ key?, label, as?, template?, strong?, text?, tones? }`,
		 * `as` one of `text` (default), `order`, `bar`, `check`, `yesNo`, `pill`.
		 * `table.sortable` / `table.filterable` put a sort button and a filter
		 * button on every column header (a column's own `sortable` /
		 * `filterable: false` opts it out). `table.reorder: { key? }` draws a
		 * drag handle per entry; a move emits `reorder` with the list
		 * renumbered in `key` (default `order`). `table.entryAction: { id,
		 * label, icon }` ends every entry with an icon button named
		 * "{label} {entry}" that emits `action` with the entry.
		 */
		layout: {
			type: Object,
			required: true,
		},

		/** Whether the row starts open. */
		open: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['action', 'reorder'],

	data() {
		return {
			isOpen: this.open,
			sortIndex: null,
			sortDir: 'asc',
			filters: {},
			filterOpen: null,
			dragIndex: null,
			dropIndex: null,
		}
	},

	computed: {
		title() {
			return String(readPath(this.object, this.layout.title || 'title') ?? '')
		},

		badge() {
			const badge = this.layout.badge
			if (!badge || !badge.label) {
				return ''
			}
			return !badge.when || evaluateVisibleWhenLocal(badge.when, this.object) ? this.tr(badge.label) : ''
		},

		description() {
			return this.layout.description ? String(readPath(this.object, this.layout.description) ?? '') : ''
		},

		chips() {
			const def = this.layout.chips
			if (!def || !def.field) {
				return []
			}
			const items = readPath(this.object, def.field)
			if (!Array.isArray(items)) {
				return []
			}
			return items
				.map((item, index) => {
					const label = def.each && def.each.includes('{')
						? fillTemplate(this.tr(def.each), item || {})
						: String(readPath(item || {}, def.each || 'name') ?? '')
					const tone = toneOf(def.tones, item)
					const variant = tone ? tone.variant : def.variant
					return { key: def.field + '.' + index, label, variant: isBadgeVariant(variant) ? variant : 'default' }
				})
				.filter((chip) => chip.label !== '')
		},

		meta() {
			const parts = Array.isArray(this.layout.meta) ? this.layout.meta : []
			return parts
				.map((part) => fillTemplate(this.tr(part), this.object))
				.filter((text) => text !== '')
				.join(' · ')
		},

		table() {
			const table = this.layout.table
			return table && table.field && Array.isArray(table.columns) ? table : null
		},

		/**
		 * The sub-table's per-entry action, when it names an id and a label.
		 *
		 * @return {{id: string, label: string, icon?: string}|null}
		 * @spec openspec/changes/expandable-row-entry-action/specs/expandable-row-entry-action/spec.md
		 */
		entryAction() {
			const action = this.table && this.table.entryAction
			return action && action.id && action.label ? action : null
		},

		tableRows() {
			const rows = this.table ? readPath(this.object, this.table.field) : null
			return Array.isArray(rows) ? rows : []
		},

		/**
		 * The entries to draw, each with its position in the list, filtered
		 * and sorted as the headers ask.
		 *
		 * @return {Array<{entry: object, index: number}>} The rows.
		 */
		viewRows() {
			const columns = this.table ? this.table.columns : []
			let rows = this.tableRows.map((entry, index) => ({ entry, index }))
			Object.keys(this.filters).forEach((c) => {
				const chosen = this.filters[c]
				rows = rows.filter((row) => chosen.includes(this.displayValue(row, columns[c])))
			})
			if (this.sortIndex !== null && columns[this.sortIndex]) {
				const column = columns[this.sortIndex]
				const sign = this.sortDir === 'desc' ? -1 : 1
				rows = [...rows].sort((a, b) => sign * compareValues(this.sortValue(a, column), this.sortValue(b, column)))
			}
			return rows
		},

		reorder() {
			const reorder = this.table && this.table.reorder
			return reorder && typeof reorder === 'object' ? reorder : null
		},

		/** Moving is off while the table is sorted or filtered: the drawn order is not the list's. */
		canReorder() {
			return this.reorder !== null && this.sortIndex === null && Object.keys(this.filters).length === 0
		},

		buttons() {
			return Array.isArray(this.layout.buttons) ? this.layout.buttons.filter((b) => b && b.action) : []
		},

		toggleLabel() {
			return this.isOpen
				? t('nextcloud-vue', 'Close {name}', { name: this.title })
				: t('nextcloud-vue', 'Open {name}', { name: this.title })
		},
	},

	watch: {
		open(value) {
			this.isOpen = value
		},
	},

	methods: {
		t,
		readPath,

		/**
		 * @param {string} text Text in the host's source language.
		 * @return {string} The text in the user's language.
		 */
		tr(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * @param {string} id The action id.
		 * @param {object} [entry] The sub-table entry, for an entry action.
		 * @return {void}
		 */
		emitAction(id, entry) {
			/**
			 * @event action A header button, the footer action or an entry
			 * action. Payload: `{ id, row }`, with `entry` for an entry action.
			 */
			this.$emit('action', entry === undefined ? { id, row: this.object } : { id, row: this.object, entry })
		},

		/**
		 * @param {object} entry The list entry.
		 * @param {object} column The column.
		 * @return {string} The cell's text.
		 */
		cellText(entry, column) {
			if (column.template) {
				return fillTemplate(this.tr(column.template), entry || {})
			}
			const value = column.key ? readPath(entry || {}, column.key) : ''
			return value === null || value === undefined ? '' : String(value)
		},

		/**
		 * @param {number} c The column index.
		 * @return {boolean} Whether the column header sorts.
		 */
		sortableAt(c) {
			const column = this.table.columns[c]
			return this.table.sortable === true && column.sortable !== false && (Boolean(column.key) || column.as === 'order' || column.as === 'pill')
		},

		/**
		 * @param {number} c The column index.
		 * @return {boolean} Whether the column header filters.
		 */
		filterableAt(c) {
			const column = this.table.columns[c]
			return this.table.filterable === true && column.filterable !== false && (Boolean(column.key) || column.as === 'order' || column.as === 'pill')
		},

		/**
		 * Ascending on the first click, descending on the second, unsorted on the third.
		 *
		 * @param {number} c The column index.
		 * @return {void}
		 */
		toggleSort(c) {
			if (this.sortIndex !== c) {
				this.sortIndex = c
				this.sortDir = 'asc'
			} else if (this.sortDir === 'asc') {
				this.sortDir = 'desc'
			} else {
				this.sortIndex = null
			}
		},

		/**
		 * @param {{entry: object, index: number}} row The row.
		 * @param {object} column The column.
		 * @return {number|string} What the column sorts the row by.
		 */
		sortValue(row, column) {
			if (column.as === 'order') {
				return row.index
			}
			if (column.as === 'bar') {
				return this.percent(row.entry, column)
			}
			if (column.as === 'check' || column.as === 'yesNo') {
				return readPath(row.entry || {}, column.key) ? 1 : 0
			}
			return this.displayValue(row, column)
		},

		/**
		 * @param {{entry: object, index: number}} row The row.
		 * @param {object} column The column.
		 * @return {string} The cell as the user reads it.
		 */
		displayValue(row, column) {
			const entry = row.entry
			switch (column.as) {
				case 'order':
					return String(row.index + 1)
				case 'bar':
					return this.percent(entry, column) + '%'
				case 'check':
					return readPath(entry || {}, column.key) ? this.tr(column.text || '') || t('nextcloud-vue', 'Yes') : ''
				case 'yesNo':
					return readPath(entry || {}, column.key) ? t('nextcloud-vue', 'Yes') : t('nextcloud-vue', 'No')
				case 'pill': {
					const pill = this.pillOf(entry, column)
					return pill ? pill.label : ''
				}
				default:
					return this.cellText(entry, column)
			}
		},

		/**
		 * @param {number} c The column index.
		 * @return {Array<string>} The distinct values the column holds, sorted.
		 */
		valuesOf(c) {
			const column = this.table.columns[c]
			const values = new Set(this.tableRows.map((entry, index) => this.displayValue({ entry, index }, column)))
			return [...values].sort(compareValues)
		},

		isFiltered(c) {
			return Array.isArray(this.filters[c])
		},

		isChosen(c, value) {
			return this.isFiltered(c) && this.filters[c].includes(value)
		},

		/**
		 * @param {number} c The column index.
		 * @param {string} value The value.
		 * @param {boolean} on Whether the value is chosen.
		 * @return {void}
		 */
		toggleValue(c, value, on) {
			const chosen = (this.filters[c] || []).filter((v) => v !== value)
			if (on) {
				chosen.push(value)
			}
			const filters = { ...this.filters }
			if (chosen.length > 0) {
				filters[c] = chosen
			} else {
				delete filters[c]
			}
			this.filters = filters
		},

		clearFilter(c) {
			const filters = { ...this.filters }
			delete filters[c]
			this.filters = filters
			this.filterOpen = null
		},

		/**
		 * @param {object} entry The list entry.
		 * @return {string} The entry's name for the move button.
		 */
		entryName(entry) {
			const named = (this.table.columns || []).find((column) => column.key && !column.as)
			return named ? this.cellText(entry, named) : ''
		},

		onDragStart(index, event) {
			if (!this.canReorder) {
				return
			}
			this.dragIndex = index
			if (event && event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move'
				event.dataTransfer.setData('text/plain', String(index))
			}
		},

		onDragOver(index, event) {
			if (this.dragIndex === null) {
				return
			}
			event.preventDefault()
			this.dropIndex = index
		},

		onDrop(index, event) {
			if (event) {
				event.preventDefault()
			}
			const from = this.dragIndex
			this.dragIndex = null
			this.dropIndex = null
			if (from !== null) {
				this.moveTo(from, index)
			}
		},

		/**
		 * @param {number} index The entry's position.
		 * @param {number} step -1 up, 1 down.
		 * @return {void}
		 */
		moveBy(index, step) {
			this.moveTo(index, index + step)
		},

		/**
		 * Emit the list with one entry moved, renumbered in the reorder key.
		 * The list itself is left alone; the host saves and reloads it.
		 *
		 * @param {number} from The entry's position.
		 * @param {number} to Its new position.
		 * @return {void}
		 */
		moveTo(from, to) {
			const list = this.tableRows
			if (!this.canReorder || from === to || to < 0 || to >= list.length) {
				return
			}
			const moved = [...list]
			moved.splice(to, 0, moved.splice(from, 1)[0])
			const key = this.reorder.key || 'order'
			const entries = moved.map((entry, i) => (entry && typeof entry === 'object' ? { ...entry, [key]: i + 1 } : entry))
			/**
			 * @event reorder An entry of the sub-table moved. Payload: `{ row, field, entries }`, the list in its new order.
			 */
			this.$emit('reorder', { row: this.object, field: this.table.field, entries })
		},

		/**
		 * @param {object} entry The list entry.
		 * @param {object} column The column.
		 * @return {number} The value as a whole percentage from 0 to 100.
		 */
		percent(entry, column) {
			const value = Number(readPath(entry || {}, column.key))
			return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
		},

		/**
		 * @param {object} entry The list entry.
		 * @param {object} column The column.
		 * @return {{label: string, variant: string}|null} The pill, or null.
		 */
		pillOf(entry, column) {
			const tone = toneOf(column.tones, entry)
			if (!tone || !tone.text) {
				return null
			}
			return { label: this.tr(tone.text), variant: isBadgeVariant(tone.variant) ? tone.variant : 'default' }
		},
	},
}
</script>

<style scoped>
.cn-expandable-row {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
}

.cn-expandable-row__head {
	display: flex;
	gap: 16px;
	align-items: flex-start;
	padding: 18px 18px 18px 18px;
}

.cn-expandable-row__toggle {
	display: flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: 1px solid var(--color-border-dark);
	border-radius: 50%;
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-expandable-row--open .cn-expandable-row__toggle {
	border-color: transparent;
	background: var(--color-primary-element-light);
}

.cn-expandable-row--open .cn-expandable-row__chevron {
	transform: rotate(180deg);
}

.cn-expandable-row__main {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.cn-expandable-row__title-line {
	display: flex;
	gap: 10px;
	align-items: center;
}

.cn-expandable-row__title {
	margin: 0;
	font-size: 18px;
	font-weight: 700;
}

.cn-expandable-row__description {
	margin: 0;
}

.cn-expandable-row__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
}

.cn-expandable-row__separator {
	display: inline-flex;
	color: var(--color-text-maxcontrast);
}

.cn-expandable-row__meta {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-expandable-row__actions {
	display: flex;
	flex: none;
	gap: 8px;
	align-items: center;
}

.cn-expandable-row__body {
	border-top: 1px solid var(--color-border);
}

.cn-expandable-row__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-expandable-row__table th,
.cn-expandable-row__table td {
	padding: 12px 18px;
	border-bottom: 1px solid var(--color-border);
	text-align: start;
}

.cn-expandable-row__table th {
	color: var(--color-text-maxcontrast);
	font-weight: 600;
}

.cn-expandable-row__order {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	background: var(--color-background-dark);
	font-size: 13px;
	font-weight: 600;
}

.cn-expandable-row__bar {
	display: flex;
	gap: 12px;
	align-items: center;
}

.cn-expandable-row__bar-track {
	flex: 1;
	min-width: 120px;
	height: 6px;
	border-radius: 3px;
	background: var(--color-background-dark);
	overflow: hidden;
}

.cn-expandable-row__bar-fill {
	display: block;
	height: 100%;
	background: var(--color-primary-element);
}

.cn-expandable-row__bar-value {
	font-weight: 600;
}

.cn-expandable-row__check {
	display: inline-flex;
	gap: 6px;
	align-items: center;
	color: var(--color-primary-element);
	font-weight: 600;
}

.cn-expandable-row__foot {
	display: flex;
	gap: 16px;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
}

.cn-expandable-row__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-expandable-row__th {
	display: inline-flex;
	gap: 4px;
	align-items: center;
}

/* With the wrapper class, so these outrank Nextcloud's plain-button rule
   (`button:not(.button-vue,...)`, 0,2,1), which drew a grey 22px button. */
.cn-expandable-row__th .cn-expandable-row__sort {
	display: inline-flex;
	gap: 4px;
	align-items: center;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.cn-expandable-row__sort-icon {
	color: var(--color-text-maxcontrast);
	opacity: .6;
}

.cn-expandable-row__sort--active .cn-expandable-row__sort-icon {
	color: var(--color-primary-element);
	opacity: 1;
}

.cn-expandable-row__sort--active:not(.cn-expandable-row__sort--desc) .cn-expandable-row__sort-icon {
	transform: rotate(180deg);
}

.cn-expandable-row__filter-anchor {
	position: relative;
	display: inline-flex;
}

.cn-expandable-row__filter-anchor .cn-expandable-row__filter {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 4px;
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
}

.cn-expandable-row__filter-anchor .cn-expandable-row__filter:hover,
.cn-expandable-row__filter-anchor .cn-expandable-row__filter--active {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-expandable-row__filter-panel {
	position: absolute;
	inset-block-start: calc(100% + 4px);
	inset-inline-start: 0;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 180px;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background);
	box-shadow: 0 2px 8px var(--color-box-shadow);
	color: var(--color-main-text);
	font-weight: 400;
}

.cn-expandable-row__filter-option {
	display: flex;
	gap: 8px;
	align-items: center;
	white-space: nowrap;
}

.cn-expandable-row__filter-clear {
	align-self: flex-start;
	min-height: 0;
	margin: 4px 0 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--color-primary-element);
	font: inherit;
	cursor: pointer;
}

.cn-expandable-row__table th.cn-expandable-row__handle-head,
.cn-expandable-row__table td.cn-expandable-row__cell--handle {
	width: 18px;
	padding-inline: 18px 6px;
}

.cn-expandable-row__handle {
	display: inline-flex;
	align-items: center;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: var(--color-text-maxcontrast);
	cursor: grab;
}

.cn-expandable-row__handle:disabled {
	cursor: default;
	opacity: .4;
}

.cn-expandable-row__table th.cn-expandable-row__entry-action-head,
.cn-expandable-row__table td.cn-expandable-row__cell--entry-action {
	width: 32px;
	padding-inline: 12px 18px;
	text-align: end;
}

/* A 32px round icon button on no ground (PqPipelines "Fase bewerken"). */
.cn-expandable-row__entry-action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	min-height: 0;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 50%;
	background: transparent;
	color: var(--cn-board-text-soft, var(--color-main-text));
	cursor: pointer;
}

.cn-expandable-row__entry-action:hover {
	background: var(--color-background-hover);
}

.cn-expandable-row__entry-action:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-expandable-row__tr--drop td {
	box-shadow: inset 0 2px 0 var(--color-primary-element);
}
</style>
