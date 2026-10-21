<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-week-strip" :class="{ 'cn-week-strip--inset': inset }" data-testid="cn-week-strip">
		<div v-if="hasHeader" class="cn-week-strip__header" data-testid="cn-week-strip-header">
			<h2 v-if="heading" class="cn-week-strip__heading">
				{{ heading }}
			</h2>
			<div v-if="navigation" class="cn-week-strip__nav">
				<NcButton
					variant="tertiary"
					:aria-label="mode === 'today' ? previousDayLabel : previousWeekLabel"
					data-testid="cn-week-strip-previous"
					@click="move(-1)">
					<template #icon>
						<ChevronLeft :size="20" />
					</template>
				</NcButton>
				<span class="cn-week-strip__range" aria-live="polite" data-testid="cn-week-strip-range">{{ rangeLabel }}</span>
				<NcButton
					variant="tertiary"
					:aria-label="mode === 'today' ? nextDayLabel : nextWeekLabel"
					data-testid="cn-week-strip-next"
					@click="move(1)">
					<template #icon>
						<ChevronRight :size="20" />
					</template>
				</NcButton>
				<NcButton
					v-if="!showsToday"
					variant="tertiary"
					data-testid="cn-week-strip-today"
					@click="goToday">
					{{ backToTodayLabel }}
				</NcButton>
			</div>
			<div
				v-if="modes"
				class="cn-week-strip__modes"
				role="group"
				:aria-label="viewModeLabel">
				<NcButton
					:variant="mode === 'today' ? 'primary' : 'secondary'"
					:aria-pressed="mode === 'today' ? 'true' : 'false'"
					data-testid="cn-week-strip-mode-today"
					@click="setMode('today')">
					{{ todayModeLabel }}
				</NcButton>
				<NcButton
					:variant="mode === 'week' ? 'primary' : 'secondary'"
					:aria-pressed="mode === 'week' ? 'true' : 'false'"
					data-testid="cn-week-strip-mode-week"
					@click="setMode('week')">
					{{ weekModeLabel }}
				</NcButton>
			</div>
		</div>
		<NcNoteCard
			v-for="notice in shownNotices"
			:key="notice.key"
			:type="notice.type"
			data-testid="cn-week-strip-notice">
			{{ notice.text }}
		</NcNoteCard>
		<!-- @slot notice Content above the days, such as a note about where the items come from. -->
		<slot name="notice" />
		<section
			v-if="summary"
			class="cn-week-strip__summary"
			aria-live="polite"
			data-testid="cn-week-strip-summary">
			<h3 class="cn-week-strip__summary-title">
				{{ summary.title }}
			</h3>
			<ul class="cn-week-strip__summary-list">
				<li v-for="entry in summary.items" :key="entry.key" class="cn-week-strip__summary-item">
					<span class="cn-week-strip__title">{{ entry.title }}</span>
					<span v-if="entry.badge" class="cn-week-strip__badge" :class="`cn-week-strip__badge--${entry.badge.variant}`">{{ entry.badge.label }}</span>
					<span v-if="entry.meta" class="cn-week-strip__meta">{{ entry.meta }}</span>
				</li>
			</ul>
		</section>
		<div v-if="isLoading" class="cn-week-strip__state" role="status">
			<NcLoadingIcon :size="20" />
			<span class="cn-week-strip__state-text">{{ loadingLabel }}</span>
		</div>
		<p v-else-if="hasError" class="cn-week-strip__state" role="status">
			{{ errorLabel }}
		</p>
		<p v-else-if="weekEmpty" class="cn-week-strip__state" data-testid="cn-week-strip-week-empty">
			{{ weekEmptyLabel }}
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
						<li v-for="item in day.shown" :key="item.key" class="cn-week-strip__item-row">
							<component
								:is="item.href ? 'a' : 'div'"
								class="cn-week-strip__item"
								:class="{ 'cn-week-strip__item--late': item.late, 'cn-week-strip__item--link': !!item.href, 'cn-week-strip__item--muted': item.muted }"
								:href="item.href || null"
								data-testid="cn-week-strip-item"
								@click="onItemClick($event, item)">
								<span v-if="item.time" class="cn-week-strip__time">{{ item.time }}</span>
								<strong class="cn-week-strip__title">{{ item.title }}</strong>
								<span v-if="item.meta" class="cn-week-strip__meta">{{ item.meta }}</span>
								<span
									v-if="item.badge"
									class="cn-week-strip__badge"
									:class="`cn-week-strip__badge--${item.badge.variant}`"
									data-testid="cn-week-strip-badge">{{ item.badge.label }}</span>
								<span v-if="item.late" class="cn-week-strip__late">{{ lateLabel }}</span>
							</component>
							<CnActionButtons
								v-if="item.actions.length > 0"
								class="cn-week-strip__actions"
								:actions="item.actions"
								data-testid="cn-week-strip-item-actions" />
						</li>
					</ul>
					<!-- `maxPerDay`: the rest of a full day sits behind "+N more": a link
					     to `moreRoute`, or a button that opens the day in place. -->
					<a
						v-if="day.hidden > 0 && moreHref"
						class="cn-week-strip__more"
						:href="moreHref"
						data-testid="cn-week-strip-more"
						@click="onMoreClick($event)">{{ moreLabel(day.hidden) }}</a>
					<button
						v-else-if="day.hidden > 0 || day.expanded"
						type="button"
						class="cn-week-strip__more"
						:aria-expanded="day.expanded ? 'true' : 'false'"
						data-testid="cn-week-strip-more"
						@click="toggleDay(day.key)">
						{{ day.expanded ? lessLabel : moreLabel(day.hidden) }}
					</button>
					<span v-if="day.items.length === 0" class="cn-week-strip__empty">{{ emptyLabel }}</span>
				</li>
			</ol>
		</div>
	</div>
