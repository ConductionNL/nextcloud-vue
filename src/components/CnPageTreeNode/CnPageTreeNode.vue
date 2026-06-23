<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<ul class="cn-page-tree" :class="{ 'cn-page-tree--child': depth > 0 }">
		<li v-for="(page, index) in siblings" :key="page.id || index" class="cn-page-tree__node">
			<div class="cn-page-tree__row">
				<span class="cn-page-tree__icon" :class="typeIcon(page)" aria-hidden="true" />
				<span class="cn-page-tree__label" :title="effectiveRoute(page)">
					{{ page.title || page.id || t('nextcloud-vue', '(untitled)') }}
				</span>
				<span class="cn-page-tree__type">{{ typeLabel(page) }}</span>

				<div class="cn-page-tree__actions">
					<NcButton type="tertiary"
						:aria-label="t('nextcloud-vue', 'Edit page')"
						:pressed="isOpen(page, index)"
						@click="toggle(page, index)">
						<template #icon>
							<Cog :size="18" />
						</template>
					</NcButton>
					<NcButton v-if="depth < maxDepth"
						type="tertiary"
						:aria-label="t('nextcloud-vue', 'Add sub-page')"
						@click="addChild(page)">
						<template #icon>
							<Plus :size="18" />
						</template>
					</NcButton>
					<NcButton type="tertiary"
						:aria-label="t('nextcloud-vue', 'Move up')"
						:disabled="index === 0"
						@click="move(page, -1)">
						<template #icon>
							<ArrowUp :size="18" />
						</template>
					</NcButton>
					<NcButton type="tertiary"
						:aria-label="t('nextcloud-vue', 'Move down')"
						:disabled="index === siblings.length - 1"
						@click="move(page, 1)">
						<template #icon>
							<ArrowDown :size="18" />
						</template>
					</NcButton>
					<NcButton type="tertiary"
						:aria-label="t('nextcloud-vue', 'Remove')"
						@click="remove(page)">
						<template #icon>
							<Delete :size="18" />
						</template>
					</NcButton>
				</div>
			</div>

			<!-- Per-page editor, revealed by the cog. -->
			<div v-if="isOpen(page, index)" class="cn-page-tree__editor">
				<NcTextField
					:value.sync="page.title"
					:label="t('nextcloud-vue', 'Title')"
					:label-visible="true" />
				<NcSelect
					class="cn-page-tree__field"
					:value="selectedType(page)"
					:options="pageTypes"
					:input-label="t('nextcloud-vue', 'Type')"
					label="label"
					:clearable="false"
					@input="setType(page, $event)" />
				<NcSelect
					v-if="depth === 0 || parentOptions(page).length"
					class="cn-page-tree__field"
					:value="selectedParent(page)"
					:options="parentOptions(page)"
					:input-label="t('nextcloud-vue', 'Parent page')"
					label="label"
					:clearable="true"
					:placeholder="t('nextcloud-vue', 'Top level')"
					@input="setParent(page, $event)" />
				<NcTextField
					:value.sync="page.route"
					:label="t('nextcloud-vue', 'Route')"
					:label-visible="true"
					:placeholder="'/example'" />
				<span class="cn-page-tree__id" :title="t('nextcloud-vue', 'Route name (used by menu links)')">
					{{ page.id }}
				</span>
			</div>

			<!-- Child pages (those whose parent is this page). -->
			<CnPageTreeNode
				v-if="depth < maxDepth && childrenOf(page).length"
				:list="list"
				:parent-id="page.id"
				:depth="depth + 1"
				:max-depth="maxDepth" />
		</li>
	</ul>
</template>

