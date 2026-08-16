<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<article :class="cardClass">
		<div class="ac-card__content">
			<!--
				Structure captured from the running reference, not invented:

				  .ac-card__content
				    .ac-flex.ac-flex--spacing-sm.ac-flex--align-items-center
				      svg
				      h3.utrecht-heading-3
				    p.utrecht-paragraph
				    a.utrecht-link.utrecht-link--html-a
				      svg

				THE ICON IS A SIBLING OF THE HEADING, not a child, and the flex
				row is its own wrapper. Nesting the icon inside the heading
				forces the heading to `display: flex`, and measured that way it
				came out Roboto 18.72px rgb(51, 51, 51) against the design's
				Avenir 24px rgb(0, 0, 0).

				`.ac-card__content` also styles itself — adding `ac-flex--spacing-sm`
				here overrode its own 12px gap with 16px.
			-->
			<div
				v-if="title"
				class="ac-flex ac-flex--spacing-sm ac-flex--align-items-center">
				<CnSiteIcon v-if="icon" :name="icon" />
				<component :is="headingTag" :class="headingClass">
					{{ title }}
				</component>
			</div>

			<p v-if="description" class="utrecht-paragraph">
				{{ description }}
			</p>

			<slot />

			<!--
				`utrecht-link` is what carries the link's colour. Without it the
				anchor falls back to the BROWSER DEFAULT — measured rgb(0, 0, 238)
				against the design's rgb(0, 68, 136), the one colour on the page
				nobody chose.

				The text is the card's own, never "lees meer": a screen reader
				listing a page's links reads them out of context, and four
				identical "lees meer" entries name nothing.
			-->
			<a v-if="link" class="utrecht-link utrecht-link--html-a" :href="link">
				{{ linkLabel || title }}
				<CnSiteIcon v-if="linkIcon" :name="linkIcon" :size="16" />
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
		 * The heading's class, tracking its level.
		 *
		 * The design system styles the CLASS, not the tag — the same reason a
		 * bare `<h2>` out of markdown renders unstyled.
		 *
		 * @return {string} e.g. `utrecht-heading-3`.
		 */
		headingClass() {
			return `utrecht-heading-${this.headingLevel}`
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
