<template>
	<div class="cn-features-tab">
		<div v-if="sortedFeatures.length === 0" class="cn-features-tab__empty">
			<NcEmptyContent :name="emptyTitle" :description="emptyDescription">
				<template #icon>
					<FileDocumentOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<div v-else class="cn-features-tab__grid">
			<article
				v-for="feature in sortedFeatures"
				:key="feature.slug"
				class="cn-features-tab__card">
				<h3 class="cn-features-tab__title">
					{{ feature.title }}
				</h3>
				<p v-if="feature.summary" class="cn-features-tab__summary">
					{{ feature.summary }}
				</p>
				<a
					v-if="feature.docsUrl"
					:href="safeHref(feature.docsUrl)"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-features-tab__link">
					{{ docsLinkLabel }}
					<OpenInNew :size="16" />
				</a>
			</article>
		</div>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnFeaturesTab — card-grid of shipped capabilities for the Features &
 * Roadmap surface. Feature data is supplied as a prop by the host app
 * (the org-wide Features Extract workflow stage emits docs/features.json
 * from openspec/specs/; see ADR-033).
 *
 * Cards are sorted alphabetically by title (locale-aware, case-insensitive)
 * inside the component. The grid auto-fits responsive columns.
 *
 * Spec: features-roadmap-component — Requirement "FeaturesTab".
 */
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent } from '@nextcloud/vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import { safeHref } from '../../utils/safeHref.js'

export default {
	name: 'CnFeaturesTab',

	components: { NcEmptyContent, FileDocumentOutline, OpenInNew },

	props: {
		/**
		 * Array of feature objects to render. Sorted alphabetically by title
		 * (locale-aware, case-insensitive) inside the component.
		 * @type {Array<{slug: string, title: string, summary: string, docsUrl: string}>}
		 */
		features: {
			type: Array,
			required: true,
			default: () => [],
		},
	},

	methods: {
		safeHref,
	},

	computed: {
		sortedFeatures() {
			const collator = new Intl.Collator(undefined, { sensitivity: 'base' })
			return [...this.features].sort((a, b) => collator.compare(a.title || '', b.title || ''))
		},
		emptyTitle() {
			return t('nextcloud-vue', 'No features documented yet')
		},
		emptyDescription() {
			return t('nextcloud-vue', 'Capabilities listed here are auto-generated from the openspec/specs/ directory once a status is set to "implemented" or "reviewed".')
		},
		docsLinkLabel() {
			return t('nextcloud-vue', 'Read more')
		},
	},
}
</script>

<style scoped>
.cn-features-tab__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 16px;
}

.cn-features-tab__card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px;
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 12px);
	transition: border-color 120ms ease, box-shadow 120ms ease;
}

.cn-features-tab__card:hover {
	border-color: var(--color-primary-element);
	box-shadow: 0 2px 8px var(--color-box-shadow, rgba(0, 0, 0, 0.08));
}

.cn-features-tab__title {
	margin: 0;
	font-size: 1.05em;
	color: var(--color-main-text);
}

.cn-features-tab__summary {
	margin: 0;
	color: var(--color-text-light);
	font-size: 0.95em;
	line-height: 1.4;
	flex: 1;
}

.cn-features-tab__link {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--color-primary-element);
	text-decoration: none;
	font-size: 0.9em;
	margin-top: auto;
}

.cn-features-tab__link:hover {
	text-decoration: underline;
}
</style>
