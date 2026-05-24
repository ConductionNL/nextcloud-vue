<template>
	<NcDialog
		:name="dialogTitle"
		size="normal"
		class="cn-support-dialog"
		data-testid="cn-modal"
		data-testid-modal="cn-support-dialog"
		@closing="onClose">
		<div class="cn-support-dialog__body">
			<p
				v-for="(paragraph, index) in paragraphs"
				:key="index"
				class="cn-support-dialog__paragraph">
				{{ paragraph }}
			</p>

			<div class="cn-support-dialog__signature">
				<span class="cn-support-dialog__signature-name">{{ founderName }}</span>
				<span class="cn-support-dialog__signature-title">— {{ founderTitle }}</span>
			</div>
		</div>

		<template #actions>
			<NcButton
				type="primary"
				data-testid="cn-support-dialog-feature-request"
				@click="openAction('feature-request', featureRequestUrl)">
				<template #icon>
					<HandHeart :size="20" />
				</template>
				{{ featureRequestLabel }}
			</NcButton>

			<NcButton
				type="secondary"
				data-testid="cn-support-dialog-app-store"
				@click="openAction('app-store', appStoreUrl)">
				<template #icon>
					<Star :size="20" />
				</template>
				{{ appStoreLabel }}
			</NcButton>

			<NcButton
				type="tertiary"
				data-testid="cn-support-dialog-donate"
				@click="openAction('donate', donateUrl)">
				<template #icon>
					<HeartOutline :size="20" />
				</template>
				{{ donateLabel }}
			</NcButton>

			<NcButton
				type="tertiary-no-background"
				data-testid="cn-support-dialog-support"
				@click="openAction('support', supportUrl)">
				<template #icon>
					<BriefcaseOutline :size="20" />
				</template>
				{{ supportLabel }}
			</NcButton>
		</template>
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
 * a generic "support us" funnel. Four CTAs in a deliberate priority
 * order:
 *   1. Suggest a feature   — primary; framed as the single most
 *                            valuable contribution.
 *   2. Review on App Store — secondary; helps other people find the app.
 *   3. Donate              — tertiary; defaults to ConductionNL GitHub
 *                            Sponsors.
 *   4. Get business support — subtle / link-style; explicitly framed
 *                            as for organisations, not individuals.
 *
 * The dialog does not manage its own visibility. Pair it with
 * `useSupportDialog(appSlug)` for first-open + dismiss-persistence, or
 * mount it imperatively (e.g. from `CnFeaturesAndRoadmapView`'s 4th
 * sidebar container).
 *
 * Adoption (see docs/components/cn-support-dialog.md for the full example).
 */
import { translate as t } from '@nextcloud/l10n'
import { NcDialog, NcButton } from '@nextcloud/vue'
import HandHeart from 'vue-material-design-icons/HandHeart.vue'
import HeartOutline from 'vue-material-design-icons/HeartOutline.vue'
import Star from 'vue-material-design-icons/Star.vue'
import BriefcaseOutline from 'vue-material-design-icons/BriefcaseOutline.vue'

import { ensureCaveatFontFace } from './assets/caveatFontFace.js'

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
		 * URL the "Get business support" CTA opens. Defaults to the
		 * Conduction contact page. The copy frames this CTA for
		 * organisations, not individuals.
		 */
		supportUrl: {
			type: String,
			default: 'https://www.conduction.nl/contact',
		},
		/**
		 * Name rendered in the handwritten signature line. Defaults to
		 * Ruben van der Linde; overridable so a future Conduction-adjacent
		 * consumer can sign their own apps.
		 */
		founderName: {
			type: String,
			default: 'Ruben van der Linde',
		},
		/**
		 * Title shown after the signature (e.g. "Founder", "Oprichter").
		 * Defaults to the English `Founder` — translated body copy already
		 * carries the localised noun in the paragraphs above, so the label
		 * here is intentionally short.
		 */
		founderTitle: {
			type: String,
			default: 'Founder',
		},
		/**
		 * Optional body-copy override. When non-empty, the array is
		 * rendered verbatim — one `<p>` per entry — and the built-in
		 * Conduction copy is skipped. Useful for one-off campaigns
		 * (release announcement, new pricing) where the founder note is
		 * not the right voice.
		 */
		bodyParagraphs: {
			type: Array,
			default: () => [],
		},
	},

	emits: ['close', 'action'],

	computed: {
		dialogTitle() {
			return t('nextcloud-vue', 'Support {appName}', { appName: this.appName })
		},
		paragraphs() {
			if (Array.isArray(this.bodyParagraphs) && this.bodyParagraphs.length > 0) {
				return this.bodyParagraphs
			}
			return [
				t('nextcloud-vue', 'Hi — I\'m {founderName}, founder of Conduction.', { founderName: this.founderName }),
				t('nextcloud-vue', 'We\'re a small Dutch team building {appName} and the rest of our open-source apps for Nextcloud. Every app is EUPL-1.2 on GitHub — your data stays yours, and the code is yours to read, fork, or improve.', { appName: this.appName }),
				t('nextcloud-vue', 'What pushes {appName} forward isn\'t sales calls — it\'s feature requests. If something\'s missing, awkward, or you\'d love to see it work differently, please tell us. That\'s how this app grows, and it\'s the single most valuable thing you can give back.', { appName: this.appName }),
				t('nextcloud-vue', 'If {appName} is useful to you, a review on the App Store helps other people find it. A small donation keeps us writing code instead of writing invoices. And if your organisation needs hands-on help — onboarding, hosting, custom work — that\'s what our paid support is for.', { appName: this.appName }),
			]
		},
		featureRequestLabel() { return t('nextcloud-vue', 'Suggest a feature') },
		appStoreLabel() { return t('nextcloud-vue', 'Review on App Store') },
		donateLabel() { return t('nextcloud-vue', 'Donate') },
		supportLabel() { return t('nextcloud-vue', 'Business support') },
	},

	mounted() {
		ensureCaveatFontFace()
	},

	methods: {
		/**
		 * Open `url` in a new tab and notify listeners. Consumers can use
		 * the `@action` event for analytics or to short-circuit the
		 * default open-in-new-tab behaviour by calling
		 * `event.preventDefault()` on the native `<NcButton>` click —
		 * not currently exposed (intentional: kept simple for v1).
		 *
		 * @param {string} action  Stable identifier — one of
		 *                         `feature-request`, `app-store`,
		 *                         `donate`, `support`.
		 * @param {string} url     URL the CTA points at.
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
	padding: 0 4px;
}

.cn-support-dialog__paragraph {
	margin: 0 0 12px 0;
	line-height: 1.55;
	color: var(--color-main-text);
}

.cn-support-dialog__paragraph:last-of-type {
	margin-bottom: 20px;
}

.cn-support-dialog__signature {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	margin-top: 8px;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
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
</style>
