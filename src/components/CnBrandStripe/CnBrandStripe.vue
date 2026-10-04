<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-brand-stripe"
		:class="{ 'cn-brand-stripe--vertical': orientation === 'vertical' }"
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
 * bands next to each other, for the top of a page, a card or a sidebar.
 *
 * The theme decides what it looks like, through the library's own custom
 * properties: `--cn-brand-stripe-color-1/2/3` (the colours, start to end),
 * `--cn-brand-stripe-ratio-1/2/3` (unitless shares, such as 6, 3 and 1)
 * and `--cn-brand-stripe-height` (such as 5px). A theming app maps its own
 * tokens onto these; the library never reads a theme's tokens. Without them the
 * stripe is one band in the Nextcloud primary colour, 4px high.
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
	},
}
</script>

<!--
  The stripe reads the library's own `--cn-brand-stripe-*` properties, each
  with a Nextcloud fallback. A theming app sets them from its own tokens.
-->
<style scoped>
.cn-brand-stripe {
	display: flex;
	flex: none;
	width: 100%;
	height: var(--cn-brand-stripe-height, 4px);
}

.cn-brand-stripe--vertical {
	flex-direction: column;
	width: var(--cn-brand-stripe-height, 4px);
	height: 100%;
}

.cn-brand-stripe__band {
	flex-basis: 0;
	flex-shrink: 1;
}

.cn-brand-stripe__band--1 {
	flex-grow: var(--cn-brand-stripe-ratio-1, 1);
	background-color: var(--cn-brand-stripe-color-1, var(--color-primary-element));
}

.cn-brand-stripe__band--2 {
	flex-grow: var(--cn-brand-stripe-ratio-2, 1);
	background-color: var(--cn-brand-stripe-color-2, var(--color-primary-element));
}

.cn-brand-stripe__band--3 {
	flex-grow: var(--cn-brand-stripe-ratio-3, 1);
	background-color: var(--cn-brand-stripe-color-3, var(--color-primary-element));
}

@media print {
	.cn-brand-stripe {
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
}
</style>
