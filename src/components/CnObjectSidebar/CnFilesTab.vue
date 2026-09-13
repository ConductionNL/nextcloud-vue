<template>
	<div class="cn-sidebar-tab">
		<!-- Upload error -->
		<div v-if="uploadError" class="cn-sidebar-tab__upload-error">
			{{ uploadError }}
		</div>

		<!-- Share toggle — seeds from schema config (defaultAutoShare) or
		     from the `defaultShare` prop. Hidden via `showShareToggle=false`. -->
		<NcCheckboxRadioSwitch
			v-if="showShareToggle"
			v-model="share"
			class="cn-sidebar-tab__share"
			:disabled="loading"
			type="switch">
			{{ shareLabel }}
		</NcCheckboxRadioSwitch>

		<!-- File drop zone -->
		<div
			class="cn-sidebar-tab__dropzone"
			:class="{ 'cn-sidebar-tab__dropzone--active': isDragOver }"
			@click="triggerFileInput"
			@dragover.prevent="onDragOver"
			@dragleave.prevent="onDragLeave"
			@drop.prevent="onDrop">
			<!--
				`:ref` (dynamic), not `ref` (static), and this is load-bearing.

				Every other binding on this input is static, and Vue caches the
				`@change` handler, so with a STATIC ref the compiler hoists the
				whole vnode to module scope. A hoisted vnode is created once,
				outside any render, so its ref carries no owner instance
				(`rawRef.i === null`).

				`setRef()` guards that — but the guard AND its early `return`
				live inside `if (process.env.NODE_ENV !== 'production')`. In a
				development build you get the warning "Missing ref owner
				context. ref cannot be used on hoisted vnodes." and nothing
				breaks. In a PRODUCTION build the guard is compiled out and
				execution falls through to `owner.refs`, throwing
				`TypeError: Cannot read properties of null (reading 'refs')`
				— which aborts the render of whatever mounted this tab.

				Measured: hrmq's detail pages (the only pages in the fleet that
				reach CnIntegrationWidget through a `widgets[]` grid) rendered a
				COMPLETELY BLANK content pane in production while looking fine
				in dev. A dynamic ref is compiled as a patchable prop, so the
				vnode is created inside the render function and owns a proper
				instance.
			-->
			<input
				:ref="fileInputRef"
				type="file"
				multiple
				class="cn-sidebar-tab__file-input"
				@change="onFileUpload">
			<Upload :size="24" class="cn-sidebar-tab__dropzone-icon" />
			<span class="cn-sidebar-tab__dropzone-text">{{ dropZoneLabel }}</span>
		</div>

		<!-- File list. Each row borrows what Nextcloud already has on this
		     page: the theme's own mime icon (OC.MimeType), the core preview
		     endpoint for images, the Viewer for opening, and the Files sidebar
		     for details, sharing and versions. Nothing of the Files app is
		     rebuilt here; the row hands over to it. -->
		<NcLoadingIcon v-if="loading" />
		<NcEmptyContent
			v-else-if="files.length === 0"
			class="cn-sidebar-tab__empty"
			:name="noFilesLabel"
			:description="dropZoneLabel">
			<template #icon>
				<Paperclip :size="44" />
			</template>
		</NcEmptyContent>
		<div v-else class="cn-sidebar-tab__list">
			<NcListItem
				v-for="file in files"
				:key="file.id"
				:name="file.name || file.title"
				:bold="false"
				:forceDisplayActions="true"
				@click="openFile(file)">
				<template #icon>
					<img
						v-if="previewUrlFor(file)"
						class="cn-sidebar-tab__thumb"
						:src="previewUrlFor(file)"
						alt=""
						loading="lazy"
						@error="onPreviewError(file)">
					<img
						v-else-if="mimeIconFor(file)"
						class="cn-sidebar-tab__mime"
						:src="mimeIconFor(file)"
						alt="">
					<FileOutline v-else :size="32" />
				</template>
				<template #subname>
					<span class="cn-sidebar-tab__meta">
						<span>{{ formatFileSize(file.size) }}</span>
						<template v-if="modifiedAt(file)">
							<span aria-hidden="true"> · </span>
							<NcDateTime :timestamp="modifiedAt(file)" :ignoreSeconds="true" />
						</template>
						<template v-if="labelsOf(file)">
							<span aria-hidden="true"> · </span>
							<span>{{ labelsOf(file) }}</span>
						</template>
					</span>
				</template>
				<template #actions>
					<NcActionButton :closeAfterClick="true" @click="openFile(file)">
						<template #icon>
							<OpenInNew :size="20" />
						</template>
						{{ openLabel }}
					</NcActionButton>
					<NcActionLink
						v-if="file.id"
						:href="downloadUrlFor(file)"
						:download="file.name || file.title || ''"
						:closeAfterClick="true">
						<template #icon>
							<Download :size="20" />
						</template>
						{{ downloadLabel }}
					</NcActionLink>
					<NcActionButton
						v-if="canShowDetails() && file.path"
						:closeAfterClick="true"
						@click="showDetails(file)">
						<template #icon>
							<InformationOutline :size="20" />
						</template>
						{{ detailsLabel }}
					</NcActionButton>
					<NcActionLink
						v-if="file.id"
						:href="showInFilesUrl(file)"
						target="_blank"
						rel="noopener noreferrer"
						:closeAfterClick="true">
						<template #icon>
							<FolderOutline :size="20" />
						</template>
						{{ showInFilesLabel }}
					</NcActionLink>
					<NcActionButton v-if="file.id" :closeAfterClick="true" @click="copyLink(file)">
						<template #icon>
							<LinkVariant :size="20" />
						</template>
						{{ copyLinkLabel }}
					</NcActionButton>
					<NcActionSeparator />
					<NcActionButton :closeAfterClick="true" @click="deleteFile(file)">
						<template #icon>
							<Delete :size="20" />
						</template>
						{{ deleteLabel }}
					</NcActionButton>
				</template>
			</NcListItem>
		</div>
		<NcButton
			v-if="files.length < total"
			variant="tertiary"
			:wide="true"
			:disabled="loadingMore"
			class="cn-sidebar-tab__load-more"
			@click="loadMore">
			<template v-if="loadingMore" #icon>
				<NcLoadingIcon :size="20" />
			</template>
			{{ loadMoreLabel }}
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import {
	NcActionButton,
	NcActionLink,
	NcActionSeparator,
	NcButton,
	NcCheckboxRadioSwitch,
	NcDateTime,
	NcEmptyContent,
	NcListItem,
	NcLoadingIcon,
} from '@nextcloud/vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import Download from 'vue-material-design-icons/Download.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import { buildHeaders } from '../../utils/index.js'
import { safeHref } from '../../utils/safeHref.js'

