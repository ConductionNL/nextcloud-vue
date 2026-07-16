<template>
	<div class="cn-features-and-roadmap-sidebar">
		<header class="cn-features-and-roadmap-sidebar__header">
			<h3 class="cn-features-and-roadmap-sidebar__name">
				{{ sidebarTitle }}
			</h3>
			<p class="cn-features-and-roadmap-sidebar__subname">
				{{ sidebarSubtitle }}
			</p>
		</header>

		<section class="cn-features-and-roadmap-sidebar__section">
			<h4 class="cn-features-and-roadmap-sidebar__section-title">
				{{ suggestTitle }}
			</h4>
			<p class="cn-features-and-roadmap-sidebar__section-body">
				{{ suggestBody }}
			</p>
			<a
				v-if="suggestUrl"
				:href="suggestUrl"
				:target="suggestUrlIsExternal ? '_blank' : null"
				:rel="suggestUrlIsExternal ? 'noopener noreferrer' : null"
				class="cn-features-and-roadmap-sidebar__link">
				{{ suggestCta }}
				<OpenInNew v-if="suggestUrlIsExternal" :size="16" />
				<ArrowRight v-else :size="16" />
			</a>
			<button
				v-else
				type="button"
				class="cn-features-and-roadmap-sidebar__link"
				@click="emitSuggest">
				{{ suggestCta }}
				<ArrowRight :size="16" />
			</button>
		</section>

		<section class="cn-features-and-roadmap-sidebar__section">
			<h4 class="cn-features-and-roadmap-sidebar__section-title">
				{{ openbuiltTitle }}
			</h4>
			<p class="cn-features-and-roadmap-sidebar__section-body">
				{{ openbuiltBody }}
			</p>
			<a
				:href="openbuiltUrl"
				class="cn-features-and-roadmap-sidebar__link">
				{{ openbuiltCta }}
				<ArrowRight :size="16" />
			</a>
		</section>

		<section class="cn-features-and-roadmap-sidebar__section">
			<h4 class="cn-features-and-roadmap-sidebar__section-title">
				{{ llmTitle }}
			</h4>
			<p class="cn-features-and-roadmap-sidebar__section-body">
				{{ llmBody }}
			</p>
			<a
				:href="llmSkillsUrl"
				target="_blank"
				rel="noopener noreferrer"
				class="cn-features-and-roadmap-sidebar__link">
				{{ llmCta }}
				<OpenInNew :size="16" />
			</a>
		</section>

		<section class="cn-features-and-roadmap-sidebar__section">
			<h4 class="cn-features-and-roadmap-sidebar__section-title">
				{{ supportTitle }}
			</h4>
			<p class="cn-features-and-roadmap-sidebar__section-body">
				{{ supportBody }}
			</p>
			<button
				type="button"
				class="cn-features-and-roadmap-sidebar__link"
				@click="emitSupport">
				{{ supportCta }}
				<ArrowRight :size="16" />
			</button>
		</section>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnFeaturesAndRoadmapSidebar — the right-edge sidebar mounted by
 * CnAppRoot's NcContent slot when CnFeaturesAndRoadmapView publishes
 * its hoisted-sidebar config (same mechanism CnIndexPage uses for
 * CnIndexSidebar; see the `cnIndexSidebarConfig` provide in
 * CnAppRoot.vue line ~185).
 *
 * Contains four pitch sections — Suggest, OpenBuilt, LLM, Support —
 * each with a short body and a CTA. Two of those CTAs are events:
 * `@suggest` (bound by the parent view to `openSuggestModal`) and
 * `@support` (bound by the parent view to mount `CnSupportDialog`).
 * Anchor CTAs (OpenBuilt, AI guide) carry URLs the host configures.
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapSidebar".
 */
import { translate as t } from '@nextcloud/l10n'
import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'

