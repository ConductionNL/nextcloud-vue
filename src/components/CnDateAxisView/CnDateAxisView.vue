<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-date-axis-view" data-testid="cn-date-axis-view">
		<p v-if="empty" class="cn-date-axis-view__empty" data-testid="cn-date-axis-empty">
			{{ emptyText }}
		</p>

		<template v-else>
			<div
				v-for="lane in lanes"
				:key="`lane-${lane.key}`"
				class="cn-date-axis-view__lane"
				data-testid="cn-date-axis-lane"
				:data-lane="lane.key">
				<h3 v-if="lane.key !== ''" class="cn-date-axis-view__lane-header">
					{{ lane.label }}
				</h3>

				<div
					v-for="(track, index) in lane.tracks"
					:key="`track-${lane.key}-${index}`"
					class="cn-date-axis-view__track"
					data-testid="cn-date-axis-track"
					role="list">
					<button
						v-for="bar in track"
						:key="`bar-${barKey(bar)}`"
						class="cn-date-axis-view__bar"
						data-testid="cn-date-axis-bar"
						role="listitem"
						:data-bar-id="barKey(bar)"
						:style="barStyle(bar)"
						:aria-label="barLabel(bar)"
						@click="openRow(bar.row)">
						{{ barText(bar) }}
					</button>
				</div>
			</div>

			<!--
				Work with no usable dates. A time scale has nowhere to put it,
				and a planner opening this view is looking for exactly this, so
				it is a visible lane rather than a row that never renders.
			-->
			<div
				v-if="unplanned.rows.length > 0"
				class="cn-date-axis-view__lane cn-date-axis-view__lane--unplanned"
				data-testid="cn-date-axis-unplanned">
				<h3 class="cn-date-axis-view__lane-header">
					{{ unplanned.label }} ({{ unplanned.rows.length }})
				</h3>
				<button
					v-for="row in unplanned.rows"
					:key="`unplanned-${rowKeyOf(row)}`"
					class="cn-date-axis-view__bar cn-date-axis-view__bar--unplanned"
					data-testid="cn-date-axis-unplanned-row"
					:data-row-id="rowKeyOf(row)"
					:aria-label="unplannedLabelFor(row)"
					@click="openRow(row)">
					{{ nameOf(row) }}
				</button>
			</div>
		</template>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { buildDateAxisLanes } from '../../utils/dateAxisLanes.js'

/**
 * CnDateAxisView — the index page's rows on a time scale.
 *
 * 🔴 IT HIDES NOTHING, AND IT RESCHEDULES NOTHING. A planner opens this to find
 * the week where three things land on one person, so overlapping bars get
 * their own track and the lane grows taller rather than losing a bar. Nothing
 * here writes: a date-axis view that moved a bar on drag would be changing
 * statutory dates from a picture, and the one gesture is opening the row.
 *
 * 🔴 EVERY BAR IS A BUTTON WITH AN ACCESSIBLE NAME. A bar positioned by
 * percentage says nothing at all to a reader who cannot see it, so the name
 * carries the row, the lane and both dates in words. `title` alone would not:
 * it is not read reliably and it cannot be reached by keyboard.
 *
 * `buildDateAxisLanes` decides the layout and is tested on its own.
 *
 * @event {object} row-click — A bar was opened. Payload: the row.
 */
