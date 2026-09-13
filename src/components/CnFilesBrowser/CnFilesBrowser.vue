<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-files-browser"
		:class="{ 'cn-files-browser--dragging': dragging }"
		data-testid="cn-files-browser"
		@dragenter.prevent="dragging = true"
		@dragover.prevent="dragging = true"
		@dragleave.prevent="dragging = false"
		@drop.prevent="onDrop">
		<!-- The bar: where you are, and what you can add. The crumbs are the
		     Files app's own breadcrumb component; the New menu lists what the
		     Files app and its plugins registered for this folder (a new folder,
		     a template, a file request) beside a plain upload. -->
		<div class="cn-files-browser__bar">
			<NcBreadcrumbs class="cn-files-browser__crumbs">
				<!-- The whole trail from the user's files root, as the Files app
				     draws it. A crumb above the browser's root links into the Files
				     app (the browser never leaves its root); the root and everything
				     beneath it navigate in place. NcBreadcrumbs draws its first
				     crumb as a home icon and keeps the name for screen readers;
				     forceIconText puts the name beside the icon. -->
				<NcBreadcrumb
					v-for="(crumb, index) in crumbs"
					:key="crumb.path"
					:name="crumb.name"
					:forceIconText="index === 0"
					:disableDrop="true"
					:href="crumb.aboveRoot ? filesAppUrl(crumb.path) : undefined"
					:target="crumb.aboveRoot ? '_blank' : undefined"
					:data-above-root="crumb.aboveRoot ? 'true' : undefined"
					data-testid="cn-files-browser-crumb"
					@click="crumb.aboveRoot ? undefined : navigate(crumb.path)" />
			</NcBreadcrumbs>
			<NcActions
				:menuName="newLabel"
				:forceMenu="true"
				:forceName="true"
				variant="primary"
				:disabled="folder === null"
				data-testid="cn-files-browser-new">
				<template #icon>
					<Plus :size="20" />
				</template>
				<NcActionButton :closeAfterClick="true" data-testid="cn-files-browser-upload" @click="pickFiles">
					<template #icon>
						<Upload :size="20" />
					</template>
					{{ uploadLabel }}
				</NcActionButton>
				<NcActionButton
					v-for="entry in newMenuEntries"
					:key="entry.id"
					:closeAfterClick="true"
					:data-testid="`cn-files-browser-new-${entry.id}`"
					@click="runNewEntry(entry)">
					<template #icon>
						<NcIconSvgWrapper v-if="entry.iconSvgInline" :svg="entry.iconSvgInline" />
						<span v-else-if="entry.iconClass" :class="entry.iconClass" />
						<Plus v-else :size="20" />
					</template>
					{{ entry.displayName }}
				</NcActionButton>
				<!-- The host's own entries, after the Files app's. -->
				<NcActionButton
					v-for="action in newActions"
					:key="`host-${action.id}`"
					:closeAfterClick="true"
					:data-testid="`cn-files-browser-new-host-${action.id}`"
					@click="runHostAction(action, null)">
					<template #icon>
						<CnIcon :name="action.icon || 'Plus'" :size="20" />
					</template>
					{{ action.label }}
				</NcActionButton>
			</NcActions>
		</div>

		<!-- `:ref` (dynamic), not `ref`: a static ref on a vnode with only static
		     bindings is hoisted, and a hoisted vnode has no owner instance to
		     hold the ref, which throws in a production build. -->
		<input
			:ref="fileInputRef"
			type="file"
			multiple
			class="cn-files-browser__file-input"
			:aria-label="uploadLabel"
			@change="onFilesPicked">

		<ul v-if="uploads.length > 0" class="cn-files-browser__uploads" data-testid="cn-files-browser-uploads">
			<li v-for="upload in uploads" :key="upload.key" class="cn-files-browser__upload">
				<span class="cn-files-browser__upload-name">{{ upload.name }}</span>
				<NcProgressBar :value="upload.progress" :error="upload.error !== ''" />
				<span v-if="upload.error" class="cn-files-browser__upload-error" role="alert">{{ upload.error }}</span>
			</li>
		</ul>

		<NcLoadingIcon v-if="loading" :size="32" class="cn-files-browser__loading" />

		<NcEmptyContent v-else-if="error !== ''" :name="error" class="cn-files-browser__state">
			<template #icon>
				<AlertCircleOutline :size="44" />
			</template>
			<template #action>
				<NcButton @click="refresh">
					{{ retryLabel }}
				</NcButton>
			</template>
		</NcEmptyContent>

		<NcEmptyContent
			v-else-if="sorted.length === 0 && linkedItems.length === 0"
			:name="emptyLabel"
			:description="emptyHint"
			class="cn-files-browser__state">
			<template #icon>
				<FolderOutline :size="44" />
			</template>
		</NcEmptyContent>

		<!-- The table. Its rows are @nextcloud/files nodes read over DAV, and
		     each row's menu is the list of actions the Files app registered on
		     this page, offered under the same names and icons the Files app
		     uses. What cannot run away from the Files page (the details
		     sidebar) is left out, and Show in Files covers it. -->
		<table v-else class="cn-files-browser__table" data-testid="cn-files-browser-table">
			<thead>
				<tr>
					<th class="cn-files-browser__col-icon" scope="col">
						<span class="hidden-visually">{{ t('nextcloud-vue', 'Type') }}</span>
					</th>
					<th scope="col" :aria-sort="ariaSort('basename')">
						<button type="button" class="cn-files-browser__sort" @click="sortBy('basename')">
							{{ t('nextcloud-vue', 'Name') }}
							<component :is="sortIcon('basename')" v-if="sortKey === 'basename'" :size="16" />
						</button>
					</th>
					<th scope="col" class="cn-files-browser__col-size" :aria-sort="ariaSort('size')">
						<button type="button" class="cn-files-browser__sort" @click="sortBy('size')">
							{{ t('nextcloud-vue', 'Size') }}
							<component :is="sortIcon('size')" v-if="sortKey === 'size'" :size="16" />
						</button>
					</th>
					<th scope="col" class="cn-files-browser__col-mtime" :aria-sort="ariaSort('mtime')">
						<button type="button" class="cn-files-browser__sort" @click="sortBy('mtime')">
							{{ t('nextcloud-vue', 'Modified') }}
							<component :is="sortIcon('mtime')" v-if="sortKey === 'mtime'" :size="16" />
						</button>
					</th>
					<th class="cn-files-browser__col-actions" scope="col">
						<span class="hidden-visually">{{ t('nextcloud-vue', 'Actions') }}</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="node in sorted"
					:key="node.source"
					class="cn-files-browser__row"
					:class="{ 'cn-files-browser__row--folder': isFolder(node) }"
					data-testid="cn-files-browser-row"
					:data-name="node.basename"
					@click="open(node)">
					<td class="cn-files-browser__col-icon">
						<img
							v-if="previewUrlFor(node)"
							class="cn-files-browser__thumb"
							:src="previewUrlFor(node)"
							alt=""
							loading="lazy"
							@error="onPreviewError(node)">
						<img
							v-else-if="mimeIconFor(node)"
							class="cn-files-browser__mime"
							:src="mimeIconFor(node)"
							alt="">
						<FolderOutline v-else-if="isFolder(node)" :size="32" />
						<FileOutline v-else :size="32" />
					</td>
					<td class="cn-files-browser__col-name">
						<span class="cn-files-browser__name">{{ node.basename }}</span>
					</td>
					<td class="cn-files-browser__col-size">
						{{ isFolder(node) ? '' : formatSize(node.size) }}
					</td>
					<td class="cn-files-browser__col-mtime">
						<NcDateTime v-if="node.mtime" :timestamp="node.mtime" :ignoreSeconds="true" />
					</td>
					<td class="cn-files-browser__col-actions" @click.stop>
						<NcActions :forceMenu="true" :ariaLabel="t('nextcloud-vue', 'Actions for {name}', { name: node.basename })">
							<NcActionButton
								v-for="action in actionsFor(node)"
								:key="action.id"
								:closeAfterClick="true"
								:data-testid="`cn-files-browser-action-${action.id}`"
								@click="run(action, node)">
								<template #icon>
									<NcIconSvgWrapper :svg="iconOf(action, node)" />
								</template>
								{{ labelOf(action, node) }}
							</NcActionButton>
							<!-- The host's own actions on a file (never on a folder): declared
							     in its manifest, dispatched through the page's action runner
							     with the node's file id, name and path merged in. -->
							<template v-if="!isFolder(node)">
								<NcActionButton
									v-for="action in rowActions"
									:key="`host-${action.id}`"
									:closeAfterClick="true"
									:data-testid="`cn-files-browser-host-action-${action.id}`"
									@click="runHostAction(action, node)">
									<template #icon>
										<CnIcon :name="action.icon || 'FileDocumentEditOutline'" :size="20" />
									</template>
									{{ action.label }}
								</NcActionButton>
							</template>
							<NcActionSeparator v-if="actionsFor(node).length > 0 || (!isFolder(node) && rowActions.length > 0)" />
							<!-- The Files app's own rename is its list's inline input,
							     which is not here; this one is a dialog over a DAV move. -->
							<NcActionButton :closeAfterClick="true" data-testid="cn-files-browser-action-rename" @click="askRename(node)">
								<template #icon>
									<Pencil :size="20" />
								</template>
								{{ renameLabel }}
							</NcActionButton>
							<NcActionLink
								v-if="node.fileid"
								:href="permalink(node)"
								target="_blank"
								rel="noopener noreferrer"
								:closeAfterClick="true">
								<template #icon>
									<OpenInNew :size="20" />
								</template>
								{{ showInFilesLabel }}
							</NcActionLink>
						</NcActions>
					</td>
				</tr>
				<!-- Rows that are not nodes of this folder: documents the host
				     joined from elsewhere (another object's folder). Open and
				     download only; nothing here can change the file. -->
				<tr
					v-for="item in linkedItems"
					:key="`linked-${item.id}`"
					class="cn-files-browser__row cn-files-browser__row--linked"
					data-testid="cn-files-browser-linked-row"
					:data-name="item.name"
					@click="openLinked(item)">
					<td class="cn-files-browser__col-icon">
						<img
							v-if="mimeIconFor({ mime: item.mime })"
							class="cn-files-browser__mime"
							:src="mimeIconFor({ mime: item.mime })"
							alt="">
						<FileOutline v-else :size="32" />
					</td>
					<td class="cn-files-browser__col-name">
						<span class="cn-files-browser__name">{{ item.name }}</span>
						<span v-if="item.note" class="cn-files-browser__note">
							<a
								v-if="item.noteHref"
								:href="item.noteHref"
								class="cn-files-browser__note-link"
								@click.stop>{{ item.note }}</a>
							<template v-else>{{ item.note }}</template>
						</span>
					</td>
					<td class="cn-files-browser__col-size">
						{{ item.size ? formatSize(item.size) : '' }}
					</td>
					<td class="cn-files-browser__col-mtime">
						<NcDateTime v-if="item.mtime" :timestamp="item.mtime" :ignoreSeconds="true" />
					</td>
					<td class="cn-files-browser__col-actions" @click.stop>
						<NcActions :forceMenu="true" :ariaLabel="t('nextcloud-vue', 'Actions for {name}', { name: item.name })">
							<NcActionLink
								v-if="item.href"
								:href="item.href"
								target="_blank"
								rel="noopener noreferrer"
								:closeAfterClick="true"
								data-testid="cn-files-browser-linked-open">
								<template #icon>
									<OpenInNew :size="20" />
								</template>
								{{ openLinkedLabel }}
							</NcActionLink>
							<NcActionLink
								v-if="item.downloadHref"
								:href="item.downloadHref"
								:download="item.name"
								:closeAfterClick="true"
								data-testid="cn-files-browser-linked-download">
								<template #icon>
									<Download :size="20" />
								</template>
								{{ downloadLabel }}
							</NcActionLink>
						</NcActions>
					</td>
				</tr>
			</tbody>
		</table>

		<NcDialog
			v-if="renaming !== null"
			:name="renameLabel"
			size="small"
			data-testid="cn-files-browser-rename"
			@closing="renaming = null">
			<form class="cn-files-browser__new-folder" @submit.prevent="rename">
				<NcTextField
					v-model="renameName"
					:label="t('nextcloud-vue', 'New name')"
					:error="renameError !== ''"
					:helperText="renameError"
					data-testid="cn-files-browser-rename-name" />
			</form>
			<template #actions>
				<NcButton @click="renaming = null">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="renameName.trim() === '' || renameName.trim() === renaming.basename"
					data-testid="cn-files-browser-rename-confirm"
					@click="rename">
					{{ renameLabel }}
				</NcButton>
			</template>
		</NcDialog>

		<NcDialog
			v-if="newFolderOpen"
			:name="newFolderLabel"
			size="small"
			data-testid="cn-files-browser-new-folder"
			@closing="newFolderOpen = false">
			<form class="cn-files-browser__new-folder" @submit.prevent="createFolder">
				<NcTextField
					v-model="newFolderName"
					:label="t('nextcloud-vue', 'Folder name')"
					:error="newFolderError !== ''"
					:helperText="newFolderError"
					data-testid="cn-files-browser-new-folder-name" />
			</form>
			<template #actions>
				<NcButton @click="newFolderOpen = false">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="newFolderName.trim() === ''"
					data-testid="cn-files-browser-new-folder-create"
					@click="createFolder">
					{{ t('nextcloud-vue', 'Create') }}
				</NcButton>
			</template>
		</NcDialog>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { FileType, formatFileSize, getFileActions, getNewFileMenuEntries, sortNodes, View } from '@nextcloud/files'
import { getClient, getDefaultPropfind, getRemoteURL, getRootPath, resultToNode } from '@nextcloud/files/dav'
/**
 * CnFilesBrowser — a folder of Nextcloud files, on any page, built from the
 * Files app's own primitives rather than a copy of its screen.
 *
 * WHAT IS BORROWED, AND FROM WHERE.
 *
 * - The rows are `@nextcloud/files` nodes read over WebDAV with the same
 *   PROPFIND the Files app sends, so a node here carries what a node there
 *   carries: id, mime, size, mtime, permissions, attributes.
 * - Each row's menu is `getFileActions()`: the actions the Files app and its
 *   plugins registered on this page (download, delete, rename, favourite, move
 *   and copy, sharing status, tags, lock, open in Files…). They are run with
 *   the same context the Files app hands them, so a plugin's action does what
 *   it does in the Files app. The host page has to load those scripts: it
 *   dispatches `LoadAdditionalScriptsEvent` and asks for the Files app's `init`
 *   script server-side. On a page that did not, the menu holds only Show in
 *   Files, which is the honest fallback.
 * - The New menu is `getNewFileMenuEntries(folder)`: new folder, a template,
 *   a file request, whatever the plugins offer for this folder, beside a plain
 *   upload that PUTs over DAV.
 * - The crumbs are NcBreadcrumbs, the icons are the theme's own mime icons
 *   through `OC.MimeType`, and image previews come from the core preview
 *   endpoint.
 *
 * WHAT IS NOT. The Files app's list itself (its column filters, selection bar
 * and inline rename) is a Vue app bound to the Files router and its own stores,
 * and so is its details sidebar on Nextcloud 34. Neither can be mounted here.
 * The actions that need them are left out of the menu by name
 * (`ACTIONS_NEEDING_THE_FILES_PAGE`), and Show in Files opens the Files app on
 * the file for the rest.
 *
 * THE REGISTRY IS VERSIONED. `@nextcloud/files` keeps its registries under
 * `window._nc_files_scope.v4_0`; a page's plugins register into the copy the
 * server ships, and this component reads through its own bundled copy. Both
 * have to be the same major, which is why this library depends on 4.x: a 3.x
 * copy read `window._nc_fileactions`, which the server's plugins never write,
 * and saw nothing while the page held thirty actions.
 */
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import {
	NcActionButton,
	NcActionLink,
	NcActions,
	NcActionSeparator,
	NcBreadcrumb,
	NcBreadcrumbs,
	NcButton,
	NcDateTime,
	NcDialog,
	NcEmptyContent,
	NcIconSvgWrapper,
	NcLoadingIcon,
	NcProgressBar,
	NcTextField,
} from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import Download from 'vue-material-design-icons/Download.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { ACTIONS_NEEDING_THE_FILES_PAGE, crumbsFor, joinPath } from './filesBrowser.js'

let uploadSeq = 0

/** A folder glyph, the icon the Files app's View constructor requires. */
const VIEW_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'

export default {
	name: 'CnFilesBrowser',

	components: {
		AlertCircleOutline,
		CnIcon,
		Download,
		FileOutline,
		FolderOutline,
		NcActionButton,
		NcActionLink,
		NcActionSeparator,
		NcActions,
		NcBreadcrumb,
		NcBreadcrumbs,
		NcButton,
		NcDateTime,
		NcDialog,
		NcEmptyContent,
		NcIconSvgWrapper,
		NcLoadingIcon,
		NcProgressBar,
		NcTextField,
		OpenInNew,
		Pencil,
		Plus,
		Upload,
	},

	inject: {
		// The page's pre-bound action runner (CnPageRenderer provides it);
		// absent outside a page tree, in which case the bare dispatcher runs.
		cnDispatchAction: { default: null },
	},

	props: {
		/**
		 * The host's own actions on each file row, declared the way a
		 * manifest declares any action (`open-modal`, `handler`, ...), and
		 * dispatched through the page's action runner with the node's
		 * `fileId`, `fileName` and `path` merged into an `open-modal` action's
		 * props (or appended as the node to a `handler` action's args). Folders
		 * get none. `icon` is an MDI icon name.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, type?: string, target?: string, props?: object, handler?: string, args?: Array}>}
		 */
		rowActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * The host's own entries in the New menu, after the ones the Files
		 * app and its plugins register. Each is dispatched like a row action
		 * (`type: 'open-modal' | 'handler' | …`) through the page's
		 * `cnDispatchAction`, carrying the current folder rather than a row,
		 * so a host can offer "new from template" or "request a file from a
		 * party" here.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, type?: string, target?: string, props?: object, handler?: string, args?: Array}>}
		 */
		newActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Rows that are not nodes of this folder: files the host joined from
		 * another object's folder. Rendered after the folder's own rows with
		 * open and download only. `note` (and its optional `noteHref`) says
		 * where the file lives.
		 *
		 * @type {Array<{id: string|number, name: string, mime?: string, size?: number, mtime?: Date|number, href?: string, downloadHref?: string, note?: string, noteHref?: string}>}
		 */
		linkedItems: {
			type: Array,
			default: () => [],
		},

		/**
		 * Label of a linked row's open action.
		 */
		openLinkedLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Open'),
		},

		/**
		 * Label of a linked row's download action.
		 */
		downloadLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Download'),
		},

		/**
		 * The folder this browser is rooted at, relative to the current user's
		 * files root (`/Open Registers/Cases/<uuid>`). The browser never
		 * navigates above it. Resolve it with `resolveObjectFolder()` for an
		 * OpenRegister object.
		 */
		rootPath: {
			type: String,
			required: true,
		},

		/**
		 * What the root crumb reads. Null shows the folder's own name, which
		 * is what the Files app shows; pass a label when the folder on disk is
		 * a uuid and the host knows a better name.
		 */
		rootLabel: {
			type: String,
			default: null,
		},

		/** Label of the New menu. */
		newLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'New'),
		},

		/** Label of the upload entry in the New menu. */
		uploadLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Upload files'),
		},

		/** Label of the new-folder entry and its dialog. */
		newFolderLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'New folder'),
		},

		/** Label of the rename action and its dialog. */
		renameLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Rename'),
		},

		/** Label of the link that opens the file in the Files app. */
		showInFilesLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Show in Files'),
		},

		/** Title of the empty state. */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'This folder is empty'),
		},

		/** Line under the empty state's title. */
		emptyHint: {
			type: String,
			default: () => t('nextcloud-vue', 'Drop files here, or use New'),
		},

		/** Label of the retry button on a failed listing. */
		retryLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Try again'),
		},
	},

	emits: ['changed'],

	data() {
		return {
			currentPath: this.rootPath,
			/** The open folder as a node, or null before the first listing. */
			folder: null,
			/** The open folder's children as nodes. */
			nodes: [],
			loading: false,
			error: '',
			sortKey: 'basename',
			sortAsc: true,
			dragging: false,
			uploads: [],
			previewFailed: {},
			newFolderOpen: false,
			newFolderName: '',
			newFolderError: '',
			/** The node being renamed, or null. */
			renaming: null,
			renameName: '',
			renameError: '',
			fileInputEl: null,
			/**
			 * The view the Files app's actions are handed. They read `view.id`
			 * to tell a trash bin or a share view from a plain folder; this is
			 * a plain folder.
			 */
			view: new View({
				id: 'files',
				name: t('nextcloud-vue', 'Files'),
				// The View constructor refuses anything but an SVG string here,
				// and throws from data(), which takes the whole tab down.
				icon: VIEW_ICON,
				order: 0,
				getContents: async () => ({ folder: this.folder, contents: this.nodes }),
			}),
		}
	},

	computed: {
		/**
		 * The breadcrumb trail from the root to the open folder.
		 *
		 * @return {Array<{name: string, path: string}>} The crumbs.
		 */
		crumbs() {
			return crumbsFor(this.rootPath, this.currentPath, this.rootLabel)
		},

		/**
		 * The children in the chosen order, folders first the way the Files app
		 * lists them.
		 *
		 * @return {Array<object>} The nodes.
		 */
		sorted() {
			return sortNodes(this.nodes, {
				sortingMode: this.sortKey,
				sortingOrder: this.sortAsc ? 'asc' : 'desc',
				sortFoldersFirst: true,
				sortFavoritesFirst: false,
			})
		},

		/**
		 * What the Files app and its plugins offer to create in this folder.
		 *
		 * Read at render, not cached: a plugin's script may register its entry
		 * after this component mounted.
		 *
		 * @return {Array<object>} The entries, in the plugins' order.
		 */
		newMenuEntries() {
			if (this.folder === null) {
				return []
			}
			try {
				return getNewFileMenuEntries(this.folder)
					.filter((entry) => typeof entry.handler === 'function')
					.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			} catch {
				return []
			}
		},
	},

	watch: {
		rootPath(next) {
			this.currentPath = next
			this.refresh()
		},
	},

	mounted() {
		this.refresh()
	},

	methods: {
		t,

		/**
		 * Hold the file input element from its function ref.
		 *
		 * @param {HTMLInputElement|null} el The element.
		 * @return {void}
		 */
		fileInputRef(el) {
			this.fileInputEl = el || null
		},

		/**
		 * The DAV path of a user-relative path.
		 *
		 * @param {string} path The user-relative path.
		 * @return {string} The path under the DAV files root.
		 */
		davPath(path) {
			return `${getRootPath()}${path}`
		},

		/**
		 * List the open folder over DAV, with the same PROPFIND the Files app sends.
		 *
		 * @return {Promise<void>}
		 */
		async refresh() {
			this.loading = true
			this.error = ''
			try {
				const client = getClient()
				const { data } = await client.getDirectoryContents(this.davPath(this.currentPath), {
					details: true,
					data: getDefaultPropfind(),
					includeSelf: true,
				})
				const stats = Array.isArray(data) ? data : []
				const nodes = stats.map((stat) => resultToNode(stat))
				const self = nodes.find((node) => node.path === this.currentPath) || nodes[0] || null
				this.folder = self
				this.nodes = nodes.filter((node) => node !== self)
			} catch (err) {
				const status = err?.response?.status ?? err?.status
				this.error = status === 404
					? t('nextcloud-vue', 'This folder no longer exists')
					: (status === 403 ? t('nextcloud-vue', 'You cannot see this folder') : t('nextcloud-vue', 'The folder could not be read'))
				this.folder = null
				this.nodes = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Open a folder below the root.
		 *
		 * @param {string} path The user-relative path.
		 * @return {void}
		 */
		navigate(path) {
			const root = this.rootPath.replace(/\/+$/, '') || '/'
			if (path !== root && !path.startsWith(root === '/' ? '/' : `${root}/`)) {
				return
			}
			this.currentPath = path
			this.refresh()
		},

		/**
		 * Whether a node is a folder.
		 *
		 * @param {object} node The node.
		 * @return {boolean} true for a folder.
		 */
		isFolder(node) {
			return node.type === FileType.Folder
		},

		/**
		 * A row was clicked: enter a folder, or open a file the way the Files
		 * app would (its `view` action, which hands over to the Viewer).
		 *
		 * @param {object} node The node.
		 * @return {Promise<void>}
		 */
		async open(node) {
			if (this.isFolder(node)) {
				this.navigate(node.path)
				return
			}
			const view = this.actionsFor(node).find((action) => action.id === 'view')
			if (view) {
				await this.run(view, node)
				return
			}
			if (node.fileid) {
				window.open(this.permalink(node), '_blank', 'noopener,noreferrer')
			}
		},

		/**
		 * The action context the Files app hands its actions for one node.
		 *
		 * @param {object} node The node.
		 * @return {object} The context.
		 */
		contextFor(node) {
			return { nodes: [node], view: this.view, folder: this.folder, contents: this.nodes }
		},

		/**
		 * The registered actions that apply to a node, in the Files app's order.
		 *
		 * Inline actions (a sharing badge, an unread-comments dot) are status
		 * marks the Files app paints beside the name, not menu items; a
		 * sub-action lives under its parent's own menu; and the actions that
		 * need the Files page are named in `ACTIONS_NEEDING_THE_FILES_PAGE`.
		 *
		 * @param {object} node The node.
		 * @return {Array<object>} The actions.
		 */
		actionsFor(node) {
			let actions
			try {
				actions = getFileActions()
			} catch {
				return []
			}
			const context = this.contextFor(node)
			return actions
				.filter((action) => !action.parent && !ACTIONS_NEEDING_THE_FILES_PAGE.includes(action.id))
				.filter((action) => typeof action.inline !== 'function' || action.inline(context) !== true)
				.filter((action) => {
					try {
						return typeof action.enabled !== 'function' || action.enabled(context) === true
					} catch {
						return false
					}
				})
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		},

		/**
		 * An action's label for a node, in the words the Files app uses.
		 *
		 * @param {object} action The action.
		 * @param {object} node The node.
		 * @return {string} The label.
		 */
		labelOf(action, node) {
			try {
				return action.displayName(this.contextFor(node))
			} catch {
				return action.id
			}
		},

		/**
		 * An action's icon for a node, as inline SVG.
		 *
		 * @param {object} action The action.
		 * @param {object} node The node.
		 * @return {string} The SVG, or the empty string.
		 */
		iconOf(action, node) {
			try {
				return action.iconSvgInline(this.contextFor(node)) || ''
			} catch {
				return ''
			}
		},

		/**
		 * Run a registered action on a node, then re-read the folder: most of
		 * them change it (a delete, a rename, a move), and the ones that do
		 * not cost one PROPFIND.
		 *
		 * @param {object} action The action.
		 * @param {object} node The node.
		 * @return {Promise<void>}
		 */
		async run(action, node) {
			try {
				const result = await action.exec(this.contextFor(node))
				if (result === false) {
					const { showError } = await import('@nextcloud/dialogs')
					showError(t('nextcloud-vue', '{action} did not succeed', { action: this.labelOf(action, node) }))
				}
			} catch (err) {
				const { showError } = await import('@nextcloud/dialogs')
				showError(err?.message || t('nextcloud-vue', '{action} did not succeed', { action: this.labelOf(action, node) }))
			}
			await this.refresh()
			/**
			 * @event changed The folder's contents changed through this browser:
			 * an upload, a new folder, or an action that ran.
			 */
			this.$emit('changed')
		},

		/**
		 * Run a New menu entry the Files app or a plugin registered, then re-read.
		 *
		 * The `newFolder` entry the Files app registers opens its own inline
		 * rename in the Files list, which is not here, so that one is answered
		 * by this component's dialog instead.
		 *
		 * @param {object} entry The entry.
		 * @return {Promise<void>}
		 */
		async runNewEntry(entry) {
			if (entry.id === 'newFolder') {
				this.askNewFolder()
				return
			}
			try {
				await entry.handler(this.folder, this.nodes)
			} catch (err) {
				const { showError } = await import('@nextcloud/dialogs')
				showError(err?.message || t('nextcloud-vue', '{action} did not succeed', { action: entry.displayName }))
			}
			await this.refresh()
			this.$emit('changed')
		},

		/**
		 * Open the new-folder dialog.
		 *
		 * @return {void}
		 */
		askNewFolder() {
			this.newFolderName = ''
			this.newFolderError = ''
			this.newFolderOpen = true
		},

		/**
		 * Create the folder named in the dialog, over DAV.
		 *
		 * @return {Promise<void>}
		 */
		async createFolder() {
			const name = this.newFolderName.trim()
			if (name === '') {
				return
			}
			if (this.nodes.some((node) => node.basename === name)) {
				this.newFolderError = t('nextcloud-vue', 'A file or folder with that name is already here')
				return
			}
			try {
				await getClient().createDirectory(this.davPath(joinPath(this.currentPath, name)))
				this.newFolderOpen = false
				await this.refresh()
				this.$emit('changed')
			} catch (err) {
				this.newFolderError = err?.message || t('nextcloud-vue', 'The folder could not be created')
			}
		},

		/**
		 * Open the rename dialog on a node.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		askRename(node) {
			this.renaming = node
			this.renameName = node.basename
			this.renameError = ''
		},

		/**
		 * Rename the node named in the dialog, as a DAV move within its folder.
		 *
		 * @return {Promise<void>}
		 */
		async rename() {
			const node = this.renaming
			const name = this.renameName.trim()
			if (node === null || name === '' || name === node.basename) {
				return
			}
			if (name.includes('/')) {
				this.renameError = t('nextcloud-vue', 'A name cannot contain a slash')
				return
			}
			if (this.nodes.some((other) => other !== node && other.basename === name)) {
				this.renameError = t('nextcloud-vue', 'A file or folder with that name is already here')
				return
			}
			try {
				await getClient().moveFile(this.davPath(node.path), this.davPath(joinPath(this.currentPath, name)))
				this.renaming = null
				await this.refresh()
				this.$emit('changed')
			} catch (err) {
				this.renameError = err?.message || t('nextcloud-vue', 'The name could not be changed')
			}
		},

		/**
		 * Open the file picker.
		 *
		 * @return {void}
		 */
		pickFiles() {
			this.fileInputEl?.click()
		},

		/**
		 * Files were picked.
		 *
		 * @param {Event} event The change event.
		 * @return {Promise<void>}
		 */
		async onFilesPicked(event) {
			const files = event.target?.files
			if (files?.length) {
				await this.uploadFiles(files)
			}
			if (this.fileInputEl) {
				this.fileInputEl.value = ''
			}
		},

		/**
		 * Files were dropped.
		 *
		 * @param {DragEvent} event The drop.
		 * @return {Promise<void>}
		 */
		async onDrop(event) {
			this.dragging = false
			const files = event.dataTransfer?.files
			if (files?.length) {
				await this.uploadFiles(files)
			}
		},

		/**
		 * PUT each file into the open folder over DAV, with a progress row
		 * each, then re-read the folder once.
		 *
		 * @param {FileList|File[]} files The files.
		 * @return {Promise<void>}
		 */
		async uploadFiles(files) {
			if (this.folder === null) {
				return
			}
			// A PUT through axios rather than the DAV client: the client's
			// putFileContents refuses a browser File ("Cannot calculate data
			// length"), and fetch reports no upload progress anyway. axios
			// carries the session and the request token, and its XHR reports
			// progress per file. If-None-Match: * refuses to overwrite.
			const batch = [...files].map((file) => ({ key: `u${++uploadSeq}`, name: file.name, progress: 0, error: '', file }))
			this.uploads = [...this.uploads, ...batch]
			for (const upload of batch) {
				try {
					await axios.put(`${getRemoteURL()}${this.davPath(joinPath(this.currentPath, upload.name))}`, upload.file, {
						headers: {
							'Content-Type': upload.file.type || 'application/octet-stream',
							'If-None-Match': '*',
						},
						onUploadProgress: (progress) => {
							if (progress?.total) {
								upload.progress = Math.round((progress.loaded / progress.total) * 100)
							}
						},
					})
					upload.progress = 100
				} catch (err) {
					const status = err?.response?.status ?? err?.status
					upload.error = status === 412
						? t('nextcloud-vue', 'A file with that name is already here')
						: (err?.message || t('nextcloud-vue', 'The upload failed'))
				}
			}
			await this.refresh()
			this.$emit('changed')
			// Finished rows leave the list; failed ones stay with their reason.
			window.setTimeout(() => {
				this.uploads = this.uploads.filter((upload) => upload.error !== '' || batch.every((b) => b.key !== upload.key))
			}, 1500)
		},

		/**
		 * Change the sort column, or flip the order on the same one.
		 *
		 * @param {string} key `basename`, `size` or `mtime`.
		 * @return {void}
		 */
		sortBy(key) {
			if (this.sortKey === key) {
				this.sortAsc = !this.sortAsc
				return
			}
			this.sortKey = key
			this.sortAsc = key === 'basename'
		},

		/**
		 * The `aria-sort` value for a column header.
		 *
		 * @param {string} key The column's sort key.
		 * @return {string|null} `ascending`, `descending` or null.
		 */
		ariaSort(key) {
			if (this.sortKey !== key) {
				return null
			}
			return this.sortAsc ? 'ascending' : 'descending'
		},

		/**
		 * The arrow beside the sorted column's name.
		 *
		 * @param {string} key The column's sort key.
		 * @return {object} The icon component.
		 */
		sortIcon(key) {
			return this.sortKey === key && !this.sortAsc ? ChevronDown : ChevronUp
		},

		/**
		 * A file's size the way the Files app prints it.
		 *
		 * @param {number|undefined} size The size in bytes.
		 * @return {string} The size, or the empty string.
		 */
		formatSize(size) {
			return typeof size === 'number' ? formatFileSize(size, true) : ''
		},

		/**
		 * The theme's own icon for a node's mime type, or null off Nextcloud.
		 *
		 * @param {object} node The node.
		 * @return {string|null} The icon url.
		 */
		mimeIconFor(node) {
			const getIconUrl = typeof window !== 'undefined' ? window.OC?.MimeType?.getIconUrl : null
			if (typeof getIconUrl !== 'function') {
				return null
			}
			try {
				return getIconUrl(this.isFolder(node) ? 'dir' : (node.mime || '')) || null
			} catch {
				return null
			}
		},

		/**
		 * A small preview for a raster image, from the core preview endpoint.
		 *
		 * @param {object} node The node.
		 * @return {string|null} The url, or null.
		 */
		previewUrlFor(node) {
			const mime = node.mime || ''
			if (!node.fileid || this.isFolder(node) || !/^image\//i.test(mime) || /svg/i.test(mime) || this.previewFailed[node.fileid]) {
				return null
			}
			return generateUrl('/core/preview?fileId={fileId}&x=64&y=64&a=1', { fileId: node.fileid })
		},

		/**
		 * Remember a preview that did not load.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		onPreviewError(node) {
			this.previewFailed = { ...this.previewFailed, [node.fileid]: true }
		},

		/**
		 * The Files app opened on a folder, for the crumbs above the root.
		 *
		 * @param {string} path The user-relative folder path.
		 * @return {string} The url.
		 */
		filesAppUrl(path) {
			return generateUrl('/apps/files/files?dir={dir}', { dir: path })
		},

		/**
		 * The Files app's permalink for a node.
		 *
		 * @param {object} node The node.
		 * @return {string} The url.
		 */
		permalink(node) {
			return generateUrl('/f/{fileid}', { fileid: node.fileid })
		},

		/**
		 * Run one of the host's declared actions on a file.
		 *
		 * An `open-modal` action gets the node merged onto its props as
		 * `fileId`, `fileName` and `path`, the same way a widget's row action
		 * hands a modal its row; a `handler` action gets the node appended to
		 * its args. Everything else is dispatched as declared.
		 *
		 * @param {object} action The declared action.
		 * @param {object} node The file it was clicked on.
		 * @return {void}
		 */
		runHostAction(action, node) {
			if (!action || typeof action !== 'object') {
				return
			}
			const type = action.type || 'handler'
			let wrapped = action
			// A New-menu entry carries no row, only the folder it was opened in.
			const context = node === null
				? { path: this.currentPath }
				: { fileId: node.fileid, fileName: node.basename, path: node.path }
			if (type === 'open-modal') {
				wrapped = { ...action, props: { ...(action.props || {}), ...context } }
			} else if (type === 'handler') {
				wrapped = { ...action, args: [...(action.args || []), node ?? this.folder] }
			}
			if (typeof this.cnDispatchAction === 'function') {
				this.cnDispatchAction(wrapped)
				return
			}
			dispatchAction(wrapped, { router: this.$router || null })
		},

		/**
		 * A click on a linked row opens the file where it lives.
		 *
		 * @param {object} item The linked item.
		 * @return {void}
		 */
		openLinked(item) {
			if (item.href && typeof window !== 'undefined') {
				window.open(item.href, '_blank', 'noopener')
			}
		},

		/**
		 * The current user's id, for callers resolving a root path.
		 *
		 * @return {string} The uid, or the empty string.
		 */
		currentUid() {
			return getCurrentUser()?.uid || ''
		},
	},
}
</script>

<style scoped>
.cn-files-browser {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	border-radius: var(--border-radius-large, 8px);
}

.cn-files-browser--dragging {
	outline: 2px dashed var(--color-primary-element);
	outline-offset: 4px;
}

.cn-files-browser__bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-width: 0;
}

