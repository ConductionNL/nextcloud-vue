<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-week-grid" data-testid="cn-week-grid">
		<div v-if="navigation" class="cn-week-grid__nav">
			<button
				type="button"
				class="cn-week-grid__nav-button"
				data-testid="cn-week-grid-previous"
				@click="moveWeek(-1)">
				{{ previousLabel }}
			</button>
			<button
				type="button"
				class="cn-week-grid__nav-button"
				:disabled="isCurrentWeek"
				data-testid="cn-week-grid-current"
				@click="moveWeek(0)">
				{{ currentLabel }}
			</button>
			<button
				type="button"
				class="cn-week-grid__nav-button"
				data-testid="cn-week-grid-next"
				@click="moveWeek(1)">
				{{ nextLabel }}
			</button>
		</div>

		<div v-if="loading" class="cn-week-grid__state" role="status">
			<NcLoadingIcon :size="20" />
			<span>{{ loadingLabel }}</span>
		</div>

		<!-- A scroll container a keyboard user cannot focus cannot be scrolled,
		     so the region is focusable and named. -->
		<div
			v-else
			class="cn-week-grid__scroll"
			role="region"
			tabindex="0"
			:aria-label="caption || regionLabel">
			<table class="cn-week-grid__table" :style="{ '--cn-week-grid-columns': dayColumns.length }">
				<caption v-if="caption" class="cn-week-grid__caption">
					{{ caption }}
				</caption>
				<thead>
					<tr>
						<td class="cn-week-grid__corner" />
						<th
							v-for="day in dayColumns"
							:key="day.key"
							scope="col"
							class="cn-week-grid__day"
							:class="{ 'cn-week-grid__day--today': day.today }"
							:aria-current="day.today ? 'date' : null"
							:data-day="day.key">
							<span class="cn-week-grid__day-label">{{ day.label }}</span>
							<span v-if="day.today" class="cn-week-grid__today">{{ todayLabel }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in gridRows" :key="row.key" :data-row="row.key">
						<th scope="row" class="cn-week-grid__row-head">
							<span class="cn-week-grid__row-label">{{ row.label }}</span>
							<span v-if="row.time" class="cn-week-grid__row-time">{{ row.time }}</span>
						</th>
						<td
							v-for="cell in row.cells"
							:key="cell.key"
							class="cn-week-grid__cell"
							:class="{ 'cn-week-grid__cell--today': cell.today }"
							:data-day="cell.day">
							<ul v-if="cell.items.length > 0" class="cn-week-grid__items">
								<li v-for="item in cell.items" :key="item.key">
									<!-- @slot item Override one entry of a cell. -->
									<!-- @binding {object} item The entry, as given in `items`. -->
									<slot name="item" :item="item.source">
										<component
											:is="item.href ? 'a' : 'button'"
											class="cn-week-grid__item"
											:class="item.pill ? `cn-week-grid__item--${item.pill.variant}` : null"
											:href="item.href || null"
											:type="item.href ? null : 'button'"
											data-testid="cn-week-grid-item"
											@click="onItemClick($event, item)">
											<strong class="cn-week-grid__title">{{ item.title }}</strong>
											<span v-if="item.meta" class="cn-week-grid__meta">{{ item.meta }}</span>
											<span
												v-if="item.pill"
												class="cn-week-grid__pill"
												:class="`cn-week-grid__pill--${item.pill.variant}`"
												data-testid="cn-week-grid-pill">{{ item.pill.label }}</span>
										</component>
									</slot>
								</li>
							</ul>
						</td>
					</tr>
					<tr v-if="gridRows.length === 0">
						<td :colspan="dayColumns.length + 1" class="cn-week-grid__empty">
							{{ emptyLabel }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { dayKey, parseDateValue } from '../../utils/dateVariant.js'
import { safeHref } from '../../utils/safeHref.js'

/** The pill variants the grid draws; anything else falls back to `changed`. */
const PILL_VARIANTS = ['changed', 'cancelled', 'substitute', 'info']

/**
 * CnWeekGrid draws one week as a timetable: the days as columns (Monday to
 * Friday, or the whole week with `days: 7`) and the time slots as rows, such
 * as a school's lesson hours or a training provider's start times. Each entry
 * sits in the cell of its day and its row, with a title, an optional meta
 * line and an optional pill for a change (another room, cancelled, a
 * substitute). Today's column is marked.
 *
 * The grid only draws what it is given: `rows` are the slots, `items` the
 * entries, each naming its `date` and its `row`. An entry whose row is not
 * in `rows`, or whose date is outside the week, is not drawn. With
 * `navigation` the grid shows previous, this week and next, and emits
 * `week-change` with the Monday of the asked week, so the host fetches that
 * week and passes it in as `week`.
 *
 * ```vue
 * <CnWeekGrid
 *   :week="monday"
 *   :rows="[{ key: '1', label: '1e uur', start: '08:30', end: '09:20' }]"
 *   :items="[{ key: 'l1', date: '2026-10-05', row: '1', title: 'Wiskunde', meta: 'H4b, lokaal 12', pill: { label: 'Lokaal 14', variant: 'changed' } }]"
 *   caption="Weekrooster"
 *   @week-change="loadWeek"
 *   @item-click="openLesson" />
 * ```
 *
 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-a-week-grid-draws-days-as-columns-and-slots-as-rows
 */
export default {
	name: 'CnWeekGrid',

	components: { NcLoadingIcon },

	props: {
		/**
		 * A day of the week to draw; the grid starts on its Monday. Empty for
		 * the week of `now`.
		 *
		 * @type {Date|string|null}
		 */
		week: {
			type: [Date, String],
			default: null,
		},

		/**
		 * How many days the grid has: `5` (Monday to Friday, the default) or `7`.
		 *
		 * @type {number}
		 */
		days: {
			type: Number,
			default: 5,
		},

		/**
		 * The time slots, top to bottom: `{ key, label, start?, end? }`. `start`
		 * and `end` (such as `08:30`) are shown under the label.
		 *
		 * @type {Array<{key: string, label: string, start?: string, end?: string}>}
		 */
		rows: {
			type: Array,
			default: () => [],
		},

		/**
		 * The entries: `{ key, date, row, title, meta?, pill?, href? }`. `date`
		 * is a `YYYY-MM-DD` string or a Date, `row` the key of its slot. `meta`
		 * is a string or a list of strings (joined with ", "). `pill` is
		 * `{ label, variant }` with variant `changed`, `cancelled`,
		 * `substitute` or `info`. With `href` the entry is a link; without it a
		 * button that only emits `item-click`.
		 *
		 * @type {Array<{key: string, date: (string|Date), row: string, title: string, meta?: (string|Array<string>), pill?: {label: string, variant?: string}, href?: string}>}
		 */
		items: {
			type: Array,
			default: () => [],
		},

		/**
		 * The table's caption, also the name of its scroll region.
		 *
		 * @type {string}
		 */
		caption: {
			type: String,
			default: '',
		},

		/**
		 * Whether to show previous, this week and next above the grid.
		 *
		 * @type {boolean}
		 */
		navigation: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether the week is still loading.
		 *
		 * @type {boolean}
		 */
		loading: {
			type: Boolean,
			default: false,
		},

		/**
		 * The text when there are no rows. Defaults to "Nothing planned this week".
		 *
		 * @type {string}
		 */
		emptyText: {
			type: String,
			default: '',
		},

		/**
		 * The moment the grid treats as "now", for today and the current week.
		 * Leave empty for the current time.
		 *
		 * @type {Date|null}
		 */
		now: {
			type: Date,
			default: null,
		},
	},

	emits: ['week-change', 'item-click'],

	computed: {
		/**
		 * The reference moment.
		 *
		 * @return {Date}
		 */
		reference() {
			return this.now instanceof Date ? this.now : new Date()
		},

		/**
		 * The Monday the grid starts on.
		 *
		 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-a-week-grid-draws-days-as-columns-and-slots-as-rows
		 * @return {Date}
		 */
		monday() {
			return mondayOf(parseDateValue(this.week) || this.reference)
		},

		/**
		 * Whether the grid shows the week of `now`.
		 *
		 * @return {boolean}
		 */
		isCurrentWeek() {
			return dayKey(this.monday) === dayKey(mondayOf(this.reference))
		},

		/**
		 * The day columns, Monday first.
		 *
		 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-a-week-grid-draws-days-as-columns-and-slots-as-rows
		 * @return {Array<{key: string, label: string, today: boolean}>}
		 */
		dayColumns() {
			const count = Number(this.days) === 7 ? 7 : 5
			const today = dayKey(this.reference)
			const format = new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' })
			const columns = []
			for (let i = 0; i < count; i++) {
				const date = new Date(this.monday.getFullYear(), this.monday.getMonth(), this.monday.getDate() + i)
				const key = dayKey(date)
				columns.push({ key, label: format.format(date), today: key === today })
			}
			return columns
		},

		/**
		 * The rows with one cell per day, each holding the entries of that day and slot.
		 *
		 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-a-week-grid-draws-days-as-columns-and-slots-as-rows
		 * @return {Array<{key: string, label: string, time: string, cells: Array<object>}>}
		 */
		gridRows() {
			const buckets = this.bucketItems()
			return this.rows
				.filter((row) => row && row.key !== undefined && row.key !== null && row.key !== '')
				.map((row) => {
					const rowKey = String(row.key)
					return {
						key: rowKey,
						label: String(row.label ?? rowKey),
						time: [row.start, row.end].filter((part) => typeof part === 'string' && part !== '').join('–'),
						cells: this.dayColumns.map((day) => ({
							key: `${rowKey}|${day.key}`,
							day: day.key,
							today: day.today,
							items: buckets.get(`${rowKey}|${day.key}`) || [],
						})),
					}
				})
		},

		previousLabel() {
			return t('nextcloud-vue', 'Previous week')
		},

		currentLabel() {
			return t('nextcloud-vue', 'This week')
		},

		nextLabel() {
			return t('nextcloud-vue', 'Next week')
		},

		todayLabel() {
			return t('nextcloud-vue', 'today')
		},

		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		regionLabel() {
			return t('nextcloud-vue', 'Week timetable')
		},

		emptyLabel() {
			return this.emptyText || t('nextcloud-vue', 'Nothing planned this week')
		},
	},

	methods: {
		/**
		 * The drawable entries by `row|day`, in the order given.
		 *
		 * @return {Map<string, Array<object>>}
		 */
		bucketItems() {
			const buckets = new Map()
			for (const source of this.items) {
				const item = normaliseItem(source)
				if (item === null) {
					continue
				}
				const bucket = `${item.row}|${item.day}`
				if (buckets.has(bucket) === false) {
					buckets.set(bucket, [])
				}
				buckets.get(bucket).push(item)
			}
			return buckets
		},

		/**
		 * Ask for another week: -1 the previous, 1 the next, 0 the week of `now`.
		 *
		 * @param {number} step The number of weeks to move, or 0 for the current week.
		 * @spec openspec/changes/week-grid/specs/week-grid/spec.md#requirement-the-week-grid-navigates-by-week
		 */
		moveWeek(step) {
			const base = step === 0 ? mondayOf(this.reference) : this.monday
			const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (step * 7))
			this.$emit('week-change', target)
		},

		/**
		 * Emit `item-click` with the entry as given; a link also follows its href.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {object} item The normalised entry.
		 */
		onItemClick(event, item) {
			this.$emit('item-click', item.source, event)
		},
	},
}

/**
 * The Monday of a date's week, at midnight.
 *
 * @param {Date} date Any day of the week.
 * @return {Date}
 */
function mondayOf(date) {
	const delta = (date.getDay() + 6) % 7
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() - delta)
}

