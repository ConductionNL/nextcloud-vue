<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-files-widget">
		<div class="cn-files-widget__toolbar">
			<nav
				class="cn-files-widget__breadcrumb"
				:aria-label="t('nextcloud-vue', 'Folder breadcrumb')">
				<button
					type="button"
					class="cn-files-widget__crumb cn-files-widget__crumb--root"
					:aria-current="currentSubPath === '/' ? 'page' : null"
					@click="navigateTo('/')">
					{{ t('nextcloud-vue', 'Root') }}
				</button>
				<template v-for="(segment, index) in pathSegments">
					<span
						:key="`sep-${index}`"
						aria-hidden="true"
						class="cn-files-widget__separator">/</span>
					<button
						:key="`seg-${index}`"
						type="button"
						class="cn-files-widget__crumb"
						:aria-current="index === pathSegments.length - 1 ? 'page' : null"
						@click="navigateTo(segmentPathTo(index))">
						{{ segment }}
					</button>
				</template>
			</nav>

			<input
				v-model="searchQuery"
				type="search"
				class="cn-files-widget__search"
				:aria-label="t('nextcloud-vue', 'Search this folder')"
				:placeholder="t('nextcloud-vue', 'Search this folder…')">

			<button
				v-if="canShowUpload"
				type="button"
				class="cn-files-widget__upload"
				@click="triggerUpload">
				{{ t('nextcloud-vue', 'Upload File') }}
			</button>
			<input
				ref="fileInput"
				type="file"
				multiple
				class="cn-files-widget__file-input"
				:aria-hidden="true"
				tabindex="-1"
				@change="onFileInputChange">
		</div>

		<div v-if="loading" class="cn-files-widget__state">
			{{ t('nextcloud-vue', 'Loading folder…') }}
		</div>

		<div
			v-else-if="unavailable"
			class="cn-files-widget__state cn-files-widget__state--unavailable">
			{{ t('nextcloud-vue', 'Files is not available') }}
		</div>

		<div
			v-else-if="errorCode === 'no_access'"
			class="cn-files-widget__state cn-files-widget__state--no-access">
			{{ t('nextcloud-vue', 'You don\'t have access to this folder.') }}
		</div>

		<div
			v-else-if="errorCode === 'folder_not_found'"
			class="cn-files-widget__state cn-files-widget__state--not-found">
			{{ t('nextcloud-vue', 'Folder no longer exists.') }}
		</div>

		<div
			v-else-if="errorCode"
			class="cn-files-widget__state cn-files-widget__state--error">
			{{ t('nextcloud-vue', 'Failed to load folder contents.') }}
			<button
				type="button"
				class="cn-files-widget__retry"
				@click="fetchContents">
				{{ t('nextcloud-vue', 'Retry') }}
			</button>
		</div>

		<div
			v-else-if="filteredItems.length === 0 && !searchQuery"
			class="cn-files-widget__state cn-files-widget__state--empty">
			{{ t('nextcloud-vue', 'This folder is empty.') }}
		</div>

		<div
			v-else-if="filteredItems.length === 0 && searchQuery"
			class="cn-files-widget__state cn-files-widget__state--empty">
			{{ noSearchResultsLabel }}
		</div>

		<ul v-else class="cn-files-widget__list">
			<li
				v-for="item in filteredItems"
				:key="item.fileId"
				class="cn-files-widget__row"
				:class="{ 'cn-files-widget__row--folder': item.isFolder }">
				<button
					type="button"
					class="cn-files-widget__row-name"
					@click="onItemClick(item)">
					<span aria-hidden="true" class="cn-files-widget__row-icon">
						{{ item.isFolder ? '📁' : '📄' }}
					</span>
					<span class="cn-files-widget__row-label">{{ item.name }}</span>
				</button>
				<span class="cn-files-widget__row-modified">{{ item.modifiedAt }}</span>
				<span class="cn-files-widget__row-size">{{ formatSize(item.size, item.isFolder) }}</span>
				<button
					v-if="canDeleteItem(item)"
					type="button"
					class="cn-files-widget__row-delete"
					:aria-label="t('nextcloud-vue', 'Delete {name}', { name: item.name })"
					@click="confirmDelete(item)">
					{{ t('nextcloud-vue', 'Delete') }}
				</button>
			</li>
		</ul>

		<div v-if="nextCursor" class="cn-files-widget__pagination">
			<button
				type="button"
				class="cn-files-widget__more"
				@click="loadMore">
				{{ t('nextcloud-vue', 'Load more') }}
			</button>
		</div>

		<div
			v-if="confirmTarget"
			class="cn-files-widget__modal-backdrop"
			role="dialog"
			aria-modal="true"
			@click.self="cancelDelete">
			<div class="cn-files-widget__modal">
				<p>
					{{ t('nextcloud-vue', 'Are you sure you want to delete {name}?', { name: confirmTarget.name }) }}
				</p>
				<div class="cn-files-widget__modal-actions">
					<button type="button" @click="cancelDelete">
						{{ t('nextcloud-vue', 'Cancel') }}
					</button>
					<button
						type="button"
						class="cn-files-widget__modal-confirm"
						@click="performDelete">
						{{ t('nextcloud-vue', 'Delete') }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnFilesWidget — an inline Nextcloud Files browser rendered as a dashboard
 * widget (catalog type `files`, migrated from the launchpad `files` widget).
 *
 * NC-INTEGRATION DEPENDENCY: this widget reads folder contents from a host
 * application's `/api/widgets/files/{placementId}/...` endpoints (the same
 * contract the launchpad/mydash backend served) and deep-links file rows into
 * the Nextcloud **Files** app (`/apps/files/?fileid=...`). The
 * `@nextcloud/axios` + `@nextcloud/router` helpers are imported LAZILY at call
 * time so the widget code never hard-couples to a network stack at module load
 * (keeps the no-op css transform path clean and lets a host without the backing
 * endpoint mount the component without side-effects). When the backing endpoint
 * is absent the widget degrades to a localised disabled / empty state rather
 * than throwing — see the `unavailable` data flag and the `folder_not_found` /
 * `no_access` error branches.
 *
 * Every placement instance owns its own navigation stack: the sub-path resets
 * to `/` whenever the `placement` prop changes, so re-configuring the widget
 * root never leaves the user on a stale path.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnFilesWidget',

	props: {
		/**
		 * Persisted content blob configuring the folder + toolbar — see
		 * {@link CnFilesWidgetForm} for the full shape (`folderPath`, `fileId`,
		 * `viewMode`, `allowUpload`, `allowDelete`, …).
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/** Placement entity; its `id` scopes the host Files endpoint. */
		placement: {
			type: Object,
			default: () => ({}),
		},
		/** Whether the dashboard shell is in admin mode. */
		isAdmin: {
			type: Boolean,
			default: false,
		},
		/** Whether the dashboard shell is in edit mode. */
		canEdit: {
			type: Boolean,
			default: false,
		},
		/**
		 * App base for the host's files-widget endpoints
		 * (`{apiBase}/api/widgets/files/{placementId}/...`). Lets a consuming
		 * app point the widget at its own backend (e.g. `/apps/launchpad`).
		 * Defaults to `/apps/files`.
		 *
		 * @type {string}
		 */
		apiBase: {
			type: String,
			default: '/apps/files',
		},
	},

	data() {
		return {
			items: [],
			currentSubPath: '/',
			loading: false,
			errorCode: null,
			unavailable: false,
			nextCursor: null,
			searchQuery: '',
			confirmTarget: null,
		}
	},

	computed: {
		/**
		 * Numeric placement id used to scope the host Files endpoint.
		 *
		 * @return {number} the placement id, or `0` when no placement is bound.
		 */
		placementId() {
			return Number(this.placement?.id || 0)
		},

		/**
		 * Whether the upload affordance is enabled by configuration.
		 *
		 * @return {boolean} `true` when `content.allowUpload` is explicitly true.
		 */
		allowUpload() {
			return this.content?.allowUpload === true
		},

		/**
		 * Whether per-row delete affordances are enabled by configuration.
		 *
		 * @return {boolean} `true` when `content.allowDelete` is explicitly true.
		 */
		allowDelete() {
			return this.content?.allowDelete === true
		},

		/**
		 * Heuristic write-permission check: an empty folder optimistically
		 * surfaces the upload button (the backend re-validates), otherwise at
		 * least one editable child is required.
		 *
		 * @return {boolean} `true` when the viewer is treated as having write access.
		 */
		viewerCanWrite() {
			if (this.items.length === 0) {
				return true
			}
			return this.items.some((item) => item.canEdit === true)
		},

		/**
		 * Whether the upload button should render.
		 *
		 * @return {boolean} `true` when upload is allowed, writable, and not errored.
		 */
		canShowUpload() {
			return this.allowUpload && this.viewerCanWrite && !this.errorCode && !this.unavailable
		},

		/**
		 * The current sub-path split into breadcrumb segments.
		 *
		 * @return {string[]} the path segments (empty at root).
		 */
		pathSegments() {
			if (!this.currentSubPath || this.currentSubPath === '/') {
				return []
			}
			return this.currentSubPath
				.split('/')
				.map((segment) => segment.trim())
				.filter((segment) => segment !== '')
		},

		/**
		 * The items filtered by the in-widget search query.
		 *
		 * @return {Array<object>} the matching items (all items when the query is empty).
		 */
		filteredItems() {
			const query = this.searchQuery.trim().toLowerCase()
			if (query === '') {
				return this.items
			}
			return this.items.filter((item) => {
				const name = String(item.name || '').toLowerCase()
				return name.includes(query)
			})
		},

		/**
		 * The localised "no results" label for the active search query.
		 *
		 * @return {string} the no-results message.
		 */
		noSearchResultsLabel() {
			return t(
				'nextcloud-vue',
				'No files matching \'{query}\'',
				{ query: this.searchQuery },
			)
		},
	},

	watch: {
		placement: {
			immediate: true,
			/**
			 * Reset navigation state and refetch whenever the placement changes.
			 *
			 * @return {void}
			 */
			handler() {
				this.currentSubPath = '/'
				this.items = []
				this.nextCursor = null
				this.errorCode = null
				this.unavailable = false
				this.fetchContents()
			},
		},
	},

	methods: {
		t,

		/**
		 * Fetch (or append) one page of folder contents from the host Files
		 * endpoint. Degrades gracefully: a missing endpoint flips `unavailable`,
		 * a 404/403 maps to a typed `errorCode`, and no exception escapes.
		 *
		 * @param {boolean} [append] whether to append to the existing list (pagination).
		 * @return {Promise<void>} resolves when the fetch settles.
		 */
		async fetchContents(append = false) {
			if (this.placementId === 0) {
				return
			}

			this.loading = !append
			this.errorCode = null
			this.unavailable = false

			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])

				const url = generateUrl(
					`${this.apiBase}/api/widgets/files/{placementId}/contents`,
					{ placementId: this.placementId },
				)
				const params = {
					currentPath: this.currentSubPath,
					limit: 50,
				}
				if (append && this.nextCursor) {
					params.cursor = this.nextCursor
				}

				const response = await axios.get(url, { params })
				const data = response?.data || {}
				const nextItems = Array.isArray(data.items) ? data.items : []
				this.items = append ? this.items.concat(nextItems) : nextItems
				this.nextCursor = data.nextCursor || null
			} catch (err) {
				const status = err?.response?.status
				const code = err?.response?.data?.error
				if (status === 404 || code === 'folder_not_found') {
					this.errorCode = 'folder_not_found'
				} else if (status === 403 || code === 'no_access') {
					this.errorCode = 'no_access'
				} else if (status === undefined) {
					// No HTTP response at all — the backing Files endpoint is
					// not installed/reachable; degrade to the disabled state.
					this.unavailable = true
				} else {
					this.errorCode = 'unknown_error'
				}
				if (!append) {
					this.items = []
					this.nextCursor = null
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Load the next page when a cursor is present.
		 *
		 * @return {void}
		 */
		loadMore() {
			if (this.nextCursor) {
				this.fetchContents(true)
			}
		},

		/**
		 * Handle a row click — descend into folders, open files in the Files app.
		 *
		 * @param {object} item the clicked item.
		 * @return {void}
		 */
		onItemClick(item) {
			if (item.isFolder) {
				const next = this.joinPath(this.currentSubPath, item.name)
				this.navigateTo(next)
			} else {
				this.openFileInFilesApp(item.fileId)
			}
		},

		/**
		 * Navigate to a sub-path, clearing search + pagination and refetching.
		 *
		 * @param {string} path the target sub-path.
		 * @return {void}
		 */
		navigateTo(path) {
			this.currentSubPath = path || '/'
			this.searchQuery = ''
			this.nextCursor = null
			this.fetchContents()
		},

		/**
		 * Build the sub-path up to (and including) a breadcrumb segment index.
		 *
		 * @param {number} index the segment index.
		 * @return {string} the assembled sub-path.
		 */
		segmentPathTo(index) {
			const segments = this.pathSegments.slice(0, index + 1)
			return '/' + segments.join('/')
		},

		/**
		 * Join a base path and a child name into a normalised sub-path.
		 *
		 * @param {string} base the base path.
		 * @param {string} name the child name.
		 * @return {string} the joined path.
		 */
		joinPath(base, name) {
			const trimmedBase = String(base || '/').replace(/\/+$/, '')
			const trimmedName = String(name || '').replace(/^\/+/, '')
			if (trimmedBase === '' || trimmedBase === '/') {
				return '/' + trimmedName
			}
			return `${trimmedBase}/${trimmedName}`
		},

		/**
		 * Deep-link a file into the Nextcloud Files app in a new tab.
		 *
		 * @param {number|string} fileId the Nextcloud file id.
		 * @return {void}
		 */
		openFileInFilesApp(fileId) {
			if (!fileId) {
				return
			}
			const url = `/apps/files/?fileid=${encodeURIComponent(fileId)}`
			window.open(url, '_blank', 'noopener,noreferrer')
		},

		/**
		 * Whether a per-row delete button should render for an item.
		 *
		 * @param {object} item the item.
		 * @return {boolean} `true` when delete is allowed and the item is deletable.
		 */
		canDeleteItem(item) {
			return this.allowDelete === true && item.canDelete === true
		},

		/**
		 * Open the delete-confirmation modal for an item.
		 *
		 * @param {object} item the item to delete.
		 * @return {void}
		 */
		confirmDelete(item) {
			this.confirmTarget = item
		},

		/**
		 * Dismiss the delete-confirmation modal.
		 *
		 * @return {void}
		 */
		cancelDelete() {
			this.confirmTarget = null
		},

		/**
		 * Delete the confirmed target via the host Files endpoint, refreshing
		 * the listing on failure so the UI stays truthful.
		 *
		 * @return {Promise<void>} resolves when the delete settles.
		 */
		async performDelete() {
			const target = this.confirmTarget
			if (!target) {
				return
			}
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])

				const url = generateUrl(
					`${this.apiBase}/api/widgets/files/{placementId}/files/{fileId}`,
					{ placementId: this.placementId, fileId: target.fileId },
				)
				await axios.delete(url)
				this.items = this.items.filter((item) => item.fileId !== target.fileId)
			} catch (err) {
				this.fetchContents()
			} finally {
				this.confirmTarget = null
			}
		},

		/**
		 * Trigger the hidden file input from the upload button.
		 *
		 * @return {void}
		 */
		triggerUpload() {
			if (this.$refs.fileInput) {
				this.$refs.fileInput.click()
			}
		},

		/**
		 * Upload the chosen files to the host Files endpoint and refresh.
		 *
		 * @param {Event} event the file-input change event.
		 * @return {Promise<void>} resolves when the upload settles.
		 */
		async onFileInputChange(event) {
			const fileList = event?.target?.files
			if (!fileList || fileList.length === 0) {
				return
			}

			const formData = new FormData()
			for (let i = 0; i < fileList.length; i++) {
				formData.append('files[]', fileList[i])
			}

			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])

				const url = generateUrl(
					`${this.apiBase}/api/widgets/files/{placementId}/upload`,
					{ placementId: this.placementId },
				)
				await axios.post(url, formData, {
					params: { currentPath: this.currentSubPath },
				})
				this.fetchContents()
			} catch (err) {
				this.fetchContents()
			} finally {
				if (this.$refs.fileInput) {
					this.$refs.fileInput.value = ''
				}
			}
		},

		/**
		 * Human-format a byte count (folders render an empty size).
		 *
		 * @param {number} bytes the byte count.
		 * @param {boolean} isFolder whether the item is a folder.
		 * @return {string} the formatted size.
		 */
		formatSize(bytes, isFolder) {
			if (isFolder) {
				return ''
			}
			const value = Number(bytes || 0)
			if (value === 0) {
				return '0 B'
			}
			const units = ['B', 'KB', 'MB', 'GB', 'TB']
			let unitIndex = 0
			let display = value
			while (display >= 1024 && unitIndex < units.length - 1) {
				display = display / 1024
				unitIndex++
			}
			return `${display.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
		},
	},
}
</script>

<style scoped>
.cn-files-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
	height: 100%;
	overflow: hidden;
}

.cn-files-widget__toolbar {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.cn-files-widget__breadcrumb {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-files-widget__crumb {
	background: transparent;
	border: none;
	padding: 4px 6px;
	cursor: pointer;
	color: var(--color-primary-element);
	font: inherit;
}

.cn-files-widget__crumb[aria-current='page'] {
	color: var(--color-main-text);
	cursor: default;
}

.cn-files-widget__separator {
	color: var(--color-text-maxcontrast);
}

.cn-files-widget__search {
	flex: 0 1 200px;
	padding: 4px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-files-widget__upload {
	padding: 4px 12px;
	border: 1px solid var(--color-primary-element);
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	border-radius: var(--border-radius);
	cursor: pointer;
}

.cn-files-widget__file-input {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	border: 0;
}

.cn-files-widget__state {
	padding: 16px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}

.cn-files-widget__retry {
	display: block;
	margin: 8px auto 0;
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
}

.cn-files-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
	overflow: auto;
	flex: 1 1 auto;
}

.cn-files-widget__row {
	display: grid;
	grid-template-columns: 1fr 140px 80px auto;
	align-items: center;
	gap: 8px;
	padding: 4px 6px;
	border-bottom: 1px solid var(--color-border);
}

.cn-files-widget__row-name {
	display: flex;
	align-items: center;
	gap: 8px;
	background: transparent;
	border: none;
	padding: 0;
	cursor: pointer;
	text-align: left;
	color: var(--color-main-text);
	font: inherit;
	min-width: 0;
}

.cn-files-widget__row-label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-files-widget__row-modified,
.cn-files-widget__row-size {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.cn-files-widget__row-delete {
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 2px 8px;
	cursor: pointer;
	font-size: 12px;
	color: var(--color-error);
}

.cn-files-widget__pagination {
	text-align: center;
	padding: 8px 0;
}

.cn-files-widget__more {
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
}

.cn-files-widget__modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
}

.cn-files-widget__modal {
	background: var(--color-main-background);
	color: var(--color-main-text);
	padding: 16px;
	border-radius: var(--border-radius-large);
	max-width: 90vw;
	min-width: 280px;
}

.cn-files-widget__modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 12px;
}

.cn-files-widget__modal-actions button {
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
}

.cn-files-widget__modal-confirm {
	background: var(--color-error);
	color: var(--color-primary-element-text);
	border-color: var(--color-error);
}
</style>
