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
		<div class="cn-notice-widget__body">
			<p class="cn-notice-widget__text">
				<strong v-if="resolvedTitle" class="cn-notice-widget__title" data-testid="cn-notice-widget-title">{{ resolvedTitle }}</strong>{{ resolvedTitle && resolvedText ? ' ' : '' }}{{ resolvedText }}
			</p>
			<router-link
				v-if="resolvedLink && resolvedLink.to && $router"
				class="cn-notice-widget__link"
				:to="resolvedLink.to"
				data-testid="cn-notice-widget-link">
				{{ resolvedLink.label }}
			</router-link>
			<a
				v-else-if="resolvedLink && resolvedLink.href"
				class="cn-notice-widget__link"
				:href="resolvedLink.href"
				data-testid="cn-notice-widget-link">
				{{ resolvedLink.label }}
			</a>
		</div>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { CnIcon } from '../CnIcon/index.js'

/** The tones a notice takes, and the icon each shows by default. */
const VARIANT_ICONS = Object.freeze({
	info: 'InformationOutline',
	warning: 'AlertOutline',
	error: 'AlertCircleOutline',
	success: 'CheckCircleOutline',
})

/**
 * @param {unknown} value A token-resolved value.
 * @return {boolean} Whether it holds a value and no token that failed to resolve.
 */
function isResolved(value) {
	if (typeof value === 'number') {
		return true
	}
	return typeof value === 'string' && value.trim() !== '' && value.charAt(0) !== '@'
}

/**
 * CnNoticeWidget — a toned notice box: an icon, a bold title and a line of
 * text in one rounded box, as the boards draw a warning beside a record
 * (DqSociaalDomein "Bijzondere persoonsgegevens: gezondheid. Elke inzage
 * wordt gelogd met het doel."). Usable in a detail page's side column, its
 * body grid and on a dashboard as widget type `notice`; the surface applies
 * the widget's `visibleWhen`.
 *
 * `content`: `{ variant?, title?, text, icon?, link? }`. `variant` is `info`
 * (default), `warning`, `error` or `success`; `title` and `text` go through
 * the host's translate; `icon` names a CnIcon instead of the variant's own.
 * `link` adds a link under the text: `{ route, params?, label, fallbackLabel? }`
 * (a route name) or `{ href, label }`. `@objectId` and `@object.<path>` in
 * `params` and `label` read the page's record; a link whose params do not
 * resolve is left out, and a label that does not resolve takes
 * `fallbackLabel`.
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
		 * The notice: `{ variant?, title?, text, icon?, link? }`.
		 *
		 * @type {{variant?: string, title?: string, text?: string, icon?: string, link?: {route?: string, params?: object, href?: string, label?: string, fallbackLabel?: string}}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},

		/** The page's record, for `@object.<path>` in the link. */
		objectData: {
			type: Object,
			default: null,
		},

		/** The page's record id, for `@objectId` in the link. */
		objectId: {
			type: [String, Number],
			default: '',
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

		/**
		 * The link under the text, with its tokens read from the page's
		 * record, or null when there is none or its params do not resolve.
		 *
		 * @return {{to?: object, href?: string, label: string}|null}
		 * @spec openspec/changes/notice-link/specs/notice-link/spec.md#requirement-a-notice-can-link-to-a-record
		 */
		resolvedLink() {
			const link = this.content && this.content.link
			if (!link || typeof link !== 'object') {
				return null
			}
			const resolved = resolveDeepTokens(link, { objectId: this.objectId, object: this.objectData || {} })
			const label = isResolved(resolved.label) ? this.translate(resolved.label) : ''
			const fallback = this.translate(link.fallbackLabel) || t('nextcloud-vue', 'Open')
			if (typeof resolved.route === 'string' && resolved.route !== '') {
				const params = resolved.params && typeof resolved.params === 'object' ? resolved.params : {}
				if (!Object.values(params).every(isResolved)) {
					return null
				}
				return { to: { name: resolved.route, params }, label: label || fallback }
			}
			if (isResolved(resolved.href)) {
				return { href: resolved.href, label: label || fallback }
			}
			return null
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

.cn-notice-widget__body {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-notice-widget__link {
	color: var(--color-primary-element-text, var(--color-primary-element));
	font-weight: 600;
	text-decoration: underline;
}

.cn-notice-widget__text {
	margin: 0;
	overflow-wrap: anywhere;
}

.cn-notice-widget__title {
	font-weight: 700;
}
</style>
