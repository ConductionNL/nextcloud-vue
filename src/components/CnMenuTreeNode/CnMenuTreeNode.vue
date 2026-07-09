<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<draggable v-model="tree"
		tag="ul"
		class="cn-menu-tree"
		:group="group"
		handle=".cn-menu-tree__handle"
		:move="onMove"
		@end="flatten">
		<li v-for="node in tree" :key="keyOf(node)" class="cn-menu-tree__node">
			<CnMenuTreeRow :item="node.ref"
				:pages="pages"
				:can-add-child="maxDepth > 0"
				@add-child="addChild(node)"
				@remove="removeNode(node, null)" />

			<!-- One level of children: a drop target on every top item. -->
			<draggable v-if="maxDepth > 0"
				v-model="node.children"
				tag="ul"
				class="cn-menu-tree__children"
				:class="{ 'cn-menu-tree__children--empty': !node.children.length }"
				:group="group"
				handle=".cn-menu-tree__handle"
				:move="onMove"
				@end="flatten">
				<li v-for="child in node.children" :key="keyOf(child)" class="cn-menu-tree__node">
					<CnMenuTreeRow :item="child.ref"
						:pages="pages"
						:can-add-child="false"
						@remove="removeNode(child, node)" />
				</li>
			</draggable>
		</li>
	</draggable>
</template>

<script>
import draggable from 'vuedraggable'
import { translate as t } from '@nextcloud/l10n'
import CnMenuTreeRow from './CnMenuTreeRow.vue'

/**
 * CnMenuTreeNode — the menu editor's drag-and-drop tree (ADR-041).
 *
 * Renders the working manifest's `menu[]` (nested via each item's `children[]`)
 * as a two-level draggable tree: drag a row to reorder, or into / out of an item
 * to nest (one level — CnAppNav supports one). Each row (CnMenuTreeRow) edits its
 * icon / label / target page inline + Delete via a cog. Drag operates on a local
 * mirror (`tree`) of real item refs; after each drop the mirror is FLATTENED back
 * onto `menu[]` in place — `order` renumbered to match the visual order, the
 * top-level `section` marker set/cleared, and each item's `children[]` rebuilt —
 * so `diffManifest` sees the change. Field edits mutate the real refs directly.
 *
 * The top level is scoped by `section`: the main-menu editor shows non-settings
 * items, the settings-menu editor shows `section: "settings"` items; flatten
 * preserves the other section's items untouched.
 */
