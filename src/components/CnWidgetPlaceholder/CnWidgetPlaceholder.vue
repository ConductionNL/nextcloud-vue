<!--
SPDX-FileCopyrightText: 2026 Conduction B.V.
SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		v-if="normalizedShape !== 'heading'"
		ref="root"
		class="cn-widget-placeholder"
		:class="[`cn-widget-placeholder--${normalizedShape}`]"
		aria-hidden="true"
		:data-shape="normalizedShape">
		<template v-if="normalizedShape === 'rows'">
			<div v-for="n in items" :key="n" class="cn-widget-placeholder__row">
				<span class="cn-widget-placeholder__icon" />
				<span class="cn-widget-placeholder__line" />
				<span class="cn-widget-placeholder__line cn-widget-placeholder__line--short" />
			</div>
		</template>
		<template v-else-if="normalizedShape === 'lines'">
			<span
				v-for="n in items"
				:key="n"
				class="cn-widget-placeholder__line"
				:class="[{ 'cn-widget-placeholder__line--short': n === items }]" />
		</template>
		<span v-else-if="normalizedShape === 'block'" class="cn-widget-placeholder__block" />
		<template v-else-if="normalizedShape === 'tiles'">
			<span v-for="n in items" :key="n" class="cn-widget-placeholder__tile" />
		</template>
		<template v-else-if="normalizedShape === 'counter'">
			<div v-for="n in items" :key="n" class="cn-widget-placeholder__counter">
				<span class="cn-widget-placeholder__number" />
				<span class="cn-widget-placeholder__line cn-widget-placeholder__line--short" />
			</div>
		</template>
	</div>
</template>

<script>
import { WIDGET_PLACEHOLDER_SHAPES } from '../../utils/resolveWidgetPlaceholder.js'

/** Height of one row (32 px icon) plus the 12 px gap, design D5. */
const ROW_PITCH = 44
/** Height of one text line (12 px) plus the 12 px gap, design D5. */
const LINE_PITCH = 24
/** The gap between tiles and between counters. */
const GAP = 12
/** The default tile size, `--cn-placeholder-tile-size`. */
const TILE_SIZE = 64
/** The width one counter takes. */
const COUNTER_WIDTH = 96
/** What a placeholder draws before it has measured its container (tests, a server-less first render). */
const UNMEASURED_ITEMS = 3

/**
 * How many items of a shape fit a content area.
 *
 * @param {string} shape The placeholder shape.
 * @param {number} width The content area's width in px.
 * @param {number} height The content area's height in px.
 * @param {number} tileSize The tile size in px.
 * @return {number} The number of whole items that fit, at least 1.
 */
export function placeholderCapacity(shape, width, height, tileSize = TILE_SIZE) {
	const fit = (space, size) => Math.max(1, Math.floor((space + GAP) / (size + GAP)))
	switch (shape) {
		case 'rows':
			return Math.max(1, Math.floor((height + GAP) / ROW_PITCH))
		case 'lines':
			return Math.max(1, Math.floor((height + GAP) / LINE_PITCH))
		case 'tiles':
			return fit(width, tileSize) * fit(height, tileSize)
		case 'counter':
			return fit(width, COUNTER_WIDTH)
		default:
			return 1
	}
}

/**
 * CnWidgetPlaceholder — the shape a dashboard widget waits in while its content
 * loads (widget-placeholder-shape, design D1/D4/D5).
 *
 * Renders the public markup contract (`cn-widget-placeholder`, design D4) that a
 * server template prints too, so the first paint and the mounted page draw the
 * same pixels with `css/widget-placeholder.css`. Hidden from assistive
 * technology; the host announces loading once (design D8).
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-3
 */
export default {
	name: 'CnWidgetPlaceholder',

	props: {
		/** The shape: `rows`, `lines`, `block`, `tiles`, `counter` or `heading` (renders nothing). */
		shape: {
			type: String,
			default: 'rows',
		},

		/** How many rows, lines, tiles or counters to draw, clipped to the container. Without it the container's size decides. */
		count: {
			type: Number,
			default: null,
		},
	},

	data() {
		return {
			width: 0,
			height: 0,
		}
	},

	computed: {
		/**
		 * The shape to draw; an unknown shape draws rows.
		 *
		 * @return {string}
		 */
		normalizedShape() {
			return WIDGET_PLACEHOLDER_SHAPES.includes(this.shape) ? this.shape : 'rows'
		},

		/**
		 * How many items to draw: the declared count clipped to what fits, or
		 * what fits. Before the container is measured the count (or 3) is used.
		 *
		 * @return {number}
		 */
		items() {
			const declared = Number.isInteger(this.count) && this.count > 0 ? this.count : null
			if (this.height <= 0) {
				return declared ?? UNMEASURED_ITEMS
			}
			const capacity = placeholderCapacity(this.normalizedShape, this.width, this.height, this.tileSize())
			return declared === null ? capacity : Math.min(declared, capacity)
		},
	},

	mounted() {
		this.measure()
		if (typeof ResizeObserver !== 'undefined' && this.$refs.root) {
			this._resizeObserver = new ResizeObserver(() => this.measure())
			this._resizeObserver.observe(this.$refs.root)
		}
	},

	beforeUnmount() {
		this._resizeObserver?.disconnect()
		this._resizeObserver = null
	},

	methods: {
		/**
		 * Read the container's size.
		 *
		 * @return {void}
		 */
		measure() {
			const root = this.$refs.root
			if (!root) {
				return
			}
			this.width = root.clientWidth
			this.height = root.clientHeight
		},

		/**
		 * The tile size from `--cn-placeholder-tile-size`, else 64 px.
		 *
		 * @return {number}
		 */
		tileSize() {
			const root = this.$refs.root
			if (!root || typeof getComputedStyle === 'undefined') {
				return TILE_SIZE
			}
			const value = parseFloat(getComputedStyle(root).getPropertyValue('--cn-placeholder-tile-size'))
			return Number.isFinite(value) && value > 0 ? value : TILE_SIZE
		},
	},
}
</script>
