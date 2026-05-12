<!--
  CnFilesCard — compact files widget for the integration registry.

  Surface-aware shell around the `files` integration: fetches the
  object's attached files and renders the most recent N in a
  CnDetailCard. Wraps the same REST endpoint that CnFilesTab uses,
  but for dashboard/detail-page surfaces where the full tab is too
  much chrome.

  Per umbrella change `pluggable-integration-registry` AD-19 (surface
  fallback), one component handles `user-dashboard`, `app-dashboard`,
  `detail-page`, and `single-entity` — the `surface` prop is forwarded
  so the component can branch internally if needed.
-->
<template>
	<CnDetailCard :title="resolvedTitle" :icon="Paperclip" :collapsible="collapsible">
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="files.length === 0" class="cn-files-card__empty">
			{{ noFilesLabel }}
		</div>
		<ul v-else class="cn-files-card__list">
			<li
				v-for="file in displayedFiles"
				:key="file.id"
				class="cn-files-card__row">
				<FileOutline :size="18" class="cn-files-card__icon" />
				<a
					v-if="file.url"
					:href="file.url"
					target="_blank"
					rel="noopener"
					class="cn-files-card__name">
					{{ file.name || file.title || file.id }}
				</a>
				<span v-else class="cn-files-card__name">
					{{ file.name || file.title || file.id }}
				</span>
				<span class="cn-files-card__size">
					{{ formatFileSize(file.size) }}
				</span>
			</li>
		</ul>
		<template v-if="files.length > maxDisplay" #footer>
			<button class="cn-files-card__show-all" @click="$emit('show-all')">
				{{ showAllLabel }} ({{ files.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnFilesCard — compact files widget rendered by the integration
 * registry on dashboard and detail surfaces.
 *
 * Basic usage
 * ```vue
 * <CnFilesCard
 *   :register="registerId"
 *   :schema="schemaId"
 *   :object-id="objectId"
 *   surface="detail-page" />
 * ```
 */
export default {
	name: 'CnFilesCard',

	components: { CnDetailCard, NcLoadingIcon, FileOutline },

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
		/** Maximum rows to render. */
		maxDisplay: { type: Number, default: 5 },
		/** Whether the card collapses. */
		collapsible: { type: Boolean, default: false },
		/** Override the card title (defaults to the translated label). */
		title: { type: String, default: '' },
		/** Pre-translated empty label. */
		noFilesLabel: { type: String, default: () => t('nextcloud-vue', 'No files attached') },
		/** Pre-translated overflow label. */
		showAllLabel: { type: String, default: () => t('nextcloud-vue', 'Show all') },
	},

	emits: ['show-all'],

	data() {
		return {
			Paperclip,
			files: [],
			loading: false,
		}
	},

	computed: {
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Files')
		},
		displayedFiles() {
			return this.files.slice(0, this.maxDisplay)
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) { this.fetchFiles() } },
		},
	},

	methods: {
		async fetchFiles() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			try {
				const params = new URLSearchParams({ limit: String(this.maxDisplay), _page: '1' })
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files?${params.toString()}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.files = data.results || data || []
				} else {
					this.files = []
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFilesCard] failed to fetch files', err)
				this.files = []
			} finally {
				this.loading = false
			}
		},

		formatFileSize(bytes) {
			if (typeof bytes !== 'number' || bytes < 0) {
				return ''
			}
			if (bytes < 1024) {
				return `${bytes} B`
			}
			if (bytes < 1024 * 1024) {
				return `${(bytes / 1024).toFixed(1)} KB`
			}
			if (bytes < 1024 * 1024 * 1024) {
				return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
			}
			return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
		},
	},
}
</script>

<style scoped>
.cn-files-card__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-files-card__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-files-card__row:last-child {
	border-bottom: none;
}

.cn-files-card__icon {
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-files-card__name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
	text-decoration: none;
}

a.cn-files-card__name:hover {
	text-decoration: underline;
}

.cn-files-card__size {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	flex-shrink: 0;
}

.cn-files-card__empty {
	color: var(--color-text-maxcontrast);
	text-align: center;
	padding: 12px 0;
}

.cn-files-card__show-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	cursor: pointer;
	padding: 4px 0;
	font: inherit;
}

.cn-files-card__show-all:hover {
	text-decoration: underline;
}
</style>
