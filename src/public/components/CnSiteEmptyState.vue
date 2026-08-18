<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		:class="['ac-empty-state', `ac-empty-state--${variant}`]"
		:role="variant === 'error' ? 'alert' : undefined"
		:aria-busy="variant === 'loading' ? 'true' : undefined"
		:aria-live="variant === 'loading' ? 'polite' : undefined">
		<CnSiteIcon v-if="icon" :name="icon" :size="32" />

		<component :is="headingTag" v-if="title" :class="headingClass">
			{{ title }}
		</component>

		<p v-if="description" class="utrecht-paragraph">
			{{ description }}
		</p>

		<a v-if="link" class="utrecht-link utrecht-link--html-a" :href="link">
			{{ linkLabel || link }}
		</a>

		<slot />
	</div>
</template>

<script>
import CnSiteIcon from './CnSiteIcon.vue'

/**
 * The state a page shows when there is nothing to show yet, nothing to show at
 * all, or nothing showable because something failed.
 *
 * WHY THIS IS NOT `NcEmptyContent`
 *
 * Nextcloud's own empty-state component is the obvious reuse and it cannot be
 * used here: it comes from `@nextcloud/vue`, which is exactly the runtime
 * coupling this entry point exists to keep out. A portal served from a
 * municipality's own domain has no `OC` global, no session and no translation
 * bundle, and a component reaching for them fails in a browser rather than at
 * build time. The transitive-import guard in this package's CI would reject the
 * import outright.
 *
 * WHY THE THREE VARIANTS ARE ONE COMPONENT
 *
 * `loading`, `empty` and `error` differ in what they ANNOUNCE, not in what they
 * look like, and getting the announcement right is the entire point of having a
 * component rather than a paragraph:
 *
 *   loading  aria-busy + aria-live="polite" — a screen reader is told the
 *            region is working and will be told again when it settles, rather
 *            than being handed a silent blank area
 *   error    role="alert" — announced immediately, because a visitor who
 *            cannot see the page must not sit waiting for content that will
 *            never arrive
 *   empty    neither. "There is nothing here" is ordinary content, and
 *            announcing it as an alert cries wolf.
 *
 * Splitting them into three components would let a caller pick the wrong
 * announcement for the right visual, which is precisely the mistake this
 * prevents.
 *
 * IT REPLACES A BARE SENTENCE. The portal previously rendered `<p>Bezig met
 * laden…</p>` — no landmark, no live region, no icon, unstyled, and identical
 * in markup to an error. A sighted visitor saw a stray line under the header; a
 * screen-reader user was told nothing at all.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import. All copy arrives as
 * props, because `t()` is the dependency that makes a component unusable
 * outside Nextcloud.
 */
export default {
	name: 'CnSiteEmptyState',

	components: { CnSiteIcon },

	props: {
		/**
		 * Which state this is. Decides the ARIA posture, not the styling.
		 */
		variant: {
			type: String,
			default: 'empty',
			validator: (v) => ['loading', 'empty', 'error'].includes(v),
		},

		/** Headline, e.g. "Bezig met laden…" or "Pagina niet gevonden". */
		title: {
			type: String,
			default: '',
		},

		/** Supporting line under the headline. */
		description: {
			type: String,
			default: '',
		},

		/** Icon name from the closed vocabulary; '' renders none. */
		icon: {
			type: String,
			default: '',
		},

		/** Optional way out — a link back to somewhere that works. */
		link: {
			type: String,
			default: '',
		},

		/** Visible text for that link. */
		linkLabel: {
			type: String,
			default: '',
		},

		/**
		 * Heading level, so the page outline stays intact.
		 *
		 * An empty state usually replaces a page's main content, so it usually
		 * wants the level that content would have had — not a fixed one.
		 */
		headingLevel: {
			type: Number,
			default: 2,
			validator: (v) => v >= 1 && v <= 6,
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
		 * The heading's class, tracking its level — the design system styles
		 * the class, not the tag.
		 *
		 * @return {string} e.g. `utrecht-heading-2`.
		 */
		headingClass() {
			return `utrecht-heading-${this.headingLevel}`
		},
	},
}
</script>

<style scoped>
/*
 * Layout only, and deliberately token-driven.
 *
 * No colours are set here: an empty state can land on any surface a host puts
 * it on, and this codebase has three separate bugs on record from rules that
 * coloured text without knowing its background. The design system colours the
 * heading, paragraph and link classes already.
 */
.ac-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	gap: var(--utrecht-space-block-md, 0.75rem);
	padding-block: var(--utrecht-space-block-2xl, 3rem);
}
</style>
