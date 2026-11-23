<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-files-widget"
		:class="{ 'cn-files-widget--dragging': isDragging, 'cn-files-widget--compact': compact }"
		@dragenter="onDragEnter"
		@dragover="onDragOver"
		@dragleave="onDragLeave"
		@drop="onDrop">
		<!-- The compact list the boards draw (LpWerkplek "Bestanden"): the
		     folder named on one line instead of the toolbar. -->
		<p v-if="compact" class="cn-files-widget__folder" data-testid="cn-files-widget-folder">
			<FolderOutline :size="16" aria-hidden="true" />
			{{ t('nextcloud-vue', 'Folder {name}', { name: folderName }) }}
		</p>
		<div v-else class="cn-files-widget__toolbar">
			<nav
				v-if="!objectBound"
				class="cn-files-widget__breadcrumb"
				:aria-label="t('nextcloud-vue', 'Folder breadcrumb')">
				<button
					type="button"
					class="cn-files-widget__crumb cn-files-widget__crumb--root"
					:aria-current="currentSubPath === '/' ? 'page' : null"
					@click="navigateTo('/')">
					{{ t('nextcloud-vue', 'Root') }}
				</button>
				<template v-for="(segment, index) in pathSegments" :key="index">
					<span
						aria-hidden="true"
						class="cn-files-widget__separator">/</span>
					<button
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
			<!--
				`:ref`, not `ref`. Note `:aria-hidden="true"` does NOT save this:
				a binding to a LITERAL CONSTANT is constant-folded, so the vnode
				stays fully static and the compiler hoists it to module scope.
				A hoisted vnode's ref has no owner instance, and `setRef()`'s
				null-owner guard — along with its early `return` — is compiled
				out of production builds, so it dereferences null and throws
				`Cannot read properties of null (reading 'refs')`, aborting the
				render of the page that mounted this widget.

				Confirmed by instrumenting Vue's own warning to print the ref
				name: `[DEBUG ref="fileInput" vnodeType=input]`. This widget is
				the `files` integration leaf, which is how it reaches a detail
				page. See CnFilesTab for the full account of the mechanism.
			-->
			<input
				:ref="fileInputRef"
				type="file"
				multiple
				class="cn-files-widget__file-input"
				:aria-hidden="true"
				tabindex="-1"
				@change="onFileInputChange">
		</div>

		<div
			v-if="isDragging && canShowUpload"
			class="cn-files-widget__dropzone"
			aria-hidden="true">
			{{ t('nextcloud-vue', 'Drop files to upload') }}
		</div>

		<div v-if="uploads.length > 0" class="cn-files-widget__uploads" role="status">
			<p class="cn-files-widget__uploads-total">
				{{ uploadTotalLabel }}
				<button
					v-if="!uploading"
					type="button"
					class="cn-files-widget__notice-dismiss"
					@click="dismissUploads">
					{{ t('nextcloud-vue', 'Dismiss') }}
				</button>
			</p>
			<ul class="cn-files-widget__uploads-list">
				<li
					v-for="(upload, index) in uploads"
					:key="index"
					class="cn-files-widget__progress-item"
					:class="'cn-files-widget__progress-item--' + upload.status">
					<span class="cn-files-widget__upload-name">{{ upload.name }}</span>
					<span
						class="cn-files-widget__upload-progress"
						role="progressbar"
						:aria-label="upload.name"
						aria-valuemin="0"
						aria-valuemax="100"
						:aria-valuenow="uploadPercent(upload)">
						<span class="cn-files-widget__upload-bar" :style="{ width: uploadPercent(upload) + '%' }" />
					</span>
					<span class="cn-files-widget__upload-status">{{ uploadStatusLabel(upload) }}</span>
				</li>
			</ul>
		</div>

		<div v-if="deleteNotice" class="cn-files-widget__notice" role="alert">
			<span>{{ deleteNotice }}</span>
			<button
				type="button"
				class="cn-files-widget__notice-dismiss"
				@click="deleteNotice = null">
				{{ t('nextcloud-vue', 'Dismiss') }}
			</button>
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

		<ul
			v-else
			class="cn-files-widget__list"
			:class="{ 'cn-files-widget__list--grid': viewMode === 'grid' }">
			<li
				v-for="item in filteredItems"
				:key="item.fileId"
				class="cn-files-widget__row"
				:class="{ 'cn-files-widget__row--folder': item.isFolder }">
				<!-- Files are real links (new tab, copyable); folders browse in-widget. -->
				<component
					:is="item.isFolder ? 'button' : 'a'"
					:type="item.isFolder ? 'button' : undefined"
					:href="item.isFolder ? undefined : (fileUrl(item.fileId) || undefined)"
					:target="item.isFolder ? undefined : '_blank'"
					:rel="item.isFolder ? undefined : 'noopener noreferrer'"
					class="cn-files-widget__row-name"
					@click="onRowClick(item, $event)">
					<span aria-hidden="true" class="cn-files-widget__row-icon">
						<template v-if="compact">
							<FolderOutline v-if="item.isFolder" :size="18" />
							<FileDocumentOutline v-else :size="18" />
						</template>
						<img
							v-else-if="showThumbnails && !item.isFolder && item.thumbnailUrl && !failedThumbs[item.fileId]"
							:src="item.thumbnailUrl"
							alt=""
							class="cn-files-widget__row-thumb"
							loading="lazy"
							@error="onThumbError(item)">
						<template v-else>{{ item.isFolder ? '📁' : '📄' }}</template>
					</span>
					<span class="cn-files-widget__row-label">{{ item.name }}</span>
				</component>
				<span class="cn-files-widget__row-modified">{{ compact ? whenText(item.modifiedAt) : item.modifiedAt }}</span>
				<span v-if="!compact" class="cn-files-widget__row-size">{{ formatSize(item.size, item.isFolder) }}</span>
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

		<CnFilePreview v-if="previewFile" :file="previewFile" @close="previewFile = null" />

		<CnFilesWidgetDeleteDialog
			:open="confirmTarget !== null"
			:fileName="confirmTarget ? confirmTarget.name : ''"
			@update:open="onDeleteDialogToggle"
			@confirm="performDelete" />
	</div>