export default {
	name: 'CnFeaturesAndRoadmapSidebar',

	components: { ArrowRight, OpenInNew },

	props: {
		/**
		 * Absolute URL or Nextcloud-relative path for the OpenBuilt CTA.
		 */
		openbuiltUrl: {
			type: String,
			required: true,
		},
		/**
		 * Absolute URL for the LLM-skills CTA (opens in a new tab).
		 */
		llmSkillsUrl: {
			type: String,
			required: true,
		},
		/**
		 * Optional override for the Suggest CTA. When set, the CTA renders
		 * as an anchor pointing at this URL — appropriate when the app
		 * routes feature suggestions through a public form, a Discord
		 * channel, or any non-forge target. When empty (default) the CTA
		 * is a button that emits `@suggest`, which the parent view binds
		 * to `CnSuggestFeatureModal`'s forge deep-link. External URLs
		 * (matching `^https?://`) open in a new tab.
		 * @type {string}
		 */
		suggestUrl: {
			type: String,
			default: '',
		},
	},

	computed: {
		suggestUrlIsExternal() {
			return /^https?:\/\//i.test(this.suggestUrl)
		},
		sidebarTitle() { return t('nextcloud-vue', 'Your input is the roadmap') },
		sidebarSubtitle() { return t('nextcloud-vue', 'Four ways to ship what you need') },

		suggestTitle() { return t('nextcloud-vue', 'Hit a wall? Tell us.') },
		suggestBody() { return t('nextcloud-vue', 'Anything that wastes your time is gold to us. Every suggestion becomes a public issue, others can back it, and we triage within 24 hours. You watch it move on this roadmap and get credit on the merge.') },
		suggestCta() { return t('nextcloud-vue', 'Suggest a feature') },

		openbuiltTitle() { return t('nextcloud-vue', 'Tweak it yourself') },
		openbuiltBody() { return t('nextcloud-vue', 'Need a new screen, renamed field, or custom register today? OpenBuilt is the visual app builder inside your own Nextcloud. Drag, drop, save. No code, no deploy, no waiting on a release.') },
		openbuiltCta() { return t('nextcloud-vue', 'Open OpenBuilt') },

		llmTitle() { return t('nextcloud-vue', 'Or have AI build it') },
		llmBody() { return t('nextcloud-vue', 'Claude, ChatGPT, Grok, Qwen or Mistral can ship a feature for you. Our skill set teaches them this codebase. You write the prompt, they write the code, push the PR — same triage, same roadmap, faster path.') },
		llmCta() { return t('nextcloud-vue', 'Read the AI guide') },

		supportTitle() { return t('nextcloud-vue', 'Support this project') },
		supportBody() { return t('nextcloud-vue', 'A short note from the founder on what keeps this app going, and the few small things you can do to help. A review, a feature request, a donation. Worth a minute.') },
		supportCta() { return t('nextcloud-vue', 'Show support note') },
	},

	methods: {
		emitSuggest() {
			/**
			 * @event suggest Emitted when the user clicks the Suggest-feature
			 *   CTA inside the sidebar (only when `suggestUrl` is empty).
			 *   The parent view binds this to its `openSuggestModal` so a
			 *   single `CnSuggestFeatureModal` serves the page header CTA
			 *   and the sidebar text-CTA.
			 */
			this.$emit('suggest')
		},
		emitSupport() {
			/**
			 * @event support Emitted when the user clicks the "Show support
			 *   note" CTA in the fourth sidebar container. The parent view
			 *   binds this to its `openSupportDialog` so a freshly-mounted
			 *   `CnSupportDialog` carries the host-app context.
			 */
			this.$emit('support')
		},
	},
}
</script>

<style scoped>
.cn-features-and-roadmap-sidebar {
	background: var(--color-main-background);
	border-left: 1px solid var(--color-border);
	height: 100%;
	overflow-y: auto;
}

.cn-features-and-roadmap-sidebar__header {
	padding: 16px;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-background-hover);
}

.cn-features-and-roadmap-sidebar__name {
	margin: 0;
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-sidebar__subname {
	margin: 4px 0 0 0;
	font-size: 0.85em;
	color: var(--color-text-light);
}

.cn-features-and-roadmap-sidebar__section {
	padding: 16px;
	border-bottom: 1px solid var(--color-border);
}

.cn-features-and-roadmap-sidebar__section:last-child {
	border-bottom: 0;
}

.cn-features-and-roadmap-sidebar__section-title {
	margin: 0 0 8px 0;
	font-size: 1em;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-sidebar__section-body {
	margin: 0 0 12px 0;
	font-size: 0.95em;
	line-height: 1.5;
	color: var(--color-text-light);
}

.cn-features-and-roadmap-sidebar__link {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--color-primary-element);
	text-decoration: none;
	font-size: 0.95em;
	background: transparent;
	border: 0;
	padding: 0;
	cursor: pointer;
	font-family: inherit;
}

.cn-features-and-roadmap-sidebar__link:hover {
	text-decoration: underline;
}
</style>