export default {
	name: 'CnDateAxisView',

	props: {
		/** The rows the list holds. */
		rows: {
			type: Array,
			default: () => [],
		},

		/** Where a row's start is. */
		startField: {
			type: String,
			default: '',
		},

		/** Where a row's end is. */
		endField: {
			type: String,
			default: '',
		},

		/** What to put in a lane together. */
		laneField: {
			type: String,
			default: '',
		},

		/** The field a bar is named by. */
		labelField: {
			type: String,
			default: '',
		},

		/** The row key. */
		rowKey: {
			type: String,
			default: 'id',
		},
	},

	emits: ['row-click'],

	computed: {
		/** @return {object} The layout. */
		layout() {
			return buildDateAxisLanes({
				rows: this.rows,
				startField: this.startField,
				endField: this.endField,
				laneField: this.laneField,
				unplannedLabel: t('nextcloud-vue', 'Unplanned'),
			})
		},

		/** @return {Array<object>} The lanes. */
		lanes() {
			return this.layout.lanes
		},

		/** @return {object} The rows that could not be placed. */
		unplanned() {
			return this.layout.unplanned
		},

		/** @return {object} The window every bar is positioned within. */
		window() {
			return this.layout.window
		},

		/** @return {boolean} Whether there is nothing at all to show. */
		empty() {
			return this.lanes.length === 0 && this.unplanned.rows.length === 0
		},

		/** @return {string} What an empty view says. */
		emptyText() {
			return t('nextcloud-vue', 'Nothing to place on a time scale')
		},
	},

	methods: {
		t,

		/**
		 * Open one record. Both the bar on the axis and the label of an
		 * undated row come through here, so the two paths cannot drift.
		 *
		 * @param {object} row The record the reader picked.
		 * @return {void} Nothing.
		 */
		openRow(row) {
			/**
			 * @event row-click Emitted when a reader opens a record, from its bar on the axis or from the label of an undated row. Payload: the row.
			 */
			this.$emit('row-click', row)
		},

		/**
		 * A bar's identity.
		 *
		 * @param {object} bar The bar.
		 * @return {string} Its key.
		 */
		barKey(bar) {
			return this.rowKeyOf(bar.row)
		},

		/**
		 * A row's identity.
		 *
		 * @param {object} row The row.
		 * @return {string} Its key.
		 */
		rowKeyOf(row) {
			return String(row?.[this.rowKey] ?? '')
		},

		/**
		 * What a row is called.
		 *
		 * @param {object} row The row.
		 * @return {string} Its name.
		 */
		nameOf(row) {
			const named = this.labelField === '' ? '' : String(row?.[this.labelField] ?? '')
			return named || this.rowKeyOf(row)
		},

		/**
		 * A bar's text.
		 *
		 * @param {object} bar The bar.
		 * @return {string} The name.
		 */
		barText(bar) {
			return this.nameOf(bar.row)
		},

		/**
		 * Where a bar sits on the scale.
		 *
		 * A window of zero width is one bar, or several that all start and end
		 * at the same instant. Dividing by it would be a division by zero, so
		 * the bar takes the whole lane: one thing on a scale of itself is the
		 * whole scale.
		 *
		 * @param {object} bar The bar.
		 * @return {object} The style.
		 */
		barStyle(bar) {
			const { from, to } = this.window
			const span = (to ?? 0) - (from ?? 0)
			if (span <= 0) {
				return { marginInlineStart: '0%', inlineSize: '100%' }
			}

			const start = ((bar.start - from) / span) * 100
			const width = ((bar.end - bar.start) / span) * 100

			return {
				marginInlineStart: `${start}%`,
				// A zero-length bar is a real thing (a one-day term) and a bar
				// of no width is invisible, so it keeps a floor.
				inlineSize: `${Math.max(width, 1)}%`,
			}
		},

		/**
		 * What a bar is called to somebody who cannot see where it sits.
		 *
		 * @param {object} bar The bar.
		 * @return {string} The accessible name.
		 */
		barLabel(bar) {
			return t('nextcloud-vue', '{name}, {from} to {to}', {
				name: this.nameOf(bar.row),
				from: this.dayOf(bar.start),
				to: this.dayOf(bar.end),
			})
		},

		/**
		 * What an unplanned row is called.
		 *
		 * @param {object} row The row.
		 * @return {string} The accessible name.
		 */
		unplannedLabelFor(row) {
			return t('nextcloud-vue', '{name}, no dates', { name: this.nameOf(row) })
		},

		/**
		 * One instant as a day.
		 *
		 * @param {number} instant Milliseconds.
		 * @return {string} The day.
		 */
		dayOf(instant) {
			return new Date(instant).toISOString().slice(0, 10)
		},
	},
}
</script>

<style scoped lang="scss">
.cn-date-axis-view__lane-header {
	font-size: 1rem;
	margin: 8px 0 4px;
}

.cn-date-axis-view__track {
	display: block;
	position: relative;
	min-block-size: 28px;
}

.cn-date-axis-view__bar {
	display: block;
	background-color: var(--color-primary-element-light);
	color: var(--color-main-text);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 2px 6px;
	margin-block-end: 4px;
	text-align: start;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	cursor: pointer;
}

.cn-date-axis-view__bar--unplanned {
	background-color: var(--color-background-hover);
	inline-size: auto;
}

.cn-date-axis-view__empty {
	color: var(--color-text-maxcontrast);
}
</style>
