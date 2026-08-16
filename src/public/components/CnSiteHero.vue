<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnSiteSection variant="hero">
		<!--
			THE HEADING IS REAL BUT NOT NECESSARILY PAINTED, and that is a
			deliberate improvement on the reference rather than a copy of it.

			Measured on the NL Design System reference home page: the hero
			contains NO heading element at all (its prompt lives inside the
			search form) and the page therefore has no `h1` anywhere. Copying
			that would inherit an outline defect.

			Painting a heading directly on the band is the other trap. The band
			is dark — `rgb(0, 56, 101)` on the reference — while the hero's own
			computed colour is black, because the design system never puts bare
			text there and so has no rule for it. A heading dropped onto that
			band renders dark-on-dark: present, selectable, and unreadable.
			(Exactly the failure that made this portal's footer links
			`rgb(0, 68, 136)` on `rgb(0, 69, 137)`.)

			So when the search box is shown, the heading stays in the DOM for
			the outline and the VISIBLE prompt is the search label, which the
			design system does style for this band. A host that wants a painted
			heading asks for it with `heading-visible`.
		-->
		<component
			:is="headingTag"
			v-if="title"
			:class="headingClass">
			{{ title }}
		</component>

		<p v-if="subtitle" :class="subtitleClass">
			{{ subtitle }}
		</p>

		<CnSiteSearch
			v-if="search"
			:label="effectiveSearchLabel"
			:label-visible="true"
			:placeholder="searchPlaceholder"
			:submit-label="searchSubmitLabel"
			:value="searchValue"
			:input-id="searchInputId"
			@search="$emit('search', $event)" />

		<slot />
	</CnSiteSection>
</template>

<script>
import CnSiteSearch from './CnSiteSearch.vue'
import CnSiteSection from './CnSiteSection.vue'

/**
 * The leading band of a site page.
 *
 * Composes the section band and, optionally, the search box — the shape the NL
 * Design System reference uses on its home page, where the hero IS the search
 * entry point rather than decoration above one.
 *
 * The search is opt-in (`search`), because a hero that always renders a search
 * field would force every portal to either wire up a query back end or ship an
 * inert control. An inert search box is worse than none: it invites the one
 * interaction it cannot honour.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import.
 */
export default {
	name: 'CnSiteHero',

	components: { CnSiteSearch, CnSiteSection },

	props: {
		/** The hero heading. */
		title: {
			type: String,
			default: '',
		},

		/** Supporting line under the heading. */
		subtitle: {
			type: String,
			default: '',
		},

		/** Heading level, so the page outline stays intact. */
		headingLevel: {
			type: Number,
			default: 1,
			validator: (v) => v >= 1 && v <= 6,
		},

		/** Whether to render the search box. */
		search: {
			type: Boolean,
			default: false,
		},

		/**
		 * Accessible name for the search landmark.
		 *
		 * EMPTY BY DEFAULT so `title` can serve as the prompt. This defaulted
		 * to 'Zoeken', which made `searchLabel || title` dead code — the
		 * fallback could never fire, and a host that set only `title` got the
		 * generic word instead of its own question. Caught by the test that
		 * asserts the visible label carries the hero's words.
		 */
		searchLabel: {
			type: String,
			default: '',
		},

		/** Placeholder inside the search field. */
		searchPlaceholder: {
			type: String,
			default: '',
		},

		/** Visible text on the search button. */
		searchSubmitLabel: {
			type: String,
			default: 'Zoeken',
		},

		/** Pre-filled search term. */
		searchValue: {
			type: String,
			default: '',
		},

		/** DOM id for the search input. */
		searchInputId: {
			type: String,
			default: 'cn-site-search',
		},

		/**
		 * Paint the heading on the band.
		 *
		 * Defaults to the safe answer: visible only when there is no search box
		 * to carry the prompt. Forcing it on a dark band without a colour rule
		 * for it is how a heading becomes invisible.
		 */
		headingVisible: {
			type: Boolean,
			default: null,
		},
	},

	emits: ['search'],

	computed: {
		/**
		 * @return {string} The heading element to render.
		 */
		headingTag() {
			return `h${this.headingLevel}`
		},

		/**
		 * The search box's accessible name.
		 *
		 * Prefers an explicit `searchLabel`, then the hero's own `title` — the
		 * reference implementation's hero puts its question inside the form, so
		 * the title IS the prompt there. Falls back to a generic word only when
		 * a host supplies neither, because an unnamed search field is worse
		 * than a generically named one.
		 *
		 * @return {string} A non-empty label.
		 */
		effectiveSearchLabel() {
			return this.searchLabel || this.title || 'Zoeken'
		},

		/**
		 * Whether the heading is painted.
		 *
		 * @return {boolean} True when it should be visible.
		 */
		showHeading() {
			if (this.headingVisible !== null) {
				return this.headingVisible
			}

			// With a search box the label carries the prompt, so a painted
			// heading would duplicate it — and duplicate it in the one place
			// the design system has no text colour for.
			return this.search === false
		},

		/**
		 * @return {Array} Classes for the heading.
		 */
		headingClass() {
			return ['ac-hero__title', this.showHeading ? null : 'sr-only'].filter(Boolean)
		},

		/**
		 * @return {Array} Classes for the subtitle.
		 */
		subtitleClass() {
			return ['ac-hero__subtitle', this.showHeading ? null : 'sr-only'].filter(Boolean)
		},
	},
}
</script>
