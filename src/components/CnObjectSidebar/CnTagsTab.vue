<template>
	<div class="cn-sidebar-tab">
		<!-- Add tag -->
		<div class="cn-sidebar-tab__action">
			<div class="cn-sidebar-tab__action--row">
				<NcTextField
					v-model="newTagName"
					:label="addTagPlaceholder"
					@input="filterSuggestions"
					@keyup.enter="addTag"
					@focus="showSuggestions = true" />
				<NcButton
					type="primary"
					:aria-label="addTagPlaceholder"
					:disabled="!newTagName.trim() || saving"
					@click="addTag">
					<template #icon>
						<Plus :size="20" />
					</template>
				</NcButton>
			</div>
			<!-- Tag suggestions dropdown -->
			<div
				v-if="showSuggestions && filtered.length > 0"
				class="cn-sidebar-tab__tag-suggestions">
				<button
					v-for="suggestion in filtered"
					:key="suggestion"
					class="cn-sidebar-tab__tag-suggestion"
					@mousedown.prevent="selectSuggestion(suggestion)">
					<TagOutline :size="16" />
					{{ suggestion }}
				</button>
			</div>
		</div>

		<!-- Tags list -->
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="tags.length === 0" class="cn-sidebar-tab__empty">
			{{ noTagsLabel }}
		</div>
		<div v-else class="cn-sidebar-tab__tags">
			<span
				v-for="tag in tags"
				:key="tag"
				class="cn-sidebar-tab__tag">
				{{ tag }}
				<button
					class="cn-sidebar-tab__tag-remove"
					:aria-label="'Remove ' + tag"
					@click="removeTag(tag)">
					<Close :size="14" />
				</button>
			</span>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcTextField, NcLoadingIcon } from '@nextcloud/vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnTagsTab',

	components: { NcButton, NcTextField, NcLoadingIcon, TagOutline, Plus, Close },

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		addTagPlaceholder: { type: String, default: () => t('nextcloud-vue', 'Add tag...') },
		noTagsLabel: { type: String, default: () => t('nextcloud-vue', 'No tags') },
	},

	data() {
		return {
			tags: [],
			loading: false,
			newTagName: '',
			saving: false,
			availableTags: [],
			filtered: [],
			showSuggestions: false,
		}
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.fetchTags()
					this.fetchAvailableTags()
				}
			},
		},
	},

	methods: {
		async fetchTags() {
			if (!this.register || !this.schema) return
			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tags`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					this.tags = await response.json()
				}
			} catch (err) {
				console.error('CnTagsTab: Failed to fetch tags', err)
			} finally {
				this.loading = false
			}
		},

		async fetchAvailableTags() {
			if (!this.register || !this.schema) return
			try {
				const response = await fetch(`${this.apiBase}/tags`, { headers: buildHeaders() })
				if (response.ok) {
					this.availableTags = await response.json()
				}
			} catch (err) {
				console.error('CnTagsTab: Failed to fetch available tags', err)
			}
		},

		filterSuggestions() {
			const query = this.newTagName.trim().toLowerCase()
			if (!query) {
				this.filtered = this.availableTags.filter(t => !this.tags.includes(t))
				return
			}
			this.filtered = this.availableTags.filter(
				t => t.toLowerCase().includes(query) && !this.tags.includes(t),
			)
		},

		selectSuggestion(tagName) {
			this.newTagName = tagName
			this.showSuggestions = false
			this.addTag()
		},

		async addTag() {
			if (!this.newTagName.trim() || !this.register || !this.schema) return
			this.saving = true
			this.showSuggestions = false
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tags`,
					{
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify({ tag: this.newTagName.trim() }),
					},
				)
				if (response.ok) {
					this.tags = await response.json()
				}
				this.newTagName = ''
				this.fetchAvailableTags()
			} catch (err) {
				console.error('CnTagsTab: Failed to add tag', err)
			} finally {
				this.saving = false
			}
		},

		async removeTag(tagName) {
			if (!this.register || !this.schema) return
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tags/${encodeURIComponent(tagName)}`,
					{ method: 'DELETE', headers: buildHeaders() },
				)
				if (response.ok) {
					this.tags = await response.json()
				}
			} catch (err) {
				console.error('CnTagsTab: Failed to remove tag', err)
			}
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }
.cn-sidebar-tab__action { margin-bottom: 16px; }
.cn-sidebar-tab__action--row { display: flex; gap: 8px; align-items: flex-end; }

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0; }

.cn-sidebar-tab__tag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	border-radius: var(--border-radius-pill, 16px);
	background: var(--color-primary-element-light, rgba(0, 130, 201, 0.1));
	color: var(--color-primary-element);
	font-size: 12px;
	font-weight: 500;
}

.cn-sidebar-tab__tag-remove {
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: var(--color-primary-element);
	opacity: 0.6;
	border-radius: 50%;
}

.cn-sidebar-tab__tag-remove:hover { opacity: 1; background: rgba(0, 0, 0, 0.08); }

.cn-sidebar-tab__tag-suggestions {
	margin-top: 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	max-height: 160px;
	overflow-y: auto;
}

.cn-sidebar-tab__tag-suggestion {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 6px 12px;
	border: none;
	background: none;
	cursor: pointer;
	font-size: 13px;
	color: var(--color-main-text);
	text-align: left;
}

.cn-sidebar-tab__tag-suggestion:hover { background: var(--color-background-hover); }
</style>