export default {
	name: 'CnFilesTab',

	components: {
		NcActionButton,
		NcActionLink,
		NcActionSeparator,
		NcButton,
		NcCheckboxRadioSwitch,
		NcDateTime,
		NcEmptyContent,
		NcListItem,
		NcLoadingIcon,
		Delete,
		Download,
		FileOutline,
		FolderOutline,
		InformationOutline,
		LinkVariant,
		OpenInNew,
		Paperclip,
		Upload,
	},

	props: {
		/** ID of the object this tab belongs to */
		objectId: { type: String, required: true },
		/** OpenRegister register slug */
		register: { type: String, default: '' },
		/** JSON Schema definition for the object */
		schema: { type: String, default: '' },
		/** Base URL for the OpenRegister API */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Text shown inside the file drop zone */
		dropZoneLabel: { type: String, default: () => t('nextcloud-vue', 'Drop files here or click to browse') },
		/** Text shown when no files are attached */
		noFilesLabel: { type: String, default: () => t('nextcloud-vue', 'No files attached') },
		/** Label for the open/view file action */
		openLabel: { type: String, default: () => t('nextcloud-vue', 'Open') },
		/** Label for the delete action */
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
		/** Label of the Download action. */
		downloadLabel: { type: String, default: () => t('nextcloud-vue', 'Download') },
		/** Label of the action that opens the Files sidebar on the file. */
		detailsLabel: { type: String, default: () => t('nextcloud-vue', 'Details and sharing') },
		/** Label of the link that opens the file in the Files app. */
		showInFilesLabel: { type: String, default: () => t('nextcloud-vue', 'Show in Files') },
		/** Label of the action that copies the file permalink. */
		copyLinkLabel: { type: String, default: () => t('nextcloud-vue', 'Copy link') },
		/** Label for the load-more button */
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
		/**
		 * Whether to render the "share uploaded files" toggle. Off by default;
		 * when false, uploads never set the share flag (no auto-publish).
		 *
		 * @type {boolean}
		 */
		showShareToggle: { type: Boolean, default: false },
		/**
		 * Initial state for the share toggle. `true`/`false` wins outright;
		 * `null` (the default) defers to the schema's
		 * `configuration.defaultAutoShare` from OpenRegister.
		 *
		 * @type {boolean|null}
		 */
		defaultShare: { type: Boolean, default: null },
		/** Label for the share toggle */
		shareLabel: { type: String, default: () => t('nextcloud-vue', 'Share uploaded files') },
	},

	data() {
		return {
			files: [],
			loading: false,
			loadingMore: false,
			isDragOver: false,
			uploadError: '',
			page: 1,
			total: 0,
			limit: 20,
			share: false,
			/** File ids whose preview request failed, so the row falls back to the mime icon. */
			previewFailed: {},
			/**
			 * The file input element, set by the template's function ref.
			 *
			 * Held here rather than read back through `$refs` so the ref stays
			 * DYNAMIC — see the long comment on the input itself for why a
			 * static ref on this element is a production crash.
			 *
			 * @type {HTMLInputElement|null}
			 */
			fileInputEl: null,
		}
	},

	watch: {
		// Match every other CnObjectSidebar tab — a single immediate
		// `objectId` watcher drives all initial loads. Folding the
		// share-toggle seed in here avoids two concurrent GETs of
		// `schemas/{schema}` on mount (one per immediate watcher).
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.fetchFiles()
				}
				this.applyShareDefault()
			},
		},
	},

	methods: {
		/**
		 * Function ref for the file input.
		 *
		 * A method (not an inline arrow in the template) so the binding is a
		 * stable reference across renders and Vue does not detach/reattach the
		 * ref on every patch. Being a function ref is what keeps the vnode
		 * dynamic — see the template comment on the input.
		 *
		 * @param {HTMLInputElement|null} el The element, or null on unmount.
		 * @return {void}
		 */
		fileInputRef(el) {
			this.fileInputEl = el || null
		},

		async fetchFiles(append = false) {
			if (!this.register || !this.schema) {
				return
			}
			if (append) {
				this.loadingMore = true
			} else {
				this.loading = true
			}
			try {
				const params = new URLSearchParams({ limit: this.limit, _page: this.page })
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files?${params}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					const results = data.results || data || []
					this.files = append ? [...this.files, ...results] : results
					this.total = data.total || this.files.length
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnFilesTab: Failed to fetch files', err)
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			this.page++
			this.fetchFiles(true)
		},

		/**
		 * Seed the `share` toggle. The `defaultShare` prop wins when set
		 * (non-null); otherwise we look up the active schema's
		 * `configuration.defaultAutoShare` from OpenRegister and use that.
		 * Network failure or missing key → keep the safe default (false) so
		 * a hiccup never silently flips uploads to "share".
		 *
		 * @return {Promise<void>}
		 */
		async applyShareDefault() {
			if (this.defaultShare !== null && this.defaultShare !== undefined) {
				this.share = !!this.defaultShare
				return
			}
			this.share = false
			if (!this.schema) {
				return
			}
			try {
				const response = await fetch(
					`${this.apiBase}/schemas/${this.schema}`,
					{ headers: buildHeaders() },
				)
				if (!response.ok) {
					return
				}
				const data = await response.json().catch(() => null)
				if (data?.configuration?.defaultAutoShare === true) {
					this.share = true
				}
			} catch (err) {
				// Non-fatal — keep the safe default, but surface the
				// failure so a missing toggle default isn't silent.
				// eslint-disable-next-line no-console
				console.error('CnFilesTab: Failed to fetch schema default for share toggle', err)
			}
		},

		triggerFileInput() {
			this.fileInputEl?.click()
		},

		onDragOver() {
			this.isDragOver = true
		},

		onDragLeave() {
			this.isDragOver = false
		},

		onDrop(event) {
			this.isDragOver = false
			const droppedFiles = event.dataTransfer?.files
			if (droppedFiles?.length) {
				this.uploadFiles(droppedFiles)
			}
		},

		async onFileUpload(event) {
			const inputFiles = event.target.files
			if (!inputFiles?.length) {
				return
			}
			await this.uploadFiles(inputFiles)
			if (this.fileInputEl) {
				this.fileInputEl.value = ''
			}
		},

		async uploadFiles(fileList) {
			if (!fileList?.length || !this.register || !this.schema) {
				return
			}
			this.uploadError = ''
			const formData = new FormData()
			for (const file of fileList) {
				formData.append('files[]', file)
			}
			// Only forward the share flag when the toggle is actually visible.
			// Hiding the toggle (showShareToggle=false) means "don't auto-publish".
			if (this.showShareToggle) {
				formData.append('share', String(this.share))
			}

			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/filesMultipart`,
					{
						method: 'POST',
						headers: { requesttoken: OC?.requestToken || '', 'OCS-APIREQUEST': 'true' },
						body: formData,
					},
				)
				if (!response.ok) {
					const data = await response.json().catch(() => ({}))
					this.uploadError = data.error || `Upload failed (${response.status})`
					return
				}
				await this.fetchFiles()
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnFilesTab: Failed to upload file', err)
				this.uploadError = 'Upload failed: could not connect to server'
			} finally {
				this.loading = false
			}
		},

		/**
		 * Whether the Files app's details sidebar is on this page.
		 *
		 * It is when the host page dispatched Nextcloud's `LoadSidebar` event
		 * server-side; then `OCA.Files.Sidebar.open(path)` shows the same
		 * sharing, versions, comments and activity tabs the Files app shows.
		 * Absent, the row offers no details action rather than a dead one. A
		 * method rather than a computed: the global is not reactive, so a
		 * cached answer from before the sidebar script ran would stay wrong.
		 *
		 * @return {boolean} true when the sidebar can be opened.
		 */
		canShowDetails() {
			return typeof window !== 'undefined' && typeof window.OCA?.Files?.Sidebar?.open === 'function'
		},

		/**
		 * The file's path relative to the user's files root, which is the path
		 * the Viewer and the Files sidebar take. OpenRegister reports the node's
		 * full path (`/{uid}/files/…`), so the first two segments come off.
		 *
		 * @param {string} path The node path as OpenRegister reports it.
		 * @return {string} The user-relative path, `/` at least.
		 */
		userRelativePath(path) {
			const stripped = String(path || '').replace(/^\/[^/]+\/files(?=\/|$)/, '')
			return stripped === '' ? '/' : stripped
		},

		/**
		 * The theme's own icon for the file's mime type, the one the Files app
		 * draws, or null on a page without Nextcloud's core script.
		 *
		 * @param {object} file The file row.
		 * @return {string|null} The icon url.
		 */
		mimeIconFor(file) {
			const getIconUrl = typeof window !== 'undefined' ? window.OC?.MimeType?.getIconUrl : null
			if (typeof getIconUrl !== 'function') {
				return null
			}
			const mime = file.type || file.mimetype || file.mimeType || ''
			try {
				return getIconUrl(mime) || null
			} catch {
				return null
			}
		},

		/**
		 * A small preview for an image, through Nextcloud's core preview
		 * endpoint, or null for anything else or after the preview failed once.
		 *
		 * @param {object} file The file row.
		 * @return {string|null} The preview url.
		 */
		previewUrlFor(file) {
			const mime = file.type || file.mimetype || file.mimeType || ''
			if (!file.id || !/^image\//i.test(mime) || /svg/i.test(mime) || this.previewFailed[file.id]) {
				return null
			}
			return generateUrl('/core/preview?fileId={fileId}&x=64&y=64&a=1', { fileId: file.id })
		},

		/**
		 * Remember that a preview did not load, so the row shows the mime icon.
		 *
		 * @param {object} file The file row.
		 * @return {void}
		 */
		onPreviewError(file) {
			this.previewFailed = { ...this.previewFailed, [file.id]: true }
		},

		/**
		 * The file's modification moment as a Date, or null when unknown.
		 *
		 * @param {object} file The file row.
		 * @return {Date|null} The moment.
		 */
		modifiedAt(file) {
			const raw = file.modified || file.updated || ''
			if (!raw) {
				return null
			}
			const date = new Date(raw)
			return Number.isNaN(date.getTime()) ? null : date
		},

		/**
		 * The file's labels (Nextcloud tags), joined for the meta line.
		 *
		 * @param {object} file The file row.
		 * @return {string} The labels, or the empty string.
		 */
		labelsOf(file) {
			return Array.isArray(file.labels) ? file.labels.filter(Boolean).join(', ') : ''
		},

		/**
		 * The download url for a file, through OpenRegister's file endpoint,
		 * which streams the node the object owns.
		 *
		 * @param {object} file The file row.
		 * @return {string} The url.
		 */
		downloadUrlFor(file) {
			return `${this.apiBase}/files/${encodeURIComponent(String(file.id))}/download`
		},

		/**
		 * The Files app's permalink for a file: opens the Files app at the
		 * file's folder with the file selected.
		 *
		 * @param {object} file The file row.
		 * @return {string} The url.
		 */
		showInFilesUrl(file) {
			return generateUrl('/f/{fileid}', { fileid: file.id })
		},

		/**
		 * Open the Files sidebar on this file: details, sharing, versions,
		 * comments and activity, exactly as the Files app offers them.
		 *
		 * @param {object} file The file row.
		 * @return {void}
		 */
		showDetails(file) {
			if (!this.canShowDetails() || !file.path) {
				return
			}
			window.OCA.Files.Sidebar.open(this.userRelativePath(file.path))
		},

		/**
		 * Put the file's permalink on the clipboard and say so.
		 *
		 * @param {object} file The file row.
		 * @return {Promise<void>}
		 */
		async copyLink(file) {
			const href = new URL(this.showInFilesUrl(file), window.location.origin).href
			try {
				await navigator.clipboard.writeText(href)
				const { showSuccess } = await import('@nextcloud/dialogs')
				showSuccess(t('nextcloud-vue', 'Link copied'))
			} catch {
				const { showError } = await import('@nextcloud/dialogs')
				showError(t('nextcloud-vue', 'The link could not be copied'))
			}
		},

		/**
		 * Whether Nextcloud's Viewer is on this page and handles the file.
		 *
		 * The Viewer is there when the host page dispatched `LoadViewer`
		 * server-side; it lists the mime types it can show, and a type it
		 * cannot falls through to the next way of opening the file.
		 *
		 * @param {object} file The file row.
		 * @return {boolean} true when the Viewer can open it in place.
		 */
		viewerHandles(file) {
			const viewer = typeof window !== 'undefined' ? window.OCA?.Viewer : null
			if (!viewer || typeof viewer.open !== 'function' || !file.path) {
				return false
			}
			const mime = file.type || file.mimetype || file.mimeType || ''
			const mimetypes = Array.isArray(viewer.mimetypes) ? viewer.mimetypes : null
			return mimetypes === null ? true : mimetypes.includes(mime)
		},

		openFile(file) {
			// The Viewer first: it opens the file over this page, so the reader
			// stays on the object. A public share link and the Files app come
			// after, in that order, when the Viewer is absent or cannot show
			// the type.
			if (this.viewerHandles(file)) {
				window.OCA.Viewer.open({ path: this.userRelativePath(file.path) })
				return
			}
			if (file.accessUrl) {
				// Security: accessUrl originates from the OR files API and may be
				// attacker-controlled. Validate the scheme via safeHref before
				// opening (C4) — this blocks javascript: / data: payloads. Add
				// noopener,noreferrer to prevent the opened tab from accessing
				// window.opener (reverse-tabnabbing) and to strip the Referer header.
				const safe = safeHref(file.accessUrl)
				if (safe !== '#') {
					window.open(safe, '_blank', 'noopener,noreferrer')
				}
			} else if (file.id) {
				const dirPath = file.path ? file.path.substring(0, file.path.lastIndexOf('/')) : ''
				const cleanPath = dirPath.replace(/^\/admin\/files\//, '/')
				window.open(`/index.php/apps/files/files/${file.id}?dir=${encodeURIComponent(cleanPath)}&openfile=true`, '_blank')
			}
		},

		async deleteFile(file) {
			if (!this.register || !this.schema) {
				return
			}
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files/${file.id}`,
					{ method: 'DELETE', headers: buildHeaders() },
				)
				this.files = this.files.filter((f) => f.id !== file.id)
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnFilesTab: Failed to delete file', err)
			}
		},

		formatFileSize(bytes) {
			const sizes = ['Bytes', 'KB', 'MB', 'GB']
			if (!bytes || bytes === 0) {
				return 'n/a'
			}
			const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
			if (i === 0) {
				return '< 1 KB'
			}
			return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }

