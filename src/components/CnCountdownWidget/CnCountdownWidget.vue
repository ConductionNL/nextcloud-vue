<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-kpi-card cn-countdown-widget"
		:class="[`cn-countdown-widget--${variant}`, { 'cn-kpi-card--board cn-countdown-widget--board': isBoardLook }]">
		<div v-if="!isBoardLook" class="cn-kpi-card__icon cn-countdown-widget__icon" :style="iconCircleStyle">
			<CnWidgetIcon :name="resolvedIcon" :size="24" />
		</div>

		<div class="cn-kpi-card__body">
			<div v-if="resolvedLabel" class="cn-kpi-card__title">
				{{ resolvedLabel }}
			</div>
			<div class="cn-kpi-card__value cn-countdown-widget__value" :style="{ color: valueColor }">
				{{ headline }}
			</div>
			<div v-if="subLabel" class="cn-countdown-widget__sub" data-testid="cn-countdown-sub">
				{{ subLabel }}
			</div>
			<dl v-if="facts.length" class="cn-countdown-widget__facts" data-testid="cn-countdown-facts">
				<template v-for="fact in facts" :key="fact.label">
					<dt>{{ fact.label }}</dt>
					<dd>{{ fact.value }}</dd>
				</template>
			</dl>
			<span
				v-if="progress !== null"
				class="cn-countdown-widget__progress"
				role="meter"
				:aria-label="progressLabel"
				:aria-valuenow="Math.round(progress)"
				aria-valuemin="0"
				aria-valuemax="100"
				data-testid="cn-countdown-progress">
				<span class="cn-countdown-widget__progress-fill" :style="{ width: `${progress}%` }" />
			</span>
			<button
				v-if="actionLabel"
				type="button"
				class="cn-countdown-widget__action"
				:class="{ 'cn-countdown-widget__action--primary': content.action && content.action.variant === 'primary' }"
				data-testid="cn-countdown-action"
				@click="runAction">
				{{ actionLabel }}
			</button>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { inject } from 'vue'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { getByPath } from '../../composables/useEndpointSource.js'
import { normalizeLook } from '../../composables/useLook.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { userLocale } from '../../utils/userLocale.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const VARIANT_COLORS = Object.freeze({
	default: 'var(--color-primary-element)',
	success: 'var(--color-success)',
	warning: 'var(--color-warning)',
	error: 'var(--color-error)',
})

/**
 * CnCountdownWidget — a KPI tile for how long is left until a date on the
 * bound record.
 *
 * Every other tile in the catalog answers "how many" by aggregating or calling
 * an endpoint. This one answers "how long", and it needs neither: the record is
 * already loaded by the detail page, so the tile reads the date straight off it
 * and does the arithmetic. No request, and nothing to go stale.
 *
 * It headlines the remaining time and carries the date itself underneath,
 * because "12 days left" and "5 October" answer different questions and a
 * handler asks both.
 *
 * ## Thresholds
 *
 * `thresholds` recolours the tile as the date approaches, in days:
 *
 * ```js
 * content: {
 *   label: 'Time left',
 *   field: 'deadline',
 *   icon: 'ClockAlertOutline',
 *   thresholds: { warn: 14, danger: 5 },
 * }
 * ```
 *
 * A date in the past reads "overdue by N days" in the error colour, never a
 * negative number: "-3 days left" is a puzzle, and an overdue case is the one
 * state a handler must not have to decode.
 *
 * ## A settled record
 *
 * `settledField` names a property on the record that is truthy once the work
 * the date belongs to is done, such as a case in its final status. A settled
 * record reads `settledLabel` (default "Closed") in no threshold colour, never
 * "overdue": a closed case missed nothing that can still be acted on, and a red
 * count of days on it sends a handler after a case that needs nobody.
 *
 * ```js
 * content: { field: 'deadline', settledField: 'isFinalStatus', settledLabel: 'Handled' }
 * ```
 *
 * ## An unset date
 *
 * Renders a dash and no threshold colour. A case with no deadline is not urgent
 * and is not on time; it simply has no deadline, and colouring it green would
 * claim otherwise.
 */
