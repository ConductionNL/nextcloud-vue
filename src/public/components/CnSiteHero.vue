<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnSiteSection variant="hero">
		<component :is="headingTag" v-if="title" class="ac-hero__title">
			{{ title }}
		</component>

		<p v-if="subtitle" class="ac-hero__subtitle">
			{{ subtitle }}
		</p>

		<CnSiteSearch
			v-if="search"
			:label="searchLabel"
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

		/** Accessible name for the search landmark. */
		searchLabel: {
			type: String,
			default: 'Zoeken',
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
	},

	emits: ['search'],

	computed: {
		/**
		 * @return {string} The heading element to render.
		 */
		headingTag() {
			return `h${this.headingLevel}`
		},
	},
}
</script>
