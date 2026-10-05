<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-brand-stripe"
		:class="{
			'cn-brand-stripe--vertical': orientation === 'vertical',
			'cn-brand-stripe--inverse': variant === 'inverse',
		}"
		aria-hidden="true"
		data-testid="cn-brand-stripe">
		<span class="cn-brand-stripe__band cn-brand-stripe__band--1" />
		<span class="cn-brand-stripe__band cn-brand-stripe__band--2" />
		<span class="cn-brand-stripe__band cn-brand-stripe__band--3" />
	</div>
</template>

<script>
/**
 * CnBrandStripe draws the organisation's brand stripe: up to three coloured
 * bands next to each other, or the organisation's own motif, for the top of a
 * page, a card or a sidebar.
 *
 * The theme decides what it looks like, through the library's own custom
 * properties: `--cn-brand-stripe-color-1/2/3` (the colours, start to end),
 * `--cn-brand-stripe-ratio-1/2/3` (unitless shares, such as 6, 3 and 1)
 * and `--cn-brand-stripe-height` (such as 5px). A theming app maps its own
 * tokens onto these; the library never reads a theme's tokens. Without them the
 * stripe is one band in the Nextcloud primary colour, 4px high.
 *
 * A theme whose motif is not three bands (hanging twigs, a canal and its bank,
 * a slanted cut) names it in `--cn-brand-stripe-image`, any background-image
 * value; the stripe then draws that image in the same box instead of the
 * bands. `--cn-brand-stripe-image-inverse` is the same motif for a dark band;
 * the `inverse` variant draws it, else the one image, else the bands.
 *
 * The stripe is decoration: it carries no meaning and is hidden from
 * assistive technology.
 *
 * ```vue
 * <CnBrandStripe />
 * ```
 */
export default {
	name: 'CnBrandStripe',

	props: {
		/**
		 * The direction the stripe runs in: `horizontal` (the default, a bar
		 * across the top) or `vertical` (a bar down the side; the height
		 * token then sets its width).
		 *
		 * @type {'horizontal'|'vertical'}
		 */
		orientation: {
			type: String,
			default: 'horizontal',
			validator: (v) => ['horizontal', 'vertical'].includes(v),
		},

		/**
		 * The ground the stripe sits on: `default` (a light surface) or
		 * `inverse` (a dark band such as a footer), which draws the theme's
		 * `--cn-brand-stripe-image-inverse` when it names one.
		 *
		 * @type {'default'|'inverse'}
		 */
		variant: {
			type: String,
			default: 'default',
			validator: (v) => ['default', 'inverse'].includes(v),
		},
	},
}
</script>

<!--
  The stripe reads the library's own `--cn-brand-stripe-*` properties, each
  with a Nextcloud fallback. A theming app sets them from its own tokens.

  THE ROOT PAINTS, NOT THE BANDS. The three bands are one background on the
  root, a gradient with hard stops computed from the ratios, so a theme's
  motif image can take its place with one `var()` fallback. A band painted on
  its own element could not be switched off by the presence of an image: CSS
  cannot ask whether a custom property is set. The band elements stay, empty,
  so markup and tests that count them keep working.
-->
<style scoped>
.cn-brand-stripe {
	--cn-brand-stripe-first: var(--cn-brand-stripe-ratio-1, 1);
	--cn-brand-stripe-second: var(--cn-brand-stripe-ratio-2, 1);
	--cn-brand-stripe-total: calc(
		var(--cn-brand-stripe-first) + var(--cn-brand-stripe-second) + var(--cn-brand-stripe-ratio-3, 1)
	);
	--cn-brand-stripe-stop-1: calc(var(--cn-brand-stripe-first) / var(--cn-brand-stripe-total) * 100%);
	--cn-brand-stripe-stop-2: calc(
		(var(--cn-brand-stripe-first) + var(--cn-brand-stripe-second)) / var(--cn-brand-stripe-total) * 100%
	);
	--cn-brand-stripe-direction: to right;
	--cn-brand-stripe-bands: linear-gradient(
		var(--cn-brand-stripe-direction),
		var(--cn-brand-stripe-color-1, var(--color-primary-element)) 0 var(--cn-brand-stripe-stop-1),
		var(--cn-brand-stripe-color-2, var(--color-primary-element)) var(--cn-brand-stripe-stop-1) var(--cn-brand-stripe-stop-2),
		var(--cn-brand-stripe-color-3, var(--color-primary-element)) var(--cn-brand-stripe-stop-2) 100%
	);
	display: flex;
	flex: none;
	width: 100%;
	height: var(--cn-brand-stripe-height, 4px);
	background-image: var(--cn-brand-stripe-image, var(--cn-brand-stripe-bands));
	background-repeat: repeat-x;
	background-size: auto 100%;
}

.cn-brand-stripe--inverse {
	background-image: var(--cn-brand-stripe-image-inverse, var(--cn-brand-stripe-image, var(--cn-brand-stripe-bands)));
}

.cn-brand-stripe--vertical {
	--cn-brand-stripe-direction: to bottom;
	flex-direction: column;
	width: var(--cn-brand-stripe-height, 4px);
	height: 100%;
	background-repeat: repeat-y;
	background-size: 100% auto;
}

.cn-brand-stripe__band {
	flex-basis: 0;
	flex-shrink: 1;
}

.cn-brand-stripe__band--1 {
	flex-grow: var(--cn-brand-stripe-ratio-1, 1);
}

.cn-brand-stripe__band--2 {
	flex-grow: var(--cn-brand-stripe-ratio-2, 1);
}

.cn-brand-stripe__band--3 {
	flex-grow: var(--cn-brand-stripe-ratio-3, 1);
}

@media print {
	.cn-brand-stripe {
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
}
</style>
