<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div v-if="groupHeading" class="cn-label-widget cn-label-widget--group">
		<h2 class="cn-label-widget__group" data-testid="cn-label-widget-group">
			{{ displayText }}
		</h2>
	</div>
	<div v-else class="cn-label-widget" :style="wrapperStyle">
		<span class="cn-label-widget__text" :style="spanStyle">{{ displayText }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnLabelWidget — renders a short, single-line, plain-text heading inside a
 * dashboard cell. Content is rendered via Vue interpolation only (never
 * `v-html`) so any embedded HTML in `text` appears as literal characters and
 * the XSS surface is eliminated.
 *
 * Persisted shape: `{text, fontSize, color, backgroundColor, fontWeight,
 * textAlign}`. Defaults: `fontSize='16px'`, `color='var(--color-main-text)'`,
 * `backgroundColor='transparent'`, `fontWeight='bold'`, `textAlign='center'`.
 *
 * With `groupHeading: true` the label is the heading of a group of tiles
 * ("Mijn apps"): a small uppercase heading on the page ground, start-aligned
 * at the bottom of its cell, and the style keys are ignored.
 *
 * Registered as the `label` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnLabelWidget',

	props: {
		/**
		 * Persisted widget content blob: `{text, fontSize, color,
		 * backgroundColor, fontWeight, textAlign}`. All keys are optional;
		 * missing keys collapse to documented defaults.
		 *
		 * @type {{text: string, fontSize: string, color: string, backgroundColor: string, fontWeight: string, textAlign: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		/** The label text, or '' when absent / non-string. */
		text() {
			return typeof this.content?.text === 'string' ? this.content.text : ''
		},

		/** Whether the label is the heading of a group of tiles. */
		groupHeading() {
			return this.content?.groupHeading === true
		},

		/** Whether the label has any non-whitespace text. */
		hasText() {
			return this.text.trim() !== ''
		},

		/** Text to render — falls back to a localised placeholder when empty. */
		displayText() {
			return this.hasText ? this.text : t('nextcloud-vue', 'Label')
		},

		/** Resolved font size (default `16px`). */
		fontSize() {
			return this.content?.fontSize || '16px'
		},

		/** Resolved text colour (default theme main text). */
		color() {
			return this.content?.color || 'var(--color-main-text)'
		},

		/** Resolved background colour (default transparent). */
		backgroundColor() {
			return this.content?.backgroundColor || 'transparent'
		},

		/** Resolved font weight (default `bold`). */
		fontWeight() {
			return this.content?.fontWeight || 'bold'
		},

		/** Resolved text alignment (default `center`). */
		textAlign() {
			return this.content?.textAlign || 'center'
		},

		/** Inline style for the flex wrapper. */
		wrapperStyle() {
			return {
				width: '100%',
				height: '100%',
				padding: '12px',
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
				'background-color': this.backgroundColor,
			}
		},

		/** Inline style for the text span. */
		spanStyle() {
			return {
				'font-size': this.fontSize,
				'font-weight': this.fontWeight,
				'text-align': this.textAlign,
				color: this.color,
				'overflow-wrap': 'break-word',
			}
		},
	},
}
</script>

<style scoped>
.cn-label-widget {
	width: 100%;
	height: 100%;
}

.cn-label-widget--group {
	display: flex;
	align-items: flex-end;
	box-sizing: border-box;
	padding: 0 4px 4px;
}

.cn-label-widget__group {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.cn-label-widget__text {
	/* Safety net — keeps long single words wrapping even if the inline
	   overflow-wrap style is overridden by host styles. */
	overflow-wrap: break-word;
	max-width: 100%;
}
</style>
