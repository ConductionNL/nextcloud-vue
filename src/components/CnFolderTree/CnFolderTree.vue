<template>
	<ul class="cn-folder-tree">
		<li v-for="folder in folders" :key="folder.id" class="cn-folder-tree__node">
			<button
				type="button"
				class="cn-folder-tree__item"
				:class="{ 'cn-folder-tree__item--active': folder.id === selectedId }"
				@click="select(folder.id)">
				<CnIcon v-if="folder.icon" :name="folder.icon" :size="18" />
				<Folder v-else :size="18" />
				<span class="cn-folder-tree__name">{{ folder.name }}</span>
				<span v-if="folder.count != null" class="cn-folder-tree__count">{{ folder.count }}</span>
			</button>
			<CnFolderTree
				v-if="folder.children && folder.children.length"
				:folders="folder.children"
				:selected-id="selectedId"
				class="cn-folder-tree__children"
				@select="select" />
		</li>
	</ul>
</template>

<script>
import Folder from 'vue-material-design-icons/Folder.vue'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnFolderTree — Recursive presentational folder tree.
 *
 * Renders a (possibly nested) list of `{ id, name, icon?, count?, children? }`
 * folders and emits `select` with a folder id when one is clicked. Purely
 * presentational — data loading and CRUD live in `CnFolderSidebar`.
 *
 * ```vue
 * <CnFolderTree :folders="tree" :selected-id="active" @select="onSelect" />
 * ```
 */
export default {
	name: 'CnFolderTree',

	components: {
		CnIcon,
		Folder,
	},

	props: {
		/**
		 * Folders at this level. Each may carry a `children` array for nesting.
		 * @type {Array<{ id: (string|number), name: string, icon?: string, count?: number, children?: Array }>}
		 */
		folders: {
			type: Array,
			default: () => [],
		},
		/** The currently selected folder id. */
		selectedId: {
			type: [String, Number],
			default: null,
		},
	},

	methods: {
		/**
		 * Emit `select` for a clicked folder (own level or a descendant).
		 *
		 * @param {(string|number)} id The clicked folder's id.
		 */
		select(id) {
			/**
			 * @event select Emitted when a folder (at this level or a descendant) is clicked.
			 * @type {(string|number)} The clicked folder's id.
			 */
			this.$emit('select', id)
		},
	},
}
</script>

<style scoped>
.cn-folder-tree {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-folder-tree__children {
	padding-inline-start: 16px;
}

.cn-folder-tree__item {
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

.cn-folder-tree__item:hover {
	background-color: var(--color-background-hover);
}

.cn-folder-tree__item--active {
	background-color: var(--color-primary-element-light);
	font-weight: 600;
}

.cn-folder-tree__name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-folder-tree__count {
	flex-shrink: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}
</style>
