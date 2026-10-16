<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-kpi-card cn-countdown-widget" :class="`cn-countdown-widget--${variant}`">
		<div class="cn-kpi-card__icon cn-countdown-widget__icon" :style="iconCircleStyle">
			<CnWidgetIcon :name="resolvedIcon" :size="24" />
		</div>

		<div class="cn-kpi-card__body">
			<div v-if="resolvedLabel" class="cn-kpi-card__title">
				{{ resolvedLabel }}
			</div>
			<div class="cn-kpi-card__value cn-countdown-widget__value" :style="{ color: valueColor }">
				{{ headline }}
			</div>
			<div v-if="subLabel" class="cn-countdown-widget__sub">
				{{ subLabel }}
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { inject } from 'vue'
import CnWidgetIcon from '../CnWidgetGrid/CnWidgetIcon.vue'
import { getByPath } from '../../composables/useEndpointSource.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
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
		 *
		 * @type {{ field?: string, label?: string, icon?: string, thresholds?: {warn?: number, danger?: number}, showDate?: boolean, settledField?: string, settledLabel?: string }}
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
				return '—'
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
			if (days === 1) {
				return t('nextcloud-vue', '1 day left')
			}
			return t('nextcloud-vue', '{count} days left', { count: days })
		},

		/**
		 * The absolute date under the headline, so the tile answers "how long"
		 * and "when" at once.
		 *
		 * @return {string} The formatted date, or ''.
		 */
		subLabel() {
			if (!this.targetDate || this.content?.showDate === false) {
				return ''
			}
			return this.targetDate.toLocaleDateString(userLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
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
}
</script>

<style scoped>
.cn-countdown-widget__value {
	white-space: nowrap;
}

.cn-countdown-widget__sub {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}
</style>
