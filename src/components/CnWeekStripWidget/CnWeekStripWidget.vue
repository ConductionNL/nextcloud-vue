<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-week-strip" :class="{ 'cn-week-strip--inset': inset }" data-testid="cn-week-strip">
		<div v-if="loading" class="cn-week-strip__state" role="status">
			<NcLoadingIcon :size="20" />
			<span class="cn-week-strip__state-text">{{ loadingLabel }}</span>
		</div>
		<p v-else-if="error" class="cn-week-strip__state" role="status">
			{{ errorLabel }}
		</p>
		<!-- A scroll container a keyboard user cannot focus cannot be scrolled,
		     so the region is focusable and named. -->
		<div
			v-else
			class="cn-week-strip__scroll"
			role="region"
			tabindex="0"
			:aria-label="regionLabel">
			<ol class="cn-week-strip__days" :style="{ '--cn-week-strip-columns': dayColumns.length }">
				<li
					v-for="day in dayColumns"
					:key="day.key"
					class="cn-week-strip__day"
					:class="{ 'cn-week-strip__day--today': day.today }"
					:aria-current="day.today ? 'date' : null"
					:data-day="day.key">
					<span class="cn-week-strip__head">
						<span class="cn-week-strip__label">{{ day.label }}</span>
						<span v-if="day.today" class="cn-week-strip__today">{{ todayLabel }}</span>
					</span>
					<ul v-if="day.items.length > 0" class="cn-week-strip__items">
						<li v-for="item in day.items" :key="item.key" class="cn-week-strip__item-row">
							<component
								:is="item.href ? 'a' : 'div'"
								class="cn-week-strip__item"
								:class="{ 'cn-week-strip__item--late': item.late, 'cn-week-strip__item--link': !!item.href }"
								:href="item.href || null"
								data-testid="cn-week-strip-item"
								@click="onItemClick($event, item)">
								<strong class="cn-week-strip__title">{{ item.title }}</strong>
								<span v-if="item.meta" class="cn-week-strip__meta">{{ item.meta }}</span>
								<span v-if="item.late" class="cn-week-strip__late">{{ lateLabel }}</span>
							</component>
						</li>
					</ul>
					<span v-else class="cn-week-strip__empty">{{ emptyLabel }}</span>
				</li>
			</ol>
		</div>
	</div>
</template>

<script>
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import { dayKey, daysUntil, parseDateValue } from '../../utils/dateVariant.js'
import { followLinkClick, resolveHref } from '../../utils/linkNavigation.js'
import { objectDisplayName, objectFieldValue } from '../../utils/objectName.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { safeHref } from '../../utils/safeHref.js'
import { compareVisibleWhen } from '../../utils/visibleWhen.js'

const DEFAULT_LIMIT = 100

/**
 * CnWeekStripWidget shows the current week as day columns, with the items
 * that fall on each day listed under it. Use it for deadlines, appointments
 * or anything else that has a date and that somebody should see coming.
 *
 * It renders the five working days by default (`days: 7` adds the weekend),
 * highlights today, marks items that are late, and says so when a day has
 * nothing. On a narrow screen the strip scrolls sideways.
 *
 * Items come from an OpenRegister source (one request for the whole week) or
 * from static `items`. Resolved by its registry type key `week-strip`.
 *
 * ```json
 * {
 *   "widgetKey": "week-strip",
 *   "props": {
 *     "content": {
 *       "source": { "register": "dossiq", "schema": "case", "filter": { "assignee": "@me" } },
 *       "dateField": "deadline",
 *       "titleField": "title",
 *       "metaFields": ["identifier", "caseType"],
 *       "itemRoute": "CaseDetail",
 *       "emptyText": "No deadlines"
 *     }
 *   }
 * }
 * ```
 */
