<template>
	<div class="cn-folder-sidebar">
		<div v-if="title" class="cn-folder-sidebar__title">
			{{ title }}
		</div>

		<!-- "All" reset entry -->
		<button
			type="button"
			class="cn-folder-sidebar__all"
			:class="{ 'cn-folder-sidebar__all--active': selectedId == null }"
			@click="select(null)">
			<CnIcon v-if="allIcon" :name="allIcon" :size="18" />
			<AllInclusive v-else :size="18" />
			<span class="cn-folder-sidebar__all-label">{{ allLabel }}</span>
		</button>

		<div v-if="loading" class="cn-folder-sidebar__loading">
			<NcLoadingIcon :size="20" />
		</div>

		<CnFolderTree
			v-else
			:folders="normalizedTree"
			:selected-id="selectedId"
			@select="select" />

		<!-- New-folder action (opt-in, custom source only) -->
		<NcButton
			v-if="allowCreate"
			class="cn-folder-sidebar__new"
			type="tertiary"
			wide
			@click="create">
			<template #icon>
				<FolderPlusOutline :size="18" />
			</template>
			{{ createLabel }}
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import FolderPlusOutline from 'vue-material-design-icons/FolderPlusOutline.vue'
import AllInclusive from 'vue-material-design-icons/AllInclusive.vue'
import { CnIcon } from '../CnIcon/index.js'
import { CnFolderTree } from '../CnFolderTree/index.js'
import { fetchWebdavFolderTree } from './webdavFolders.js'

/**
 * CnFolderSidebar — Source-agnostic folder navigation sidebar.
 *
 * Renders an "All" reset entry plus a (nested) folder tree, and emits
 * `select` with the chosen folder id (or `null` for "All"). Drop it into an
 * index page's sidebar to filter the list by folder.
 *
 * Three folder sources (`source` prop):
 * - `'custom'` — the parent supplies `folders` (flat with `parentField`, or
 *   already-nested via `childrenField`) and handles CRUD via the `create` /
 *   `rename` / `delete` events. Fits app-owned folder tables, OpenRegister
 *   folder objects, anything.
 * - `'field'` — no folder entity: the tree is built from the distinct values
 *   of a `groupBy` field across `objects`. Lightweight grouping, no nesting.
 * - `'files'` — real Nextcloud folders/collections under `filesPath`, loaded
 *   over WebDAV (override with the `fetcher` prop, e.g. for tests).
 *
 * ```vue
 * <CnFolderSidebar :folders="folderTree" :selected-id="folderId" allow-create
 *   @select="onFolder" @create="onCreateFolder" />
 * <CnFolderSidebar source="field" :objects="rows" group-by="status" :selected-id="status" @select="onFolder" />
 * <CnFolderSidebar source="files" files-path="/Vault" :selected-id="path" @select="onFolder" />
 * ```
 */
