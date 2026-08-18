<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="ac-glossary">
		<component :is="headingTag" v-if="title" :class="headingClass">
			{{ title }}
		</component>

		<p v-if="description" class="utrecht-paragraph">
			{{ description }}
		</p>

		<!--
			A DESCRIPTION LIST, not a stack of divs.

			`<dl>`/`<dt>`/`<dd>` is what a glossary IS, and it is the difference
			between a screen reader announcing "term, definition" pairs and
			announcing an undifferentiated run of text. The visual result is
			identical either way, which is why this is easy to get wrong.
		-->
		<dl v-if="terms.length" class="ac-glossary__list">
			<div
				v-for="(entry, index) in terms"
				:key="entry.term || index"
				class="ac-glossary__entry">
				<dt class="ac-glossary__term utrecht-data-list__item-key">
					{{ entry.term }}
				</dt>
				<dd class="ac-glossary__definition">
					<p class="utrecht-paragraph">
						{{ entry.definition }}
					</p>

					<!--
						SYNONYMS ARE PART OF THE DEFINITION, not a footnote.

						A visitor searching for the word they know ("Wob-verzoek")
						finds nothing if only the current term is rendered, and
						concludes the concept is absent rather than renamed. The
						old name is often the only one they have.
					-->
					<p
						v-if="synonymsOf(entry).length"
						class="utrecht-paragraph ac-glossary__synonyms">
						{{ synonymsLabel }} {{ synonymsOf(entry).join(', ') }}
					</p>

					<p v-if="entry.source" class="utrecht-paragraph ac-glossary__source">
						{{ sourceLabel }} {{ entry.source }}
					</p>
				</dd>
			</div>
		</dl>

		<p v-else class="utrecht-paragraph ac-glossary__empty">
			{{ emptyLabel }}
		</p>
	</div>
</template>

<script>
/**
 * A glossary: the terms a portal uses, with what each one means.
 *
 * WHY THIS IS A BLOCK AND NOT A PAGE
 *
 * The consuming portal used to render its glossary from a hard-coded
 * `<section>` carrying a literal `<h2>Begrippenlijst</h2>`, on every page that
 * satisfied a route check. A municipality could not move it, rename it,
 * translate it, reorder it or leave it out, and it could only ever live at one
 * URL. As a block it is content an author places — which is what it always
 * was.
 *
 * WHY THE TERMS ARE A PROP
 *
 * Every string and every row arrives from the host. This entry point exists for
 * pages served from a municipality's own domain, where there is no `OC` global,
 * no session and no translation bundle; a component that fetched its own data
 * or called `t()` would fail in a browser, on a live page, rather than at build
 * time. The host already holds these rows — it fetched them over its own public
 * contract — so passing them down costs nothing and keeps this component
 * portable.
 *
 * THE LABELS ARE PROPS FOR THE SAME REASON. "Synoniemen" is not a word this
 * library is entitled to choose on behalf of a Dutch government portal, and
 * hard-coding an English default would put the wrong language on the page for
 * every consumer this entry point was built for.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import.
 */
export default {
	name: 'CnSiteGlossary',

	props: {
		/**
		 * The glossary rows.
		 *
		 * Each entry is `{ term, definition, synonyms?, source? }`. `synonyms`
		 * tolerates a string or an array, because a single synonym arrives as
		 * either depending on the store that produced it, and a component that
		 * rendered `W,o,b` one character per row would be technically correct.
		 */
		terms: {
			type: Array,
			default: () => [],
		},

		/** Heading above the list; '' renders none. */
		title: {
			type: String,
			default: '',
		},

		/** Supporting line under the heading. */
		description: {
			type: String,
			default: '',
		},

		/**
		 * Heading level, so the page outline stays intact.
		 *
		 * The design system styles `.utrecht-heading-2`, not `h2`, so the class
		 * tracks the level too — a host changing the level to keep an outline
		 * intact must not silently lose the styling with it.
		 */
		headingLevel: {
			type: Number,
			default: 2,
			validator: (v) => v >= 1 && v <= 6,
		},

		/** Prefix for the synonyms line, e.g. 'Ook bekend als:'. */
		synonymsLabel: {
			type: String,
			default: '',
		},

		/** Prefix for the source line, e.g. 'Bron:'. */
		sourceLabel: {
			type: String,
			default: '',
		},

		/**
		 * What to say when there are no terms.
		 *
		 * An empty glossary renders this sentence rather than a bare heading
		 * over nothing, which reads as a page that failed to load.
		 */
		emptyLabel: {
			type: String,
			default: '',
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
		 * @return {string} The heading's class, tracking its level.
		 */
		headingClass() {
			return `utrecht-heading-${this.headingLevel}`
		},
	},

	methods: {
		/**
		 * A term's synonyms, as a list, whatever shape they arrived in.
		 *
		 * @param {object} entry One glossary row.
		 * @return {string[]} The synonyms, empty when there are none.
		 */
		synonymsOf(entry) {
			const raw = entry && entry.synonyms
			if (!raw) {
				return []
			}

			// A bare string is ONE synonym. Spreading it would render each
			// character as its own entry.
			if (typeof raw === 'string') {
				return raw.trim() ? [raw.trim()] : []
			}

			return Array.isArray(raw) ? raw.filter(Boolean) : []
		},
	},
}
</script>

<style scoped>
/*
 * Layout and rhythm only — no colours.
 *
 * A block lands on whatever surface a host puts it on, and this codebase has
 * three separate defects on record from rules that coloured text without
 * reference to its background. The design system colours
 * `.utrecht-heading-*` and `.utrecht-paragraph` already.
 */
.ac-glossary__list {
	margin-block-start: var(--utrecht-space-block-lg, 1.5rem);
}

.ac-glossary__entry + .ac-glossary__entry {
	margin-block-start: var(--utrecht-space-block-lg, 1.5rem);
	padding-block-start: var(--utrecht-space-block-lg, 1.5rem);
	/*
	 * `currentColor` at low alpha rather than a colour token: the rule has to
	 * be visible on a light band and on a dark one, and it cannot know which
	 * it is on.
	 */
	border-block-start: 1px solid color-mix(in srgb, currentColor 15%, transparent);
}

.ac-glossary__term {
	font-weight: 700;
}

.ac-glossary__definition {
	/* `<dd>` carries a UA indent that misaligns the definition with its term. */
	margin-inline-start: 0;
	margin-block-start: var(--utrecht-space-block-sm, 0.5rem);
}

.ac-glossary__synonyms,
.ac-glossary__source {
	margin-block-start: var(--utrecht-space-block-sm, 0.5rem);
	font-size: 0.875em;
}
</style>
