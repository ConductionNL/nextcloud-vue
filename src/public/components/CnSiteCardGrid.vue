<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="ac-grid" :style="gridStyle">
		<CnSiteCard
			v-for="(card, index) in cards"
			:key="card.id || card.title || index"
			:title="card.title"
			:description="card.description"
			:link="card.link"
			:link-label="card.linkLabel"
			:heading-level="headingLevel"
			:variant="card.variant || variant"
			:padding="padding" />
		<slot />
	</div>
</template>

<script>
import CnSiteCard from './CnSiteCard.vue'

/**
 * A responsive row of cards.
 *
 * Columns are expressed with `repeat(auto-fit, minmax(...))` rather than a
 * fixed count, so the grid reflows on a narrow viewport without a media query
 * per breakpoint. A fixed three-column grid is the usual cause of a card row
 * that forces a phone to scroll horizontally.
 *
 * NOTE ON THE NAME: nc-vue already exports a `CnCardGrid`, and this is
 * deliberately NOT that component. That one imports `@nextcloud/vue`,
 * `@nextcloud/auth` and `@nextcloud/event-bus` (measured transitively), so it
 * cannot run at a public origin. Re-exporting it under a "public" entry point
 * would have made the entry point a lie.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import.
 */
export default {
	name: 'CnSiteCardGrid',

	components: { CnSiteCard },

	props: {
		/** The cards to render. */
		cards: {
			type: Array,
			default: () => [],
		},

		/** Minimum column width before the grid reflows. */
		minColumnWidth: {
			type: String,
			default: '18rem',
		},

		/** Gap between cards. */
		gap: {
			type: String,
			default: '1.75rem',
		},

		/** Heading level for every card, so the outline stays intact. */
		headingLevel: {
			type: Number,
			default: 3,
		},

		/** Default variant for cards that do not name one. */
		variant: {
			type: String,
			default: 'category',
		},

		/** Internal padding step for every card. */
		padding: {
			type: String,
			default: 'md',
		},
	},

	computed: {
		/**
		 * @return {object} Inline grid geometry.
		 */
		gridStyle() {
			return {
				display: 'grid',
				gridTemplateColumns: `repeat(auto-fit, minmax(${this.minColumnWidth}, 1fr))`,
				gap: this.gap,
			}
		},
	},
}
</script>