export default {
	name: 'CnFolderSidebar',

	components: {
		NcButton,
		NcLoadingIcon,
		FolderPlusOutline,
		AllInclusive,
		CnIcon,
		CnFolderTree,
	},

	props: {
		/** Folder source strategy. */
		source: {
			type: String,
			default: 'custom',
			validator: (v) => ['custom', 'field', 'files'].includes(v),
		},
		/**
		 * `custom` source: the folders, flat (with `parentField`) or nested
		 * (with `childrenField`). Each needs at least `idField` + `nameField`.
		 * @type {Array<object>}
		 */
		folders: {
			type: Array,
			default: () => [],
		},
		/** `field` source: the objects whose `groupBy` values become folders. */
		objects: {
			type: Array,
			default: () => [],
		},
		/** `field` source: the object property to group by. */
		groupBy: {
			type: String,
			default: '',
		},
		/** `files` source: the folder path to list children of (root of the tree). */
		filesPath: {
			type: String,
			default: '/',
		},
		/**
		 * `files` source: how deep to recurse under `filesPath` (each level is a
		 * WebDAV request per folder — keep small). 1 = immediate children only.
		 */
		maxDepth: {
			type: Number,
			default: 1,
		},
		/**
		 * `files` source: async loader override. Signature
		 * `({ path, depth }) => Promise<folders>`. Defaults to a built-in
		 * WebDAV PROPFIND loader. Inject in tests.
		 * @type {Function}
		 */
		fetcher: {
			type: Function,
			default: null,
		},
		/** The currently selected folder id (or null for "All"). */
		selectedId: {
			type: [String, Number],
			default: null,
		},
		/** Optional heading above the tree. */
		title: {
			type: String,
			default: '',
		},
		/** Label for the "All" reset entry. */
		allLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'All'),
		},
		/** MDI icon name for the "All" entry (resolved via CnIcon; empty = the built-in all-inclusive icon). */
		allIcon: {
			type: String,
			default: '',
		},
		/** Property holding each folder's id (custom source). */
		idField: {
			type: String,
			default: 'id',
		},
		/** Property holding each folder's display name (custom source). */
		nameField: {
			type: String,
			default: 'name',
		},
		/** Property holding the parent id for flat custom folders. */
		parentField: {
			type: String,
			default: 'parentId',
		},
		/** Property holding pre-nested children (custom source). */
		childrenField: {
			type: String,
			default: 'children',
		},
		/** Show a "New folder" button (custom source). */
		allowCreate: {
			type: Boolean,
			default: false,
		},
		/** Label for the New-folder button. */
		createLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'New folder'),
		},
	},

	data() {
		return {
			fileTree: [],
			loading: false,
		}
	},

	computed: {
		/** The folder tree normalized to `{ id, name, icon?, count?, children }`. */
		normalizedTree() {
			if (this.source === 'field') return this.fieldTree
			if (this.source === 'files') return this.fileTree
			return this.customTree
		},

		/** Build a nested tree from the custom `folders` prop. */
		customTree() {
			const list = this.folders || []
			// Already nested → map straight through.
			if (list.some((f) => Array.isArray(f[this.childrenField]))) {
				return list.map((f) => this.mapCustom(f))
			}
			// Flat → assemble by parent id.
			const byId = {}
			list.forEach((f) => {
				byId[f[this.idField]] = { ...this.mapCustom(f), children: [] }
			})
			const roots = []
			list.forEach((f) => {
				const node = byId[f[this.idField]]
				const parent = f[this.parentField]
				if (parent != null && byId[parent]) {
					byId[parent].children.push(node)
				} else {
					roots.push(node)
				}
			})
			return roots
		},

		/** Distinct `groupBy` values across `objects` → flat folders. */
		fieldTree() {
			if (!this.groupBy) return []
			const counts = new Map()
			this.objects.forEach((obj) => {
				const value = obj[this.groupBy]
				if (value == null || value === '') return
				counts.set(value, (counts.get(value) || 0) + 1)
			})
			return Array.from(counts.entries()).map(([value, count]) => ({
				id: String(value),
				name: String(value),
				count,
				children: [],
			}))
		},
	},

	watch: {
		filesPath: 'maybeLoadFiles',
		source: 'maybeLoadFiles',
	},

	mounted() {
		this.maybeLoadFiles()
	},

	methods: {
		/**
		 * Emit `select` for a chosen folder (or "All").
		 *
		 * @param {(string|number|null)} id The chosen folder id (null = All).
		 */
		select(id) {
			/**
			 * @event select Emitted when a folder (or "All") is chosen.
			 * @type {(string|number|null)} The folder id, or null for "All".
			 */
			this.$emit('select', id)
		},

		/** Emit `create` with the current folder as parent. */
		create() {
			/**
			 * @event create Emitted when the New-folder button is clicked.
			 * @type {{ parentId: (string|number|null) }} The current folder as parent.
			 */
			this.$emit('create', { parentId: this.selectedId })
		},

		/**
		 * Map one custom folder to the normalized shape, recursing on children.
		 *
		 * @param {object} folder The raw folder from the `folders` prop.
		 * @return {object} The normalized `{ id, name, icon, count, children }` node.
		 */
		mapCustom(folder) {
			const children = folder[this.childrenField]
			return {
				id: folder[this.idField],
				name: folder[this.nameField],
				icon: folder.icon,
				count: folder.count,
				children: Array.isArray(children) ? children.map((c) => this.mapCustom(c)) : [],
			}
		},

		/** Load the WebDAV folder tree when the `files` source is active. */
		async maybeLoadFiles() {
			if (this.source !== 'files') return
			this.loading = true
			try {
				const load = this.fetcher || fetchWebdavFolderTree
				this.fileTree = await load({ path: this.filesPath, depth: this.maxDepth })
			} catch (e) {
				console.error('[CnFolderSidebar] failed to load folders', e)
				this.fileTree = []
			} finally {
				this.loading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-folder-sidebar {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-folder-sidebar__title {
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.3px;
	color: var(--color-text-maxcontrast);
	padding: 4px 8px;
}

.cn-folder-sidebar__all {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 6px 8px;
	border: none;
	border-radius: var(--border-radius);
	background: transparent;
	color: var(--color-main-text);
	font-size: inherit;
	text-align: start;
	cursor: pointer;
}

.cn-folder-sidebar__all:hover {
	background-color: var(--color-background-hover);
}

.cn-folder-sidebar__all--active {
	background-color: var(--color-primary-element-light);
	font-weight: 600;
}

.cn-folder-sidebar__all-label {
	flex: 1;
	min-width: 0;
}

.cn-folder-sidebar__loading {
	display: flex;
	justify-content: center;
	padding: 12px;
}

.cn-folder-sidebar__new {
	margin-top: 8px;
}
</style>
