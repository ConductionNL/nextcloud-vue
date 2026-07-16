<!--
  CnTranslatedBadge — stateless chip that surfaces OR's
  `_translationMeta` block.

  The badge auto-hides when the bound object has no `_translationMeta`
  block, or when `_translationMeta.translatedFrom` is null. When the
  field IS set, the badge renders "(translated from {sourceLanguage})"
  and exposes the `translatedAt` timestamp via the `title` attribute.

  Pairs with the language-negotiation getters on `createObjectStore`
  (see `i18n-language-negotiation-getters`): apps that wire
  `languageGetter` get translated bytes from OR; the badge then
  signals to the user that those bytes are a translation projection,
  not the source row.
-->
<template>
	<span
		v-if="visible"
		class="cn-translated-badge"
		:title="hoverTitle"
		data-testid="cn-translated-badge">
		<span class="cn-translated-badge__icon" aria-hidden="true">⇄</span>
		<span class="cn-translated-badge__label">
			{{ label }}
		</span>
	</span>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnTranslatedBadge — surfaces OR's `_translationMeta.translatedFrom`
 * as a small chip in detail surfaces.
 *
 * Basic:
 * ```vue
 * <CnTranslatedBadge :object="object" />
 * ```
 *
 * With custom locale name formatter:
 * ```vue
 * <CnTranslatedBadge
 *   :object="object"
 *   :locale-name-formatter="(bcp47) => myLanguageLabels[bcp47] || bcp47" />
 * ```
 */
export default {
	name: 'CnTranslatedBadge',

	props: {
		/**
		 * The OR object whose `_translationMeta` is surfaced. The
		 * badge auto-hides when `object` is null, when
		 * `object._translationMeta` is missing, or when
		 * `_translationMeta.translatedFrom` is null/empty.
		 *
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},

		/**
		 * Optional BCP-47 → display name function. Receives the
		 * BCP-47 string from `_translationMeta.translatedFrom` and
		 * returns a user-facing label (e.g. `'nl' → 'Nederlands'`).
		 * When omitted, falls back to `Intl.DisplayNames` when
		 * available, then to the raw BCP-47 string.
		 *
		 * @type {Function|null}
		 */
		localeNameFormatter: {
			type: Function,
			default: null,
		},
	},

	computed: {
		/**
		 * The translatedFrom BCP-47 string when present, else null.
		 * @return {string|null}
		 */
		translatedFrom() {
			const meta = this.object && this.object._translationMeta
			if (!meta) return null
			const v = meta.translatedFrom
			return typeof v === 'string' && v.length > 0 ? v : null
		},

		/**
		 * The translatedAt ISO timestamp when present, else null.
		 * @return {string|null}
		 */
		translatedAt() {
			const meta = this.object && this.object._translationMeta
			if (!meta) return null
			const v = meta.translatedAt
			return typeof v === 'string' && v.length > 0 ? v : null
		},

		/**
		 * Whether the badge should render at all.
		 * @return {boolean}
		 */
		visible() {
			return this.translatedFrom !== null
		},

		/**
		 * Display name for the source language. Falls back through
		 * `localeNameFormatter` → `Intl.DisplayNames` → raw BCP-47.
		 * @return {string}
		 */
		sourceDisplayName() {
			const bcp47 = this.translatedFrom
			if (!bcp47) return ''
			if (typeof this.localeNameFormatter === 'function') {
				try {
					const v = this.localeNameFormatter(bcp47)
					if (typeof v === 'string' && v.length > 0) return v
				} catch {
					// fall through to Intl
				}
			}
			if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
				try {
					const navLang = (typeof navigator !== 'undefined' && navigator.language) || 'en'
					const dn = new Intl.DisplayNames([navLang], { type: 'language' })
					const v = dn.of(bcp47)
					if (typeof v === 'string' && v.length > 0) return v
				} catch {
					// fall through to raw
				}
			}
			return bcp47
		},

		/**
		 * The user-facing label, e.g. `(translated from Dutch)`.
		 * @return {string}
		 */
		label() {
			return t('nextcloud-vue', '(translated from {language})', { language: this.sourceDisplayName })
		},

		/**
		 * Hover title — exposes `translatedAt` so users can see how
		 * old the projection is.
		 * @return {string}
		 */
		hoverTitle() {
			if (!this.translatedAt) return ''
			try {
				const d = new Date(this.translatedAt)
				if (!Number.isNaN(d.getTime())) {
					return t('nextcloud-vue', 'Translated at {when}', { when: d.toLocaleString() })
				}
			} catch {
				// fall through to raw ISO
			}
			return this.translatedAt
		},
	},
}
</script>

<style scoped>
.cn-translated-badge {
	display: inline-flex;
	align-items: center;
	gap: var(--default-grid-baseline, 4px);
	padding: calc(0.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	border-radius: var(--border-radius-pill, 999px);
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
	font-size: 0.75em;
	font-weight: 500;
	line-height: 1;
}

.cn-translated-badge__icon {
	font-size: 0.9em;
}
</style>
