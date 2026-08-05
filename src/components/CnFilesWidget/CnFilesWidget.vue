<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div
		class="cn-files-widget"
		:class="{ 'cn-files-widget--dragging': isDragging }"
		@dragenter="onDragEnter"
		@dragover="onDragOver"
		@dragleave="onDragLeave"
		@drop="onDrop">
		<div class="cn-files-widget__toolbar">
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
			<input
				ref="fileInput"
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
				<button
					type="button"
					class="cn-files-widget__row-name"
					@click="onItemClick(item)">
					<span aria-hidden="true" class="cn-files-widget__row-icon">
						<img
							v-if="showThumbnails && !item.isFolder && item.thumbnailUrl && !failedThumbs[item.fileId]"
							:src="item.thumbnailUrl"
							alt=""
							class="cn-files-widget__row-thumb"
							loading="lazy"
							@error="onThumbError(item)">
						<template v-else>{{ item.isFolder ? '📁' : '📄' }}</template>
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

		<CnFilesWidgetDeleteDialog
			:open="confirmTarget !== null"
			:file-name="confirmTarget ? confirmTarget.name : ''"
			@update:open="onDeleteDialogToggle"
			@confirm="performDelete" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import CnFilesWidgetDeleteDialog from '../../dialogs/CnFilesWidgetDeleteDialog.vue'

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
		CnFilesWidgetDeleteDialog,
	},

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
			return this.content?.showThumbnails !== false
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
			// Canonical Nextcloud file permalink: `/f/{fileid}` resolves the id
			// to its containing folder and opens the file. generateUrl adds the
			// `index.php` prefix on instances without URL rewriting. The previous
			// raw `/apps/files/?fileid=` both omitted that prefix (404 on those
			// instances) and, on modern Nextcloud, only ever landed on the root
			// folder instead of the file.
			const url = generateUrl('/f/{fileid}', { fileid: fileId })
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
			await this.uploadFiles(fileList)
			if (this.$refs.fileInput) {
				this.$refs.fileInput.value = ''
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
			for (let i = 0; i < fileList.length; i++) {
				formData.append('files[]', fileList[i])
			}

			try {
				const { default: axios } = await import('@nextcloud/axios')

				if (this.objectBound) {
					const objectUrl = generateUrl(
						`${this.objectApiBase}/objects/{register}/{schema}/{objectId}/filesMultipart`,
						{ register: this.register, schema: this.schemaSlug, objectId: this.objectId },
					)
					await axios.post(objectUrl, formData)
				} else {
					const url = generateUrl(
						`${this.apiBase}/api/widgets/files/{placementId}/upload`,
						{ placementId: this.placementId },
					)
					await axios.post(url, formData, {
						params: { currentPath: this.currentSubPath },
					})
				}
				this.fetchContents()
			} catch (err) {
				this.fetchContents()
			}
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
