<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<ul class="cn-menu-tree" :class="{ 'cn-menu-tree--child': depth > 0 }">
		<li v-for="(item, index) in sortedSiblings" :key="keyOf(item, index)" class="cn-menu-tree__node">
			<div class="cn-menu-tree__row">
				<span class="cn-menu-tree__icon" :class="iconClass(item)" aria-hidden="true" />
				<span class="cn-menu-tree__label" :title="item.route || ''">
					{{ item.label || t('nextcloud-vue', '(untitled)') }}
				</span>

				<div class="cn-menu-tree__actions">
					<NcButton
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Edit menu item')"
						:pressed="isOpen(item, index)"
						@click="toggle(item, index)">
						<template #icon><Cog :size="18" /></template>
					</NcButton>
					<NcButton
						v-if="depth < maxDepth"
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Add sub-item')"
						@click="addChild(item)">
						<template #icon><Plus :size="18" /></template>
					</NcButton>
					<NcButton
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Move up')"
						:disabled="index === 0"
						@click="move(item, -1)">
						<template #icon><ArrowUp :size="18" /></template>
					</NcButton>
					<NcButton
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Move down')"
						:disabled="index === sortedSiblings.length - 1"
						@click="move(item, 1)">
						<template #icon><ArrowDown :size="18" /></template>
					</NcButton>
					<NcButton
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Remove')"
						@click="remove(item)">
						<template #icon><Delete :size="18" /></template>
					</NcButton>
				</div>
			</div>

			<!-- Per-item editor, revealed by the cog. -->
			<div v-if="isOpen(item, index)" class="cn-menu-tree__editor">
				<NcTextField
					:value.sync="item.label"
					:label="t('nextcloud-vue', 'Label')"
					:label-visible="true" />
				<NcTextField
					:value.sync="item.icon"
					:label="t('nextcloud-vue', 'Icon')"
					:label-visible="true" />
				<NcTextField
					:value.sync="item.route"
					:label="t('nextcloud-vue', 'Route')"
					:label-visible="true" />
			</div>

			<!-- Nested children (recursive). -->
			<CnMenuTreeNode
				v-if="Array.isArray(item.children) && item.children.length"
				:list="item.children"
				:depth="depth + 1"
				:max-depth="maxDepth" />
		</li>
	</ul>
</template>

<script>
import { NcButton, NcTextField } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'

/**
 * CnMenuTreeNode — recursive tree row for the menu editor (ADR-041).
 *
 * Renders one sibling list of `menu[]` entries as compact rows (icon + label)
 * with a per-item **edit cog** that reveals the item's Label / Icon / Route
 * fields, plus reorder, delete, and add-sub-item. Children render via the same
 * component one level deeper. Mutates the passed `list` (and each item's
 * `children`) IN PLACE — the array is the working manifest's, by reference, so
 * `diffManifest` captures every change without any extra plumbing.
 */
export default {
	name: 'CnMenuTreeNode',

	components: { NcButton, NcTextField, Cog, Plus, Delete, ArrowUp, ArrowDown },

	props: {
		/**
		 * The sibling list to render (the working manifest's `menu[]` at the
		 * root, or an item's `children[]` deeper down). Edited in place.
		 *
		 * @type {Array}
		 */
		list: {
			type: Array,
			required: true,
		},
		/** Nesting depth (0 = top-level). Controls indentation + add-sub-item. */
		depth: {
			type: Number,
			default: 0,
		},
		/** Maximum nesting depth that may gain children (CnAppNav supports one level). */
		maxDepth: {
			type: Number,
			default: 1,
		},
	},

	data() {
		return {
			// Keys (id||index) of rows whose editor is currently open.
			openKeys: [],
		}
	},

	computed: {
		/** Siblings in nav order: `order` ascending, array index as tiebreak. */
		sortedSiblings() {
			return this.list
				.map((item, index) => ({ item, index }))
				.sort((a, b) => {
					const oa = typeof a.item.order === 'number' ? a.item.order : a.index
					const ob = typeof b.item.order === 'number' ? b.item.order : b.index
					return oa === ob ? a.index - b.index : oa - ob
				})
				.map((e) => e.item)
		},
	},

	methods: {
		t,

		/** Stable-ish key for v-for + open tracking. */
		keyOf(item, index) {
			return item.id || `idx-${index}`
		},

		/** Whether this row's editor is open. */
		isOpen(item, index) {
			return this.openKeys.includes(this.keyOf(item, index))
		},

		/** Toggle this row's editor. */
		toggle(item, index) {
			const key = this.keyOf(item, index)
			const at = this.openKeys.indexOf(key)
			if (at === -1) this.openKeys.push(key)
			else this.openKeys.splice(at, 1)
		},

		/** Render an `icon-*` NC class as a glyph; non-class icons get a generic dot. */
		iconClass(item) {
			return typeof item.icon === 'string' && item.icon.startsWith('icon-')
				? item.icon
				: 'cn-menu-tree__icon--generic'
		},

		/** Reorder within this sibling list by renumbering `order` sequentially. */
		move(item, delta) {
			const sorted = this.sortedSiblings
			const idx = sorted.indexOf(item)
			const to = idx + delta
			if (to < 0 || to >= sorted.length) return
			const reordered = [...sorted]
			reordered.splice(idx, 1)
			reordered.splice(to, 0, item)
			reordered.forEach((it, i) => { this.$set(it, 'order', (i + 1) * 10) })
		},

		/** Remove an item from this sibling list. */
		remove(item) {
			const i = this.list.indexOf(item)
			if (i !== -1) this.list.splice(i, 1)
		},

		/** Append a blank child under an item (creating `children` if needed). */
		addChild(item) {
			if (!Array.isArray(item.children)) this.$set(item, 'children', [])
			const maxOrder = item.children.reduce((m, c) => Math.max(m, typeof c.order === 'number' ? c.order : 0), 0)
			item.children.push({
				id: `menu-${item.id || 'child'}-${item.children.length + 1}`,
				label: '',
				icon: '',
				route: '',
				order: maxOrder + 10,
			})
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

.cn-menu-tree--child {
	margin-left: 28px;
	margin-top: 4px;
	border-left: 2px solid var(--color-border);
	padding-left: 8px;
}

.cn-menu-tree__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 6px;
	border-radius: var(--border-radius);
}

.cn-menu-tree__row:hover {
	background: var(--color-background-hover);
}

.cn-menu-tree__icon {
	width: 20px;
	height: 20px;
	flex-shrink: 0;
	background-size: 16px;
	background-position: center;
	background-repeat: no-repeat;
	opacity: 0.7;
}

.cn-menu-tree__icon--generic {
	border-radius: 50%;
	background: var(--color-border-dark);
}

.cn-menu-tree__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}

.cn-menu-tree__actions {
	display: flex;
	gap: 0;
	flex-shrink: 0;
}

.cn-menu-tree__editor {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	padding: 8px 6px 12px 28px;
}

.cn-menu-tree__editor > * {
	flex: 1 1 160px;
}
</style>
