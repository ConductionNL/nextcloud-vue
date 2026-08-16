<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<article :class="cardClass">
		<div class="ac-card__content ac-flex ac-flex--column ac-flex--spacing-sm">
			<component
				:is="headingTag"
				v-if="title"
				class="ac-card__title ac-flex ac-flex--align-items-center ac-flex--spacing-xs">
				<CnSiteIcon v-if="icon" :name="icon" />
				<span>{{ title }}</span>
			</component>

			<p v-if="description" class="ac-card__description">
				{{ description }}
			</p>

			<slot />

			<!--
				The link carries the card's own text, never "lees meer". A
				screen-reader user listing a page's links hears them out of
				context, and four identical "lees meer" entries name nothing.
			-->
			<a
				v-if="link"
				class="ac-card__link ac-flex ac-flex--align-items-center ac-flex--spacing-xs"
				:href="link">
				<span>{{ linkLabel || title }}</span>
				<CnSiteIcon :name="linkIcon" :size="18" />
			</a>
		</div>
	</article>
</template>

<script>
import CnSiteIcon from './CnSiteIcon.vue'

/**
 * One card in a card grid.
 *
 * The heading level is a PROP rather than a fixed `<h3>`. A card is placed by
 * its host, and the correct level depends on what sits above it; hard-coding
 * one produces a document whose outline skips levels, which is the most common
 * way a visually tidy page fails an outline check.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import.
 */
export default {
	name: 'CnSiteCard',

	components: { CnSiteIcon },

	props: {
		/**
		 * Icon shown beside the title, from the closed vocabulary.
		 *
		 * A NAME, never path data: page content is authored input, and raw SVG
		 * from an author would be attacker-controlled markup inside an <svg> on
		 * a public government page. An unknown name renders nothing.
		 */
		icon: {
			type: String,
			default: '',
		},

		/** Icon trailing the link. The reference uses a right arrow. */
		linkIcon: {
			type: String,
			default: 'arrow-right',
		},

		/** Card heading. */
		title: {
			type: String,
			default: '',
		},

		/** Supporting line under the heading. */
		description: {
			type: String,
			default: '',
		},

		/** Where the card points, if anywhere. */
		link: {
			type: String,
			default: '',
		},

		/** Visible link text. Defaults to the title, never "read more". */
		linkLabel: {
			type: String,
			default: '',
		},

		/** Heading level, chosen by the host to keep the outline intact. */
		headingLevel: {
			type: Number,
			default: 3,
			validator: (v) => v >= 2 && v <= 6,
		},

		/** Design-system variant. */
		variant: {
			type: String,
			default: 'category',
			validator: (v) => ['category', 'blue', 'plain'].includes(v),
		},

		/** Internal padding step. */
		padding: {
			type: String,
			default: 'md',
			validator: (v) => ['md', 'lg'].includes(v),
		},
	},

	computed: {
		/**
		 * @return {string} The heading element to render.
		 */
		headingTag() {
			return `h${this.headingLevel}`
		},

		/**
		 * @return {Array} The card's classes.
		 */
		cardClass() {
			return [
				'ac-card',
				this.variant !== 'plain' ? `ac-card--${this.variant}` : null,
				`ac-card--padding-${this.padding}`,
				'ac-card--space-between',
			].filter(Boolean)
		},
	},
}
</script>
