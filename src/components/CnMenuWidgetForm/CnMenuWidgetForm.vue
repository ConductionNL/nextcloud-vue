<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-menu-form">
		<NcSelect
			:value="style"
			:options="styleOptions"
			:input-label="t('nextcloud-vue', 'Menu Style')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('style', $event)" />

		<NcSelect
			v-if="style !== 'tree'"
			:value="orientation"
			:options="orientationOptions"
			:input-label="t('nextcloud-vue', 'Orientation')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('orientation', $event)" />

		<NcSelect
			:value="activeItemHighlight"
			:options="highlightOptions"
			:input-label="t('nextcloud-vue', 'Active Item Highlight')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('activeItemHighlight', $event)" />

		<label class="cn-menu-form__toggle">
			<input
				type="checkbox"
				:checked="showIcons"
				@change="updateField('showIcons', $event.target.checked)">
			{{ t('nextcloud-vue', 'Show Icons') }}
		</label>

		<label v-if="style === 'tree'" class="cn-menu-form__toggle">
			<input
				type="checkbox"
				:checked="expandedByDefault"
				@change="updateField('expandedByDefault', $event.target.checked)">
			{{ t('nextcloud-vue', 'Expanded by Default') }}
		</label>

		<div class="cn-menu-form__items">
			<h4 class="cn-menu-form__items-title">
				{{ t('nextcloud-vue', 'Items') }}
			</h4>
			<CnMenuItemEditor
				v-for="(item, idx) in items"
				:key="`item-${idx}`"
				:item="item"
				:depth="1"
				:path="[idx]"
				@update-item="onUpdateItem"
				@remove-item="onRemoveItem"
				@add-child="onAddChild" />
			<button
				type="button"
				class="cn-menu-form__add-top"
				@click="onAddTop">
				+ {{ t('nextcloud-vue', 'Add Item') }}
			</button>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'
import CnMenuItemEditor from '../CnMenuItemEditor/CnMenuItemEditor.vue'

const VALID_STYLES = ['dropdown', 'megamenu', 'tree']
const VALID_ORIENTATIONS = ['horizontal', 'vertical']
const VALID_HIGHLIGHTS = ['background', 'underline', 'left-bar', 'none']

const DEFAULT_CONTENT = Object.freeze({
	items: [],
	style: 'dropdown',
	orientation: 'horizontal',
	showIcons: true,
	expandedByDefault: false,
	activeItemHighlight: 'underline',
})

