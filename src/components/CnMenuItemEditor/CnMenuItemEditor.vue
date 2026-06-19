<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-menu-item-editor" :style="rowStyle">
		<div class="cn-menu-item-editor__row">
			<span class="cn-menu-item-editor__depth">
				{{ depthLabel }}
			</span>
			<input
				type="text"
				class="cn-menu-item-editor__input"
				:value="item.label"
				:placeholder="t('nextcloud-vue', 'Label')"
				@input="emitFieldChange('label', $event.target.value)">
			<input
				type="text"
				class="cn-menu-item-editor__input"
				:value="item.url"
				:placeholder="t('nextcloud-vue', 'URL')"
				@input="emitFieldChange('url', $event.target.value)">
			<input
				type="text"
				class="cn-menu-item-editor__input cn-menu-item-editor__input--icon"
				:value="item.icon"
				:placeholder="t('nextcloud-vue', 'Icon')"
				@input="emitFieldChange('icon', $event.target.value)">
			<button
				v-if="canAddChildren"
				type="button"
				class="cn-menu-item-editor__btn"
				@click="$emit('add-child', { path })">
				+ {{ t('nextcloud-vue', 'Add Children') }}
			</button>
			<button
				type="button"
				class="cn-menu-item-editor__btn cn-menu-item-editor__btn--danger"
				:title="t('nextcloud-vue', 'Remove Item')"
				@click="$emit('remove-item', { path })">
				✕
			</button>
		</div>
		<div v-if="hasChildren" class="cn-menu-item-editor__children">
			<CnMenuItemEditor
				v-for="(child, idx) in item.children"
				:key="`child-${idx}`"
				:item="child"
				:depth="depth + 1"
				:path="[...path, idx]"
				@update-item="$emit('update-item', $event)"
				@remove-item="$emit('remove-item', $event)"
				@add-child="$emit('add-child', $event)" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnMenuItemEditor — recursive row editor used by the menu widget form. Inline
 * label/url/icon inputs plus per-row "Add Children" and "Remove" actions. The
 * "Add Children" button is hidden once the row reaches depth 3 so the user
 * cannot create a tree the server would reject.
 *
 * Field changes bubble up via the `update-item` event with the row's `path`
 * (an index list) so the parent form can mutate the canonical `items` array in
 * one place.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnMenuItemEditor',

	props: {
		/**
		 * Single menu item being edited (`{label, url, icon, children?}`).
		 *
		 * @type {{label: string, url: string, icon: string, children?: object[]}}
		 */
		item: {
			type: Object,
			required: true,
		},
		/** 1-indexed depth — drives the indent and the depth label. */
		depth: {
			type: Number,
			default: 1,
		},
		/**
		 * Path of indices from the root to this item (e.g. `[0, 2]`).
		 *
		 * @type {number[]}
		 */
		path: {
			type: Array,
			required: true,
		},
	},

	emits: [
		/**
		 * Fired when a field changes; payload `{path, item}` carries the row's
		 * index path and the updated item object.
		 */
		'update-item',
		/** Fired to remove a row; payload `{path}` carries the row's index path. */
		'remove-item',
		/** Fired to add a child row; payload `{path}` carries the parent's index path. */
		'add-child',
	],

	computed: {
		/**
		 * Whether this item has at least one child row.
		 *
		 * @return {boolean} true when `item.children` is a non-empty array.
		 */
		hasChildren() {
			return Array.isArray(this.item?.children) && this.item.children.length > 0
		},

		/**
		 * Whether the "Add Children" action is allowed (depth cap of 3).
		 *
		 * @return {boolean} true while `depth < 3`.
		 */
		canAddChildren() {
			return this.depth < 3
		},

		/**
		 * Human-readable depth label shown at the start of the row.
		 *
		 * @return {string} the localised level label.
		 */
		depthLabel() {
			if (this.depth === 1) {
				return t('nextcloud-vue', 'Level 1')
			}
			if (this.depth === 2) {
				return t('nextcloud-vue', 'Level 2')
			}
			return t('nextcloud-vue', 'Level 3 - max reached')
		},

		/**
		 * Inline style giving the row its depth-proportional left indent.
		 *
		 * @return {{paddingLeft: string}} the indent style object.
		 */
		rowStyle() {
			return { paddingLeft: `${(this.depth - 1) * 16}px` }
		},
	},

	methods: {
		t,

		/**
		 * Emit an `update-item` event with a copy of the item whose `field` has
		 * been set to `value`.
		 *
		 * @param {string} field the item field that changed.
		 * @param {string} value the new field value.
		 * @return {void}
		 */
		emitFieldChange(field, value) {
			const updated = { ...this.item, [field]: value }
			this.$emit('update-item', { path: this.path, item: updated })
		},
	},
}
</script>

<style scoped>
.cn-menu-item-editor {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-menu-item-editor__row {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
}

.cn-menu-item-editor__depth {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	min-width: 80px;
}

.cn-menu-item-editor__input {
	padding: 4px 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 13px;
	flex: 1;
	min-width: 60px;
}

.cn-menu-item-editor__input--icon {
	flex: 0 0 90px;
}

.cn-menu-item-editor__btn {
	padding: 4px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	font-size: 12px;
	cursor: pointer;
}

.cn-menu-item-editor__btn--danger {
	color: var(--color-error, #c00);
}

.cn-menu-item-editor__children {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
</style>