export default {
	name: 'CnWeekStripWidget',

	components: { NcLoadingIcon },

	inject: {
		/**
		 * Host translate function provided by CnAppRoot. The manifest-authored
		 * `emptyText` and static item texts run through it. Identity by default.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget's configuration. `days` is `5` (working days, the
		 * default) or `7`. `source` names the OpenRegister register and schema,
		 * with an optional `filter` (the shared @-token grammar) and `limit`.
		 * `dateField` is the field the items are bucketed by. `titleField` and
		 * `metaFields` pick what each item shows. `itemRoute` is the route name
		 * an item links to (with the record id as `params.id`). `lateWhen` is a
		 * `{ op, value }` rule on the days until the date (default: before
		 * today), `lateField` a boolean field that marks a record late.
		 * `items` are static entries `{ title, meta?, date, route?, href?, late? }`.
		 * `emptyText` is the text of a day without items. `weekOffset` moves
		 * the strip whole weeks from the current one. `inset: true` draws the
		 * strip inside the board's inset (16px above, 24px at the sides, 22px
		 * below) instead of from card edge to card edge.
		 *
		 * @type {{days?: (5|7), inset?: boolean, source?: {register?: string, schema?: string, filter?: object, limit?: number}, dateField?: string, titleField?: string, metaFields?: Array<string>, itemRoute?: string, lateWhen?: {op?: string, value?: number}, lateField?: string, items?: Array<{title: string, meta?: string, date: string, route?: (string|object), href?: string, late?: boolean}>, emptyText?: string, weekOffset?: number}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Translate function. Falls back to the injected `cnTranslate`. Pass it
		 * when mounting the widget outside a CnAppRoot.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},

		/**
		 * The moment the strip treats as "now". Leave empty for the current
		 * time; set it to render another week or to test.
		 *
		 * @type {Date|null}
		 */
		now: {
			type: Date,
			default: null,
		},
	},

	data() {
		return {
			rows: [],
			loading: false,
			error: '',
		}
	},

	computed: {
		/**
		 * Whether the widget draws the board's inset (`content.inset`). Off
		 * by default, which keeps it edge to edge as before.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-strip-and-a-stacked-bar-can-take-the-board-inset
		 * @return {boolean}
		 */
		inset() {
			return Boolean(this.content && this.content.inset === true)
		},

		/**
		 * The translate function in use.
		 *
		 * @return {(key: string) => string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * The reference moment.
		 *
		 * @return {Date}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		reference() {
			return this.now instanceof Date ? this.now : new Date()
		},

		/**
		 * How many day columns render: 7, or 5 for anything else.
		 *
		 * @return {number}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		dayCount() {
			return Number(this.content.days) === 7 ? 7 : 5
		},

		/**
		 * The days of the strip, Monday first.
		 *
		 * @return {Array<Date>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		weekDays() {
			const ref = this.reference
			const offset = Number.isInteger(this.content.weekOffset) ? this.content.weekOffset : 0
			const mondayDelta = (ref.getDay() + 6) % 7
			const days = []
			for (let i = 0; i < this.dayCount; i++) {
				days.push(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - mondayDelta + (offset * 7) + i))
			}
			return days
		},

		/**
		 * The field the items are bucketed by.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		dateField() {
			return typeof this.content.dateField === 'string' ? this.content.dateField : ''
		},

		/**
		 * Whether the items come from OpenRegister.
		 *
		 * @return {boolean}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		hasSource() {
			const s = this.content.source || {}
			return Boolean(s.register && s.schema && this.dateField)
		},

		/**
		 * Every item, from the source rows or the static list, in one shape.
		 *
		 * @return {Array<{key: string, title: string, meta: string, date: (Date|null), late: boolean, href: string, target: (object|string|null)}>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		normalizedItems() {
			if (this.hasSource) {
				return this.rows.map((row, index) => this.itemFromRow(row, index))
			}
			const items = Array.isArray(this.content.items) ? this.content.items : []
			return items
				.filter((item) => item && typeof item === 'object')
				.map((item, index) => this.itemFromStatic(item, index))
		},

		/**
		 * The columns: one per day, each with its items.
		 *
		 * @return {Array<{key: string, label: string, today: boolean, items: Array<object>}>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		dayColumns() {
			const todayKey = dayKey(this.reference)
			const buckets = {}
			for (const item of this.normalizedItems) {
				if (item.date === null) {
					continue
				}
				const key = dayKey(item.date)
				;(buckets[key] = buckets[key] || []).push(item)
			}
			const formatter = this.dayFormatter
			return this.weekDays.map((day) => {
				const key = dayKey(day)
				return {
					key,
					label: formatter.format(day),
					today: key === todayKey,
					items: buckets[key] || [],
				}
			})
		},

		/**
		 * Formats a day as a short weekday and a day number ("Mon 5").
		 *
		 * @return {Intl.DateTimeFormat}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		dayFormatter() {
			let locale
			try {
				locale = getCanonicalLocale()
			} catch {
				locale = undefined
			}
			try {
				return new Intl.DateTimeFormat(locale || undefined, { weekday: 'short', day: 'numeric' })
			} catch {
				return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' })
			}
		},

		/**
		 * The text of a day without items.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		emptyLabel() {
			const text = this.content.emptyText
			return (typeof text === 'string' && text !== '')
				? this.effectiveTranslate(text)
				: t('nextcloud-vue', 'Nothing planned')
		},

		/**
		 * @return {string} The badge on today's column.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		todayLabel() {
			return t('nextcloud-vue', 'today')
		},

		/**
		 * @return {string} The marker on a late item.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		lateLabel() {
			return t('nextcloud-vue', 'Late')
		},

		/**
		 * @return {string} The accessible name of the scrolling region.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		regionLabel() {
			return t('nextcloud-vue', 'This week, day by day')
		},

		/**
		 * @return {string} The loading text.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading…')
		},

		/**
		 * @return {string} The text shown when the items could not be loaded.
		 *
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		errorLabel() {
			return t('nextcloud-vue', 'The items for this week could not be loaded.')
		},

		/**
		 * Changes whenever a new fetch is needed.
		 *
		 * @return {string}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		sourceKey() {
			return JSON.stringify({
				s: this.content.source || {},
				f: this.dateField,
				d: this.weekDays.length > 0 ? [dayKey(this.weekDays[0]), this.weekDays.length] : [],
			})
		},
	},

	watch: {
		/** @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget */
		sourceKey() {
			this.fetchItems()
		},
	},

	mounted() {
		this.fetchItems()
	},

	methods: {
		/**
		 * Whether a date counts as late under `content.lateWhen` (default:
		 * before today).
		 *
		 * @param {Date|null} date The item's date.
		 * @return {boolean}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		isLateDate(date) {
			if (date === null) {
				return false
			}
			const rule = (this.content.lateWhen && typeof this.content.lateWhen === 'object')
				? this.content.lateWhen
				: { op: 'lt', value: 0 }
			return compareVisibleWhen(daysUntil(date, this.reference), rule.op || 'lt', rule.value ?? 0)
		},

		/**
		 * One OpenRegister record as a strip item.
		 *
		 * @param {object} row The record.
		 * @param {number} index Its position, used as a key of last resort.
		 * @return {object} The item.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		itemFromRow(row, index) {
			const c = this.content
			const id = row && (row.id || (row['@self'] && row['@self'].id))
			const date = parseDateValue(objectFieldValue(row, this.dateField))
			const titleValue = c.titleField ? objectFieldValue(row, c.titleField) : undefined
			const title = (titleValue !== undefined && titleValue !== null && titleValue !== '')
				? String(titleValue)
				: objectDisplayName(row)
			const metaFields = Array.isArray(c.metaFields) ? c.metaFields : []
			const meta = metaFields
				.map((field) => objectFieldValue(row, field))
				.filter((value) => value !== undefined && value !== null && value !== '' && typeof value !== 'object')
				.map(String)
				.join(' · ')
			const flagged = c.lateField ? objectFieldValue(row, c.lateField) === true : false
			const target = (c.itemRoute && id) ? { name: c.itemRoute, params: { id } } : null
			return {
				key: String(id || `row-${index}`),
				title,
				meta,
				date,
				late: flagged || this.isLateDate(date),
				target,
				href: target ? resolveHref(target, this.$router) : '',
			}
		},

		/**
		 * One static manifest entry as a strip item.
		 *
		 * @param {object} item The entry.
		 * @param {number} index Its position.
		 * @return {object} The item.
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		itemFromStatic(item, index) {
			const date = parseDateValue(item.date)
			let target = null
			let href = ''
			if (item.route) {
				target = typeof item.route === 'string' ? { name: item.route } : item.route
				href = resolveHref(target, this.$router)
			} else if (typeof item.href === 'string' && item.href !== '') {
				const safe = safeHref(item.href)
				href = safe === '#' ? '' : safe
			}
			return {
				key: `item-${index}`,
				title: typeof item.title === 'string' ? this.effectiveTranslate(item.title) : '',
				meta: typeof item.meta === 'string' ? this.effectiveTranslate(item.meta) : '',
				date,
				late: item.late === true || (item.late !== false && this.isLateDate(date)),
				target,
				href,
			}
		},

		/**
		 * Load the week's records in one request.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		async fetchItems() {
			if (!this.hasSource) {
				this.rows = []
				this.error = ''
				return
			}
			const s = this.content.source
			const requestKey = this.sourceKey
			const first = this.weekDays[0]
			const last = this.weekDays[this.weekDays.length - 1]
			const dayAfter = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
			this.loading = true
			this.error = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{register}/{schema}',
					{ register: s.register, schema: s.schema },
				)
				const params = {
					_limit: Number.isInteger(s.limit) && s.limit > 0 ? s.limit : DEFAULT_LIMIT,
					[`_order[${this.dateField}]`]: 'asc',
				}
				const filter = resolveFilterTokens(s.filter || {}, {})
				for (const [k, v] of Object.entries(filter || {})) {
					if (v && typeof v === 'object') {
						for (const [op, ov] of Object.entries(v)) {
							params[`${k}[${op}]`] = ov
						}
					} else if (v !== '' && v !== null && v !== undefined) {
						params[k] = v
					}
				}
				// The week window goes last, so a manifest filter on the date
				// field cannot widen the strip beyond the days it shows.
				params[`${this.dateField}[gte]`] = dayKey(first)
				params[`${this.dateField}[lt]`] = dayKey(dayAfter)
				const res = await axios.get(url, { params })
				if (requestKey !== this.sourceKey) {
					return
				}
				this.rows = (res && res.data && Array.isArray(res.data.results)) ? res.data.results : []
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[CnWeekStripWidget] failed to load items:', e)
				this.error = (e && e.message) || 'error'
				this.rows = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Route a plain click on an in-app item; the browser handles the rest.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {object} item The clicked item.
		 * @return {void}
		 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-week-strip-widget
		 */
		onItemClick(event, item) {
			if (item.target) {
				followLinkClick(event, item.target, this.$router)
			}
		},
	},
}
</script>