/**
 * The page's locale for the day headers, or `en` when none is known.
 *
 * @return {string}
 */
function locale() {
	try {
		return getCanonicalLocale() || 'en'
	} catch {
		return 'en'
	}
}

/**
 * A link the grid may draw, or null for none or an unsafe one.
 *
 * @param {string|undefined|null} href The entry's href.
 * @return {string|null}
 */
function safeLink(href) {
	if (typeof href !== 'string' || href === '') {
		return null
	}
	const safe = safeHref(href)
	return safe === '#' ? null : safe
}

/**
 * An entry as the grid draws it, or null when it names no day, row or title.
 *
 * @param {object} source The entry as given.
 * @return {object|null}
 */
function normaliseItem(source) {
	if (source === null || typeof source !== 'object') {
		return null
	}
	const date = parseDateValue(source.date)
	const title = typeof source.title === 'string' ? source.title.trim() : ''
	if (date === null || source.row === undefined || source.row === null || title === '') {
		return null
	}
	const meta = Array.isArray(source.meta)
		? source.meta.filter((part) => typeof part === 'string' && part !== '').join(', ')
		: (typeof source.meta === 'string' ? source.meta : '')
	let pill = null
	if (source.pill && typeof source.pill.label === 'string' && source.pill.label !== '') {
		pill = {
			label: source.pill.label,
			variant: PILL_VARIANTS.includes(source.pill.variant) ? source.pill.variant : 'changed',
		}
	}
	return {
		key: String(source.key ?? `${source.row}|${dayKey(date)}|${title}`),
		day: dayKey(date),
		row: String(source.row),
		title,
		meta,
		pill,
		href: safeLink(source.href),
		source,
	}
}
</script>

