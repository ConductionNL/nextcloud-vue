<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		class="cn-support-dialog"
		data-testid="cn-modal"
		data-testid-modal="cn-support-dialog"
		@closing="onClose">
		<div class="cn-support-dialog__body">
			<!-- Host-provided override copy: plain paragraphs, no links. -->
			<template v-if="hasBodyOverride">
				<p
					v-for="(paragraph, index) in bodyParagraphs"
					:key="index"
					class="cn-support-dialog__paragraph">
					{{ paragraph }}
				</p>
			</template>

			<!-- Default Conduction copy with inline links. -->
			<template v-else>
				<p class="cn-support-dialog__paragraph">
					{{ greetingHi }}
				</p>
				<p class="cn-support-dialog__paragraph">
					{{ introLead }} <a
						:href="conductionUrl"
						target="_blank"
						rel="noopener noreferrer"
						class="cn-support-dialog__link">{{ conductionLabel }}</a>.
				</p>
				<p class="cn-support-dialog__paragraph">
					{{ teamLead }} <a
						:href="appsUrl"
						target="_blank"
						rel="noopener noreferrer"
						class="cn-support-dialog__link">{{ appsLabel }}</a> {{ teamTrail }}
				</p>
				<p class="cn-support-dialog__paragraph">
					{{ featureParagraph }}
				</p>
				<p class="cn-support-dialog__paragraph">
					{{ supportParagraph }}
				</p>
			</template>

			<div class="cn-support-dialog__signature">
				<a
					v-if="founderProfileUrl"
					:href="founderProfileUrl"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-support-dialog__avatar-link"
					:aria-label="founderName">
					<img
						class="cn-support-dialog__avatar"
						:src="founderAvatarUrl"
						:alt="founderName"
						width="48"
						height="48">
				</a>
				<img
					v-else
					class="cn-support-dialog__avatar"
					:src="founderAvatarUrl"
					:alt="founderName"
					width="48"
					height="48">
				<span class="cn-support-dialog__signature-text">
					<span class="cn-support-dialog__signature-name">{{ founderName }}</span>
					<span class="cn-support-dialog__signature-title">{{ founderTitle }}</span>
				</span>
			</div>

			<div class="cn-support-dialog__actions">
				<NcButton
					type="tertiary"
					wide
					data-testid="cn-support-dialog-donate"
					@click="openAction('donate', donateUrl)">
					<template #icon>
						<HeartOutline :size="20" />
					</template>
					{{ donateLabel }}
				</NcButton>

				<NcButton
					type="tertiary"
					wide
					data-testid="cn-support-dialog-support"
					@click="openAction('support', supportUrl)">
					<template #icon>
						<BriefcaseOutline :size="20" />
					</template>
					{{ supportLabel }}
				</NcButton>

				<NcButton
					type="primary"
					wide
					data-testid="cn-support-dialog-feature-request"
					@click="openAction('feature-request', featureRequestUrl)">
					<template #icon>
						<HandHeart :size="20" />
					</template>
					{{ featureRequestLabel }}
				</NcButton>

				<NcButton
					type="secondary"
					wide
					data-testid="cn-support-dialog-app-store"
					@click="openAction('app-store', appStoreUrl)">
					<template #icon>
						<Star :size="20" />
					</template>
					{{ appStoreLabel }}
				</NcButton>
			</div>
		</div>
	</NcDialog>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnSupportDialog — a personal first-open support note from the founder
 * to the user of any Conduction Nextcloud app.
 *
 * The dialog is intentionally calm and personal (MKB tone) rather than
 * a generic "support us" funnel. A founder avatar + handwritten
 * signature sit above four CTAs laid out in a 2x2 grid, in a deliberate
 * priority order:
 *   1. Suggest a feature   primary; framed as the most useful contribution.
 *   2. Review on App Store secondary; helps other people find the app.
 *   3. Donate              tertiary; defaults to ConductionNL GitHub Sponsors.
 *   4. Get support         tertiary; routes organisations to a Conduction
 *                          support partner (the apps stay free).
 *
 * Every piece of host-specific content is overridable via props: the
 * app name + slug, all four CTA URLs, the two inline links (Conduction
 * + apps), the founder name/title/avatar/profile link, and the entire
 * body copy (`bodyParagraphs`). This keeps the component reusable by
 * Conduction-adjacent parties signing their own apps — see
 * docs/components/cn-support-dialog.md.
 *
 * The dialog does not manage its own visibility. Pair it with
 * `useSupportDialog(appSlug)` for first-open + dismiss-persistence, or
 * mount it imperatively (e.g. from `CnFeaturesAndRoadmapView`'s 4th
 * sidebar container).
 */
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton } from '@nextcloud/vue'
import HandHeart from 'vue-material-design-icons/HandHeart.vue'
import HeartOutline from 'vue-material-design-icons/HeartOutline.vue'
import Star from 'vue-material-design-icons/Star.vue'
import BriefcaseOutline from 'vue-material-design-icons/BriefcaseOutline.vue'

