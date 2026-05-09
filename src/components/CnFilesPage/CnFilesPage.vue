<!--
  CnFilesPage — File-browser / document surface.

  v1: lists the contents of `folder` via the WebDAV listing returned
  by Nextcloud's Files API. The component renders a CnDataTable with
  columns for name, size, mtime, and type, with optional MIME-type
  filtering via `allowedTypes`.

  Heads-up — the Nextcloud Files webview is NOT directly embeddable
  in another app's route; the public path is `/apps/files`, mounted
  by the Files app itself. This component therefore renders a
  lightweight listing that scopes to `folder` and provides a "Open in
  Files" link as the bridge to the full Files UI. Consumers wanting
  the full file-picker UX should use the `#files-view` slot to drop
  in their own component (e.g. `OC.dialogs.filepicker` or a custom
  WebDAV-backed listing).
-->
<template>
	<div class="cn-files-page">
		<!-- Header — overridable via #header slot -->
		<slot
			name="header"
			:title="title"
			:description="description"
			:icon="icon">
			<CnPageHeader
				v-if="showTitle && title"
				:title="title"
				:description="description"
				:icon="icon" />
		</slot>

		<!-- Actions slot -->
		<div v-if="$slots.actions || $scopedSlots.actions" class="cn-files-page__actions">
			<slot name="actions">
				<NcButton type="secondary" @click="openInFiles">
					<template #icon>
						<OpenInNew :size="20" />
					</template>
					{{ openInFilesLabel }}
				</NcButton>
			</slot>
		</div>

		<!-- Files view — overridable via #files-view slot. Default is a
		     simple data-table listing of the folder contents. The
		     scoped slot exposes `{ folder, allowedTypes, files,
		     loading, error, refresh }` so a consumer-supplied file
		     browser can wire to the same state. -->
		<slot
			name="files-view"
			:folder="folder"
			:allowed-types="allowedTypes"
			:files="filteredFiles"
			:loading="loading"
			:error="error"
			:refresh="refresh">
			<div class="cn-files-page__body">
				<div v-if="loading" class="cn-files-page__loading">
					<NcLoadingIcon :size="32" />
				</div>
				<div v-else-if="error" class="cn-files-page__error">
					<slot name="error" :error="error">
						<NcEmptyContent :name="errorText">
							<template #icon>
								<AlertCircleOutline :size="64" />
							</template>
						</NcEmptyContent>
					</slot>
				</div>
				<div v-else-if="filteredFiles.length === 0" class="cn-files-page__empty">
					<slot name="empty">
						<NcEmptyContent :name="emptyText">
							<template #icon>
								<FolderOutline :size="64" />
							</template>
						</NcEmptyContent>
					</slot>
				</div>
				<CnDataTable
					v-else
					:columns="columns"
					:rows="filteredFiles"
					row-key="path"
					:empty-text="emptyText" />
			</div>
		</slot>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import {
	NcButton,
	NcEmptyContent,
	NcLoadingIcon,
} from '@nextcloud/vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import { CnDataTable } from '../CnDataTable/index.js'
import { CnPageHeader } from '../CnPageHeader/index.js'

/**
 * CnFilesPage — File-browser / document surface.
 *
 * Lists the contents of `folder` and provides a quick action to
 * open the same folder in the Nextcloud Files app. The default
 * listing is a simple table; the `#files-view` slot fully replaces
 * the default so consumers can drop in their own file picker /
 * WebDAV component.
 *
 * Limitations (v1) — see the change's "Custom fallbacks" report:
 *  - The component does NOT bundle a full WebDAV client. The
 *    `files` array is populated from the consumer-supplied `files`
 *    prop OR from the `#files-view` slot's own data; if neither is
 *    set, the component falls back to its empty-state. This keeps
 *    the library zero-dep on `webdav` while still letting consumers
 *    wire a richer listing.
 *  - No upload, no rename, no delete. Use the "Open in Files" link
 *    or fill the `#files-view` slot to provide those actions.
 *
 * Slots:
 *  - `#header` — Replaces the CnPageHeader.
 *  - `#actions` — Right-aligned actions area; defaults to an "Open
 *    in Files" button.
 *  - `#files-view` — Replaces the entire default listing. Scope:
 *    `{ folder, allowedTypes, files, loading, error, refresh }`.
 *  - `#empty` — Replaces the empty-state.
 *  - `#error` — Replaces the error state. Scope: `{ error }`.
 */