.cn-sidebar-tab__upload-error {
	padding: 8px 12px;
	margin-bottom: 8px;
	border-radius: var(--border-radius, 4px);
	background-color: var(--color-error-light, rgba(229, 57, 53, 0.1));
	color: var(--color-error, #e53935);
	font-size: 13px;
}

.cn-sidebar-tab__dropzone {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 20px 12px;
	margin-bottom: 16px;
	border: 2px dashed var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	cursor: pointer;
	transition: border-color 0.15s ease, background-color 0.15s ease;
}

.cn-sidebar-tab__dropzone:hover {
	border-color: var(--color-primary-element);
	background-color: var(--color-primary-element-light, rgba(0, 130, 201, 0.08));
}

.cn-sidebar-tab__dropzone--active {
	border-color: var(--color-primary-element);
	background-color: var(--color-primary-element-light, rgba(0, 130, 201, 0.12));
}

.cn-sidebar-tab__share { margin-bottom: 12px; }

.cn-sidebar-tab__dropzone-icon { color: var(--color-text-maxcontrast); }

.cn-sidebar-tab__dropzone--active .cn-sidebar-tab__dropzone-icon,
.cn-sidebar-tab__dropzone:hover .cn-sidebar-tab__dropzone-icon { color: var(--color-primary-element); }

.cn-sidebar-tab__dropzone-text { font-size: 13px; color: var(--color-text-maxcontrast); }

.cn-sidebar-tab__file-input { display: none; }

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__list { display: flex; flex-direction: column; gap: 2px; }

.cn-sidebar-tab__mime,
.cn-sidebar-tab__thumb {
	width: 32px;
	height: 32px;
	display: block;
}

.cn-sidebar-tab__thumb {
	object-fit: cover;
	border-radius: var(--border-radius, 4px);
}

.cn-sidebar-tab__meta { color: var(--color-text-maxcontrast); }

.cn-sidebar-tab__load-more { margin-top: 8px; }
</style>
