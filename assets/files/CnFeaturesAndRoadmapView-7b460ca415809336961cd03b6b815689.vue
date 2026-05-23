<template>
	<div class="cn-features-and-roadmap-view">
		<div v-if="disabled" class="cn-features-and-roadmap-view__disabled">
			<NcEmptyContent :name="disabledTitle" :description="disabledDescription">
				<template #icon>
					<LockOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<template v-else>
			<header class="cn-features-and-roadmap-view__header">
				<h2 class="cn-features-and-roadmap-view__title">
					{{ headerTitle }}
				</h2>
				<div class="cn-features-and-roadmap-view__actions">
					<NcButton @click="toggleView">
						<template #icon>
							<RoadVariant v-if="activeView === 'features'" :size="20" />
							<FormatListBulleted v-else :size="20" />
						</template>
						{{ toggleLabel }}
					</NcButton>
					<NcButton type="primary" @click="openSuggestModal">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ suggestLabel }}
					</NcButton>
				</div>
			</header>

			<div class="cn-features-and-roadmap-view__body">
				<main class="cn-features-and-roadmap-view__panel">
					<CnFeaturesTab v-if="activeView === 'features'" :features="features" />
					<CnRoadmapTab v-else :repo="repo" />
				</main>

				<aside class="cn-features-and-roadmap-view__sidebar">
					<NcButton
						type="primary"
						class="cn-features-and-roadmap-view__sidebar-cta"
						@click="openSuggestModal">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ suggestLabel }}
					</NcButton>

					<section class="cn-features-and-roadmap-view__sidebar-section">
						<h3 class="cn-features-and-roadmap-view__sidebar-title">
							{{ openbuiltTitle }}
						</h3>
						<p class="cn-features-and-roadmap-view__sidebar-body">
							{{ openbuiltBody }}
						</p>
						<a
							:href="resolvedOpenbuiltUrl"
							class="cn-features-and-roadmap-view__sidebar-link">
							{{ openbuiltCta }}
							<ArrowRight :size="16" />
						</a>
					</section>

					<section class="cn-features-and-roadmap-view__sidebar-section">
						<h3 class="cn-features-and-roadmap-view__sidebar-title">
							{{ llmTitle }}
						</h3>
						<p class="cn-features-and-roadmap-view__sidebar-body">
							{{ llmBody }}
						</p>
						<a
							:href="resolvedLlmSkillsUrl"
							target="_blank"
							rel="noopener noreferrer"
							class="cn-features-and-roadmap-view__sidebar-link">
							{{ llmCta }}
							<OpenInNew :size="16" />
						</a>
					</section>
				</aside>
			</div>

			<CnSuggestFeatureModal
				v-if="showSuggestModal"
				:repo="repo"
				:spec-ref="suggestModalSpecRef"
				@submitted="onSubmitted"
				@close="showSuggestModal = false" />
		</template>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnFeaturesAndRoadmapView — route-level container for the Features &
 * Roadmap surface. Renders a card grid (features OR roadmap) with a
 * state-aware toggle button in the header that switches between the two
 * views. A right-hand sidebar carries a second Suggest-feature CTA plus
 * two short pitch blocks: build-it-yourself in OpenBuilt, and let an LLM
 * ship the feature using the Conduction skill set.
 *
 * Sidebar link targets are overridable via the `openbuiltUrl` and
 * `llmSkillsUrl` props; defaults point at the in-Nextcloud OpenBuilt
 * route and the public docs.conduction.nl page respectively.
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapView".
 */
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent } from '@nextcloud/vue'
import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'

import CnFeaturesTab from '../CnFeaturesTab/CnFeaturesTab.vue'
import CnRoadmapTab from '../CnRoadmapTab/CnRoadmapTab.vue'
import CnSuggestFeatureModal from '../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'
import { useSpecRef } from '../../composables/useSpecRef.js'

const DEFAULT_OPENBUILT_PATH = '/apps/openbuilt'
const DEFAULT_LLM_SKILLS_URL = 'https://docs.conduction.nl/ai-skills'