import { ensureCaveatFontFace } from './assets/caveatFontFace.js'
import { DEFAULT_FOUNDER_AVATAR } from './assets/founderAvatar.js'

export default {
	name: 'CnSupportDialog',

	components: {
		NcDialog,
		NcButton,
		HandHeart,
		HeartOutline,
		Star,
		BriefcaseOutline,
	},

	props: {
		/**
		 * Display name of the host app, interpolated into the body copy
		 * (e.g. "Decidesk", "OpenRegister"). Required.
		 */
		appName: {
			type: String,
			required: true,
		},
		/**
		 * Kebab-case app id used as the localStorage namespace by
		 * `useSupportDialog`. Required so two apps mounted in the same
		 * Nextcloud session don't share a "shown" flag.
		 */
		appSlug: {
			type: String,
			required: true,
		},
		/**
		 * Nextcloud App Store listing URL for the host app — opens in a
		 * new tab when the "Review on App Store" CTA fires. Required.
		 */
		appStoreUrl: {
			type: String,
			required: true,
		},
		/**
		 * URL the "Suggest a feature" CTA opens (typically the host app's
		 * GitHub issues "new feature" template). Required.
		 */
		featureRequestUrl: {
			type: String,
			required: true,
		},
		/**
		 * URL the "Donate" CTA opens. Defaults to ConductionNL's GitHub
		 * Sponsors page so apps that haven't set up their own donation
		 * channel still have a working button.
		 */
		donateUrl: {
			type: String,
			default: 'https://github.com/sponsors/ConductionNL',
		},
		/**
		 * URL the "Get support" CTA opens. Defaults to the Conduction
		 * support page, where organisations are matched with a Host,
		 * Service, or Certified partner. Conduction does not sell direct
		 * support — the apps stay free and support runs through partners.
		 */
		supportUrl: {
			type: String,
			default: 'https://www.conduction.nl/support',
		},
		/**
		 * Target of the inline "Conduction" link in the default body copy.
		 * Ignored when `bodyParagraphs` is provided.
		 */
		conductionUrl: {
			type: String,
			default: 'https://www.conduction.nl',
		},
		/**
		 * Target of the inline "apps" link in the default body copy.
		 * Ignored when `bodyParagraphs` is provided.
		 */
		appsUrl: {
			type: String,
			default: 'https://www.conduction.nl/apps',
		},
		/**
		 * Name rendered in the handwritten signature line. Defaults to
		 * Ruben van der Linde; overridable so a Conduction-adjacent
		 * consumer can sign their own apps.
		 */
		founderName: {
			type: String,
			default: 'Ruben van der Linde',
		},
		/**
		 * Title shown under the signature name. Defaults to
		 * "a founder of Conduction" (Conduction has more than one
		 * founder); override when signing your own apps.
		 */
		founderTitle: {
			type: String,
			default: 'a founder of Conduction',
		},
		/**
		 * Avatar shown to the left of the signature. Defaults to the
		 * bundled founder portrait (data URI, self-hosted — no third-party
		 * request). Override with any URL or data URI when signing your
		 * own apps.
		 */
		founderAvatarUrl: {
			type: String,
			default: DEFAULT_FOUNDER_AVATAR,
		},
		/**
		 * Profile the avatar links to (opens in a new tab). Defaults to
		 * the founder's LinkedIn. Pass an empty string to render the
		 * avatar without a link.
		 */
		founderProfileUrl: {
			type: String,
			default: 'https://www.linkedin.com/in/rubenlinde/',
		},
		/**
		 * Optional body-copy override. When non-empty, the array is
		 * rendered verbatim — one `<p>` per entry, no inline links — and
		 * the built-in Conduction copy is skipped. Useful for one-off
		 * campaigns (release announcement, new pricing) where the founder
		 * note is not the right voice.
		 */
		bodyParagraphs: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['close', 'action'],

	computed: {
		hasBodyOverride() {
			return Array.isArray(this.bodyParagraphs) && this.bodyParagraphs.length > 0
		},
		dialogTitle() {
			return t('nextcloud-vue', 'Support {appName}', { appName: this.appName })
		},
		greetingHi() { return t('nextcloud-vue', 'Hi,') },
		introLead() {
			return t('nextcloud-vue', 'I\'m {founderName}, a founder of', { founderName: this.founderName })
		},
		conductionLabel() { return t('nextcloud-vue', 'Conduction') },
		teamLead() {
			return t('nextcloud-vue', 'We\'re a small Dutch team. We build {appName} and the rest of our open-source', { appName: this.appName })
		},
		appsLabel() { return t('nextcloud-vue', 'apps') },
		teamTrail() {
			return t('nextcloud-vue', 'for Nextcloud. Every app is EUPL-1.2 on GitHub, so your data stays yours and you can read, fork or improve the code yourself.')
		},
		featureParagraph() {
			return t('nextcloud-vue', 'Feature requests are what move {appName} forward, not sales calls. If something is missing, awkward, or you\'d like it to work differently, tell us. That\'s how the app grows.', { appName: this.appName })
		},
		supportParagraph() {
			return t('nextcloud-vue', 'If {appName} is useful to you, a review on the App Store helps other people find it, and a small donation keeps us writing code instead of invoices. The app stays free, always. And if your organisation wants hands-on help with hosting, setup or an SLA, we\'ll match you with a partner who supports it.', { appName: this.appName })
		},
		featureRequestLabel() { return t('nextcloud-vue', 'Suggest a feature') },
		appStoreLabel() { return t('nextcloud-vue', 'Review on App Store') },
		donateLabel() { return t('nextcloud-vue', 'Donate') },
		supportLabel() { return t('nextcloud-vue', 'Get support') },
	},

	mounted() {
		ensureCaveatFontFace()
	},

	methods: {
		/**
		 * Open `url` in a new tab and notify listeners.
		 *
		 * @param {string} action Stable identifier — one of
		 *                        `feature-request`, `app-store`, `donate`,
		 *                        `support`.
		 * @param {string} url    URL the CTA points at.
		 */
		openAction(action, url) {
			if (url) {
				window.open(url, '_blank', 'noopener,noreferrer')
			}
			/**
			 * @event action Fired alongside the native `window.open` call on
			 *   each CTA click. Useful for analytics or to short-circuit the
			 *   default open-in-new-tab behaviour from a parent listener.
			 * @type {{action: string, url: string}}
			 */
			this.$emit('action', { action, url })
		},
		onClose() {
			/**
			 * @event close Emitted when the user dismisses the dialog
			 *   (backdrop click, ESC, close icon). Pair with
			 *   `useSupportDialog().hide` to also persist the dismissal.
			 */
			this.$emit('close')
		},
	},
}
</script>

<style scoped>
.cn-support-dialog__body {
	/* Bottom padding restores the breathing room the NcDialog actions slot
	   used to provide — the CTAs now live in the body, so without it the
	   bottom row sits flush against the dialog edge. */
	padding: 0 4px 16px;
}

.cn-support-dialog__paragraph {
	margin: 0 0 12px 0;
	line-height: 1.55;
	color: var(--color-main-text);
}

.cn-support-dialog__link {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-support-dialog__signature {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12px;
	margin-top: 8px;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
}

.cn-support-dialog__avatar-link {
	flex: 0 0 auto;
	display: inline-flex;
	border-radius: 50%;
}

.cn-support-dialog__avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	object-fit: cover;
	display: block;
}

.cn-support-dialog__signature-text {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
}

.cn-support-dialog__signature-name {
	font-family: 'Caveat', 'Brush Script MT', 'Lucida Handwriting', cursive;
	font-size: 28px;
	line-height: 1;
	color: var(--color-main-text);
}

.cn-support-dialog__signature-title {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-support-dialog__actions {
	display: grid;
	grid-template-columns: 1fr 1fr;
	column-gap: 8px;
	row-gap: 8px;
	align-items: stretch;
	margin-top: 16px;
}

/* Normalise per-button margins so the grid gap is the only spacing —
   NcButton ships its own margins that otherwise make the rows look uneven. */
.cn-support-dialog__actions > * {
	margin: 0;
	width: 100%;
}

@media (max-width: 480px) {
	.cn-support-dialog__actions {
		grid-template-columns: 1fr;
	}
}
</style>