export default {
	name: 'CnFilesPage',

	components: {
		NcButton,
		NcEmptyContent,
		NcLoadingIcon,
		OpenInNew,
		FolderOutline,
		AlertCircleOutline,
		CnDataTable,
		CnPageHeader,
	},

	props: {
		/** Page title. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Files'),
		},
		/** Description shown under the title when `showTitle` is set. */
		description: {
			type: String,
			default: '',
		},
		/** Whether to render the inline page header. */
		showTitle: {
			type: Boolean,
			default: false,
		},
		/** MDI icon name for the header. */
		icon: {
			type: String,
			default: '',
		},
		/**
		 * Folder path within the user's Nextcloud filesystem. Required
		 * for the "Open in Files" link to work; the spec marks this
		 * field required at the manifest level.
		 */
		folder: {
			type: String,
			required: true,
		},
		/**
		 * MIME types to filter on. Each entry is matched literally OR
		 * as a wildcard with a trailing `/*`. Examples:
		 * `['application/pdf']` keeps only PDFs;
		 * `['image/*']` keeps every image MIME.
		 *
		 * @type {string[]}
		 */
		allowedTypes: {
			type: Array,
			default: () => [],
		},
		/**
		 * Pre-loaded file listing — used when the consumer wants to
		 * provide their own data fetch (e.g. via the consuming app's
		 * existing FilesPlugin). Each entry: `{ name, path, size,
		 * mtime, mime }`. When empty, the component falls back to the
		 * `#files-view` slot or the empty-state.
		 *
		 * @type {Array<object>}
		 */
		files: {
			type: Array,
			default: () => [],
		},
		/** Whether a fetch is in progress (rendered as a spinner). */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Error object/message — when truthy the error state shows. */
		error: {
			type: [Error, String, Object],
			default: null,
		},
		/** Empty-state text. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No files in this folder'),
		},
		/** Error-state text. */
		errorText: {
			type: String,
			default: () => t('nextcloud-vue', 'Could not load folder contents'),
		},
		/** Label for the "Open in Files" button. */
		openInFilesLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Open in Files'),
		},
		/**
		 * Optional refresh callback wired to the slot scope. The library
		 * cannot trigger a re-fetch on its own (no built-in WebDAV
		 * client), so consumers pass their own re-fetch function in.
		 *
		 * @type {Function|null}
		 */
		onRefresh: {
			type: Function,
			default: null,
		},
	},

	computed: {
		/** Default columns for the listing. */
		columns() {
			return [
				{ key: 'name', label: t('nextcloud-vue', 'Name'), sortable: true },
				{ key: 'size', label: t('nextcloud-vue', 'Size') },
				{ key: 'mtime', label: t('nextcloud-vue', 'Modified'), sortable: true },
				{ key: 'mime', label: t('nextcloud-vue', 'Type') },
			]
		},

		/** Files filtered by `allowedTypes`. */
		filteredFiles() {
			if (!this.allowedTypes || this.allowedTypes.length === 0) {
				return this.files
			}
			return this.files.filter((f) => this.matchesAllowedTypes(f.mime))
		},
	},

	methods: {
		matchesAllowedTypes(mime) {
			if (!mime) return false
			for (const pattern of this.allowedTypes) {
				if (pattern === mime) return true
				if (pattern.endsWith('/*')) {
					const prefix = pattern.slice(0, -1) // keep trailing slash
					if (mime.startsWith(prefix)) return true
				}
			}
			return false
		},

		openInFiles() {
			// Build a Files-app URL for the configured folder. The URL
			// shape (`/apps/files/files?dir=…`) is stable on Nextcloud
			// 26+; for older releases the consumer can override the
			// button entirely via the `#actions` slot.
			const url = generateUrl('/apps/files/files?dir={dir}', { dir: this.folder })
			window.open(url, '_self')
		},

		/**
		 * Programmatic refresh — calls the consumer-supplied
		 * `onRefresh` when present.
		 *
		 * @public
		 */
		refresh() {
			if (typeof this.onRefresh === 'function') {
				this.onRefresh()
			}
		},
	},
}
</script>

<style scoped>
.cn-files-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-files-page__actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

.cn-files-page__loading,
.cn-files-page__empty,
.cn-files-page__error {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 240px;
}
</style>