export default {
	name: 'CnFeaturesAndRoadmapView',

	components: {
		NcButton,
		NcEmptyContent,
		ArrowRight,
		FormatListBulleted,
		LockOutline,
		OpenInNew,
		Plus,
		RoadVariant,
		CnFeaturesTab,
		CnRoadmapTab,
		CnSuggestFeatureModal,
	},

	props: {
		/**
		 * `<owner>/<repo>` of the app's GitHub repository.
		 */
		repo: {
			type: String,
			required: true,
		},
		/**
		 * Build-time feature manifest (alphabetical list rendered by CnFeaturesTab).
		 * @type {Array<{slug: string, title: string, summary: string, docsUrl: string}>}
		 */
		features: {
			type: Array,
			required: true,
			default: () => [],
		},
		/**
		 * Admin opt-out flag — when true the entire view collapses to a
		 * single "disabled by admin" empty state.
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Override the OpenBuilt sidebar CTA target. Pass an absolute URL or
		 * a Nextcloud-relative path. When unset, defaults to the in-instance
		 * OpenBuilt route at `/apps/openbuilt` (resolved via `generateUrl`).
		 * @type {string}
		 */
		openbuiltUrl: {
			type: String,
			default: '',
		},
		/**
		 * Override the LLM-skills sidebar CTA target. Defaults to
		 * `https://docs.conduction.nl/ai-skills`.
		 * @type {string}
		 */
		llmSkillsUrl: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			activeView: 'features',
			showSuggestModal: false,
			suggestModalSpecRef: null,
		}
	},

	computed: {
		headerTitle() {
			return this.activeView === 'features'
				? t('nextcloud-vue', 'Features')
				: t('nextcloud-vue', 'Roadmap')
		},
		toggleLabel() {
			return this.activeView === 'features'
				? t('nextcloud-vue', 'Show roadmap')
				: t('nextcloud-vue', 'Show features')
		},
		suggestLabel() { return t('nextcloud-vue', 'Suggest feature') },
		disabledTitle() { return t('nextcloud-vue', 'This feature has been disabled by your administrator') },
		disabledDescription() { return t('nextcloud-vue', 'Contact your Nextcloud administrator to enable Features & Roadmap on this instance.') },

		openbuiltTitle() { return t('nextcloud-vue', 'Tweak it in OpenBuilt') },
		openbuiltBody() { return t('nextcloud-vue', 'Add a screen, rename a field, wire up a register. OpenBuilt does it without code.') },
		openbuiltCta() { return t('nextcloud-vue', 'Open OpenBuilt') },

		llmTitle() { return t('nextcloud-vue', 'Let AI add the feature') },
		llmBody() { return t('nextcloud-vue', 'Claude, ChatGPT, Grok, Qwen or Mistral can ship a feature for you. Our skill set teaches them this code base. You bring the prompt.') },
		llmCta() { return t('nextcloud-vue', 'Read the AI guide') },

		resolvedOpenbuiltUrl() {
			if (this.openbuiltUrl) return this.openbuiltUrl
			return generateUrl(DEFAULT_OPENBUILT_PATH)
		},
		resolvedLlmSkillsUrl() {
			return this.llmSkillsUrl || DEFAULT_LLM_SKILLS_URL
		},
	},

	methods: {
		toggleView() {
			this.activeView = this.activeView === 'features' ? 'roadmap' : 'features'
		},
		openSuggestModal() {
			this.suggestModalSpecRef = useSpecRef(this)
			this.showSuggestModal = true
		},
		onSubmitted(payload) {
			this.showSuggestModal = false
			/**
			 * Re-emitted when a feature suggestion was successfully filed from this view.
			 * Carries the sanitized GitHub issue payload returned by the OpenRegister proxy
			 * (`{number, title, html_url, ...}`). Host apps may use it to show a toast.
			 *
			 * @event submitted
			 * @type {object}
			 */
			this.$emit('submitted', payload)
			// Switch to the Roadmap view so the user sees their submission appear.
			this.activeView = 'roadmap'
		},
	},
}
</script>

<style scoped>
.cn-features-and-roadmap-view {
	max-width: 1200px;
	margin: 0 auto;
	padding: 24px 16px;
}

.cn-features-and-roadmap-view__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 24px;
	flex-wrap: wrap;
}

.cn-features-and-roadmap-view__title {
	font-size: 1.4em;
	margin: 0;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-view__actions {
	display: flex;
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
}

.cn-features-and-roadmap-view__body {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 280px;
	gap: 24px;
	align-items: start;
}

@media (max-width: 900px) {
	.cn-features-and-roadmap-view__body {
		grid-template-columns: 1fr;
	}
}

.cn-features-and-roadmap-view__panel {
	min-height: 320px;
}

.cn-features-and-roadmap-view__sidebar {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-features-and-roadmap-view__sidebar-cta {
	width: 100%;
	justify-content: center;
}

.cn-features-and-roadmap-view__sidebar-section {
	padding: 16px;
	background: var(--color-background-hover);
	border-radius: var(--border-radius-large, 12px);
	border: 1px solid var(--color-border);
}

.cn-features-and-roadmap-view__sidebar-title {
	margin: 0 0 8px 0;
	font-size: 1em;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-view__sidebar-body {
	margin: 0 0 12px 0;
	font-size: 0.9em;
	line-height: 1.45;
	color: var(--color-text-light);
}

.cn-features-and-roadmap-view__sidebar-link {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--color-primary-element);
	text-decoration: none;
	font-size: 0.9em;
}

.cn-features-and-roadmap-view__sidebar-link:hover {
	text-decoration: underline;
}
</style>
