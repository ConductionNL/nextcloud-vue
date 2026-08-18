<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section :class="sectionClass" :style="sectionStyle">
		<div class="container">
			<slot />
		</div>
	</section>
</template>

<script>
/**
 * A full-bleed band with a constrained reading column inside it.
 *
 * The band paints edge to edge and the `.container` holds the content at the
 * design system's column width. That split is not cosmetic: every band in the
 * NL Design System reference works this way, and a region that emits its
 * content WITHOUT a container renders body copy hard against the viewport edge
 * while the navigation above and the footer below start inset.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import, directly or
 * transitively. This component must render at a public origin where there is
 * no Nextcloud, no `OC` global and no translation bundle.
 */
export default {
	name: 'CnSiteSection',

	props: {
		/**
		 * Vertical rhythm. `spacing` adds the design system's block padding;
		 * `hero` is the taller leading band.
		 */
		variant: {
			type: String,
			default: 'spacing',
			validator: (v) => ['spacing', 'hero', 'flush'].includes(v),
		},

		/** Optional background image URL, layered over the band's colour. */
		backgroundImage: {
			type: String,
			default: '',
		},
	},

	computed: {
		/**
		 * Inline background, when the host supplies an image.
		 *
		 * Inline rather than a class because the URL is per-portal CONTENT; a
		 * stylesheet cannot enumerate them. `background-image` is layered OVER
		 * the band's own colour rather than replacing it, so a slow or blocked
		 * image leaves the blue behind it and the text stays readable — an
		 * image that fails is not allowed to become white-on-white.
		 *
		 * @return {object|null} Style bindings, or null.
		 */
		sectionStyle() {
			if (this.backgroundImage === '') {
				return null
			}

			return {
				backgroundImage: `url(${JSON.stringify(this.backgroundImage)})`,
				backgroundSize: 'cover',
				backgroundPosition: '50% 50%',
				backgroundRepeat: 'no-repeat',
			}
		},

		/**
		 * @return {Array} The band's classes.
		 */
		sectionClass() {
			return [
				'ac-section',
				this.variant === 'hero' ? 'ac-hero' : null,
				this.variant === 'spacing' ? 'ac-section--spacing' : null,
			].filter(Boolean)
		},
	},
}
</script>

<style scoped>
/*
 * ONLY THE TEXT THAT ACTUALLY SITS ON THE BAND IS RECOLOURED.
 *
 * `.ac-hero` paints itself `--tilburg-color-blue-500` — dark — and defines no
 * colour for text placed directly on it, because the reference implementation
 * never puts any there: its hero holds a white input and a blue button, both
 * of which bring their own surface. So a heading or paragraph dropped onto the
 * band inherits the document's dark body colour and lands dark-on-dark.
 *
 * THIS RULE WAS FIRST WRITTEN ON `.ac-hero` ITSELF, AND THAT WAS WRONG — it is
 * the very mistake the rest of this codebase keeps recording. Colour set on an
 * ancestor cannot know that a descendant paints its own background:
 * `.ac-search-box` has one, `rgb(230, 246, 255)`, and inheriting white into it
 * put the label and button at contrast 1.11 and the input's text at 1.0.
 *
 * Worse, the "bug" that prompted it was a MEASUREMENT ERROR. The label
 * computed `rgb(51, 51, 51)`, which was compared against the BAND and scored
 * 1.06 — but the label does not sit on the band, it sits on the search box's
 * own light surface, where that colour is entirely correct. The contrast probe
 * has to walk up to the first ancestor that actually paints a background;
 * against the nearest NAMED band it reports a failure that is not there, and
 * then invites a fix that breaks something real.
 *
 * So: the hero's own title and subtitle, and nothing else. The system's
 * inverse token rather than a literal, so a theme with a light hero corrects
 * both together.
 */
.ac-hero__title,
.ac-hero__subtitle {
	color: var(--utrecht-document-inverse-color, #ffffff);
}
</style>
