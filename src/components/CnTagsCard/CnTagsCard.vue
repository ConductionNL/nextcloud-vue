<!--
  CnTagsCard — compact tags widget for the integration registry.

  Surface-aware shell around the `tags` integration: fetches the
  Nextcloud system tags attached to an OpenRegister object and renders
  them as inline pills inside a CnDetailCard.

  Per umbrella change `pluggable-integration-registry` AD-19 (surface
  fallback), one component handles all surfaces — `surface` is
  forwarded so consumers can branch internally if desired.
-->
<template>
	<CnDetailCard :title="resolvedTitle" :icon="Tag" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="tags.length === 0" class="cn-tags-card__empty">
			{{ noTagsLabel }}
		</div>
		<ul v-else class="cn-tags-card__list">
			<li
				v-for="tag in tags"
				:key="tag.id"
				class="cn-tags-card__pill"
				:title="tag.name">
				<Tag :size="14" />
				<span>{{ tag.name }}</span>
			</li>
		</ul>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import Tag from 'vue-material-design-icons/Tag.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnTagsCard — compact tags widget rendered by the integration
 * registry on dashboard and detail surfaces.
 *
 * Basic usage
 * ```vue
 * <CnTagsCard
 *   :register="registerId"
 *   :schema="schemaId"
 *   :object-id="objectId"
 *   surface="detail-page" />
 * ```
 */
export default {
	name: 'CnTagsCard',

	components: { CnDetailCard, NcLoadingIcon, Tag },

	props: {
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface — passed for AD-19 surface fallback consumers. */
		surface: {
			type: String,
			default: 'detail-page',
			validator: (value) => ['user-dashboard', 'app-dashboard', 'detail-page', 'single-entity'].includes(value),
		},
		/** Base API URL. */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Whether the card collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },
		/** Pre-translated empty label. */
		noTagsLabel: { type: String, default: () => t('nextcloud-vue', 'No tags') },
	},

	data() {
		return {
			Tag,
			tags: [],
			loading: false,
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Tags')
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) { this.fetchTags() } },
		},
	},

	methods: {
		async fetchTags() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tags`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.tags = data.results || data || []
				} else {
					this.tags = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnTagsCard] failed to fetch tags', err)
				this.tags = []
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-tags-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.cn-tags-card__pill {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 10px;
	border-radius: 999px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 0.9em;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-tags-card__empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 12px 0;
}
</style>
