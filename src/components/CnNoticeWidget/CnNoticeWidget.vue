<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<section
		v-if="(resolvedText || resolvedTitle) && !dismissed"
		class="cn-notice-widget"
		:class="[`cn-notice-widget--${resolvedVariant}`, { 'cn-notice-widget--inline': inline, 'cn-notice-widget--stacked': resolvedLayout === 'stacked' }]"
		:aria-label="resolvedTitle || null"
		:role="resolvedRole"
		data-testid="cn-notice-widget">
		<CnIcon
			class="cn-notice-widget__icon"
			:name="resolvedIcon"
			:size="18"
			aria-hidden="true" />
		<div class="cn-notice-widget__body">
			<p v-if="resolvedLayout === 'stacked'" class="cn-notice-widget__text">
				<strong v-if="resolvedTitle" class="cn-notice-widget__title" data-testid="cn-notice-widget-title">{{ resolvedTitle }}</strong>
				<span v-if="resolvedText" class="cn-notice-widget__line">{{ resolvedText }}</span>
			</p>
			<p v-else class="cn-notice-widget__text">
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
		<div v-if="resolvedActions.length > 0" class="cn-notice-widget__actions">
			<NcButton
				v-for="entry in resolvedActions"
				:key="entry.key"
				:variant="entry.variant"
				class="cn-notice-widget__action"
				:data-testid="`cn-notice-widget-action-${entry.key}`"
				@click="runAction(entry)">
				{{ entry.label }}
			</NcButton>
		</div>
		<NcButton
			v-if="content && content.dismissible === true"
			variant="tertiary-no-background"
			class="cn-notice-widget__dismiss"
			:aria-label="closeLabel"
			:title="closeLabel"
			data-testid="cn-notice-widget-dismiss"
			@click="dismiss">
			<template #icon>
				<CnIcon name="Close" :size="18" aria-hidden="true" />
			</template>
		</NcButton>
	</section>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { readVisibleWhenPath } from '../../utils/visibleWhen.js'
import { CnIcon } from '../CnIcon/index.js'

/** The tones a notice takes, and the icon each shows by default. */
const VARIANT_ICONS = Object.freeze({
	info: 'InformationOutline',
	warning: 'AlertOutline',
	error: 'AlertCircleOutline',
	success: 'CheckCircleOutline',
})

/** The roles a notice can take. */
const ROLES = Object.freeze(['note', 'status', 'alert'])

/** The button weights a notice action can take, as NcButton variants. */
const ACTION_VARIANTS = Object.freeze({ link: 'tertiary', secondary: 'secondary', primary: 'primary', tertiary: 'tertiary' })

/**
 * Fill `{path}` placeholders from a record. A placeholder the record does not
 * hold becomes empty, so a notice never shows a raw token.
 *
 * @param {string} text The translated text.
 * @param {object|null} record The record the placeholders read.
 * @return {string} The filled text.
 */
export function fillNoticeText(text, record) {
	if (typeof text !== 'string' || text.indexOf('{') === -1) {
		return text
	}
	return text.replace(/\{([A-Za-z_@][\w.@]*)\}/g, (match, path) => {
		const value = record ? readVisibleWhenPath(record, path) : undefined
		return value === undefined || value === null || typeof value === 'object' ? '' : String(value)
	})
}

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
 * `content`: `{ variant?, role?, layout?, title?, text, icon?, link?, actions?, dismissible? }`. `variant` is `info`
 * (default), `warning`, `error` or `success`; `title` and `text` go through
 * the host's translate; `icon` names a CnIcon instead of the variant's own.
 * `link` adds a link under the text: `{ route, params?, label, fallbackLabel? }`
 * (a route name) or `{ href, label }`. `@objectId` and `@object.<path>` in
 * `params` and `label` read the page's record; a link whose params do not
 * resolve is left out, and a label that does not resolve takes
 * `fallbackLabel`.
 *
 * Inside a card (`inline`) it is the card's state banner: an engine refusal,
 * a partial result, a source that is down (R1). `role` is `status`, `alert`
 * or `note`; inside a card it defaults to `alert` for an error and `status`
 * otherwise, as a widget it stays `note`. `layout: 'stacked'` puts the title
 * on its own line. `actions` (`[{ label, action, variant? }]`) are buttons
 * that dispatch a manifest action; `dismissible` adds a close button.
 * `{path}` in the title and text is filled from the record.
 *
 * ```vue
 * <CnNoticeWidget :content="{ variant: 'warning', title: 'Special category data: health.', text: 'Every view is logged with its purpose.' }" />
 * ```
 */