export default {
	name: 'CnCountdownWidget',

	components: {
		CnWidgetIcon,
	},

	props: {
		/**
		 * The tile's config.
		 *
		 * - `field` — property on the bound record holding the target date.
		 * - `label` — the tile's title.
		 * - `icon` — MDI icon name.
		 * - `thresholds` — `{ warn, danger }` in days remaining.
		 * - `showDate` — render the absolute date underneath (default true).
		 * - `settledField` — property on the record that is truthy once the work is done; the tile then reads `settledLabel` and never counts overdue.
		 * - `settledLabel` — the headline of a settled record, run through the host's translate function (default "Closed").
		 * - `daysLabel` — `{ one, other }` with `{count}`, the headline while days remain ("27 dagen").
		 * - `caption` — the line under the headline instead of the date, with `{date}` (the long date) and `{count}` (days left).
		 * - `startField` — property holding the start of the term; a bar then shows how much of it has passed.
		 * - `action` — one manifest action under the card (`{ label, type, variant?, ... }`, the headerActions shape; `variant: "primary"` draws it in the primary tint).
		 * - `emptyLabel` — the headline while the date is unset (default a dash).
		 * - `emptyCaption` — the line under it while the date is unset, with `{date}` read from `emptyDateField`.
		 * - `facts` — `[{ label, field }]` rows under the caption.
		 *
		 * @type {{ field?: string, label?: string, icon?: string, thresholds?: {warn?: number, danger?: number}, showDate?: boolean, settledField?: string, settledLabel?: string, daysLabel?: {one?: string, other?: string}, caption?: string, startField?: string, action?: object, emptyLabel?: string, emptyCaption?: string, emptyDateField?: string, facts?: Array<{label: string, field: string}> }}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The bound record, when the surface passes it explicitly. Falls back to
		 * the injected `cnObjectContext` a detail page provides.
		 *
		 * @type {object|null}
		 */
		objectData: {
			type: Object,
			default: null,
		},
	},

	setup() {
		return {
			cnObjectContextInjected: inject('cnObjectContext', null),
			cnDetailObjectContextInjected: inject('cnDetailObjectContext', null),
			cnTranslate: inject('cnTranslate', null),
			cnLook: inject('cnLook', 'nextcloud'),
			cnDispatchAction: inject('cnDispatchAction', null),
		}
	},

	computed: {
		/**
		 * The record to read the date from.
		 *
		 * @return {object|null} The bound record, or null.
		 */
		record() {
			if (this.objectData) {
				return this.objectData
			}
			const ctx = resolveObjectTokenContext(this.cnObjectContextInjected, this.cnDetailObjectContextInjected)
			return ctx?.object || null
		},

		/**
		 * The target date, or null when unset or unparseable.
		 *
		 * @return {Date|null} The parsed date.
		 */
		targetDate() {
			const field = this.content?.field
			if (!this.record || !field) {
				return null
			}
			const raw = getByPath(this.record, field)
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const parsed = new Date(raw)
			return Number.isNaN(parsed.getTime()) ? null : parsed
		},

		/**
		 * Whole days from today until the target. Negative once it has passed.
		 *
		 * Both ends are floored to midnight first, so "tomorrow" is 1 day away
		 * all day today rather than flipping to 0 at lunchtime.
		 *
		 * @return {number|null} Days remaining, or null.
		 */
		daysRemaining() {
			if (!this.targetDate) {
				return null
			}
			const startOfDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
			return Math.round((startOfDay(this.targetDate) - startOfDay(new Date())) / MS_PER_DAY)
		},

		/**
		 * Whether the record says its work is done (`settledField` is truthy).
		 *
		 * @return {boolean} True for a settled record.
		 * @spec openspec/changes/countdown-settled-record/specs/countdown-settled-record/spec.md#requirement-a-settled-record-never-reads-as-overdue
		 */
		isSettled() {
			const field = this.content?.settledField
			if (!this.record || !field) {
				return false
			}
			return Boolean(getByPath(this.record, field))
		},

		/**
		 * Whether the date has passed on a record still open.
		 *
		 * @return {boolean} True when overdue.
		 * @spec openspec/changes/countdown-settled-record/specs/countdown-settled-record/spec.md#requirement-a-settled-record-never-reads-as-overdue
		 */
		isOverdue() {
			return !this.isSettled && this.daysRemaining !== null && this.daysRemaining < 0
		},

		/**
		 * The headline: the remaining time in words.
		 *
		 * @return {string} The headline text.
		 * @spec openspec/changes/countdown-settled-record/specs/countdown-settled-record/spec.md#requirement-a-settled-record-never-reads-as-overdue
		 */
		headline() {
			if (this.isSettled) {
				const label = this.content?.settledLabel
				if (label) {
					return typeof this.cnTranslate === 'function' ? this.cnTranslate(label) : label
				}
				return t('nextcloud-vue', 'Closed')
			}
			const days = this.daysRemaining
			if (days === null) {
				return this.content?.emptyLabel ? this.translate(this.content.emptyLabel) : '—'
			}
			if (days < 0) {
				const overdue = Math.abs(days)
				return overdue === 1
					? t('nextcloud-vue', '1 day overdue')
					: t('nextcloud-vue', '{count} days overdue', { count: overdue })
			}
			if (days === 0) {
				return t('nextcloud-vue', 'Due today')
			}
			const labels = this.content?.daysLabel
			if (labels && typeof labels === 'object' && (labels.one || labels.other)) {
				const template = this.translate((days === 1 ? labels.one : labels.other) || labels.other || labels.one)
				return template.replace(/\{count\}/g, String(days))
			}
			if (days === 1) {
				return t('nextcloud-vue', '1 day left')
			}
			return t('nextcloud-vue', '{count} days left', { count: days })
		},

		/**
		 * Whether the app takes the board look: no icon circle.
		 *
		 * @return {boolean} True in the board look.
		 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md#requirement-the-countdown-draws-the-boards-term-card
		 */
		isBoardLook() {
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * How much of the term has passed, from `startField` to the date, in
		 * whole days and as a percentage (0 to 100), or null without a usable
		 * start.
		 *
		 * @return {number|null} The share passed.
		 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md#requirement-the-countdown-draws-the-boards-term-card
		 */
		progress() {
			const field = this.content?.startField
			if (!field || !this.record || !this.targetDate || this.isSettled) {
				return null
			}
			const raw = getByPath(this.record, field)
			const start = raw === null || raw === undefined || raw === '' ? null : new Date(raw)
			if (!start || Number.isNaN(start.getTime())) {
				return null
			}
			const startOfDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
			const span = startOfDay(this.targetDate) - startOfDay(start)
			if (span <= 0) {
				return null
			}
			return Math.min(100, Math.max(0, ((startOfDay(new Date()) - startOfDay(start)) / span) * 100))
		},

		/**
		 * The `facts` rows under the caption (`[{ label, field }]`), with
		 * their values read off the record; a row without a value is left out.
		 *
		 * @return {Array<{label: string, value: string}>} The rows.
		 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md#requirement-the-countdown-draws-the-boards-term-card
		 */
		facts() {
			const rows = Array.isArray(this.content?.facts) ? this.content.facts : []
			return rows
				.filter((row) => row && typeof row.label === 'string' && typeof row.field === 'string')
				.map((row) => {
					const value = this.record ? getByPath(this.record, row.field) : null
					return { label: this.translate(row.label), value: value === null || value === undefined ? '' : this.translate(String(value)) }
				})
				.filter((row) => row.value !== '')
		},

		/** @return {string} The accessible name of the progress bar. */
		progressLabel() {
			return t('nextcloud-vue', 'Time passed')
		},

		/**
		 * The label of `content.action`, translated, or ''.
		 *
		 * @return {string} The label.
		 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md#requirement-the-countdown-draws-the-boards-term-card
		 */
		actionLabel() {
			const action = this.content?.action
			return action && typeof action === 'object' && typeof action.label === 'string' && action.label !== ''
				? this.translate(action.label)
				: ''
		},

		/**
		 * The absolute date under the headline, so the tile answers "how long"
		 * and "when" at once.
		 *
		 * @return {string} The formatted date, or ''.
		 */
		subLabel() {
			if (!this.targetDate && typeof this.content?.emptyCaption === 'string' && this.content.emptyCaption !== '') {
				const raw = this.content.emptyDateField && this.record ? getByPath(this.record, this.content.emptyDateField) : null
				const when = raw ? new Date(raw) : null
				const date = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString(userLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) : ''
				return this.translate(this.content.emptyCaption).replace(/\{date\}/g, date)
			}
			if (!this.targetDate || this.content?.showDate === false) {
				return ''
			}
			const date = this.targetDate.toLocaleDateString(userLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
			const caption = this.content?.caption
			if (typeof caption === 'string' && caption !== '') {
				return this.translate(caption).replace(/\{date\}/g, date).replace(/\{count\}/g, String(this.daysRemaining ?? ''))
			}
			return date
		},

		/**
		 * The threshold band this date falls in.
		 *
		 * @return {string} One of default / success / warning / error.
		 * @spec openspec/changes/countdown-settled-record/specs/countdown-settled-record/spec.md#requirement-a-settled-record-never-reads-as-overdue
		 */
		variant() {
			const days = this.daysRemaining
			if (days === null || this.isSettled) {
				return 'default'
			}
			if (days < 0) {
				return 'error'
			}
			const thresholds = this.content?.thresholds || {}
			if (Number.isFinite(thresholds.danger) && days <= thresholds.danger) {
				return 'error'
			}
			if (Number.isFinite(thresholds.warn) && days <= thresholds.warn) {
				return 'warning'
			}
			return 'default'
		},

		/** @return {string} The value colour for the current band. */
		valueColor() {
			if (this.isBoardLook && this.variant === 'default') {
				return 'var(--color-main-text)'
			}
			return VARIANT_COLORS[this.variant] || VARIANT_COLORS.default
		},

		/** @return {string} The tile label. */
		resolvedLabel() {
			return this.content?.label || ''
		},

		/** @return {string} The MDI icon name. */
		resolvedIcon() {
			return this.content?.icon || 'ClockOutline'
		},

		/** @return {object} Inline style for the icon circle. */
		iconCircleStyle() {
			return { color: this.valueColor }
		},
	},

	methods: {
		/**
		 * The host's translate, or the text unchanged.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation.
		 */
		translate(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Dispatch `content.action` with the record's tokens resolved, through
		 * the page's dispatcher when there is one.
		 *
		 * @return {unknown}
		 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md#requirement-the-countdown-draws-the-boards-term-card
		 */
		runAction() {
			const action = this.content?.action
			if (!action || typeof action !== 'object') {
				return undefined
			}
			const ctx = resolveObjectTokenContext(this.cnObjectContextInjected, this.cnDetailObjectContextInjected) || {}
			const tokenCtx = { ...ctx, object: this.record || ctx.object || null, objectId: this.record?.id ?? ctx.objectId ?? null }
			const resolved = resolveDeepTokens(action, tokenCtx)
			if (typeof this.cnDispatchAction === 'function') {
				return this.cnDispatchAction(resolved)
			}
			return dispatchAction(resolved, { router: this.$router || null, tokenCtx })
		},
	},
}
</script>

<style scoped>
.cn-countdown-widget__value {
	white-space: nowrap;
}

.cn-countdown-widget__progress {
	background: var(--color-border);
	border-radius: 3px;
	display: block;
	height: 6px;
	margin-block-start: 10px;
	overflow: hidden;
}

.cn-countdown-widget__progress-fill {
	background: var(--color-primary-element);
	display: block;
	height: 100%;
}

.cn-countdown-widget__action {
	align-self: flex-start;
	background: var(--color-background-dark);
	border: 0;
	border-radius: var(--border-radius-pill, 17px);
	color: var(--color-main-text);
	font-weight: 600;
	margin-block-start: 10px;
	min-height: 34px;
	padding: 0 12px;
}

/* The board draws the term card's action as a 34px chip with 13px text and
   a 17px radius (DqZaak "Termijn opschorten"); Nextcloud's pill radius is
   100px and its text 15px. */
.cn-countdown-widget--board .cn-countdown-widget__action {
	border-radius: 17px;
	font-size: 13px;
}

.cn-countdown-widget__action--primary {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
}

.cn-countdown-widget__facts {
	display: grid;
	gap: 8px 16px;
	grid-template-columns: max-content 1fr;
	margin: 10px 0 0;
}

.cn-countdown-widget__facts dt {
	color: var(--color-text-maxcontrast);
}

.cn-countdown-widget__facts dd {
	margin: 0;
}

.cn-countdown-widget__action:hover,
.cn-countdown-widget__action:focus-visible {
	background: var(--color-background-hover);
}

.cn-countdown-widget__sub {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}
</style>
