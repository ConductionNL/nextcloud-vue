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
		<template v-if="$slots.actions || addLabel" #actions>
			<!--
				@slot actions Header actions of the card, e.g. an Add button. Scope:
				`{ refresh }`, which reads the files again after the host added one.
			-->
			<slot name="actions" :refresh="fetchFiles" />
			<template v-if="addLabel">
				<NcButton
					class="cn-button--tonal"
					variant="tertiary"
					:disabled="uploading"
					data-testid="cn-files-card-add"
					@click="$refs.picker.click()">
					<template #icon>
						<Plus :size="16" />
					</template>
					{{ addLabel }}
				</NcButton>
				<input
					ref="picker"
					type="file"
					multiple
					class="cn-files-card__picker"
					tabindex="-1"
					:aria-label="addLabel"
					data-testid="cn-files-card-input"
					@change="onPick">
			</template>
		</template>
		<NcLoadingIcon v-if="loading" />
		<p v-else-if="uploadError" class="cn-files-card__error" role="alert">
			{{ uploadError }}
		</p>
		<div v-else-if="files.length === 0" class="cn-files-card__empty">
			{{ noFilesLabel }}
		</div>
		<ul v-else class="cn-files-card__list">
			<li
				v-for="file in displayedFiles"
				:key="file.id"
				class="cn-files-card__row">
				<FileOutline :size="18" class="cn-files-card__icon" />
				<button
					type="button"
					class="cn-files-card__name cn-files-card__open"
					:aria-label="file.name || file.title || String(file.id)"
					@click="openFile(file)">
					{{ file.name || file.title || file.id }}
				</button>
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
		<CnFilePreview v-if="previewFile" :file="previewFile" @close="previewFile = null" />
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { markRaw } from 'vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import CnFilePreview from '../CnFilePreview/CnFilePreview.vue'
import { useFileOpener } from '../../composables/useFileOpener.js'
import { cnFetchJson } from '../../utils/cnFetch.js'
import { buildHeaders, prefixUrl } from '../../utils/index.js'

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

	components: { CnDetailCard, CnFilePreview, NcButton, NcLoadingIcon, FileOutline, Plus },

	props: {
		/** OpenRegister register id (slug or uuid). */
		register: { type: String, required: true },
		/** OpenRegister schema id (slug or uuid). */
		schema: { type: String, required: true },
		/** Parent object id. */
		objectId: { type: String, required: true },
		/** Rendering surface — passed for AD-19 surface fallback consumers. */
		surface: { // eslint-disable-line vue/no-unused-properties -- AD-19 hands every integration widget the same `surface`; this one does not branch on it yet
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
		/**
		 * Label of an add button in the card header that attaches picked files
		 * to the object. Empty: no button.
		 */
		addLabel: { type: String, default: '' },
	},

	emits: ['show-all', 'uploaded'],

	data() {
		return {
			// markRaw: `data()` is deeply reactive and would proxy the component.
			Paperclip: markRaw(Paperclip),
			files: [],
			previewFile: null,
			loading: false,
			uploading: false,
			uploadError: '',
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
			handler(id) {
				if (id) {
					this.fetchFiles()
				}
			},
		},
	},

	methods: {
		/**
		 * Show a file in the in-page preview.
		 *
		 * @param {object} file The file to preview.
		 */
		showPreview(file) {
			this.previewFile = file
		},

		/**
		 * Open a file through the shared opener (Viewer, preview, browser, Files).
		 *
		 * @param {object} file The file row.
		 */
		openFile(file) {
			useFileOpener({ onPreview: this.showPreview }).open(file)
		},

		/**
		 * Bubble the footer button's click up so parents can open the
		 * host app's full files view.
		 */
		emitShowAll() {
			/**
			 * User clicked the "show all" footer button — emitted with
			 * no payload. Parents typically open the host app's full
			 * files view in response.
			 *
			 * @event show-all
			 */
			this.$emit('show-all')
		},

		async fetchFiles() {
			if (!this.register || !this.schema || !this.objectId) {
				return
			}
			this.loading = true
			try {
				const params = new URLSearchParams({ limit: String(this.maxDisplay), _page: '1' })
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files?${params.toString()}`),
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

		/**
		 * Attach the picked files to the object, then read the files again.
		 *
		 * @param {Event} event The file input's change event.
		 */
		async onPick(event) {
			const picked = [...(event.target.files || [])]
			event.target.value = ''
			if (picked.length === 0) {
				return
			}
			this.uploading = true
			this.uploadError = ''
			try {
				const endpoint = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files`
				for (const file of picked) {
					const content = await this.readAsDataUrl(file)
					await cnFetchJson(endpoint, { method: 'POST', body: JSON.stringify({ name: file.name, content }) })
				}
				/**
				 * Files were attached to the object. Payload: their names.
				 *
				 * @event uploaded
				 */
				this.$emit('uploaded', picked.map((file) => file.name))
				await this.fetchFiles()
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('[CnFilesCard] failed to attach a file', err)
				this.uploadError = t('nextcloud-vue', 'The file could not be added. Try again.')
			} finally {
				this.uploading = false
			}
		},

		/**
		 * @param {File} file A picked file.
		 * @return {Promise<string>} Its content as a data URL.
		 */
		readAsDataUrl(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(String(reader.result))
				reader.onerror = () => reject(reader.error)
				reader.readAsDataURL(file)
			})
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
.cn-files-card__picker {
	display: none;
}

.cn-files-card__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

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

button.cn-files-card__open {
	background: none;
	border: 0;
	padding: 0;
	font: inherit;
	text-align: start;
	cursor: pointer;
}

button.cn-files-card__open:hover {
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