/**
 * CnMenuWidgetForm — sub-form for creating or editing a `menu` placement.
 * Surfaces the five config dropdowns/toggles plus a recursive item editor
 * ({@link CnMenuItemEditor}) that enforces a 3-level depth cap. `validate()`
 * mirrors that depth check.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnMenuWidgetForm',

	components: {
		NcSelect,
		CnMenuItemEditor,
	},

	props: {
		/** The placement being edited, or `null` in create mode. */
		editingWidget: {
			type: Object,
			default: null,
		},
		/** Initial content values (registry defaults when not editing). */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted on every change with the assembled content payload.
		 *
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			items: Array.isArray(initial.items) ? this.cloneItems(initial.items) : [],
			style: VALID_STYLES.includes(initial.style) ? initial.style : DEFAULT_CONTENT.style,
			orientation: VALID_ORIENTATIONS.includes(initial.orientation) ? initial.orientation : DEFAULT_CONTENT.orientation,
			showIcons: typeof initial.showIcons === 'boolean' ? initial.showIcons : DEFAULT_CONTENT.showIcons,
			expandedByDefault: typeof initial.expandedByDefault === 'boolean' ? initial.expandedByDefault : DEFAULT_CONTENT.expandedByDefault,
			activeItemHighlight: VALID_HIGHLIGHTS.includes(initial.activeItemHighlight) ? initial.activeItemHighlight : DEFAULT_CONTENT.activeItemHighlight,
		}
	},

	computed: {
		/**
		 * The menu-style dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		styleOptions() {
			return [
				{ value: 'dropdown', label: t('nextcloud-vue', 'Dropdown') },
				{ value: 'megamenu', label: t('nextcloud-vue', 'Megamenu') },
				{ value: 'tree', label: t('nextcloud-vue', 'Tree') },
			]
		},

		/**
		 * The orientation dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		orientationOptions() {
			return [
				{ value: 'horizontal', label: t('nextcloud-vue', 'Horizontal') },
				{ value: 'vertical', label: t('nextcloud-vue', 'Vertical') },
			]
		},

		/**
		 * The active-item-highlight dropdown options.
		 *
		 * @return {Array<{value: string, label: string}>} the options.
		 */
		highlightOptions() {
			return [
				{ value: 'underline', label: t('nextcloud-vue', 'Underline') },
				{ value: 'background', label: t('nextcloud-vue', 'Background') },
				{ value: 'left-bar', label: t('nextcloud-vue', 'Left Bar') },
				{ value: 'none', label: t('nextcloud-vue', 'None') },
			]
		},

		/**
		 * The assembled `content` payload emitted to the parent.
		 *
		 * @return {object} the content blob.
		 */
		assembledContent() {
			return {
				items: this.cloneItems(this.items),
				style: this.style,
				orientation: this.orientation,
				showIcons: this.showIcons,
				expandedByDefault: this.expandedByDefault,
				activeItemHighlight: this.activeItemHighlight,
			}
		},
	},

	methods: {
		/**
		 * Set a field and emit.
		 *
		 * @param {string} field the field name.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.emitChange()
		},

		/**
		 * Emit `update:content` with the assembled payload.
		 *
		 * @return {void}
		 */
		emitChange() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Deep-clone a (possibly nested) items array into a normalised shape.
		 *
		 * @param {object[]} arr the items to clone.
		 * @return {object[]} the cloned items.
		 */
		cloneItems(arr) {
			if (!Array.isArray(arr)) {
				return []
			}
			return arr.map((it) => ({
				label: typeof it?.label === 'string' ? it.label : '',
				url: typeof it?.url === 'string' ? it.url : '',
				icon: typeof it?.icon === 'string' ? it.icon : '',
				children: this.cloneItems(it?.children || []),
			}))
		},

		/**
		 * Apply a mutator to the item at a given index path.
		 *
		 * @param {object[]} items the items array to descend.
		 * @param {number[]} path the index path.
		 * @param {Function} mutator called with `(arr, index)`.
		 * @return {void}
		 */
		setItemAtPath(items, path, mutator) {
			if (path.length === 0) {
				return
			}
			const head = path[0]
			if (path.length === 1) {
				mutator(items, head)
				return
			}
			if (items[head] && Array.isArray(items[head].children)) {
				this.setItemAtPath(items[head].children, path.slice(1), mutator)
			}
		},

		/**
		 * Handle an `update-item` event from the editor.
		 *
		 * @param {{path: number[], item: object}} payload the editor payload.
		 * @return {void}
		 */
		onUpdateItem({ path, item }) {
			this.setItemAtPath(this.items, path, (arr, idx) => {
				const existing = arr[idx]
				arr.splice(idx, 1, {
					...existing,
					label: typeof item.label === 'string' ? item.label : existing.label,
					url: typeof item.url === 'string' ? item.url : existing.url,
					icon: typeof item.icon === 'string' ? item.icon : existing.icon,
					children: Array.isArray(existing?.children) ? existing.children : [],
				})
			})
			this.emitChange()
		},

		/**
		 * Handle a `remove-item` event from the editor.
		 *
		 * @param {{path: number[]}} payload the editor payload.
		 * @return {void}
		 */
		onRemoveItem({ path }) {
			this.setItemAtPath(this.items, path, (arr, idx) => {
				arr.splice(idx, 1)
			})
			this.emitChange()
		},

		/**
		 * Handle an `add-child` event from the editor.
		 *
		 * @param {{path: number[]}} payload the editor payload.
		 * @return {void}
		 */
		onAddChild({ path }) {
			this.setItemAtPath(this.items, path, (arr, idx) => {
				const target = arr[idx]
				if (!Array.isArray(target.children)) {
					target.children = []
				}
				target.children.push({ label: '', url: '', icon: '', children: [] })
			})
			this.emitChange()
		},

		/**
		 * Append a new top-level item.
		 *
		 * @return {void}
		 */
		onAddTop() {
			this.items.push({ label: '', url: '', icon: '', children: [] })
			this.emitChange()
		},

		/**
		 * Validate the menu — mirrors the 3-level depth cap.
		 *
		 * @return {string[]} the validation errors (empty when valid).
		 */
		validate() {
			const errors = []
			const walk = (list, depth) => {
				if (depth > 3) {
					errors.push(t('nextcloud-vue', 'Menu items can nest at most 3 levels deep'))
					return
				}
				list.forEach((it) => {
					if (Array.isArray(it.children) && it.children.length > 0) {
						walk(it.children, depth + 1)
					}
				})
			}
			walk(this.items, 1)
			return Array.from(new Set(errors))
		},
	},
}
</script>

<style scoped>
.cn-menu-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-menu-form__toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
}

.cn-menu-form__items {
	display: flex;
	flex-direction: column;
	gap: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px;
}

.cn-menu-form__items-title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
}

.cn-menu-form__add-top {
	align-self: flex-start;
	padding: 6px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 13px;
}
</style>
