<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section
		v-if="resolvedText || resolvedTitle"
		class="cn-notice-widget"
		:class="`cn-notice-widget--${resolvedVariant}`"
		:aria-label="resolvedTitle || null"
		role="note"
		data-testid="cn-notice-widget">
		<CnIcon
			class="cn-notice-widget__icon"
			:name="resolvedIcon"
			:size="18"
			aria-hidden="true" />
		<p class="cn-notice-widget__text">
			<strong v-if="resolvedTitle" class="cn-notice-widget__title" data-testid="cn-notice-widget-title">{{ resolvedTitle }}</strong>{{ resolvedTitle && resolvedText ? ' ' : '' }}{{ resolvedText }}
		</p>
	</section>
</template>

<script>
import { CnIcon } from '../CnIcon/index.js'

/** The tones a notice takes, and the icon each shows by default. */
const VARIANT_ICONS = Object.freeze({
	info: 'InformationOutline',
	warning: 'AlertOutline',
	error: 'AlertCircleOutline',
	success: 'CheckCircleOutline',
})

/**
 * CnNoticeWidget — a toned notice box: an icon, a bold title and a line of
 * text in one rounded box, as the boards draw a warning beside a record
 * (DqSociaalDomein "Bijzondere persoonsgegevens: gezondheid. Elke inzage
 * wordt gelogd met het doel."). Usable in a detail page's side column, its
 * body grid and on a dashboard as widget type `notice`; the surface applies
 * the widget's `visibleWhen`.
 *
 * `content`: `{ variant?, title?, text, icon? }`. `variant` is `info`
 * (default), `warning`, `error` or `success`; `title` and `text` go through
 * the host's translate; `icon` names a CnIcon instead of the variant's own.
 *
 * ```vue
 * <CnNoticeWidget :content="{ variant: 'warning', title: 'Special category data: health.', text: 'Every view is logged with its purpose.' }" />
 * ```
 */
export default {
	name: 'CnNoticeWidget',

	components: { CnIcon },

	inject: {
		/** The host app's translate function (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The notice: `{ variant?, title?, text, icon? }`.
		 *
		 * @type {{variant?: string, title?: string, text?: string, icon?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	computed: {
		/** @return {string} `info`, `warning`, `error` or `success`. */
		resolvedVariant() {
			const variant = this.content && this.content.variant === 'danger' ? 'error' : this.content && this.content.variant
			return Object.hasOwn(VARIANT_ICONS, variant) ? variant : 'info'
		},

		/** @return {string} The icon name. */
		resolvedIcon() {
			const icon = this.content && this.content.icon
			return typeof icon === 'string' && icon !== '' ? icon : VARIANT_ICONS[this.resolvedVariant]
		},

		/** @return {string} The title through the host translate. */
		resolvedTitle() {
			return this.translate(this.content && this.content.title)
		},

		/** @return {string} The text through the host translate. */
		resolvedText() {
			return this.translate(this.content && this.content.text)
		},
	},

	methods: {
		/**
		 * @param {unknown} text A manifest string.
		 * @return {string} Its translation, '' for anything but a non-empty string.
		 */
		translate(text) {
			if (typeof text !== 'string' || text === '') {
				return ''
			}
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},
	},
}
</script>

<style scoped>
.cn-notice-widget {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 14px 16px;
	border-radius: var(--cn-board-card-radius, 12px);
	font-size: 14px;
	line-height: 1.5;
	background: color-mix(in srgb, var(--color-info, #0071ad) 10%, var(--color-main-background));
	color: var(--color-main-text);
}

.cn-notice-widget--warning {
	background: var(--color-warning-light, #fff4de);
	color: var(--color-warning-text, #7a4f00);
}

.cn-notice-widget--error {
	background: color-mix(in srgb, var(--color-error, #db0606) 10%, var(--color-main-background));
	color: var(--color-error-text, var(--color-main-text));
}

.cn-notice-widget--success {
	background: color-mix(in srgb, var(--color-success, #2d7b41) 10%, var(--color-main-background));
	color: var(--color-success-text, var(--color-main-text));
}

.cn-notice-widget__icon {
	flex: 0 0 auto;
	margin-top: 2px;
}

.cn-notice-widget__text {
	margin: 0;
	overflow-wrap: anywhere;
}

.cn-notice-widget__title {
	font-weight: 700;
}
</style>
