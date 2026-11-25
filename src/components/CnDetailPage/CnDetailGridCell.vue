<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		ref="cell"
		:class="{ 'cn-detail-grid-cell--pending': !shown }"
		:style="shown ? null : placeholderStyle"
		:aria-busy="shown ? null : 'true'"
		:data-cn-pending="shown ? null : ''">
		<slot v-if="shown" />
	</div>
</template>

<script>
/**
 * Call `reveal` when `event` is a Tab press: a keyboard user is moving
 * through the page and needs every cell's controls in the tab order.
 *
 * @spec openspec/changes/properties-table-by-keyboard/specs/properties-table-by-keyboard/spec.md#requirement-a-detail-page-s-widgets-are-in-the-tab-order
 * @param {KeyboardEvent} event The key event.
 * @param {() => void} reveal Mounts the cell's content.
 * @return {boolean} Whether the cell was revealed.
 */
export function revealOnTab(event, reveal) {
	if (event.key !== 'Tab') {
		return false
	}
	reveal()
	return true
}

/**
 * CnDetailGridCell — one cell of a detail page's body grid that mounts its
 * content only once the cell comes near the screen.
 *
 * A widget fetches on `mounted()`, so a grid of twenty widgets fires twenty
 * requests on page open, most of them for cards below the fold. This cell
 * holds its content back until an IntersectionObserver reports it within
 * `rootMargin` of the viewport, then keeps it mounted for good.
 *
 * Until then the cell is an empty placeholder. A fixed-height cell keeps its
 * size from the grid; a size-to-content cell gets `minHeight` so GridStack
 * does not collapse the row and then jump when the content arrives.
 *
 * The content mounts at once when `eager` is set, when there is no
 * IntersectionObserver, before the page is printed, and on the first Tab
 * key: an empty placeholder holds nothing to focus and Tab does not scroll
 * to it, so without that a keyboard user never reaches the widgets below
 * the fold.
 */
export default {
	name: 'CnDetailGridCell',

	props: {
		/** Mount the content at once, without waiting for the cell to be near the screen. */
		eager: {
			type: Boolean,
			default: false,
		},

		/** Height in pixels the empty placeholder holds; 0 leaves it to the grid. */
		minHeight: {
			type: Number,
			default: 0,
		},

		/** How far outside the viewport a cell counts as near (IntersectionObserver `rootMargin`). */
		rootMargin: {
			type: String,
			default: '100% 0px',
		},
	},

	data() {
		return {
			shown: this.eager || typeof IntersectionObserver === 'undefined',
		}
	},

	computed: {
		placeholderStyle() {
			return this.minHeight > 0 ? { minHeight: `${this.minHeight}px` } : null
		},
	},

	watch: {
		eager(value) {
			if (value) {
				this.reveal()
			}
		},
	},

	mounted() {
		if (this.shown) {
			return
		}
		this.observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				this.reveal()
			}
		}, { rootMargin: this.rootMargin })
		this.observer.observe(this.$refs.cell)
		this.onBeforePrint = () => this.reveal()
		window.addEventListener('beforeprint', this.onBeforePrint)
		this.onKeydown = (event) => revealOnTab(event, () => this.reveal())
		document.addEventListener('keydown', this.onKeydown, true)
	},

	beforeUnmount() {
		this.stopWatching()
	},

	methods: {
		/**
		 * Mount the content and stop watching the viewport.
		 *
		 * @return {void}
		 */
		reveal() {
			this.shown = true
			this.stopWatching()
		},

		/**
		 * Disconnect the observer and the print listener.
		 *
		 * @return {void}
		 */
		stopWatching() {
			if (this.observer) {
				this.observer.disconnect()
				this.observer = null
			}
			if (this.onBeforePrint) {
				window.removeEventListener('beforeprint', this.onBeforePrint)
				this.onBeforePrint = null
			}
			if (this.onKeydown) {
				document.removeEventListener('keydown', this.onKeydown, true)
				this.onKeydown = null
			}
		},
	},
}
</script>
