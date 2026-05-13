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
					{{ viewTitle }}
				</h2>
				<NcButton variant="primary" @click="openSuggestModal">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ suggestLabel }}
				</NcButton>
			</header>

			<div class="cn-features-and-roadmap-view__tabs">
				<button
					type="button"
					class="cn-features-and-roadmap-view__tab"
					:class="{ 'cn-features-and-roadmap-view__tab--active': activeTab === 'features' }"
					@click="activeTab = 'features'">
					{{ featuresTabLabel }}
				</button>
				<button
					type="button"
					class="cn-features-and-roadmap-view__tab"
					:class="{ 'cn-features-and-roadmap-view__tab--active': activeTab === 'roadmap' }"
					@click="activeTab = 'roadmap'">
					{{ roadmapTabLabel }}
				</button>
			</div>

			<div class="cn-features-and-roadmap-view__panel">
				<CnFeaturesTab v-if="activeTab === 'features'" :features="features" />
				<CnRoadmapTab v-else-if="activeTab === 'roadmap'" :repo="repo" />
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
 * CnFeaturesAndRoadmapView — route-level container hosting the Features tab,
 * the Roadmap tab, and the Suggest-feature header button + modal. Renders
 * an admin-disabled empty state when the `disabled` prop is true.
 *
 * Spec: features-roadmap-component — Requirement "CnFeaturesAndRoadmapView".
 */
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent } from '@nextcloud/vue'
import LockOutline from 'vue-material-design-icons/LockOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnFeaturesTab from '../CnFeaturesTab/CnFeaturesTab.vue'
import CnRoadmapTab from '../CnRoadmapTab/CnRoadmapTab.vue'
import CnSuggestFeatureModal from '../CnSuggestFeatureModal/CnSuggestFeatureModal.vue'
import { useSpecRef } from '../../composables/useSpecRef.js'

export default {
	name: 'CnFeaturesAndRoadmapView',

	components: {
		NcButton,
		NcEmptyContent,
		LockOutline,
		Plus,
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
		 *
		 * @type {Array<{slug: string, title: string, summary: string, docsUrl: string}>}
		 */
		features: {
			type: Array,
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
	},

	data() {
		return {
			activeTab: 'features',
			showSuggestModal: false,
			suggestModalSpecRef: null,
		}
	},

	computed: {
		viewTitle() { return t('nextcloud-vue', 'Features & roadmap') },
		suggestLabel() { return t('nextcloud-vue', 'Suggest feature') },
		featuresTabLabel() { return t('nextcloud-vue', 'Features') },
		roadmapTabLabel() { return t('nextcloud-vue', 'Roadmap') },
		disabledTitle() { return t('nextcloud-vue', 'This feature has been disabled by your administrator') },
		disabledDescription() { return t('nextcloud-vue', 'Contact your Nextcloud administrator to enable Features & Roadmap on this instance.') },
	},

	methods: {
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
			// Re-fetch the roadmap tab when the user just submitted from this view.
			this.activeTab = 'roadmap'
		},
	},
}
</script>

<style scoped>
.cn-features-and-roadmap-view {
	max-width: 920px;
	margin: 0 auto;
	padding: 24px 16px;
}

.cn-features-and-roadmap-view__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
}

.cn-features-and-roadmap-view__title {
	font-size: 1.4em;
	margin: 0;
	color: var(--color-main-text);
}

.cn-features-and-roadmap-view__tabs {
	display: flex;
	gap: 0;
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 0;
}

.cn-features-and-roadmap-view__tab {
	padding: 12px 20px;
	border: 0;
	background: transparent;
	border-bottom: 2px solid transparent;
	color: var(--color-text-light);
	cursor: pointer;
	font-size: 1em;
}

.cn-features-and-roadmap-view__tab:hover {
	background: var(--color-background-hover);
}

.cn-features-and-roadmap-view__tab--active {
	color: var(--color-primary-element);
	border-bottom-color: var(--color-primary-element);
}

.cn-features-and-roadmap-view__panel {
	min-height: 320px;
}
</style>
