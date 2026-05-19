<template>
	<div class="cn-features-tab">
		<div v-if="sortedFeatures.length === 0" class="cn-features-tab__empty">
			<NcEmptyContent :name="emptyTitle" :description="emptyDescription">
				<template #icon>
					<FileDocumentOutline :size="48" />
				</template>
			</NcEmptyContent>
		</div>
		<ul v-else class="cn-features-tab__list">
			<li
				v-for="feature in sortedFeatures"
				:key="feature.slug"
				class="cn-features-tab__item">
				<h3 class="cn-features-tab__title">
					{{ feature.title }}
				</h3>
				<p v-if="feature.summary" class="cn-features-tab__summary">
					{{ feature.summary }}
				</p>
				<a
					v-if="feature.docsUrl"
					:href="feature.docsUrl"
					target="_blank"
					rel="noopener noreferrer"
					class="cn-features-tab__link">
					{{ docsLinkLabel }}
					<OpenInNew :size="16" />
				</a>
			</li>
		</ul>
	</div>
</template>

<script>
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * FeaturesTab — alphabetically-sorted list of shipped capabilities for the
 * Features & Roadmap surface. Feature data is supplied as a prop by the host
 * app (the `@conduction/openspec-manifest` build CLI emits the bundled JSON
 * that powers this; see section 3 of the openregister-side openspec change).
 *
 * Spec: features-roadmap-component — Requirement "FeaturesTab".
 */
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent } from '@nextcloud/vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'

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
.cn-features-tab__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-features-tab__item {
	padding: 16px;
	border-bottom: 1px solid var(--color-border);
}

.cn-features-tab__item:last-child {
	border-bottom: 0;
}

.cn-features-tab__title {
	margin: 0 0 8px 0;
	font-size: 1.1em;
	color: var(--color-main-text);
}

.cn-features-tab__summary {
	margin: 0 0 8px 0;
	color: var(--color-text-light);
}

.cn-features-tab__link {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	color: var(--color-primary-element);
	text-decoration: none;
}

.cn-features-tab__link:hover {
	text-decoration: underline;
}
</style>