.cn-files-browser__crumbs {
	min-width: 0;
	flex: 1 1 auto;
}

.cn-files-browser__file-input {
	display: none;
}

.cn-files-browser__uploads {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-files-browser__upload {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-files-browser__upload-name {
	font-size: 13px;
}

.cn-files-browser__upload-error {
	color: var(--color-error);
	font-size: 13px;
}

.cn-files-browser__loading {
	padding: 24px 0;
}

.cn-files-browser__table {
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
}

.cn-files-browser__table th {
	text-align: start;
	font-weight: normal;
	color: var(--color-text-maxcontrast);
	padding: 4px 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-files-browser__sort {
	background: none;
	border: none;
	padding: 0;
	font: inherit;
	color: inherit;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 2px;
}

.cn-files-browser__sort:hover,
.cn-files-browser__sort:focus-visible {
	color: var(--color-main-text);
}

.cn-files-browser__row {
	cursor: pointer;
}

.cn-files-browser__row:hover,
.cn-files-browser__row:focus-within {
	background-color: var(--color-background-hover);
}

.cn-files-browser__table td {
	padding: 4px 8px;
	border-bottom: 1px solid var(--color-border);
	vertical-align: middle;
}

.cn-files-browser__col-icon {
	width: 48px;
}

.cn-files-browser__col-size {
	width: 96px;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__col-mtime {
	width: 140px;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__col-actions {
	width: 48px;
}

.cn-files-browser__col-name {
	min-width: 0;
}

.cn-files-browser__name {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-files-browser__row--linked {
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__note {
	color: var(--color-text-maxcontrast);
	display: block;
	font-size: var(--font-size-small, 13px);
}

.cn-files-browser__note-link {
	color: inherit;
	text-decoration: underline;
}

.cn-files-browser__row--folder .cn-files-browser__name {
	font-weight: 600;
}

.cn-files-browser__mime,
.cn-files-browser__thumb {
	width: 32px;
	height: 32px;
	display: block;
}

.cn-files-browser__thumb {
	object-fit: cover;
	border-radius: var(--border-radius, 4px);
}

.cn-files-browser__new-folder {
	padding: 8px 0;
}

.hidden-visually {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