export default {
	name: 'CnNoticeWidget',

	components: { CnIcon, NcButton },

	inject: {
		/** The host app's translate function (CnAppRoot `cnTranslate`). */
		cnTranslate: { default: () => (key) => key },
		/** The page's bound action dispatcher, when there is one. */
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The notice: `{ variant?, title?, text, icon?, link? }`.
		 *
		 * @type {{variant?: string, title?: string, text?: string, icon?: string, link?: {route?: string, params?: object, href?: string, label?: string, fallbackLabel?: string}}}
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
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

		/**
		 * Draw the notice as a card's state banner: the tighter board inset,
		 * and a `status` / `alert` role unless `content.role` says otherwise.
		 */
		inline: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['action', 'dismiss'],

	data() {
		return {
			dismissed: false,
		}
	},

	computed: {
		/**
		 * @return {string} The ARIA role: `content.role`, else `alert` for an
		 *   error and `status` otherwise inside a card, else `note`.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		resolvedRole() {
			const role = this.content && this.content.role
			if (ROLES.includes(role)) {
				return role
			}
			if (!this.inline) {
				return 'note'
			}
			return this.resolvedVariant === 'error' ? 'alert' : 'status'
		},

		/**
		 * @return {string} `inline` (title and text on one line) or `stacked`.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		resolvedLayout() {
			return this.content && this.content.layout === 'stacked' ? 'stacked' : 'inline'
		},

		/**
		 * @return {string} The close button's name.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		closeLabel() {
			return t('nextcloud-vue', 'Close')
		},

		/**
		 * The notice's buttons: entries with a label and an action.
		 *
		 * @return {Array<{key: string, label: string, variant: string, action: object}>} The buttons.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		resolvedActions() {
			const list = this.content && Array.isArray(this.content.actions) ? this.content.actions : []
			return list
				.filter((entry) => entry && typeof entry.label === 'string' && entry.label !== '' && entry.action && typeof entry.action === 'object')
				.map((entry, index) => ({
					key: entry.id || String(index),
					label: this.translate(entry.label),
					variant: ACTION_VARIANTS[entry.variant] || 'tertiary',
					action: entry.action,
				}))
		},

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

		/**
		 * @return {string} The title through the host translate.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		resolvedTitle() {
			return fillNoticeText(this.translate(this.content && this.content.title), this.objectData)
		},

		/**
		 * @return {string} The text through the host translate.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		resolvedText() {
			return fillNoticeText(this.translate(this.content && this.content.text), this.objectData)
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

	watch: {
		/**
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		content() {
			this.dismissed = false
		},
	},

	methods: {
		/**
		 * Run a notice button: emit it, and dispatch its action through the
		 * page dispatcher (or the plain dispatcher outside a page).
		 *
		 * @param {{key: string, action: object}} entry The button.
		 * @return {unknown} The dispatch result.
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		runAction(entry) {
			this.$emit('action', entry)
			const context = { objectId: this.objectId, object: this.objectData || {} }
			const action = resolveDeepTokens(entry.action, context)
			const tokenCtx = { tokenCtx: context }
			return typeof this.cnDispatchAction === 'function'
				? this.cnDispatchAction(action, tokenCtx)
				: dispatchAction(action, { router: this.$router || null, ...tokenCtx })
		},

		/**
		 * Hide the notice until its content changes, and say so.
		 *
		 * @spec openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner
		 */
		dismiss() {
			this.dismissed = true
			this.$emit('dismiss')
		},

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
	flex: 1 1 auto;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-notice-widget--inline {
	padding: 10px 14px;
	border-radius: var(--cn-notice-inline-radius, 10px);
}

.cn-notice-widget--stacked .cn-notice-widget__text {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-notice-widget--stacked .cn-notice-widget__title {
	font-weight: 600;
}

.cn-notice-widget__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-self: center;
}

.cn-notice-widget__dismiss {
	flex: 0 0 auto;
	margin: -6px -8px -6px 0;
	color: inherit;
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
