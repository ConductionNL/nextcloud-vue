<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-menu-tree__row">
		<span class="cn-menu-tree__handle" :aria-label="t('nextcloud-vue', 'Drag to reorder or nest')">
			<DragVertical :size="18" />
		</span>

		<!-- Icon: click to pick inline. -->
		<NcSelect v-if="editing === 'icon'"
			class="cn-menu-tree__inline-select"
			:value="selectedIcon"
			:options="iconOptions"
			:input-label="t('nextcloud-vue', 'Icon')"
			label="label"
			:clearable="true"
			@input="onIcon"
			@close="stopEdit">
			<template #option="opt">
				<span class="cn-menu-tree__icon-opt"><span class="cn-menu-tree__icon-glyph" :class="opt.value" aria-hidden="true" />{{ opt.label }}</span>
			</template>
			<template #selected-option="opt">
				<span class="cn-menu-tree__icon-opt"><span class="cn-menu-tree__icon-glyph" :class="opt.value" aria-hidden="true" />{{ opt.label }}</span>
			</template>
		</NcSelect>
		<button v-else
			type="button"
			class="cn-menu-tree__icon-btn"
			:aria-label="t('nextcloud-vue', 'Change icon')"
			@click="startEdit('icon')">
			<span class="cn-menu-tree__icon" :class="iconClass" aria-hidden="true" />
		</button>

		<!-- Label: click to edit inline. -->
		<NcTextField v-if="editing === 'label'"
			ref="labelField"
			class="cn-menu-tree__inline-field"
			:value="item.label || ''"
			:label="t('nextcloud-vue', 'Label')"
			:label-outside="true"
			@update:value="setLabel"
			@keydown.enter="stopEdit"
			@blur="stopEdit" />
		<button v-else
			type="button"
			class="cn-menu-tree__label cn-menu-tree__label--btn"
			:title="item.route || ''"
			@click="startEdit('label')">
			{{ item.label || t('nextcloud-vue', '(untitled)') }}
		</button>

		<!-- Target page: click to change inline. -->
		<NcSelect v-if="editing === 'page'"
			class="cn-menu-tree__inline-select"
			:value="selectedPage"
			:options="pages"
			:input-label="t('nextcloud-vue', 'Page')"
			label="label"
			:clearable="true"
			:placeholder="pages.length ? t('nextcloud-vue', 'Pick a page') : t('nextcloud-vue', 'No pages')"
			@input="onPage"
			@close="stopEdit" />
		<button v-else
			type="button"
			class="cn-menu-tree__page cn-menu-tree__page--btn"
			@click="startEdit('page')">
			{{ pageLabel }}
		</button>

		<!-- Cog → actions popover (add sub-item + delete). -->
		<NcPopover :shown.sync="popoverOpen" :focus-trap="false">
			<template #trigger="{ attrs }">
				<NcButton v-bind="attrs"
					type="tertiary"
					:aria-label="t('nextcloud-vue', 'Menu item settings')">
					<template #icon>
						<Cog :size="18" />
					</template>
				</NcButton>
			</template>
			<div class="cn-menu-tree__config">
				<NcButton v-if="canAddChild"
					type="tertiary"
					@click="$emit('add-child')">
					<template #icon>
						<Plus :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Add sub-item') }}
				</NcButton>
				<NcButton type="tertiary"
					@click="$emit('remove')">
					<template #icon>
						<Delete :size="18" />
					</template>
					{{ t('nextcloud-vue', 'Delete item') }}
				</NcButton>
			</div>
		</NcPopover>
	</div>
</template>

<script>
import { NcButton, NcTextField, NcSelect, NcPopover } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { NEXTCLOUD_ICONS } from './nextcloudIcons.js'
import Cog from 'vue-material-design-icons/Cog.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'

/**
 * CnMenuTreeRow — one editable menu-item row for CnMenuTreeNode (ADR-041).
 *
 * Renders a menu entry as a compact row with INLINE editing — click the icon to
 * pick a new one, click the label to rename, click the target page to re-point
 * it — and a cog that opens an actions popover (Add sub-item + Delete).
 * Reordering and nesting are done by dragging the row (handled by the parent
 * CnMenuTreeNode). The item is mutated IN PLACE (it is the working manifest's, by
 * reference) so `diffManifest` captures every field change; structural actions
 * are emitted.
 */