<script>
import { NcButton, NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'

// The renderer's closed page-type enum (CnPageRenderer dispatches on these).
const PAGE_TYPES = [
	{ value: 'dashboard', label: 'Dashboard' },
	{ value: 'index', label: 'Index (list)' },
	{ value: 'detail', label: 'Detail' },
	{ value: 'custom', label: 'Custom' },
]

const TYPE_ICONS = {
	dashboard: 'icon-dashboard',
	index: 'icon-toggle-filelist',
	detail: 'icon-details',
	custom: 'icon-settings',
}

/**
 * CnPageTreeNode — recursive tree row for the pages editor (ADR-041).
 *
 * Renders the manifest's `pages[]` as compact rows (icon + title + type) with a
 * per-page **edit cog** that reveals Title / Type / Parent / Route, plus
 * reorder, delete and add-sub-page. The hierarchy is derived from each page's
 * `parent` field (the parent page's id) — top-level pages render first, and a
 * page's children (`parent === page.id`) render nested one level deeper, so an
 * index and its detail visually correlate and the route can build up from the
 * parent's. Mutates the passed flat `list` (the working manifest's `pages[]`)
 * IN PLACE so `diffManifest` captures every change.
 */
export default {
	name: 'CnPageTreeNode',

	components: { NcButton, NcTextField, NcSelect, Cog, Plus, Delete, ArrowUp, ArrowDown },

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
		/** Render the pages whose parent is this id (`''` = top level). */
		parentId: {
			type: String,
			default: '',
		},
		/** Nesting depth (0 = top-level). */
		depth: {
			type: Number,
			default: 0,
		},
		/** Maximum nesting depth that may gain children (one level: index → detail). */
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
		/** Closed page-type options for the Type dropdown. */
		pageTypes() {
			return PAGE_TYPES
		},
		/** The pages at this level — those whose parent matches `parentId`, in array order. */
		siblings() {
			return this.list.filter((p) => p && (p.parent || '') === this.parentId)
		},
	},

	methods: {
		t,
		/**
		 * Stable-ish key for v-for + open tracking.
		 * @param {object} page The page.
		 * @param {number} index Position within the sibling list.
		 * @return {string}
		 */
		keyOf(page, index) {
			return page.id || `idx-${index}`
		},
		/**
		 * Whether this row's editor is open.
		 * @param {object} page The page.
		 * @param {number} index Position within the sibling list.
		 * @return {boolean}
		 */
		isOpen(page, index) {
			return this.openKeys.includes(this.keyOf(page, index))
		},
		/**
		 * Toggle this row's editor.
		 * @param {object} page The page.
		 * @param {number} index Position within the sibling list.
		 * @return {void}
		 */
		toggle(page, index) {
			const key = this.keyOf(page, index)
			const at = this.openKeys.indexOf(key)
			if (at === -1) this.openKeys.push(key)
			else this.openKeys.splice(at, 1)
		},
		/**
		 * Child pages of a page (those whose `parent` is its id).
		 * @param {object} page The page.
		 * @return {Array}
		 */
		childrenOf(page) {
			return this.list.filter((p) => p && p.parent === page.id)
		},
		/**
		 * The `icon-*` glyph class for a page's type.
		 * @param {object} page The page.
		 * @return {string}
		 */
		typeIcon(page) {
			return TYPE_ICONS[page && page.type] || TYPE_ICONS.custom
		},
		/**
		 * Human label for a page's type.
		 * @param {object} page The page.
		 * @return {string}
		 */
		typeLabel(page) {
			const opt = PAGE_TYPES.find((o) => o.value === (page && page.type))
			return opt ? opt.label : (page && page.type) || 'custom'
		},
		/**
		 * The route a page resolves to (echoed in the row title attribute).
		 * @param {object} page The page.
		 * @return {string}
		 */
		effectiveRoute(page) {
			return (page && page.route) || ''
		},
		/**
		 * Resolve a page's type to its option (synthetic fallback for unknown values).
		 * @param {object} page The page.
		 * @return {{value: string, label: string}}
		 */
		selectedType(page) {
			const type = (page && page.type) || 'custom'
			return PAGE_TYPES.find((o) => o.value === type) || { value: type, label: type }
		},
		/**
		 * Write the chosen type onto the page in place.
		 * @param {object} page The page.
		 * @param {{value: string}|null} option The selected option.
		 * @return {void}
		 */
		setType(page, option) {
			this.$set(page, 'type', option ? option.value : 'custom')
		},
		/**
		 * Eligible parent pages for a page: top-level pages (so nesting stays one
		 * level) other than itself. Mapped to `{ value: id, label }` options.
		 * @param {object} page The page being edited.
		 * @return {Array<{value: string, label: string}>}
		 */
		parentOptions(page) {
			return this.list
				.filter((p) => p && p.id && p.id !== page.id && !(p.parent))
				.map((p) => ({ value: p.id, label: (typeof p.title === 'string' && p.title) ? p.title : p.id }))
		},
		/**
		 * Resolve a page's current parent to its option (null when top level).
		 * @param {object} page The page.
		 * @return {{value: string, label: string}|null}
		 */
		selectedParent(page) {
			const parent = page && page.parent
			if (!parent) return null
			const target = this.list.find((p) => p && p.id === parent)
			return { value: parent, label: (target && target.title) || parent }
		},
		/**
		 * Set a page's parent and build its route up from the parent's. Clearing
		 * the parent makes it top level (route reduced to its own last segment).
		 * @param {object} page The page (mutated in place).
		 * @param {{value: string}|null} option The selected parent option.
		 * @return {void}
		 */
		setParent(page, option) {
			const parentId = option ? option.value : ''
			this.$set(page, 'parent', parentId)
			const segment = this.lastSegment(page.route) || (page.id || 'page')
			if (parentId) {
				const parent = this.list.find((p) => p && p.id === parentId)
				const base = parent ? String(parent.route || '').replace(/\/+$/, '') : ''
				this.$set(page, 'route', `${base}/${segment}`)
			} else {
				this.$set(page, 'route', `/${segment}`)
			}
		},
		/**
		 * The last path segment of a route (used to rebuild the route on reparent).
		 * @param {string} route The route path.
		 * @return {string}
		 */
		lastSegment(route) {
			const parts = String(route || '').split('/').filter(Boolean)
			return parts.length ? parts[parts.length - 1] : ''
		},
		/**
		 * Reorder a page among its siblings by swapping positions in the flat list.
		 * @param {object} page The page.
		 * @param {number} delta -1 to move up, +1 to move down.
		 * @return {void}
		 */
		move(page, delta) {
			const sibs = this.siblings
			const pos = sibs.indexOf(page)
			const target = sibs[pos + delta]
			if (!target) return
			const a = this.list.indexOf(page)
			const b = this.list.indexOf(target)
			if (a === -1 || b === -1) return
			// In-place edit by design (see component docblock); `list` is the
			// working manifest's pages[], mutated by reference so diffManifest sees it.
			/* eslint-disable vue/no-mutating-props */
			this.list.splice(a, 1, target)
			this.list.splice(b, 1, page)
			/* eslint-enable vue/no-mutating-props */
		},
		/**
		 * Remove a page; its children are reparented to its parent so none orphan.
		 * @param {object} page The page.
		 * @return {void}
		 */
		remove(page) {
			this.childrenOf(page).forEach((child) => { this.$set(child, 'parent', page.parent || '') })
			const i = this.list.indexOf(page)
			// In-place edit by design (see component docblock).
			// eslint-disable-next-line vue/no-mutating-props
			if (i !== -1) this.list.splice(i, 1)
		},
		/**
		 * Append a detail sub-page under a page (parent set, route built up).
		 * @param {object} page The parent page.
		 * @return {void}
		 */
		addChild(page) {
			let n = this.list.length + 1
			const ids = new Set(this.list.map((p) => p && p.id))
			while (ids.has(`page-${n}`)) n++
			const id = `page-${n}`
			// A detail sub-page defaults to the parent's route + the `:id` route
			// param (a vue-router dynamic segment), e.g. /dogs → /dogs/:id, so the
			// detail opens for a specific record. Edit the Route to rename the
			// param (e.g. /dogs/:dogId) if needed.
			const base = String(page.route || '').replace(/\/+$/, '')
			// In-place edit by design (see component docblock).
			// eslint-disable-next-line vue/no-mutating-props
			this.list.push({ id, parent: page.id, type: 'detail', route: `${base}/:id`, title: '', config: {} })
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

.cn-page-tree--child {
	margin-left: 28px;
	margin-top: 4px;
	border-left: 2px solid var(--color-border);
	padding-left: 8px;
}

.cn-page-tree__row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 6px;
	border-radius: var(--border-radius);
}

.cn-page-tree__row:hover {
	background: var(--color-background-hover);
}

.cn-page-tree__icon {
	width: 20px;
	height: 20px;
	flex-shrink: 0;
	background-size: 16px;
	background-position: center;
	background-repeat: no-repeat;
	opacity: 0.7;
}

.cn-page-tree__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 500;
}

.cn-page-tree__type {
	flex-shrink: 0;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-page-tree__actions {
	display: flex;
	gap: 0;
	flex-shrink: 0;
}

.cn-page-tree__editor {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
	align-items: flex-end;
	padding: 8px 6px 12px 28px;
}

.cn-page-tree__editor > * {
	flex: 1 1 160px;
}

.cn-page-tree__field {
	min-width: 160px;
}

.cn-page-tree__id {
	flex: 0 0 auto;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
	padding-bottom: 8px;
	white-space: nowrap;
}
</style>
