<template>
	<div class="cn-roadmap-tab">
		<div v-if="disabled" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="disabledLabel">
				<template #icon><InformationOutline :size="48" /></template>
			</NcEmptyContent>
		</div>
		<div v-else-if="loading" class="cn-roadmap-tab__loading">
			<NcLoadingIcon :size="32" />
		</div>
		<div v-else-if="degraded === 'pat_not_configured'" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="patNotConfiguredTitle" :description="patNotConfiguredDescription">
				<template #icon><KeyOutline :size="48" /></template>
			</NcEmptyContent>
		</div>
		<div v-else-if="degraded === 'rate_limited'" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="rateLimitedTitle" :description="rateLimitedDescription">
				<template #icon><ClockOutline :size="48" /></template>
			</NcEmptyContent>
		</div>
		<div v-else-if="degraded === 'error'" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="errorTitle">
				<template #icon><AlertCircleOutline :size="48" /></template>
				<template #action>
					<NcButton type="primary" @click="fetchItems">
						{{ retryLabel }}
					</NcButton>
				</template>
			</NcEmptyContent>
		</div>
		<div v-else-if="sortedItems.length === 0" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="emptyTitle" :description="emptyDescription">
				<template #icon><RoadVariant :size="48" /></template>
			</NcEmptyContent>
		</div>
		<ul v-else class="cn-roadmap-tab__list">
			<li v-for="item in sortedItems" :key="item.number">
				<CnRoadmapItem :item="item" />
			</li>
		</ul>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * RoadmapTab — reaction-sorted GitHub issues feed. Fetches from the
 * OpenRegister `github-issue-proxy` GET endpoint on mount with the curated
 * label filter (`labels=enhancement,feature`, per openregister design D23)
 * and renders each item via `RoadmapItem`.
 *
 * Handles four documented degraded states with distinct localized messages:
 * `hint: github_pat_not_configured`, HTTP 429 `github_rate_limited`, network
 * errors, and the empty-array edge case.
 *
 * Spec: features-roadmap-component — Requirement "RoadmapTab".
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent, NcLoadingIcon, NcButton } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import KeyOutline from 'vue-material-design-icons/KeyOutline.vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'

import CnRoadmapItem from '../CnRoadmapItem/CnRoadmapItem.vue'

export default {
	name: 'CnRoadmapTab',

	components: {
		AlertCircleOutline, ClockOutline, InformationOutline, KeyOutline, RoadVariant,
		NcEmptyContent, NcLoadingIcon, NcButton,
		CnRoadmapItem,
	},

	props: {
		/**
		 * `<owner>/<repo>` of the app's GitHub repository. Passed through
		 * to the proxy as the `repo` query parameter.
		 */
		repo: {
			type: String,
			required: true,
		},
		/**
		 * Admin opt-out flag — when true the tab renders the disabled empty state.
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			loading: false,
			items: [],
			degraded: null, // null | 'pat_not_configured' | 'rate_limited' | 'error'
		}
	},

	computed: {
		sortedItems() {
			return [...this.items].sort(
				(a, b) => (b.reactions?.total_count || 0) - (a.reactions?.total_count || 0)
			)
		},
		disabledLabel() { return t('nextcloud-vue', 'Roadmap is disabled by your administrator') },
		patNotConfiguredTitle() { return t('nextcloud-vue', 'Roadmap not yet configured') },
		patNotConfiguredDescription() { return t('nextcloud-vue', 'Ask your administrator to add a GitHub Personal Access Token in the OpenRegister settings to enable the roadmap.') },
		rateLimitedTitle() { return t('nextcloud-vue', 'GitHub temporarily unavailable') },
		rateLimitedDescription() { return t('nextcloud-vue', 'GitHub rate limited the request — please retry in a few minutes.') },
		errorTitle() { return t('nextcloud-vue', 'Could not load the roadmap') },
		emptyTitle() { return t('nextcloud-vue', 'No roadmap items yet') },
		emptyDescription() { return t('nextcloud-vue', 'When the maintainers label issues "enhancement" or "feature" on GitHub they will appear here.') },
		retryLabel() { return t('nextcloud-vue', 'Retry') },
	},

	mounted() {
		if (!this.disabled) {
			this.fetchItems()
		}
	},

	methods: {
		async fetchItems() {
			this.loading = true
			this.degraded = null
			this.items = []
			try {
				const url = generateUrl('/apps/openregister/api/github/issues')
				const response = await axios.get(url, {
					params: {
						repo: this.repo,
						labels: 'enhancement,feature',
					},
				})
				const data = response.data || {}
				if (data.hint === 'github_pat_not_configured') {
					this.degraded = 'pat_not_configured'
				} else if (Array.isArray(data.items)) {
					this.items = data.items
				}
			} catch (e) {
				const status = e?.response?.status
				const code = e?.response?.data?.error
				if (status === 429 || code === 'github_rate_limited' || code === 'rate_limited') {
					this.degraded = 'rate_limited'
				} else {
					this.degraded = 'error'
				}
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-roadmap-tab__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-roadmap-tab__loading {
	display: flex;
	justify-content: center;
	padding: 32px;
}
</style>