export default {
	name: 'CnMenuTreeRow',

	components: { NcButton, NcTextField, NcSelect, NcPopover, Cog, Plus, Delete, DragVertical },

	props: {
		/**
		 * The menu item (an element of the working manifest's `menu[]` or a
		 * `children[]`), mutated in place.
		 *
		 * @type {object}
		 */
		item: {
			type: Object,
			required: true,
		},
		/**
		 * Selectable target pages as `{ value: routeName, label }` options.
		 *
		 * @type {Array<{value: string, label: string}>}
		 */
		pages: {
			type: Array,
			default: () => [],
		},
		/** Whether this row may gain a sub-item (top level only). */
		canAddChild: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			// Which field is in inline-edit mode: null | 'icon' | 'label' | 'page'.
			editing: null,
			// Whether the actions popover is open.
			popoverOpen: false,
		}
	},

	computed: {
		/** Nextcloud icon options for the icon dropdown. */
		iconOptions() {
			return NEXTCLOUD_ICONS
		},
		/** Render an `icon-*` class as a glyph; anything else gets a generic dot. */
		iconClass() {
			return typeof this.item.icon === 'string' && this.item.icon.startsWith('icon-')
				? this.item.icon
				: 'cn-menu-tree__icon--generic'
		},
		/** The chosen icon as an option (synthetic fallback for a custom value). */
		selectedIcon() {
			const icon = this.item && this.item.icon
			if (!icon) return null
			return this.iconOptions.find((o) => o.value === icon) || { value: icon, label: icon }
		},
		/** The chosen target page as an option (synthetic fallback for a custom route). */
		selectedPage() {
			const route = this.item && this.item.route
			if (!route) return null
			return this.pages.find((o) => o.value === route) || { value: route, label: route }
		},
		/** Human label for the current target page (falls back to the raw route). */
		pageLabel() {
			const sel = this.selectedPage
			return sel ? sel.label : this.t('nextcloud-vue', 'No page')
		},
	},

	methods: {
		t,
		/**
		 * Enter inline-edit mode for a field, focusing the label input when relevant.
		 * @param {string} field 'icon' | 'label' | 'page'.
		 * @return {void}
		 */
		startEdit(field) {
			this.editing = field
			if (field === 'label') {
				this.$nextTick(() => {
					const el = this.$refs.labelField && this.$refs.labelField.$el && this.$refs.labelField.$el.querySelector('input')
					if (el) el.focus()
				})
			}
		},
		/** Leave inline-edit mode. */
		stopEdit() {
			this.editing = null
		},
		/**
		 * Write the item label in place.
		 * @param {string} value The new label.
		 * @return {void}
		 */
		setLabel(value) {
			this.$set(this.item, 'label', value)
		},
		/**
		 * Set the item icon and leave edit mode.
		 * @param {{value: string}|null} option The selected icon option.
		 * @return {void}
		 */
		onIcon(option) {
			this.$set(this.item, 'icon', option ? option.value : '')
			this.stopEdit()
		},
		/**
		 * Set the item's target page (route name) and leave edit mode.
		 * @param {{value: string}|null} option The selected page option.
		 * @return {void}
		 */
		onPage(option) {
			this.$set(this.item, 'route', option ? option.value : '')
			this.stopEdit()
		},
	},
}
</script>

<style scoped>
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

.cn-menu-tree__handle {
	display: inline-flex;
	align-items: center;
	cursor: grab;
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
}

.cn-menu-tree__icon-btn {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	flex-shrink: 0;
}

.cn-menu-tree__icon {
	display: inline-block;
	width: 20px;
	height: 20px;
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

.cn-menu-tree__label--btn {
	background: none;
	border: none;
	text-align: left;
	cursor: text;
	font: inherit;
	color: inherit;
	padding: 4px;
	border-radius: var(--border-radius);
}

.cn-menu-tree__label--btn:hover {
	background: var(--color-background-dark);
}

.cn-menu-tree__page {
	flex-shrink: 0;
	font-size: 0.8em;
	color: var(--color-text-maxcontrast);
}

.cn-menu-tree__page--btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px 6px;
	border-radius: var(--border-radius);
}

.cn-menu-tree__page--btn:hover {
	background: var(--color-background-dark);
}

.cn-menu-tree__inline-field {
	flex: 1 1 auto;
}

.cn-menu-tree__inline-select {
	min-width: 160px;
	flex-shrink: 0;
}

.cn-menu-tree__config {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 10px;
	min-width: 180px;
}

.cn-menu-tree__icon-opt {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.cn-menu-tree__icon-glyph {
	display: inline-block;
	width: 16px;
	height: 16px;
	background-size: 16px;
	background-position: center;
	background-repeat: no-repeat;
	opacity: 0.8;
}
</style>
