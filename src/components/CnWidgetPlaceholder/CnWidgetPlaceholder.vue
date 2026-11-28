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

/** One observer for every placeholder, so a dashboard's placeholders are sized in one callback. */
let sharedObserver = null
/** Observed root element -> its placeholder component. */
const observed = new Map()

/**
 * Size every resized placeholder from its observer entry. The entry carries the
 * size the browser just laid out, so nothing is read from the DOM here and no
 * layout is forced (a clientWidth read in mounted() forced one per widget).
 *
 * @param {ResizeObserverEntry[]} entries The resized roots.
 * @return {void}
 */
function onPlaceholderResize(entries) {
	const updates = []
	for (const entry of entries) {
		const vm = observed.get(entry.target)
		if (vm) {
			updates.push([vm, entry.contentRect, vm.normalizedShape === 'tiles' ? vm.tileSize() : vm.tile])
		}
	}
	for (const [vm, rect, tile] of updates) {
		vm.applySize(rect.width, rect.height, tile)
	}
}

/**
 * Start sizing a placeholder through the shared observer.
 *
 * @param {Element} el The placeholder root.
 * @param {object} vm The placeholder component.
 * @return {boolean} False when the browser has no ResizeObserver.
 */
function observePlaceholder(el, vm) {
	if (typeof ResizeObserver === 'undefined') {
		return false
	}
	sharedObserver = sharedObserver || new ResizeObserver(onPlaceholderResize)
	observed.set(el, vm)
	sharedObserver.observe(el)
	return true
}

/**
 * Stop sizing a placeholder.
 *
 * @param {Element} el The placeholder root.
 * @return {void}
 */
function unobservePlaceholder(el) {
	if (!observed.delete(el) || !sharedObserver) {
		return
	}
	sharedObserver.unobserve(el)
	if (observed.size === 0) {
		sharedObserver.disconnect()
		sharedObserver = null
	}
}

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
			tile: TILE_SIZE,
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
			const capacity = placeholderCapacity(this.normalizedShape, this.width, this.height, this.tile)
			return declared === null ? capacity : Math.min(declared, capacity)
		},
	},

	mounted() {
		const root = this.$refs.root
		if (!root) {
			return
		}
		// The observer's first callback sizes it after layout; without an observer, read once.
		this._observedRoot = observePlaceholder(root, this) ? root : null
		if (!this._observedRoot) {
			this.measure()
		}
	},

	beforeUnmount() {
		if (this._observedRoot) {
			unobservePlaceholder(this._observedRoot)
			this._observedRoot = null
		}
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
			this.applySize(root.clientWidth, root.clientHeight, this.normalizedShape === 'tiles' ? this.tileSize() : this.tile)
		},

		/**
		 * Take a measured content size (whole pixels, as clientWidth gives them).
		 *
		 * @param {number} width Content width in px.
		 * @param {number} height Content height in px.
		 * @param {number} tile The tile size in px.
		 * @return {void}
		 */
		applySize(width, height, tile) {
			this.width = Math.round(width)
			this.height = Math.round(height)
			this.tile = tile
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