<style scoped>
.cn-week-grid {
	width: 100%;
}

.cn-week-grid__nav {
	display: flex;
	gap: 8px;
	margin-bottom: 12px;
}

.cn-week-grid__nav-button {
	padding: 6px 12px;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-week-grid__nav-button:disabled {
	opacity: 0.5;
	cursor: default;
}

.cn-week-grid__state {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 0;
	color: var(--color-text-maxcontrast);
}

.cn-week-grid__scroll {
	overflow-x: auto;
}

.cn-week-grid__scroll:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-week-grid__table {
	width: 100%;
	min-width: calc(var(--cn-week-grid-columns, 5) * 140px + 96px);
	border-collapse: separate;
	border-spacing: 4px;
	table-layout: fixed;
}

.cn-week-grid__caption {
	text-align: start;
	font-weight: bold;
	padding-bottom: 8px;
}

.cn-week-grid__corner {
	width: 96px;
}

.cn-week-grid__day {
	padding: 8px;
	border-radius: var(--border-radius-element, 8px);
	text-align: start;
	font-weight: bold;
}

.cn-week-grid__day--today {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
}

.cn-week-grid__today {
	display: block;
	font-weight: normal;
	font-size: 0.85em;
}

.cn-week-grid__row-head {
	padding: 8px;
	text-align: start;
	vertical-align: top;
	font-weight: normal;
}

.cn-week-grid__row-label {
	display: block;
	font-weight: bold;
}

.cn-week-grid__row-time {
	display: block;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-week-grid__cell {
	vertical-align: top;
	padding: 2px;
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-background-hover);
}

.cn-week-grid__cell--today {
	background: var(--color-primary-element-light);
}

.cn-week-grid__items {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-week-grid__item {
	display: flex;
	flex-direction: column;
	gap: 2px;
	width: 100%;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-element, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	text-align: start;
	text-decoration: none;
	font: inherit;
	cursor: pointer;
}

.cn-week-grid__item--cancelled .cn-week-grid__title {
	text-decoration: line-through;
}

.cn-week-grid__meta {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-week-grid__pill {
	align-self: flex-start;
	padding: 0 8px;
	border-radius: var(--border-radius-pill, 999px);
	font-size: 0.8em;
	background: var(--color-warning);
	color: var(--color-warning-text, var(--color-main-text));
}

.cn-week-grid__pill--cancelled {
	background: var(--color-error);
	color: var(--color-error-text, var(--color-main-background));
}

.cn-week-grid__pill--substitute,
.cn-week-grid__pill--info {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
}

.cn-week-grid__empty {
	padding: 12px;
	color: var(--color-text-maxcontrast);
}
</style>