</template>

<script>
import { getLanguage, translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import CnFilesWidgetDeleteDialog from '../../dialogs/CnFilesWidgetDeleteDialog.vue'
import CnFilePreview from '../CnFilePreview/CnFilePreview.vue'
import { useFileOpener } from '../../composables/useFileOpener.js'
import { stripTrailingSlashes } from '../../utils/trailingSlashes.js'

/** Milliseconds in a day. */
const DAY_MS = 86400000

/**
 * When a file changed, as the boards word it in a file list: the time for
 * today, the weekday within the last week, the day and month before that.
 *
 * @param {string} value ISO date of the change.
 * @param {Date} now The current moment.
 * @param {string} locale BCP 47 locale.
 * @return {string} The moment, or the value as given when it is no date.
 */
export function fileWhenText(value, now, locale) {
	const changed = new Date(value ?? '')
	if (Number.isNaN(changed.getTime())) {
		return value ?? ''
	}
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	if (changed >= startOfToday) {
		return changed.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
	}
	if (startOfToday - changed < 6 * DAY_MS) {
		return changed.toLocaleDateString(locale, { weekday: 'long' })
	}
	return changed.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/**
 * CnFilesWidget — an inline Nextcloud Files browser rendered as a dashboard
 * widget (catalog type `files`, migrated from the launchpad `files` widget).
 *
 * NC-INTEGRATION DEPENDENCY: this widget reads folder contents from a host
 * application's `/api/widgets/files/{placementId}/...` endpoints (the same
 * contract the launchpad/mydash backend served) and deep-links file rows into
 * the Nextcloud **Files** app via the canonical `/f/{fileid}` permalink. The
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

	components: {
		CnFilePreview,
		CnFilesWidgetDeleteDialog,
		FileDocumentOutline,
		FolderOutline,
	},

	props: {
		/**
		 * Persisted content blob configuring the folder + toolbar — see
		 * `CnFilesWidgetForm` for the full shape (`folderPath`, `fileId`,
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
		isAdmin: { // eslint-disable-line vue/no-unused-properties -- the dashboard shell passes this to every widget; declared so it does not fall through to $attrs.
			type: Boolean,
			default: false,
		},

		/** Whether the dashboard shell is in edit mode. */
		canEdit: { // eslint-disable-line vue/no-unused-properties -- the dashboard shell passes this to every widget; declared so it does not fall through to $attrs.
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

		/**
		 * Object-bound mode: the OpenRegister object id this widget attaches
		 * files to. When `objectId` + `register` + `schema` are all set (they
		 * are auto-supplied by `CnWidgetGrid`'s detail-page context merge), the
		 * widget lists/uploads/deletes against the object's Nextcloud folder via
		 * the OpenRegister object endpoints instead of the dashboard
		 * `/api/widgets/files/...` contract. Empty (default) keeps the dashboard
		 * placement behaviour unchanged.
		 *
		 * @type {string}
		 */
		objectId: {
			type: String,
			default: '',
		},

		/**
		 * Object-bound mode: the OpenRegister register slug of the bound object.
		 * See the `objectId` prop.
		 *
		 * @type {string}
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * Object-bound mode: the OpenRegister schema of the bound object. Accepts
		 * either a slug string or the resolved schema object (as merged by
		 * `CnWidgetGrid`); the slug is derived by the `schemaSlug` computed. See
		 * the `objectId` prop.
		 *
		 * @type {string|object}
		 */
		schema: {
			type: [String, Object],
			default: '',
		},

		/**
		 * App base for the OpenRegister object-file endpoints used in
		 * object-bound mode (`{objectApiBase}/objects/{register}/{schema}/{id}/...`).
		 * Defaults to `/apps/openregister/api`.
		 *
		 * @type {string}
		 */
		objectApiBase: {
			type: String,
			default: '/apps/openregister/api',
		},
	},

	data() {
		return {
			/** The file shown in the in-page preview, or null. */
			previewFile: null,
			/**
			 * The hidden file input, set by the template's function ref (kept off `$refs` so the ref stays dynamic — see the template).
			 *
			 * @type {HTMLInputElement|null}
			 */
			fileInputEl: null,
			items: [],
			currentSubPath: '/',
			loading: false,
			errorCode: null,
			unavailable: false,
			nextCursor: null,
			searchQuery: '',
			confirmTarget: null,
			// fileId → true for thumbnails whose <img> failed to load, so the
			// row falls back to the generic icon instead of a broken image.
			failedThumbs: {},
			// Whether a file drag is currently hovering the widget (drop overlay).
			isDragging: false,
			// Depth counter so nested dragenter/dragleave don't flicker the overlay.
			dragDepth: 0,
			// The files of the current or last upload batch, each
			// `{ name, size, loaded, status, error }` with status `queued`,
			// `uploading`, `done` or `failed`.
			uploads: [],
			uploading: false,
			// Why the last delete was refused, shown until dismissed.
			deleteNotice: null,
		}
	},

	computed: {
		/**
		 * The compact list (`content.layout: 'compact'`): the folder named on
		 * one line, then each file with its glyph, name and when it changed;
		 * no toolbar, thumbnail or size.
		 *
		 * @return {boolean}
		 */
		compact() {
			return Boolean(this.content && this.content.layout === 'compact')
		},

		/**
		 * @return {string} The last segment of the configured folder.
		 */
		folderName() {
			const parts = String((this.content && this.content.folderPath) || '').split('/').filter(Boolean)
			return parts.length > 0 ? parts[parts.length - 1] : t('nextcloud-vue', 'Files')
		},

		/**
		 * Numeric placement id used to scope the host Files endpoint.
		 *
		 * @return {number} the placement id, or `0` when no placement is bound.
		 */
		placementId() {
			return Number(this.placement?.id || 0)
		},

		/**
		 * The schema slug in object-bound mode. Accepts either a slug string or
		 * the resolved schema object merged by `CnWidgetGrid` (in which case the
		 * slug is read from `slug`/`id`/`uuid`).
		 *
		 * @return {string} the schema slug, or `''` when unavailable.
		 */
		schemaSlug() {
			const s = this.schema
			if (typeof s === 'string') {
				return s
			}
			return (s && (s.slug || s.id || s.uuid)) || ''
		},

		/**
		 * Whether the widget runs in object-bound mode — i.e. it attaches files
		 * to a specific OpenRegister object rather than a dashboard placement.
		 *
		 * @return {boolean} `true` when `objectId`, `register` and `schemaSlug` are all set.
		 */
		objectBound() {
			return !!(this.objectId && this.register && this.schemaSlug)
		},

		/**
		 * Stable identity key for the bound object, or `''` in dashboard mode.
		 * Watched to (re)fetch when the object context first resolves (the schema
		 * object arrives after the ids) or when the widget rebinds to another
		 * object.
		 *
		 * @return {string} `register/schema/objectId`, or `''` when not object-bound.
		 */
		objectKey() {
			return this.objectBound
				? `${this.register}/${this.schemaSlug}/${this.objectId}`
				: ''
		},

		/**
		 * Whether the upload affordance is enabled by configuration. Defaults to
		 * enabled in BOTH modes — a Files widget is an add-files surface — and is
		 * only suppressed when a placement explicitly sets `allowUpload: false`.
		 * (Object-bound mode already defaulted on, matching the object sidebar's
		 * Files tab; beta extended the same default to dashboard placements.)
		 *
		 * @return {boolean} `true` unless `content.allowUpload` is explicitly false.
		 */
		allowUpload() {
			return this.content?.allowUpload !== false
		},

		/**
		 * Whether per-row delete affordances are enabled by configuration. On by
		 * default in object-bound mode (unless `content.allowDelete` is explicitly
		 * false); opt-in (`content.allowDelete === true`) in dashboard mode.
		 *
		 * @return {boolean} `true` when deletes are allowed.
		 */
		allowDelete() {
			if (this.objectBound) {
				return this.content?.allowDelete !== false
			}
			return this.content?.allowDelete === true
		},

		/**
		 * Layout for the file listing, from `content.viewMode`. `'grid'` renders
		 * the items as a tile grid; any other value (`'list'`, `'tree'`, unset)
		 * renders the default list. Tree navigation is not implemented, so
		 * `'tree'` falls back to the list layout.
		 *
		 * @return {string} `'grid'` or `'list'`.
		 */
		viewMode() {
			return this.content?.viewMode === 'grid' ? 'grid' : 'list'
		},

		/**
		 * Whether file rows show a preview thumbnail (from `content.showThumbnails`).
		 * Defaults to on; only an explicit `false` disables it. Files without a
		 * backend-provided `thumbnailUrl` still fall back to the generic icon.
		 *
		 * @return {boolean} `true` unless `content.showThumbnails` is explicitly false.
		 */
		showThumbnails() {
			// Tree mode lists names only, whatever `showThumbnails` says.
			if (this.content?.viewMode === 'tree') {
				return false
			}
			return this.content?.showThumbnails !== false
		},

		/**
		 * The batch line above the upload list: bytes sent of the total while
		 * uploading, then how many files arrived.
		 *
		 * @return {string} the label.
		 */
		uploadTotalLabel() {
			const total = this.uploads.reduce((sum, upload) => sum + upload.size, 0)
			if (this.uploading) {
				const loaded = this.uploads.reduce((sum, upload) => sum + upload.loaded, 0)
				return t('nextcloud-vue', 'Uploading {loaded} / {total}', {
					loaded: this.formatSize(loaded),
					total: this.formatSize(total),
				})
			}
			const failed = this.uploads.filter((upload) => upload.status === 'failed').length
			if (failed > 0) {
				return n('nextcloud-vue', '{count} file could not be uploaded', '{count} files could not be uploaded', failed, { count: failed })
			}
			return t('nextcloud-vue', 'Upload complete')
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
			 * Dashboard mode only — object-bound mode is driven by `objectKey`.
			 *
			 * @return {void}
			 */
			handler() {
				if (this.objectBound) {
					return
				}
				this.resetListing()
				this.fetchContents()
			},
		},

		objectKey: {
			immediate: true,
			/**
			 * Reset and refetch when the bound object first resolves or changes.
			 *
			 * @param {string} key the new object key (`''` in dashboard mode).
			 * @return {void}
			 */
			handler(key) {
				if (!key) {
					return
				}
				this.resetListing()
				this.fetchContents()
			},
		},
	},

	methods: {
		t,

		/**
		 * Function ref for the hidden file input; a method so the binding is
		 * stable across renders and the vnode stays dynamic.
		 *
		 * @param {HTMLInputElement|null} el The element, or null on unmount.
		 * @return {void}
		 */
		fileInputRef(el) {
			this.fileInputEl = el || null
		},

		/**
		 * Reset the listing/navigation state before a (re)fetch.
		 *
		 * @return {void}
		 */
		resetListing() {
			this.currentSubPath = '/'
			this.items = []
			this.nextCursor = null
			this.errorCode = null
			this.unavailable = false
		},

		/**
		 * Fetch (or append) one page of folder contents from the host Files
		 * endpoint. Degrades gracefully: a missing endpoint flips `unavailable`,
		 * a 404/403 maps to a typed `errorCode`, and no exception escapes.
		 *
		 * @param {boolean} [append] whether to append to the existing list (pagination).
		 * @return {Promise<void>} resolves when the fetch settles.
		 */
		async fetchContents(append = false) {
			if (this.objectBound) {
				return this.fetchObjectFiles()
			}
			if (this.placementId === 0) {
				return
			}

			this.loading = !append
			this.errorCode = null
			this.unavailable = false

			try {
				const { default: axios } = await import('@nextcloud/axios')

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
		 * Object-bound listing: fetch the bound OpenRegister object's files from
		 * `{objectApiBase}/objects/{register}/{schema}/{id}/files` and map them
		 * onto the widget's flat item shape (no folder navigation). Degrades the
		 * same way as the dashboard fetch: 404/403 → typed `errorCode`, no HTTP
		 * response → `unavailable`.
		 *
		 * @return {Promise<void>} resolves when the fetch settles.
		 */
		async fetchObjectFiles() {
			this.loading = true
			this.errorCode = null
			this.unavailable = false

			try {
				const { default: axios } = await import('@nextcloud/axios')

				const url = generateUrl(
					`${this.objectApiBase}/objects/{register}/{schema}/{objectId}/files`,
					{ register: this.register, schema: this.schemaSlug, objectId: this.objectId },
				)
				const response = await axios.get(url)
				const data = response?.data || {}
				const results = Array.isArray(data)
					? data
					: (Array.isArray(data.results) ? data.results : [])
				this.items = results.map((file) => {
					const mime = file.mimeType || file.mimetype || file.type || ''
					// SVG: Nextcloud's rasterised /core/preview is usually
					// unavailable for SVG (no rsvg/imagick), so stream the raw file
					// from OpenRegister's authenticated per-file download endpoint
					// (works for the owner's un-shared uploads via the session
					// cookie; the widget's other calls use the same objectApiBase).
					// Rendered through the list's <img>, the SVG runs in the
					// browser's restricted image mode — inline <script> / event
					// handlers never execute and external refs don't load — so
					// untrusted SVG is shown safely without a bespoke sandbox.
					// Other images use the rasterised server preview; anything else
					// gets the generic icon (a missing preview also falls back via
					// the <img> @error handler).
					let thumbnailUrl = null
					if (file.id && /^image\/svg\+xml$/i.test(mime)) {
						thumbnailUrl = generateUrl(`${this.objectApiBase}/files/{fileId}/download`, { fileId: file.id })
					} else if (file.id && /^image\//.test(mime)) {
						thumbnailUrl = generateUrl('/core/preview?fileId={fileId}&x=256&y=256&a=1', { fileId: file.id })
					}
					return {
						name: file.name || file.title || '',
						fileId: file.id,
						mimeType: mime,
						path: file.path || '',
						downloadUrl: file.id ? generateUrl(`${this.objectApiBase}/files/{fileId}/download`, { fileId: file.id }) : '',
						isFolder: false,
						size: file.size,
						modifiedAt: file.modified || file.updated || '',
						thumbnailUrl,
						canEdit: true,
						canDelete: this.allowDelete,
					}
				})
				this.nextCursor = null
			} catch (err) {
				const status = err?.response?.status
				if (status === 404) {
					this.errorCode = 'folder_not_found'
				} else if (status === 403) {
					this.errorCode = 'no_access'
				} else if (status === undefined) {
					this.unavailable = true
				} else {
					this.errorCode = 'unknown_error'
				}
				this.items = []
				this.nextCursor = null
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
		 * Show a file in the in-page preview.
		 *
		 * @param {object} file The file to preview.
		 */
		showPreview(file) {
			this.previewFile = file
		},

		/**
		 * Handle a row click: a folder is browsed in place, a file opens through
		 * the shared opener (Viewer, preview, browser, Files app).
		 *
		 * @param {object} item the clicked row.
		 * @param {MouseEvent} [event] the click event.
		 * @return {void}
		 */
		onRowClick(item, event) {
			if (item.isFolder) {
				this.onItemClick(item)
				return
			}
			// Keep the link's own behaviour for a modified click (new tab, etc.).
			if (event && (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1)) {
				return
			}
			if (event) {
				event.preventDefault()
			}
			useFileOpener({ onPreview: this.showPreview }).open({
				id: item.fileId,
				name: item.name,
				type: item.mimeType || item.mimetype || item.type || '',
				path: item.path || '',
				accessUrl: item.accessUrl || '',
				downloadUrl: item.downloadUrl || '',
			})
		},

		/**
		 * Descend into a folder row.
		 *
		 * @param {object} item the clicked folder item.
		 * @return {void}
		 */
		onItemClick(item) {
			this.navigateTo(this.joinPath(this.currentSubPath, item.name))
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
			const trimmedBase = stripTrailingSlashes(String(base || '/'))
			const trimmedName = String(name || '').replace(/^\/+/, '')
			if (trimmedBase === '' || trimmedBase === '/') {
				return '/' + trimmedName
			}
			return `${trimmedBase}/${trimmedName}`
		},

		/**
		 * The Files-app permalink for a file.
		 *
		 * @param {number|string} fileId the Nextcloud file id.
		 * @return {string} the URL, or '' without a file id.
		 */
		fileUrl(fileId) {
			if (!fileId) {
				return ''
			}
			// Canonical permalink: `/f/{fileid}` resolves the id to its folder
			// and opens the file; generateUrl adds `index.php` where needed.
			return generateUrl('/f/{fileid}', { fileid: fileId })
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
		 * Mark an item's thumbnail as failed so the row falls back to the
		 * generic icon. Fires when the preview `<img>` cannot load (e.g. the
		 * preview was not generated in time).
		 *
		 * @param {object} item the item whose thumbnail failed.
		 * @return {void}
		 */
		onThumbError(item) {
			this.failedThumbs[item.fileId] = true
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
		 * React to the delete dialog's open-state changes. Closing it (Cancel,
		 * Esc, click-outside, or the header X) clears the pending target.
		 *
		 * @param {boolean} open the dialog's new open state.
		 * @return {void}
		 */
		onDeleteDialogToggle(open) {
			if (!open) {
				this.confirmTarget = null
			}
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
			this.deleteNotice = null
			try {
				const { default: axios } = await import('@nextcloud/axios')

				const url = this.objectBound
					? generateUrl(
							`${this.objectApiBase}/objects/{register}/{schema}/{objectId}/files/{fileId}`,
							{ register: this.register, schema: this.schemaSlug, objectId: this.objectId, fileId: target.fileId },
						)
					: generateUrl(
							`${this.apiBase}/api/widgets/files/{placementId}/files/{fileId}`,
							{ placementId: this.placementId, fileId: target.fileId },
						)
				await axios.delete(url)
				this.items = this.items.filter((item) => item.fileId !== target.fileId)
			} catch (err) {
				this.deleteNotice = err?.response?.status === 403
					? t('nextcloud-vue', 'You no longer have permission to delete {name}.', { name: target.name })
					: t('nextcloud-vue', 'Could not delete {name}.', { name: target.name })
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
			if (this.fileInputEl) {
				this.fileInputEl.click()
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
			await this.uploadFiles(fileList)
			if (this.fileInputEl) {
				this.fileInputEl.value = ''
			}
		},

		/**
		 * POST a FileList (from the picker or a drag-and-drop) to the host Files
		 * endpoint, then refresh the listing. No-op when there is nothing to upload
		 * or upload is not permitted; never throws.
		 *
		 * @param {FileList|File[]|null} fileList the files to upload.
		 * @return {Promise<void>} resolves when the upload settles.
		 */
		async uploadFiles(fileList) {
			if (!fileList || fileList.length === 0 || !this.canShowUpload) {
				return
			}

			const formData = new FormData()
			const files = []
			for (let i = 0; i < fileList.length; i++) {
				formData.append('files[]', fileList[i])
				files.push(fileList[i])
			}
			this.uploads = files.map((file) => ({ name: file.name, size: Number(file.size) || 0, loaded: 0, status: 'queued', error: '' }))
			this.uploading = true
			const onUploadProgress = (event) => this.trackUploadProgress(event)

			try {
				const { default: axios } = await import('@nextcloud/axios')

				let response
				if (this.objectBound) {
					const objectUrl = generateUrl(
						`${this.objectApiBase}/objects/{register}/{schema}/{objectId}/filesMultipart`,
						{ register: this.register, schema: this.schemaSlug, objectId: this.objectId },
					)
					response = await axios.post(objectUrl, formData, { onUploadProgress })
				} else {
					const url = generateUrl(
						`${this.apiBase}/api/widgets/files/{placementId}/upload`,
						{ placementId: this.placementId },
					)
					response = await axios.post(url, formData, {
						params: { currentPath: this.currentSubPath },
						onUploadProgress,
					})
				}
				this.settleUploads(Array.isArray(response?.data?.errors) ? response.data.errors : [])
				this.fetchContents()
			} catch (err) {
				const reason = this.uploadErrorLabel(err?.response?.data?.error)
				this.uploads = this.uploads.map((upload) => ({ ...upload, status: 'failed', error: reason }))
				this.fetchContents()
			} finally {
				this.uploading = false
			}
		},

		/**
		 * Spread the batch's sent bytes over its files in upload order: the
		 * files before the byte count are done sending, the one it falls in is
		 * uploading, the rest are queued.
		 *
		 * @param {{loaded: number, total?: number}} event axios' upload progress.
		 * @return {void}
		 */
		trackUploadProgress(event) {
			const size = this.uploads.reduce((sum, upload) => sum + upload.size, 0)
			const total = Number(event?.total) || size
			const scale = total > 0 ? size / total : 0
			let remaining = Number(event?.loaded || 0) * scale
			this.uploads = this.uploads.map((upload) => {
				const loaded = Math.max(0, Math.min(upload.size, remaining))
				remaining -= upload.size
				let status = 'queued'
				if (loaded >= upload.size && upload.size > 0) {
					status = 'done'
				} else if (loaded > 0) {
					status = 'uploading'
				}
				return { ...upload, loaded, status }
			})
		},

		/**
		 * Mark the batch finished: a file the host names in `errors`
		 * (`{ name, error }`) failed with that reason, every other one arrived.
		 *
		 * @param {Array<{name: string, error?: string}>} errors the host's per-file errors.
		 * @return {void}
		 */
		settleUploads(errors) {
			const byName = new Map(errors.map((entry) => [String(entry?.name ?? ''), entry]))
			this.uploads = this.uploads.map((upload) => {
				const entry = byName.get(upload.name)
				if (entry) {
					return { ...upload, status: 'failed', error: this.uploadErrorLabel(entry.error) }
				}
				return { ...upload, loaded: upload.size, status: 'done', error: '' }
			})
		},

		/**
		 * The reason shown for a file that did not upload, from the host's code.
		 *
		 * @param {string|undefined} code the error code (`insufficient_storage`, …).
		 * @return {string} the localised reason.
		 */
		uploadErrorLabel(code) {
			if (code === 'insufficient_storage') {
				return t('nextcloud-vue', 'Not enough storage space')
			}
			if (code === 'no_access' || code === 'forbidden') {
				return t('nextcloud-vue', 'You may not upload to this folder')
			}
			if (code === 'mime_type_not_allowed' || code === 'mime_not_allowed') {
				return t('nextcloud-vue', 'This file type is not allowed here')
			}
			return t('nextcloud-vue', 'Upload failed')
		},

		/**
		 * The percentage of one file sent, for its progress bar.
		 *
		 * @param {object} upload an entry of `uploads`.
		 * @return {number} 0 to 100.
		 */
		uploadPercent(upload) {
			if (upload.status === 'done') {
				return 100
			}
			return upload.size > 0 ? Math.round((upload.loaded / upload.size) * 100) : 0
		},

		/**
		 * The status text of one file in the upload list.
		 *
		 * @param {object} upload an entry of `uploads`.
		 * @return {string} the label.
		 */
		uploadStatusLabel(upload) {
			if (upload.status === 'failed') {
				return upload.error
			}
			if (upload.status === 'done') {
				return this.uploading ? t('nextcloud-vue', 'Sent') : t('nextcloud-vue', 'Uploaded')
			}
			if (upload.status === 'uploading') {
				return t('nextcloud-vue', 'Uploading {percent}%', { percent: this.uploadPercent(upload) })
			}
			return t('nextcloud-vue', 'Queued')
		},

		/**
		 * Clear a finished upload list.
		 *
		 * @return {void}
		 */
		dismissUploads() {
			this.uploads = []
		},

		/**
		 * Track a drag entering the widget (depth-counted so nested elements don't
		 * flicker the drop overlay).
		 *
		 * @param {DragEvent} event the dragenter event.
		 * @return {void}
		 */
		onDragEnter(event) {
			if (!this.canShowUpload || !this.hasFiles(event)) {
				return
			}
			event.preventDefault()
			this.dragDepth++
			this.isDragging = true
		},

		/**
		 * Keep the browser from opening the dragged file and mark the drop as a copy.
		 *
		 * @param {DragEvent} event the dragover event.
		 * @return {void}
		 */
		onDragOver(event) {
			if (!this.canShowUpload || !this.hasFiles(event)) {
				return
			}
			event.preventDefault()
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = 'copy'
			}
		},

		/**
		 * Track a drag leaving the widget, clearing the overlay at depth zero.
		 *
		 * @return {void}
		 */
		onDragLeave() {
			if (this.dragDepth > 0) {
				this.dragDepth--
			}
			if (this.dragDepth === 0) {
				this.isDragging = false
			}
		},

		/**
		 * Handle a file drop — upload the dropped files into the current folder.
		 *
		 * @param {DragEvent} event the drop event.
		 * @return {Promise<void>} resolves when the upload settles.
		 */
		async onDrop(event) {
			this.dragDepth = 0
			this.isDragging = false
			if (!this.canShowUpload || !this.hasFiles(event)) {
				return
			}
			event.preventDefault()
			await this.uploadFiles(event.dataTransfer?.files)
		},

		/**
		 * Whether a drag event is carrying files (vs. text / an internal drag).
		 *
		 * @param {DragEvent} event the drag event.
		 * @return {boolean} `true` when the payload includes files.
		 */
		hasFiles(event) {
			const types = event?.dataTransfer?.types
			if (!types) {
				return false
			}
			return Array.from(types).includes('Files')
		},

		/**
		 * Human-format a byte count (folders render an empty size).
		 *
		 * @param {number} bytes the byte count.
		 * @param {boolean} isFolder whether the item is a folder.
		 * @return {string} the formatted size.
		 */
		/**
		 * @param {string} value ISO date of the change.
		 * @return {string} When the file changed, in the reader's language.
		 */
		whenText(value) {
			return fileWhenText(value, new Date(), getLanguage())
		},

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
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 8px;
	height: 100%;
	overflow: hidden;
}

.cn-files-widget--dragging {
	outline: 2px dashed var(--color-primary-element);
	outline-offset: -2px;
	border-radius: var(--border-radius);
}

.cn-files-widget__dropzone {
	position: absolute;
	inset: 0;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	background: var(--color-primary-element-light, rgba(0, 130, 201, 0.1));
	color: var(--color-primary-element);
	font-weight: 600;
	border-radius: var(--border-radius);
}

.cn-files-widget__folder {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 4px;
	color: var(--color-text-maxcontrast);
	font-size: 12px;
}

.cn-files-widget--compact .cn-files-widget__row {
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 12px;
	padding: 7px 0;
	border-bottom: none;
	border-top: 1px solid var(--color-border);
}

.cn-files-widget--compact .cn-files-widget__row-name {
	min-width: 0;
	color: var(--color-main-text);
	font-size: 14px;
	text-decoration: none !important;
}

.cn-files-widget--compact .cn-files-widget__row-icon {
	display: flex;
	color: var(--color-text-maxcontrast);
}

.cn-files-widget--compact .cn-files-widget__row-modified {
	color: var(--color-text-maxcontrast);
	font-size: 12px;
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
	clip-path: inset(50%);
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
	text-decoration: none;
	min-width: 0;
}

.cn-files-widget__row-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: 24px;
	height: 24px;
}

.cn-files-widget__row-thumb {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-radius: var(--border-radius);
	background-color: var(--color-background-dark);
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

/* Grid view (content.viewMode === 'grid'): lay the rows out as tiles. */
.cn-files-widget__list--grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 8px;
	padding: 4px;
	align-content: start;
}

.cn-files-widget__list--grid .cn-files-widget__row {
	grid-template-columns: 1fr;
	justify-items: center;
	text-align: center;
	gap: 4px;
	padding: 10px 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
}

.cn-files-widget__list--grid .cn-files-widget__row-name {
	flex-direction: column;
	align-items: center;
	max-width: 100%;
}

.cn-files-widget__list--grid .cn-files-widget__row-label {
	max-width: 100%;
}

.cn-files-widget__list--grid .cn-files-widget__row-icon {
	font-size: 32px;
	width: 56px;
	height: 56px;
}

/* Keep tiles compact — the modified date is list-view detail. */
.cn-files-widget__list--grid .cn-files-widget__row-modified {
	display: none;
}

.cn-files-widget__uploads,
.cn-files-widget__notice {
	margin: 4px 0 8px;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	font-size: 13px;
}

.cn-files-widget__notice {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	border-color: var(--color-error);
}

.cn-files-widget__uploads-total {
	display: flex;
	justify-content: space-between;
	gap: 8px;
	margin: 0 0 4px;
	font-weight: 600;
}

.cn-files-widget__uploads-list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-files-widget__progress-item {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 80px auto;
	align-items: center;
	gap: 8px;
	padding: 2px 0;
}

.cn-files-widget__upload-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-files-widget__upload-progress {
	display: block;
	height: 6px;
	overflow: hidden;
	border-radius: 3px;
	background: var(--color-background-dark);
}

.cn-files-widget__upload-bar {
	display: block;
	height: 100%;
	background: var(--color-primary-element);
}

.cn-files-widget__progress-item--failed .cn-files-widget__upload-status {
	color: var(--color-error-text, var(--color-error));
}

.cn-files-widget__upload-status {
	color: var(--color-text-maxcontrast);
}

.cn-files-widget__notice-dismiss {
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	font-weight: normal;
	text-decoration: underline;
	cursor: pointer;
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

</style>