<style scoped>
.cn-week-strip {
	width: 100%;
}

/* `content.inset: true`: the board's inset inside the card (zuiddrecht-pixel-
   gaps-3). A dashboard renders its widgets flush, so without it the strip ran
   from card edge to card edge. Theme hook: --cn-widget-board-inset. */
.cn-week-strip--inset {
	box-sizing: border-box;
	padding: var(--cn-widget-board-inset, 16px 24px 22px);
}

.cn-week-strip__state {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	padding: 12px 4px;
	color: var(--color-text-maxcontrast);
}

.cn-week-strip__scroll {
	overflow-x: auto;
	border-radius: var(--border-radius-large, 8px);
}

.cn-week-strip__scroll:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-week-strip__days {
	display: grid;
	grid-template-columns: repeat(var(--cn-week-strip-columns, 5), minmax(128px, 1fr));
	gap: 10px;
	/* 5 columns of 128px plus gaps: below this the region scrolls sideways. */
	min-width: calc(var(--cn-week-strip-columns, 5) * 136px);
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-week-strip__day {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	padding: 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-background-hover);
}

.cn-week-strip__day--today {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-week-strip__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
	font-size: 0.85em;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-week-strip__today {
	padding: 1px 8px;
	border-radius: var(--border-radius-pill, 10px);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	font-size: 0.85em;
	font-weight: 700;
}

.cn-week-strip__items {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-week-strip__item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background);
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-week-strip__item--link:hover {
	border-color: var(--color-primary-element);
}

.cn-week-strip__item--link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* The edge is drawn inside the box, so a late item is as wide as the others. */
.cn-week-strip__item--late {
	border-color: var(--color-element-error, var(--color-error));
	box-shadow: inset 3px 0 0 0 var(--color-element-error, var(--color-error));
}

.cn-week-strip__title {
	font-size: 0.95em;
	line-height: 1.3;
	overflow-wrap: anywhere;
}

.cn-week-strip__meta {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	overflow-wrap: anywhere;
}

.cn-week-strip__late {
	font-size: 0.8em;
	font-weight: 600;
	color: var(--color-text-error, var(--color-error-text));
}

.cn-week-strip__empty {
	font-size: 0.9em;
	color: var(--color-text-maxcontrast);
}
</style>
