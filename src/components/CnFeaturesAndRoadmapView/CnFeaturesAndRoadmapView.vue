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

			<main class="cn-features-and-roadmap-view__panel">
				<CnFeaturesTab v-if="activeView === 'features'" :features="features" />
				<CnRoadmapTab v-else :repo="repo" />
			</main>

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
 * Roadmap surface. Header carries the view-toggle and the primary
 * Suggest-feature CTA. Body is a card grid (Features OR Roadmap).
 *
 * The right-edge sidebar is hoisted to NcContent level via the same
 * `cnIndexSidebarConfig` provide mechanism CnIndexPage uses for its
 * CnIndexSidebar — that's the only place where Nextcloud's right-edge
 * sidebar slot renders correctly (next to NcAppContent, not inside it).
 * When mounted under CnAppRoot the view publishes
 * `CnFeaturesAndRoadmapSidebar` + props into the holder on mounted()
 * and clears it on beforeDestroy(). Sidebar carries three pitch
 * sections: Suggest, OpenBuilt, LLM. The Suggest CTA inside the sidebar
 * bubbles a `@suggest` event the view forwards to its modal opener.
 *
 * Sidebar link targets are overridable via the `openbuiltUrl` and
 * `llmSkillsUrl` props. Defaults: in-instance `/apps/openbuilt` (via
 * `generateUrl`) and `https://docs.conduction.nl/ai-skills`.
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapView".
 */
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcEmptyContent } from '@nextcloud/vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'

import CnFeaturesTab from '../CnFeaturesTab/CnFeaturesTab.vue'
import CnRoadmapTab from '../CnRoadmapTab/CnRoadmapTab.vue'
import CnSuggestFeatureModal from '../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'
import CnFeaturesAndRoadmapSidebar from '../CnFeaturesAndRoadmapSidebar/CnFeaturesAndRoadmapSidebar.vue'
import { useSpecRef } from '../../composables/useSpecRef.js'

const DEFAULT_OPENBUILT_PATH = '/apps/openbuilt'
const DEFAULT_LLM_SKILLS_URL = 'https://docs.conduction.nl/ai-skills'

export default {
	name: 'CnFeaturesAndRoadmapView',

	components: {
		NcButton,
		NcEmptyContent,
		FormatListBulleted,
		LockOutline,
		Plus,
		RoadVariant,
		CnFeaturesTab,
		CnRoadmapTab,
		CnSuggestFeatureModal,
	},

	inject: {
		/**
		 * Set to `true` by CnAppRoot so descendants know the host will
		 * mount a hoisted sidebar at NcContent level (see CnAppRoot.vue
		 * `cnHostsIndexSidebar: true`). When `false` (no CnAppRoot
		 * ancestor) the view skips publishing — there's no inline
		 * fallback for this surface.
		 */
		cnHostsIndexSidebar: { default: false },
		/**
		 * Reactive holder published by CnAppRoot that backs the
		 * hoisted-sidebar render in NcContent. Set value to
		 * `{component, props, listeners}` to mount; set to `null` to
		 * unmount. Same holder CnIndexPage uses.
		 */
		cnIndexSidebarConfig: { default: () => ({ value: null }) },
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

		resolvedOpenbuiltUrl() {
			if (this.openbuiltUrl) return this.openbuiltUrl
			return generateUrl(DEFAULT_OPENBUILT_PATH)
		},
		resolvedLlmSkillsUrl() {
			return this.llmSkillsUrl || DEFAULT_LLM_SKILLS_URL
		},
	},

	mounted() {
		this.publishHoistedSidebar()
	},

	beforeDestroy() {
		// Clear the holder so the hoisted sidebar disappears when the
		// user navigates away from this route. Mirrors CnIndexPage.
		if (this.cnHostsIndexSidebar && this.cnIndexSidebarConfig) {
			this.cnIndexSidebarConfig.value = null
		}
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
		/**
		 * Publish the hoisted-sidebar config to `cnIndexSidebarConfig`
		 * (same holder CnIndexPage uses) so CnAppRoot mounts the
		 * CnFeaturesAndRoadmapSidebar at NcContent level. The sidebar
		 * emits `suggest` when the user clicks the Suggest CTA inside
		 * it; the view forwards that to `openSuggestModal()`. No-op
		 * when there's no CnAppRoot ancestor.
		 */
		publishHoistedSidebar() {
			if (!this.cnHostsIndexSidebar || !this.cnIndexSidebarConfig) return
			if (this.disabled) {
				this.cnIndexSidebarConfig.value = null
				return
			}
			this.cnIndexSidebarConfig.value = {
				component: CnFeaturesAndRoadmapSidebar,
				props: {
					openbuiltUrl: this.resolvedOpenbuiltUrl,
					llmSkillsUrl: this.resolvedLlmSkillsUrl,
				},
				listeners: {
					suggest: () => this.openSuggestModal(),
				},
			}
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
</style>
