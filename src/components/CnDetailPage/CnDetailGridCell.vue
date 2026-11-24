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
 * IntersectionObserver, and before the page is printed.
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
		},
	},
}
</script>
