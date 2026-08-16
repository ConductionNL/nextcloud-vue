<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<section :class="sectionClass">
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
	},

	computed: {
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