</template>

<script>
import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { ref } from 'vue'
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import { useEndpointSource } from '../../composables/useEndpointSource.js'
import { dayKey, daysUntil, parseDateValue } from '../../utils/dateVariant.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { fillItemTokens } from '../../utils/itemTokens.js'
import { followLinkClick, resolveHref } from '../../utils/linkNavigation.js'
import { objectDisplayName, objectFieldValue } from '../../utils/objectName.js'
import { readPath } from '../../utils/readPath.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { safeHref } from '../../utils/safeHref.js'
import { compareVisibleWhen, evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { CnActionButtons } from '../CnActionButtons/index.js'

const DEFAULT_LIMIT = 100

/**
 * CnWeekStripWidget shows the current week as day columns, with the items
 * that fall on each day listed under it. Use it for deadlines, appointments
 * or anything else that has a date and that somebody should see coming.
 *
 * It renders the five working days by default (`days: 7` adds the weekend),
 * highlights today, marks items that are late, and says so when a day has
 * nothing. On a narrow screen the strip scrolls sideways; under the board
 * look (`.cn-look-board`) the days wrap into rows instead.
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

	components: { ChevronLeft, ChevronRight, CnActionButtons, NcButton, NcLoadingIcon, NcNoteCard },

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
		 * below) instead of from card edge to card edge. `maxPerDay` caps the
		 * items a day shows; the rest sit behind "+N more", a link to
		 * `moreRoute` (a route name or object) or, without one, a button that
		 * opens the day in place. `moreLabel` replaces the text (`{count}` is
		 * the number hidden).
		 *
		 * The week view (`endpointSource` and the keys after it):
		 * - `endpointSource` `{ url, params?, responsePath? }` reads the items from an app endpoint;
		 *   `@range.from` and `@range.to` in it are the first day shown and the day after the last
		 *   (`YYYY-MM-DD`). `itemsPath` (default `items`) is the list in the answer, and `itemLists`
		 *   (`[{ path, dateField?, titleTemplate?, ... }]`) more lists of the same answer, each taking
		 *   the item keys below for itself.
		 * - Item keys: `titleTemplate` and `metaTemplates` (fillTemplate templates, a list being
		 *   candidates), `timeFields` `{ start, end }` (an ISO moment or `HH:MM`), `badgeField` with
		 *   `variantMap` `{ <value>: { label, variant?, muted? } }`, `itemActions` (CnActionButtons
		 *   actions, `@item.<path>` and `@item` filled from the item, a local `visibleWhen` over
		 *   `item.<path>`), and `itemRouteWhen`, a local condition on the item for its `itemRoute` link.
		 * - `navigation: true` draws previous, next and back-to-today; `modes: true` a Today / Week
		 *   switch (`defaultMode` picks the first); `heading` a heading.
		 * - `notices` `[{ path, equals?, notEquals?, missing?, type?, text }]` are notes on the answer;
		 *   `summary` `{ title, path, itemTitle, itemMeta?, badgeField?, variantMap? }` lists the
		 *   answer's entries at `path` above the days (today's changes); `weekEmptyText` replaces the
		 *   days when none has an item.
		 *
		 * @type {{maxPerDay?: number, moreRoute?: (string|object), moreLabel?: string, days?: (5|7), inset?: boolean, source?: {register?: string, schema?: string, filter?: object, limit?: number}, dateField?: string, titleField?: string, metaFields?: Array<string>, itemRoute?: string, lateWhen?: {op?: string, value?: number}, lateField?: string, items?: Array<{title: string, meta?: string, date: string, route?: (string|object), href?: string, late?: boolean}>, emptyText?: string, weekOffset?: number}}
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

	setup(props) {
		const range = ref(null)
		const hasEndpoint = () => Boolean(props.content && props.content.endpointSource && props.content.endpointSource.url)
		const { data: answer, loading: answerLoading, error: answerError } = useEndpointSource(
			() => (hasEndpoint() && range.value ? props.content.endpointSource : null),
			{ ctx: () => ({ range: range.value || {} }) },
		)
		return { range, answer, answerLoading, answerError }
	},

	data() {
		return {
			/** The day the shown week (or day) is anchored on; null is the reference day. */
			anchor: null,
			/** `week` or `today`. */
			mode: this.content && this.content.defaultMode === 'today' ? 'today' : 'week',
			rows: [],
			loading: false,
			error: '',
			/** The days opened past `maxPerDay`, by day key. */
			expandedDays: {},
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
			const ref = this.anchor || this.reference
			if (this.mode === 'today') {
				return [new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())]
			}
			const offset = Number.isInteger(this.content.weekOffset) ? this.content.weekOffset : 0
			const mondayDelta = (ref.getDay() + 6) % 7
			const days = []
			for (let i = 0; i < this.dayCount; i++) {
				days.push(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - mondayDelta + (offset * 7) + i))
			}
			return days
		},

		/** @return {boolean} Whether the items come from an app endpoint. */
		hasEndpoint() {
			return Boolean(this.content.endpointSource && this.content.endpointSource.url)
		},

		/** @return {boolean} Whether the header row is drawn. */
		hasHeader() {
			return this.navigation || this.modes || this.heading !== ''
		},

		navigation() {
			return this.content.navigation === true
		},

		modes() {
			return this.content.modes === true
		},

		heading() {
			return typeof this.content.heading === 'string' && this.content.heading !== '' ? this.effectiveTranslate(this.content.heading) : ''
		},

		/** @return {boolean} Whether the shown days include today. */
		showsToday() {
			const today = dayKey(this.reference)
			return this.weekDays.some((day) => dayKey(day) === today)
		},

		/**
		 * The shown days as a range: the first, and the day after the last.
		 *
		 * @return {{from: string, to: string}}
		 * @spec openspec/changes/week-view/specs/week-view/spec.md#requirement-a-week-view-reads-its-week-from-an-endpoint-and-moves-through-weeks
		 */
		shownRange() {
			const first = this.weekDays[0]
			const last = this.weekDays[this.weekDays.length - 1]
			return { from: dayKey(first), to: dayKey(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)) }
		},

		/** @return {string} The shown days, "5 Oct to 9 Oct" or one day. */
		rangeLabel() {
			const format = (date) => this.formatWith({ day: 'numeric', month: 'short' }, date)
			const first = this.weekDays[0]
			const last = this.weekDays[this.weekDays.length - 1]
			return this.weekDays.length === 1
				? this.formatWith({ weekday: 'long', day: 'numeric', month: 'long' }, first)
				: t('nextcloud-vue', '{from} to {to}', { from: format(first), to: format(last) })
		},

		/**
		 * The lists of the endpoint answer and how each reads its items.
		 *
		 * @return {Array<object>}
		 */
		itemSpecs() {
			const c = this.content
			const base = { ...c, path: c.itemsPath || 'items' }
			const extra = (Array.isArray(c.itemLists) ? c.itemLists : [])
				.filter((spec) => spec && typeof spec.path === 'string')
				.map((spec) => ({ dateField: c.dateField, ...spec }))
			return [base, ...extra]
		},

		shownNotices() {
			return (Array.isArray(this.content.notices) ? this.content.notices : [])
				.map((notice, index) => ({ ...notice, key: index }))
				.filter((notice) => this.answerMatches(notice))
				.map((notice) => ({ key: notice.key, type: notice.type || 'info', text: this.effectiveTranslate(notice.text || '') }))
		},

		/**
		 * The list above the days (`summary`), or null when it has no entries.
		 *
		 * @return {{title: string, items: Array<object>}|null}
		 */
		summary() {
			const spec = this.content.summary
			if (!spec || typeof spec !== 'object' || !spec.path || !this.answer) {
				return null
			}
			const list = readPath(this.answer, spec.path)
			if (!Array.isArray(list) || list.length === 0) {
				return null
			}
			return {
				title: this.effectiveTranslate(spec.title || ''),
				items: list.filter((row) => row && typeof row === 'object').map((row, index) => ({
					key: String(row.id ?? index),
					title: this.template(spec.itemTitle || '{title}', row),
					meta: this.templates(spec.itemMeta, row),
					badge: this.badgeOf(row, spec),
				})),
			}
		},

		/** @return {boolean} Whether no shown day has an item and a week-empty text is set. */
		weekEmpty() {
			return Boolean(this.content.weekEmptyText) && this.normalizedItems.every((item) => item.date === null || !this.weekDays.some((day) => dayKey(day) === dayKey(item.date)))
		},

		weekEmptyLabel() {
			return this.effectiveTranslate(this.content.weekEmptyText || '')
		},

		previousWeekLabel() {
			return t('nextcloud-vue', 'Previous week')
		},

		nextWeekLabel() {
			return t('nextcloud-vue', 'Next week')
		},

		previousDayLabel() {
			return t('nextcloud-vue', 'Previous day')
		},

		nextDayLabel() {
			return t('nextcloud-vue', 'Next day')
		},

		backToTodayLabel() {
			return t('nextcloud-vue', 'Back to today')
		},

		viewModeLabel() {
			return t('nextcloud-vue', 'View')
		},

		todayModeLabel() {
			return t('nextcloud-vue', 'Today')
		},

		weekModeLabel() {
			return t('nextcloud-vue', 'Week')
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
			if (this.hasEndpoint) {
				return this.itemsFromAnswer()
			}
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
				const items = (buckets[key] || []).slice().sort((a, b) => (a.sortKey || '').localeCompare(b.sortKey || ''))
				const expanded = this.expandedDays[key] === true
				const cap = this.maxPerDay > 0 && !expanded ? this.maxPerDay : items.length
				return {
					key,
					label: formatter.format(day),
					today: key === todayKey,
					items,
					shown: items.slice(0, cap),
					hidden: Math.max(0, items.length - cap),
					expanded: expanded && this.maxPerDay > 0 && items.length > this.maxPerDay,
				}
			})
		},

		/**
		 * The most items a day shows (`content.maxPerDay`), or 0 for no cap.
		 *
		 * @return {number}
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		maxPerDay() {
			const value = Number(this.content.maxPerDay)
			return Number.isInteger(value) && value > 0 ? value : 0
		},

		/**
		 * Where "+N more" leads (`content.moreRoute`), or null to open the day in place.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		moreTarget() {
			const route = this.content.moreRoute
			if (typeof route === 'string' && route !== '') {
				return { name: route }
			}
			return route && typeof route === 'object' ? route : null
		},

		/**
		 * @return {string} The href of the "+N more" link, '' without a target.
		 *
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		moreHref() {
			return this.moreTarget ? (resolveHref(this.moreTarget, this.$router) || '') : ''
		},

		/**
		 * @return {string} The text that closes an opened day.
		 *
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		lessLabel() {
			return t('nextcloud-vue', 'Show less')
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

		isLoading() {
			return this.hasEndpoint ? this.answerLoading && !this.answer : this.loading
		},

		hasError() {
			return this.hasEndpoint ? Boolean(this.answerError) : Boolean(this.error)
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

		shownRange: {
			immediate: true,
			handler(value) {
				this.range = value
			},
		},
	},

	mounted() {
		this.fetchItems()
	},

	methods: {
		/**
		 * Format a date with Intl options in the Nextcloud locale.
		 *
		 * @param {object} options Intl options.
		 * @param {Date} date The date.
		 * @return {string}
		 */
		formatWith(options, date) {
			let locale
			try {
				locale = getCanonicalLocale()
			} catch {
				locale = undefined
			}
			try {
				return new Intl.DateTimeFormat(locale || undefined, options).format(date)
			} catch {
				return new Intl.DateTimeFormat(undefined, options).format(date)
			}
		},

		/**
		 * Move the shown week (or day) by `step`.
		 *
		 * @param {number} step -1 or 1.
		 * @return {void}
		 * @spec openspec/changes/week-view/specs/week-view/spec.md#requirement-a-week-view-reads-its-week-from-an-endpoint-and-moves-through-weeks
		 */
		move(step) {
			const ref = this.anchor || this.reference
			const days = this.mode === 'today' ? step : step * 7
			this.anchor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + days)
		},

		goToday() {
			this.anchor = null
		},

		setMode(mode) {
			this.mode = mode === 'today' ? 'today' : 'week'
		},

		answerMatches(rule) {
			if (!rule || !rule.path || !this.answer) {
				return false
			}
			const value = readPath(this.answer, rule.path)
			const present = value !== null && value !== undefined && value !== '' && value !== false && !(Array.isArray(value) && value.length === 0)
			if (Object.hasOwn(rule, 'equals')) {
				return value === rule.equals
			}
			if (Object.hasOwn(rule, 'notEquals')) {
				return present && value !== rule.notEquals
			}
			return rule.missing === true ? !present : present
		},

		/**
		 * A template (or a list of candidates) filled from a row, translated.
		 *
		 * @param {string|Array<string>} template The template.
		 * @param {object} row The row.
		 * @return {string}
		 */
		template(template, row) {
			if (Array.isArray(template)) {
				return firstFilled(template, row, (text) => this.effectiveTranslate(text))
			}
			return typeof template === 'string' && template !== '' ? fillTemplate(this.effectiveTranslate(template), row) : ''
		},

		templates(list, row) {
			return (Array.isArray(list) ? list : (list ? [list] : []))
				.map((entry) => this.template(entry, row))
				.filter((text) => text !== '')
				.join(' · ')
		},

		badgeOf(row, spec) {
			if (!spec.badgeField || !spec.variantMap) {
				return null
			}
			const entry = spec.variantMap[String(readPath(row, spec.badgeField) ?? '')]
			return entry && entry.label ? { label: this.effectiveTranslate(entry.label), variant: entry.variant || 'info', muted: entry.muted === true } : null
		},

		/**
		 * A clock time from an ISO moment or `HH:MM`, '' otherwise.
		 *
		 * @param {unknown} value The value.
		 * @return {string}
		 */
		clock(value) {
			if (typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)) {
				return value.slice(0, 5)
			}
			const date = parseDateValue(value)
			return date ? this.formatWith({ hour: '2-digit', minute: '2-digit' }, date) : ''
		},

		/**
		 * Every item of the endpoint answer, from each configured list.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/week-view/specs/week-view/spec.md#requirement-a-week-view-reads-its-week-from-an-endpoint-and-moves-through-weeks
		 */
		itemsFromAnswer() {
			if (!this.answer) {
				return []
			}
			const items = []
			this.itemSpecs.forEach((spec, listIndex) => {
				const list = readPath(this.answer, spec.path)
				;(Array.isArray(list) ? list : []).forEach((row, index) => {
					if (row && typeof row === 'object') {
						items.push(this.itemFromAnswerRow(row, spec, `${listIndex}-${index}`))
					}
				})
			})
			return items
		},

		/**
		 * One answer row as an item of the week view.
		 *
		 * @param {object} row The row.
		 * @param {object} spec How its list reads.
		 * @param {string} fallbackKey A key when the row has no id.
		 * @return {object}
		 */
		itemFromAnswerRow(row, spec, fallbackKey) {
			const id = row.id || (row['@self'] && row['@self'].id)
			const date = parseDateValue(readPath(row, spec.dateField || ''))
			const times = spec.timeFields && typeof spec.timeFields === 'object' ? spec.timeFields : {}
			const start = times.start ? this.clock(readPath(row, times.start)) : ''
			const end = times.end ? this.clock(readPath(row, times.end)) : ''
			let title = this.template(spec.titleTemplate, row)
			if (title === '') {
				const value = spec.titleField ? readPath(row, spec.titleField) : undefined
				title = value !== undefined && value !== null && value !== '' ? String(value) : objectDisplayName(row)
			}
			const badge = this.badgeOf(row, spec)
			const linked = spec.itemRoute && id && (!spec.itemRouteWhen || evaluateVisibleWhenLocal(spec.itemRouteWhen, row))
			const target = linked ? { name: spec.itemRoute, params: { id } } : null
			const scope = { item: row }
			const actions = (Array.isArray(spec.itemActions) ? spec.itemActions : [])
				.filter((action) => action && typeof action === 'object')
				.filter((action) => !action.visibleWhen || evaluateVisibleWhenLocal(action.visibleWhen, scope))
				.map((action, index) => {
					const { visibleWhen, ...rest } = action
					return { ...fillItemTokens(rest, scope), id: `${action.id || 'item-action'}-${id || fallbackKey}-${index}` }
				})
			return {
				key: String(id || `answer-${fallbackKey}`),
				title,
				meta: this.templates(spec.metaTemplates, row),
				time: start && end ? `${start}–${end}` : start,
				sortKey: start,
				date,
				late: false,
				badge,
				muted: Boolean(badge && badge.muted),
				actions,
				target,
				href: target ? resolveHref(target, this.$router) : '',
			}
		},

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
				actions: [],
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
				actions: [],
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
		 * The text of the "+N more" control: `content.moreLabel` with `{count}`
		 * filled, else "+N more" from the library's catalogue.
		 *
		 * @param {number} count The number of hidden items.
		 * @return {string}
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		moreLabel(count) {
			const own = this.content.moreLabel
			if (typeof own === 'string' && own !== '') {
				return this.effectiveTranslate(own).replace(/\{count\}/g, String(count))
			}
			return t('nextcloud-vue', '+{count} more', { count })
		},

		/**
		 * Open or close a day past its cap.
		 *
		 * @param {string} key The day key.
		 * @return {void}
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		toggleDay(key) {
			this.expandedDays = { ...this.expandedDays, [key]: this.expandedDays[key] !== true }
		},

		/**
		 * Route a plain click on the "+N more" link.
		 *
		 * @param {MouseEvent} event The click.
		 * @return {void}
		 * @spec openspec/changes/screens-week-strip-max-per-day/specs/week-strip-max-per-day/spec.md#requirement-a-day-shows-at-most-maxperday-items
		 */
		onMoreClick(event) {
			if (this.moreTarget) {
				followLinkClick(event, this.moreTarget, this.$router)
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

.cn-week-strip__header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px 16px;
	margin-bottom: 12px;
}

.cn-week-strip__heading {
	margin: 0;
}

.cn-week-strip__nav,
.cn-week-strip__modes {
	display: flex;
	align-items: center;
	gap: 4px;
}

.cn-week-strip__range {
	min-width: 9em;
	text-align: center;
}

.cn-week-strip__summary {
	margin-bottom: 12px;
}

.cn-week-strip__summary-title {
	margin: 0 0 4px;
}

.cn-week-strip__summary-list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-week-strip__summary-item {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 8px;
	align-items: baseline;
}

.cn-week-strip__time {
	color: var(--color-text-maxcontrast);
	font-variant-numeric: tabular-nums;
}

.cn-week-strip__badge {
	align-self: flex-start;
	padding: 0 6px;
	border-radius: var(--border-radius-pill, 12px);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-size: 0.85em;
}

.cn-week-strip__badge--error {
	background: var(--color-error);
	color: var(--color-error-text, #fff);
}

.cn-week-strip__badge--warning {
	background: var(--color-warning);
	color: var(--color-warning-text, #000);
}

.cn-week-strip__badge--success {
	background: var(--color-success);
	color: var(--color-success-text, #fff);
}

.cn-week-strip__item--muted .cn-week-strip__title {
	text-decoration: line-through;
}

.cn-week-strip__actions {
	margin-top: 4px;
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

/* "+N more" under a capped day: a quiet text control, 24px high to click. */
.cn-week-strip__more {
	align-self: flex-start;
	min-height: 24px;
	margin: 0;
	padding: 2px 4px;
	border: 0;
	border-radius: var(--border-radius, 4px);
	background: transparent;
	color: var(--color-primary-element);
	font: inherit;
	font-size: 0.85em;
	font-weight: 600;
	text-decoration: none;
	cursor: pointer;
}

.cn-week-strip__more:hover {
	text-decoration: underline;
}

.cn-week-strip__more:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}
</style>