export default {
	name: 'CnMenuTreeNode',

	components: { draggable, CnMenuTreeRow },

	props: {
		/**
		 * The working manifest's `menu[]` (top-level items; children live in each
		 * item's `children[]`). Edited in place.
		 *
		 * @type {Array}
		 */
		list: {
			type: Array,
			required: true,
		},
		/** Maximum nesting depth that may gain children (CnAppNav supports one level). */
		maxDepth: {
			type: Number,
			default: 1,
		},
		/**
		 * Selectable target pages as `{ value: routeName, label }` options,
		 * forwarded to every row's Page picker.
		 *
		 * @type {Array<{value: string, label: string}>}
		 */
		pages: {
			type: Array,
			default: () => [],
		},
		/**
		 * Which nav section this editor scopes to at the top level
		 * (`"settings"` shows only the gear-foldout items; anything else shows
		 * the non-settings items). Flatten preserves the other section.
		 *
		 * @type {string|null}
		 */
		section: {
			type: String,
			default: null,
		},
	},

	data() {
		return {
			// Local nested mirror of the section's items (real refs); flattened
			// back to `list` after each drop.
			tree: this.buildTree(),
			// Per-section drag group (main + settings editors never inter-drag).
			group: 'cn-menu-' + (this.section || 'main'),
			// Guard against the watcher rebuilding mid-flatten.
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
		section() {
			this.tree = this.buildTree()
		},
	},

	methods: {
		t,
		/**
		 * Stable-ish v-for key for a node.
		 * @param {object} node The tree node.
		 * @return {string}
		 */
		keyOf(node) {
			return (node.ref && node.ref.id) || String(node._k || (node._k = Math.random()))
		},

		/** Whether this editor scopes to the settings section. */
		wantSettings() {
			return this.section === 'settings'
		},

		/**
		 * Order comparator: numeric `order` ascending, array index as tiebreak.
		 * @param {Array} arr The array being sorted (for index tiebreak).
		 * @return {Function}
		 */
		byOrder(arr) {
			return (a, b) => {
				const oa = typeof a.order === 'number' ? a.order : arr.indexOf(a)
				const ob = typeof b.order === 'number' ? b.order : arr.indexOf(b)
				return oa - ob
			}
		},

		/**
		 * Build the nested mirror from `list`, scoped to this section and ordered.
		 * @return {Array<{ref: object, children: Array}>}
		 */
		buildTree() {
			const list = Array.isArray(this.list) ? this.list : []
			const wantSettings = this.section === 'settings'
			const top = list
				.filter((it) => it && (it.section === 'settings') === wantSettings)
				.slice()
				.sort(this.byOrder(list))
			return top.map((ref) => {
				const kids = Array.isArray(ref.children) ? ref.children.slice().sort(this.byOrder(ref.children)) : []
				return { ref, children: kids.map((c) => ({ ref: c, children: [] })) }
			})
		},

		/**
		 * Flatten the mirror back onto `list` in place: renumber `order`, set/clear
		 * the top-level `section` marker, rebuild each item's `children[]`, and
		 * preserve the other section's items.
		 * @return {void}
		 */
		flatten() {
			const wantSettings = this.section === 'settings'
			const others = this.list.filter((it) => it && (it.section === 'settings') !== wantSettings)
			const mine = this.tree.map((node, i) => {
				const ref = node.ref
				this.$set(ref, 'order', (i + 1) * 10)
				if (wantSettings) this.$set(ref, 'section', 'settings')
				else this.$delete(ref, 'section')
				if (node.children.length) {
					this.$set(ref, 'children', node.children.map((cn, j) => {
						this.$set(cn.ref, 'order', (j + 1) * 10)
						this.$delete(cn.ref, 'section')
						return cn.ref
					}))
				} else {
					this.$delete(ref, 'children')
				}
				return ref
			})
			const next = wantSettings ? [...others, ...mine] : [...mine, ...others]
			this.suppressRebuild = true
			// In-place edit by design — `list` is the working manifest's menu[],
			// mutated by reference so diffManifest captures the reorder/nesting.
			// eslint-disable-next-line vue/no-mutating-props
			this.list.splice(0, this.list.length, ...next)
			this.$nextTick(() => { this.suppressRebuild = false })
		},

		/**
		 * vuedraggable guard: forbid dropping a node that HAS children into a
		 * child list (would nest two levels deep).
		 * @param {object} evt The vuedraggable move event.
		 * @return {boolean} False to veto.
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
		 * Generate a unique `menu-N` id not already used at any level of `list`.
		 * @return {string}
		 */
		nextId() {
			const ids = new Set()
			const walk = (arr) => (arr || []).forEach((it) => { if (it) { ids.add(it.id); walk(it.children) } })
			walk(this.list)
			let n = ids.size + 1
			while (ids.has(`menu-${n}`)) n++
			return `menu-${n}`
		},

		/**
		 * Append a blank child under a top node.
		 * @param {object} node The parent tree node.
		 * @return {void}
		 */
		addChild(node) {
			const ref = { id: this.nextId(), label: '', icon: '', route: '' }
			node.children.push({ ref, children: [] })
			this.flatten()
		},

		/**
		 * Remove a node. A removed top node's children are lifted to top level.
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
.cn-menu-tree {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-menu-tree__children {
	list-style: none;
	margin: 4px 0 0 28px;
	padding: 0 0 0 8px;
	border-left: 2px solid var(--color-border);
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-menu-tree__children--empty {
	min-height: 10px;
	margin-top: 0;
	border-left-color: transparent;
}

.cn-menu-tree__node {
	list-style: none;
}
</style>
