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
					<NcButton @click="sidebarOpen = !sidebarOpen">
						<template #icon>
							<InformationOutline :size="20" />
						</template>
						{{ sidebarToggleLabel }}
					</NcButton>
					<NcButton type="primary" @click="openSuggestModal">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ suggestLabel }}
					</NcButton>
				</div>
			</header>

			<main class="cn-features-and-roadmap-view__panel">
				<CnFeaturesTab v-if="activeView === 'features'" :features="features" />
				<CnRoadmapTab v-else :repo="repo" />
			</main>

			<NcAppSidebar
				v-if="sidebarOpen"
				:name="sidebarTitle"
				:subname="sidebarSubtitle"
				:empty="true"
				:show-tabs="false"
				class="cn-features-and-roadmap-view__sidebar"
				@close="sidebarOpen = false">
				<section class="cn-features-and-roadmap-view__sidebar-section">
					<h3 class="cn-features-and-roadmap-view__sidebar-section-title">
						{{ suggestSidebarTitle }}
					</h3>
					<p class="cn-features-and-roadmap-view__sidebar-section-body">
						{{ suggestSidebarBody }}
					</p>
					<button
						type="button"
						class="cn-features-and-roadmap-view__sidebar-link"
						@click="openSuggestModal">
						{{ suggestSidebarCta }}
						<ArrowRight :size="16" />
					</button>
				</section>

				<section class="cn-features-and-roadmap-view__sidebar-section">
					<h3 class="cn-features-and-roadmap-view__sidebar-section-title">
						{{ openbuiltTitle }}
					</h3>
					<p class="cn-features-and-roadmap-view__sidebar-section-body">
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
					<h3 class="cn-features-and-roadmap-view__sidebar-section-title">
						{{ llmTitle }}
					</h3>
					<p class="cn-features-and-roadmap-view__sidebar-section-body">
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
			</NcAppSidebar>

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
 * Roadmap surface. Header carries the view-toggle, the info-sidebar
 * toggle, and the primary Suggest-feature CTA. Body is a card grid
 * (Features OR Roadmap). The slide-in NcAppSidebar (opened from the
 * header) carries three pitch sections: how to suggest a feature, how
 * to tweak the app in OpenBuilt, and how to let an LLM ship a feature
 * using the Conduction skill set.
 *
 * Sidebar starts closed; consumers persist no state. Sidebar link
 * targets are overridable via the `openbuiltUrl` and `llmSkillsUrl`
 * props. Defaults: in-instance `/apps/openbuilt` (via `generateUrl`)
 * and `https://docs.conduction.nl/ai-skills`.
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapView".
 */
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcAppSidebar, NcButton, NcEmptyContent } from '@nextcloud/vue'
import ArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
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
		NcAppSidebar,
		NcButton,
		NcEmptyContent,
		ArrowRight,
		FormatListBulleted,
		InformationOutline,
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
			sidebarOpen: false,
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
		sidebarToggleLabel() {
			return this.sidebarOpen
				? t('nextcloud-vue', 'Hide info')
				: t('nextcloud-vue', 'Show info')
		},
		suggestLabel() { return t('nextcloud-vue', 'Suggest feature') },
		disabledTitle() { return t('nextcloud-vue', 'This feature has been disabled by your administrator') },
		disabledDescription() { return t('nextcloud-vue', 'Contact your Nextcloud administrator to enable Features & Roadmap on this instance.') },

		sidebarTitle() { return t('nextcloud-vue', 'Shape this app') },
		sidebarSubtitle() { return t('nextcloud-vue', 'Three ways to land a feature') },

		suggestSidebarTitle() { return t('nextcloud-vue', 'Missing something?') },
		suggestSidebarBody() { return t('nextcloud-vue', 'Tell us what would make your day. Every suggestion lands as a GitHub issue. Other users can +1 it. The maintainers triage it. You watch the status here on the roadmap.') },
		suggestSidebarCta() { return t('nextcloud-vue', 'Suggest a feature') },

		openbuiltTitle() { return t('nextcloud-vue', 'Tweak it in OpenBuilt') },
		openbuiltBody() { return t('nextcloud-vue', 'Want a new screen, a renamed field, or a custom register? OpenBuilt is our visual app builder. Drag, drop, save. It runs inside your own Nextcloud, so no code, no deploy, no waiting.') },
		openbuiltCta() { return t('nextcloud-vue', 'Open OpenBuilt') },

		llmTitle() { return t('nextcloud-vue', 'Let AI add the feature') },
		llmBody() { return t('nextcloud-vue', 'Claude, ChatGPT, Grok, Qwen or Mistral can ship a feature for you. Our skill set teaches them this codebase. You bring the prompt, they write the code. Push the PR, run the tests, and watch your feature land.') },
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

.cn-features-and-roadmap-view__panel {
	min-height: 320px;
}

/* NcAppSidebar positions itself at the viewport edge; styles below only
   target the content slot inside the sidebar. */
.cn-features-and-roadmap-view__sidebar-section {
	padding: 16px;
	border-bottom: 1px solid var(--color-border);
}

.cn-features-and-roadmap-view__sidebar-section:last-child {
	border-bottom: 0;
}

.cn-features-and-roadmap-view__sidebar-section-title {
	margin: 0 0 8px 0;
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-view__sidebar-section-body {
	margin: 0 0 12px 0;
	font-size: 0.95em;
	line-height: 1.5;
	color: var(--color-text-light);
}

.cn-features-and-roadmap-view__sidebar-link {
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

.cn-features-and-roadmap-view__sidebar-link:hover {
	text-decoration: underline;
}
</style>
