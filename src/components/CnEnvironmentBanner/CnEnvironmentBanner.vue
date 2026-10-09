<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		v-if="marked"
		class="cn-environment-banner"
		:class="`cn-environment-banner--${marked}`"
		role="note"
		:aria-label="label"
		data-testid="cn-environment-banner">
		<span class="cn-environment-banner__label">{{ label }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { ENVIRONMENT_TITLE_PREFIX, MARKED_ENVIRONMENTS, normaliseEnvironment } from '../../utils/environment.js'

/**
 * CnEnvironmentBanner — names a non-production environment on every app screen
 * so acceptance is not mistaken for production.
 *
 * Shows "Development environment", "Test environment" or "Acceptance
 * environment" in words, with a colour per environment, as a `role="note"` with
 * an accessible name. It has no close action and cannot be hidden by a user
 * setting. While it shows, the document title is prefixed `[DEV]`, `[TEST]` or
 * `[ACC]` (and put back when it goes). Production, an unknown value and no
 * value render nothing and leave the title alone.
 *
 * `CnAppRoot` and `CnAdminSettingsShell` place it themselves, from their
 * `environment` prop or the active organisation's `environment` field. An app
 * that does not mount them can place it:
 *
 * ```vue
 * <CnEnvironmentBanner environment="acceptance" />
 * ```
 */
export default {
	name: 'CnEnvironmentBanner',

	props: {
		/** The environment: `development`, `test` or `acceptance` shows the banner; anything else shows nothing. */
		environment: {
			type: String,
			default: '',
		},
	},

	computed: {
		/** @return {string} The environment to mark, or '' when nothing is shown. */
		marked() {
			const name = normaliseEnvironment(this.environment)
			return MARKED_ENVIRONMENTS.includes(name) ? name : ''
		},

		/** @return {string} The name of the environment in words. */
		label() {
			return {
				development: t('nextcloud-vue', 'Development environment'),
				test: t('nextcloud-vue', 'Test environment'),
				acceptance: t('nextcloud-vue', 'Acceptance environment'),
			}[this.marked] || ''
		},
	},

	watch: {
		marked: {
			immediate: true,
			handler(next) {
				this.applyTitlePrefix(next)
			},
		},
	},

	mounted() {
		// A router that sets the title after we did must not lose the prefix.
		const titleElement = typeof document !== 'undefined' ? document.querySelector('title') : null
		if (titleElement && typeof MutationObserver !== 'undefined') {
			this.titleObserver = new MutationObserver(() => this.applyTitlePrefix(this.marked))
			this.titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true })
		}
	},

	beforeUnmount() {
		if (this.titleObserver) {
			this.titleObserver.disconnect()
		}
		this.applyTitlePrefix('')
	},

	methods: {
		/**
		 * Put the environment's prefix at the start of the tab title, or take ours
		 * off when nothing is marked.
		 *
		 * @param {string} environment The marked environment, or ''.
		 * @return {void}
		 */
		applyTitlePrefix(environment) {
			if (typeof document === 'undefined') {
				return
			}
			const all = Object.values(ENVIRONMENT_TITLE_PREFIX)
			const bare = document.title.replace(new RegExp(`^(?:${all.map((p) => p.replace(/[[\]]/g, '\\$&')).join('|')}) `), '')
			const wanted = environment ? `${ENVIRONMENT_TITLE_PREFIX[environment]} ${bare}` : bare
			if (document.title !== wanted) {
				document.title = wanted
			}
		},
	},
}
</script>

<style scoped>
.cn-environment-banner {
	--cn-environment-accent: var(--color-element-info, var(--color-primary-element));
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	min-height: 24px;
	padding: 2px 12px;
	border-inline-start: 6px solid var(--cn-environment-accent);
	border-block-end: 2px solid var(--cn-environment-accent);
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-weight: bold;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.cn-environment-banner--development {
	--cn-environment-accent: var(--color-element-info, var(--color-primary-element));
}

.cn-environment-banner--test {
	--cn-environment-accent: var(--color-element-warning, var(--color-warning));
}

.cn-environment-banner--acceptance {
	--cn-environment-accent: var(--color-element-error, var(--color-error));
}
</style>
