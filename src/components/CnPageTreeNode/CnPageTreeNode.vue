<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<draggable v-model="tree"
		tag="ul"
		class="cn-page-tree"
		:group="group"
		handle=".cn-page-tree__handle"
		:move="onMove"
		@end="flatten">
		<li v-for="node in tree" :key="nodeKey(node.ref)" class="cn-page-tree__node">
			<CnPageTreeRow :page="node.ref"
				:can-add-child="maxDepth > 0"
				@add-child="addChild(node)"
				@rename="(id) => renamePage(node.ref, id)"
				@navigate="bubbleNavigate"
				@remove="removeNode(node, null)" />

			<!-- One level of children: a drop target on every top page so a row
			     can be dragged IN (to nest) or OUT (to top level). -->
			<draggable v-if="maxDepth > 0"
				v-model="node.children"
				tag="ul"
				class="cn-page-tree__children"
				:class="{ 'cn-page-tree__children--empty': !node.children.length }"
				:group="group"
				handle=".cn-page-tree__handle"
				:move="onMove"
				@end="flatten">
				<li v-for="child in node.children" :key="nodeKey(child.ref)" class="cn-page-tree__node">
					<CnPageTreeRow :page="child.ref"
						:can-add-child="false"
						@rename="(id) => renamePage(child.ref, id)"
						@navigate="bubbleNavigate"
						@remove="removeNode(child, node)" />
				</li>
			</draggable>
		</li>
	</draggable>
</template>

<script>
import draggable from 'vuedraggable'
import { translate as t } from '@nextcloud/l10n'
import CnPageTreeRow from './CnPageTreeRow.vue'

// Stable per-page-object render keys, independent of the mutable `id`. Keyed by
// the page ref itself (a WeakMap, so removed pages are GC'd) so a slug rename —
// which changes `id` in place — does NOT change the `<li>` key and therefore
// does NOT tear down the row (which would close its inline settings panel).
let pageKeySeq = 0
const pageKeys = new WeakMap()

/**
 * CnPageTreeNode — the pages editor's drag-and-drop tree (ADR-041).
 *
 * Renders the working manifest's FLAT `pages[]` (each page carrying an optional
 * `parent` id) as a two-level draggable tree: drag a row to reorder, or drag it
 * into / out of a page to nest (an index and its detail, one level deep). Each
 * row (CnPageTreeRow) edits its own fields inline + via a cog popover. Drag
 * operates on a local nested mirror (`tree`) of real page refs; after every drop
 * the mirror is FLATTENED back onto the flat `pages[]` in place — top nodes lose
 * `parent`, nested nodes get `parent = <top id>` — so `diffManifest` sees the
 * change and the manifest keeps its flat shape. Field edits mutate the real page
 * refs directly, independent of the mirror.
 */
