<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-divider-widget" :style="wrapperStyle">
		<!-- Line style — full-width horizontal rule with configurable
		     color, thickness, and border-style. -->
		<div
			v-if="style === 'line'"
			class="cn-divider-widget__line"
			role="separator"
			aria-orientation="horizontal"
			:style="lineStyleObject" />

		<!-- Whitespace style — transparent vertical spacer. The
		     role="separator" keeps it discoverable to AT as a decorative
		     divider rather than empty content. -->
		<div
			v-else-if="style === 'whitespace'"
			class="cn-divider-widget__whitespace"
			role="separator"
			aria-orientation="horizontal"
			:style="whitespaceStyleObject" />

		<!-- Heading-break — semantic h3 flanked by two lines. The wrapper
		     carries an aria-label so screen readers announce "<text>
		     divider" once instead of three separate elements. -->
		<div
			v-else-if="style === 'heading-break'"
			class="cn-divider-widget__heading-break"
			role="separator"
			aria-orientation="horizontal"
			:aria-label="headingAriaLabel">
			<hr class="cn-divider-widget__heading-line" :style="headingLineStyleObject" aria-hidden="true">
			<h3 class="cn-divider-widget__heading-text">
				{{ headingText }}
			</h3>
			<hr class="cn-divider-widget__heading-line" :style="headingLineStyleObject" aria-hidden="true">
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

const WHITESPACE_SIZES = Object.freeze({
	small: '16px',
	medium: '32px',
	large: '64px',
	xlarge: '128px',
})

/**
 * CnDividerWidget — a lightweight visual separator inside a dashboard cell:
 * a horizontal line, a whitespace spacer, or a centered heading flanked by
 * two lines. All rendering is fully client-side; the widget makes zero API
 * calls.
 *
 * Persisted shape: `{style, lineColor, lineThickness, lineStyle,
 * whitespaceSize, headingText}`. Defaults: `style='line'`, `lineColor=''`
 * (resolves to `var(--color-border)`), `lineThickness=1`, `lineStyle='solid'`,
 * `whitespaceSize='medium'`, `headingText=''`.
 *
 * Registered as the `divider` dashboard widget type via the renderer's
 * `index.js`.
 */
export default {
	name: 'CnDividerWidget',

	props: {
		/**
		 * Persisted widget content blob: `{style, lineColor, lineThickness,
		 * lineStyle, whitespaceSize, headingText}`.
		 *
		 * @type {{style: string, lineColor: string, lineThickness: number, lineStyle: string, whitespaceSize: string, headingText: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		/** Resolved divider style (line / whitespace / heading-break). */
		style() {
			const value = this.content?.style
			if (value === 'whitespace' || value === 'heading-break' || value === 'line') {
				return value
			}
			return 'line'
		},

		/** Resolved line colour; explicit value overrides the theme variable. */
		lineColor() {
			const color = this.content?.lineColor
			if (typeof color === 'string' && color.trim() !== '') {
				return color
			}
			return 'var(--color-border)'
		},

		/** Resolved line thickness, clamped to 1..8 pixels. */
		lineThickness() {
			const raw = Number(this.content?.lineThickness)
			if (!Number.isFinite(raw) || raw < 1) {
				return 1
			}
			return Math.min(8, Math.max(1, Math.floor(raw)))
		},

		/** Resolved CSS border style (solid / dashed / dotted). */
		lineStyle() {
			const value = this.content?.lineStyle
			if (value === 'dashed' || value === 'dotted' || value === 'solid') {
				return value
			}
			return 'solid'
		},

		/** Resolved whitespace size preset key. */
		whitespaceSize() {
			const value = this.content?.whitespaceSize
			if (Object.prototype.hasOwnProperty.call(WHITESPACE_SIZES, value)) {
				return value
			}
			return 'medium'
		},

		/** Pixel height for the resolved whitespace preset. */
		whitespaceHeight() {
			return WHITESPACE_SIZES[this.whitespaceSize]
		},

		/** Heading text, or a localised fallback when empty. */
		headingText() {
			const value = this.content?.headingText
			return typeof value === 'string' && value.trim() !== ''
				? value
				: t('nextcloud-vue', 'Section')
		},

		/** Accessible label for the heading-break separator. */
		headingAriaLabel() {
			return t('nextcloud-vue', '{heading} divider', { heading: this.headingText })
		},

		/** Inline style for the flex wrapper. */
		wrapperStyle() {
			return {
				width: '100%',
				height: '100%',
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
			}
		},

		/** Inline style for the line variant. */
		lineStyleObject() {
			return {
				width: '100%',
				'border-bottom-width': `${this.lineThickness}px`,
				'border-bottom-style': this.lineStyle,
				'border-bottom-color': this.lineColor,
			}
		},

		/** Inline style for the whitespace variant. */
		whitespaceStyleObject() {
			return {
				width: '100%',
				height: this.whitespaceHeight,
				'background-color': 'transparent',
			}
		},

		/** Inline style for the heading-break flanking lines. */
		headingLineStyleObject() {
			return {
				flex: '1 1 auto',
				'border-top-width': `${this.lineThickness}px`,
				'border-top-style': this.lineStyle,
				'border-top-color': this.lineColor,
				margin: '0',
			}
		},
	},
}
</script>

<style scoped>
.cn-divider-widget {
	width: 100%;
	height: 100%;
}

.cn-divider-widget__line {
	border-bottom: 1px solid var(--color-border);
}

.cn-divider-widget__heading-break {
	display: flex;
	align-items: center;
	gap: 1rem;
	width: 100%;
}

.cn-divider-widget__heading-line {
	border: 0;
	border-top: 1px solid var(--color-border);
}

.cn-divider-widget__heading-text {
	margin: 0;
	font-size: 1rem;
	font-weight: 600;
	color: var(--color-main-text);
	white-space: nowrap;
}

/*
 * Dividers MUST remain visible when printed. We deliberately keep this
 * @media print block free of any `display: none` rules; the styles below
 * merely tighten contrast for paper output.
 */
@media print {
	.cn-divider-widget,
	.cn-divider-widget__line,
	.cn-divider-widget__whitespace,
	.cn-divider-widget__heading-break {
		display: flex;
	}

	.cn-divider-widget__line,
	.cn-divider-widget__heading-line {
		border-color: #000;
	}
}
</style>
