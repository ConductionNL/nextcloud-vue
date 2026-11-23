<template>
	<div class="cn-roadmap-tab">
		<div v-if="disabled" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="disabledLabel">
				<template #icon>
					<InformationOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<div v-else-if="loading" class="cn-roadmap-tab__loading">
			<NcLoadingIcon :size="32" />
		</div>
		<div v-else-if="degraded === 'pat_not_configured'" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="patNotConfiguredTitle" :description="patNotConfiguredDescription">
				<template #icon>
					<KeyOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<div v-else-if="degraded === 'rate_limited'" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="rateLimitedTitle" :description="rateLimitedDescription">
				<template #icon>
					<ClockOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<div v-else-if="degraded === 'error'" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="errorTitle">
				<template #icon>
					<AlertCircleOutline :size="48" />
				</template>
				<template #action>
					<NcButton variant="primary" @click="fetchItems">
						{{ retryLabel }}
					</NcButton>
				</template>
			</NcEmptyContent>
		</div>
		<div v-else-if="sortedItems.length === 0" class="cn-roadmap-tab__empty">
			<NcEmptyContent :name="emptyTitle" :description="emptyDescription">
				<template #icon>
					<RoadVariant :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<div v-else-if="layout === 'columns'" class="cn-roadmap-tab__columns" data-testid="cn-roadmap-columns">
			<section v-for="column in columns"
				:key="column.key"
				class="cn-roadmap-tab__column"
				:data-testid="`cn-roadmap-column-${column.key}`">
				<h3 class="cn-roadmap-tab__column-title">
					{{ column.label }}
					<span class="cn-roadmap-tab__column-count">{{ column.items.length }}</span>
				</h3>
				<CnRoadmapItem
					v-for="item in column.items"
					:key="item.number"
					:item="item"
					class="cn-roadmap-tab__card" />
			</section>
		</div>
		<div v-else class="cn-roadmap-tab__grid">
			<CnRoadmapItem
				v-for="item in sortedItems"
				:key="item.number"
				:item="item"
				class="cn-roadmap-tab__card" />
		</div>
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcEmptyContent, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import KeyOutline from 'vue-material-design-icons/KeyOutline.vue'
import RoadVariant from 'vue-material-design-icons/RoadVariant.vue'
import CnRoadmapItem from '../CnRoadmapItem/CnRoadmapItem.vue'
import { fetchRoadmapIssues, ROADMAP_IN_PROGRESS_LABELS, roadmapColumns, sortByReactions } from '../../utils/roadmapIssues.js'

export default {
	name: 'CnRoadmapTab',

	components: {
		AlertCircleOutline,
		ClockOutline,
		InformationOutline,
		KeyOutline,
		RoadVariant,
		NcEmptyContent,
		NcLoadingIcon,
		NcButton,
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

		/**
		 * `grid` (default): the open issues as cards. `columns`: Planned, In
		 * development and Available with their counts, closed-as-completed
		 * issues included (`config.layout`).
		 */
		layout: {
			type: String,
			default: 'grid',
		},

		/**
		 * Labels that put an open issue under In development (case-insensitive).
		 * Empty takes the defaults: "in progress", "in-progress", "in development".
		 */
		inProgressLabels: {
			type: Array,
			default: () => [],
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
			return sortByReactions(this.items)
		},

		/**
		 * The three columns of the `columns` layout, each with its heading.
		 *
		 * @return {Array<{key: string, label: string, items: Array<object>}>}
		 * @spec openspec/changes/roadmap-tab-columns/specs/roadmap-tab-columns/spec.md#requirement-a-roadmap-can-be-drawn-as-three-columns
		 */
		columns() {
			const grouped = roadmapColumns(this.sortedItems, this.inProgressLabels.length > 0 ? this.inProgressLabels : ROADMAP_IN_PROGRESS_LABELS)
			return [
				{ key: 'planned', label: t('nextcloud-vue', 'Planned'), items: grouped.planned },
				{ key: 'in-progress', label: t('nextcloud-vue', 'In development'), items: grouped.inProgress },
				{ key: 'available', label: t('nextcloud-vue', 'Available'), items: grouped.available },
			]
		},

		disabledLabel() {
			return t('nextcloud-vue', 'Roadmap is disabled by your administrator')
		},

		patNotConfiguredTitle() {
			return t('nextcloud-vue', 'Roadmap not yet configured')
		},

		patNotConfiguredDescription() {
			return t('nextcloud-vue', 'Ask your administrator to add a GitHub Personal Access Token in the OpenRegister settings to enable the roadmap.')
		},

		rateLimitedTitle() {
			return t('nextcloud-vue', 'GitHub temporarily unavailable')
		},

		rateLimitedDescription() {
			return t('nextcloud-vue', 'GitHub rate limited the request — please retry in a few minutes.')
		},

		errorTitle() {
			return t('nextcloud-vue', 'Could not load the roadmap')
		},

		emptyTitle() {
			return t('nextcloud-vue', 'No roadmap items yet')
		},

		emptyDescription() {
			return t('nextcloud-vue', 'When the maintainers label issues "enhancement" or "feature" on GitHub they will appear here.')
		},

		retryLabel() {
			return t('nextcloud-vue', 'Retry')
		},
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
			const { items, degraded } = await fetchRoadmapIssues(this.repo, this.layout === 'columns' ? { state: 'all' } : {})
			this.items = items
			this.degraded = degraded
			this.loading = false
		},
	},
}
</script>

<style scoped>
.cn-roadmap-tab__columns {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 16px;
	padding: 16px;
}

.cn-roadmap-tab__column {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-roadmap-tab__column-title {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	font-size: 16px;
}

.cn-roadmap-tab__column-count {
	padding: 0 8px;
	border-radius: 10px;
	background: var(--color-background-dark);
	font-size: 13px;
}

.cn-roadmap-tab__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 16px;
}

.cn-roadmap-tab__card {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	transition: border-color 120ms ease, box-shadow 120ms ease;
}

.cn-roadmap-tab__card:hover {
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 8px var(--color-box-shadow, rgba(0, 0, 0, 0.08));
}

.cn-roadmap-tab__loading {
	display: flex;
	justify-content: center;
	padding: 32px;
}
</style>