export default {
	name: 'CnPageTreeNode',

	components: { draggable, CnPageTreeRow },

	props: {
		/**
		 * The full, flat `pages[]` array (the working manifest's). Edited in
		 * place; the tree is derived from each page's `parent`.
		 *
		 * @type {Array}
		 */
		list: {
			type: Array,
			required: true,
		},
		/** Maximum nesting depth that may gain children (one level: index → detail). */
		maxDepth: {
			type: Number,
			default: 1,
		},
		/**
		 * The working manifest's `menu[]`, used to re-point menu links (whose
		 * `route` is a page id) when a page's slug is renamed. Optional — when
		 * absent, only child `parent` references are cascaded.
		 *
		 * @type {Array}
		 */
		menu: {
			type: Array,
			default: null,
		},
	},

	data() {
		return {
			// Local nested mirror of `list` (real page refs) that vuedraggable
			// reorders; flattened back to `list` after each drop.
			tree: this.buildTree(),
			// Shared drag group so rows move between the top list and child lists.
			group: 'cn-pages',
			// Guard against the `list` watcher rebuilding the tree during our own
			// flatten (which would discard the just-dropped arrangement).
			suppressRebuild: false,
		}
	},

	watch: {
		list: {
			handler() {
				if (this.suppressRebuild) return
				this.tree = this.buildTree()
			},
			deep: false,
		},
	},

	methods: {
		t,
		/**
		 * Stable render key for a page's `<li>`, tied to the page object rather
		 * than its `id`. Renaming a slug mutates `id` in place; keying by `id`
		 * would change the key and tear the row down, closing its open settings
		 * panel. Keyed by the ref (via WeakMap) so it survives renames and tree
		 * rebuilds (which reuse the same page objects).
		 *
		 * @param {object} ref The page object.
		 * @return {string} A stable key for this page.
		 */
		nodeKey(ref) {
			let key = pageKeys.get(ref)
			if (!key) {
				key = `cn-page-${++pageKeySeq}`
				pageKeys.set(ref, key)
			}
			return key
		},
		/**
		 * Bubble a row's "Go to page" request up to the modal, which navigates.
		 *
		 * @param {string} route The route path to open.
		 * @return {void}
		 */
		bubbleNavigate(route) {
			/**
			 * @event navigate Emitted when a row's "Go to page" button is used.
			 * @type {string} The route path to open.
			 */
			this.$emit('navigate', route)
		},
		/**
		 * Build the nested mirror from the flat `list`: top-level pages (no
		 * `parent`) each carry their children (`parent === id`). Pages whose
		 * `parent` doesn't resolve to a top page are surfaced as top (no orphans).
		 *
		 * @return {Array<{ref: object, children: Array}>}
		 */
		buildTree() {
			const list = Array.isArray(this.list) ? this.list : []
			const topIds = new Set(list.filter((p) => p && !p.parent).map((p) => p.id))
			const childrenByParent = {}
			const top = []
			for (const p of list) {
				if (!p) continue
				if (p.parent && topIds.has(p.parent)) {
					(childrenByParent[p.parent] || (childrenByParent[p.parent] = [])).push(p)
				} else {
					top.push(p)
				}
			}
			return top.map((ref) => ({
				ref,
				children: (childrenByParent[ref.id] || []).map((c) => ({ ref: c, children: [] })),
			}))
		},

		/**
		 * Flatten the mirror back onto `list` in place: top nodes drop `parent`,
		 * nested nodes get `parent = <top id>`, preserving array order.
		 *
		 * @return {void}
		 */
		flatten() {
			const flat = []
			for (const node of this.tree) {
				if (node.ref.parent) delete node.ref.parent
				flat.push(node.ref)
				for (const child of node.children) {
					child.ref.parent = node.ref.id
					flat.push(child.ref)
				}
			}
			this.suppressRebuild = true
			// In-place edit by design — `list` is the working manifest's pages[],
			// mutated by reference so diffManifest captures the reorder/nesting.
			// eslint-disable-next-line vue/no-mutating-props
			this.list.splice(0, this.list.length, ...flat)
			this.$nextTick(() => { this.suppressRebuild = false })
		},

		/**
		 * vuedraggable guard: forbid dropping a node that HAS children into a
		 * child list (that would nest two levels deep). `relatedContext.list` is
		 * the destination array — anything other than the top `tree` is a child
		 * list.
		 *
		 * @param {object} evt The vuedraggable move event.
		 * @return {boolean} False to veto the move.
		 */
		onMove(evt) {
			const dragged = evt.draggedContext && evt.draggedContext.element
			const target = evt.relatedContext && evt.relatedContext.list
			const intoChild = target && target !== this.tree
			if (intoChild && dragged && Array.isArray(dragged.children) && dragged.children.length) {
				return false
			}
			return true
		},

		/**
		 * Generate a unique `page-N` id not already used in `list`.
		 * @return {string}
		 */
		nextId() {
			const ids = new Set(this.list.map((p) => p && p.id))
			let n = this.list.length + 1
			while (ids.has(`page-${n}`)) n++
			return `page-${n}`
		},

		/**
		 * Rename a page's slug (its id). Cascades the new id to child pages'
		 * `parent` and to any `menu[]` links whose `route` targets the old id, so
		 * nesting and navigation keep working. No-op when the new id collides with
		 * another page. The page id is the vue-router route name.
		 * @param {object} ref The page being renamed (mutated in place).
		 * @param {string} newId The sanitised new id.
		 * @return {void}
		 */
		renamePage(ref, newId) {
			const oldId = ref.id
			if (!newId || newId === oldId) return
			if (this.list.some((p) => p && p.id === newId)) return
			for (const p of this.list) {
				if (p && p.parent === oldId) p.parent = newId
			}
			if (Array.isArray(this.menu)) {
				const walk = (items) => (items || []).forEach((it) => {
					if (!it) return
					if (it.route === oldId) it.route = newId
					walk(it.children)
				})
				walk(this.menu)
			}
			ref.id = newId
			this.flatten()
			this.tree = this.buildTree()
		},

		/**
		 * Append a detail sub-page under a top node (route built from the parent).
		 * @param {object} node The parent tree node.
		 * @return {void}
		 */
		addChild(node) {
			const base = String(node.ref.route || '').replace(/\/+$/, '')
			const ref = { id: this.nextId(), parent: node.ref.id, type: 'detail', route: `${base}/:id`, title: '', config: {} }
			node.children.push({ ref, children: [] })
			this.flatten()
		},

		/**
		 * Remove a node. A removed top node's children are lifted to top level so
		 * none orphan.
		 * @param {object} node The node to remove.
		 * @param {object|null} parent The parent node, or null for a top node.
		 * @return {void}
		 */
		removeNode(node, parent) {
			if (parent) {
				const i = parent.children.indexOf(node)
				if (i !== -1) parent.children.splice(i, 1)
			} else {
				const i = this.tree.indexOf(node)
				if (i !== -1) this.tree.splice(i, 1, ...node.children)
			}
			this.flatten()
		},
	},
}
</script>

<style scoped>
.cn-page-tree {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-page-tree__children {
	list-style: none;
	margin: 4px 0 0 28px;
	padding: 0 0 0 8px;
	border-left: 2px solid var(--color-border);
	display: flex;
	flex-direction: column;
	gap: 4px;
}

/* Keep an empty child list as a visible drop target for nesting. */
.cn-page-tree__children--empty {
	min-height: 10px;
	margin-top: 0;
	border-left-color: transparent;
}

.cn-page-tree__node {
	list-style: none;
}
</style>
