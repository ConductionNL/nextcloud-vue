<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcPopover
		v-model:shown="open"
		class="cn-grouped-menu"
		placement="bottom-end"
		popupRole="menu"
		:setReturnFocus="returnFocus"
		data-testid="cn-grouped-menu">
		<template #trigger="{ attrs }">
			<NcButton
				ref="trigger"
				v-bind="attrs"
				:variant="variant"
				class="cn-grouped-menu__trigger"
				data-testid="cn-grouped-menu-trigger">
				<template #icon>
					<DotsHorizontal :size="20" />
				</template>
				{{ triggerLabel }}
			</NcButton>
		</template>
		<div
			ref="panel"
			class="cn-grouped-menu__panel"
			:class="{ 'cn-grouped-menu__panel--single': visibleColumns.length < 2 }"
			role="menu"
			:aria-label="triggerLabel"
			data-testid="cn-grouped-menu-panel"
			@keydown="onKeydown">
			<div
				v-for="(column, columnIndex) in visibleColumns"
				:key="columnIndex"
				class="cn-grouped-menu__column">
				<div
					v-for="group in column"
					:key="group.id"
					class="cn-grouped-menu__group"
					:class="{ 'cn-grouped-menu__group--divided': group.divided === true }"
					role="group"
					:aria-labelledby="group.title ? `${domId}-${group.id}` : undefined"
					:data-testid="`cn-grouped-menu-group-${group.id}`">
					<span
						v-if="group.title"
						:id="`${domId}-${group.id}`"
						class="cn-grouped-menu__title">
						{{ group.title }}
					</span>
					<component
						:is="itemTag(item)"
						v-for="item in group.items"
						:key="item.id"
						v-bind="itemAttributes(item)"
						class="cn-grouped-menu__item"
						:class="{
							'cn-grouped-menu__item--checked': item.checked === true,
							'cn-grouped-menu__item--destructive': item.destructive === true,
						}"
						:role="item.checked === undefined ? 'menuitem' : 'menuitemradio'"
						:aria-checked="item.checked === undefined ? undefined : String(item.checked === true)"
						:aria-disabled="item.disabled === true ? 'true' : undefined"
						tabindex="-1"
						:data-testid="`cn-grouped-menu-item-${item.id}`"
						@click="onItemClick($event, item)">
						<span class="cn-grouped-menu__icon" aria-hidden="true">
							<component :is="item.icon" v-if="item.icon" :size="18" />
						</span>
						<span class="cn-grouped-menu__label">{{ item.label }}</span>
						<span v-if="item.meta" class="cn-grouped-menu__meta">{{ item.meta }}</span>
					</component>
				</div>
			</div>
		</div>
	</NcPopover>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcPopover } from '@nextcloud/vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'

let domIdCounter = 0

/**
 * CnGroupedMenu: one "More" button whose menu lays its actions out in titled
 * groups over one or two columns, as LpVandaag's "Meer" menu draws them
 * (Dashboards and Settings on the left, This dashboard and the app's own
 * destinations on the right). It replaces a row of separate icon menus with
 * one entry point, without hiding what is in it behind a second level.
 *
 * `columns` is an array of columns, each an array of groups:
 * `{ id, title?, divided?, items: [item] }`. An item is
 * `{ id, label, icon?, meta?, checked?, destructive?, disabled?, href?,
 * target?, to?, onClick? }`: `href` renders a link, `to` a router link,
 * anything else a button. `checked` (true or false) makes the item a radio
 * item, for "which dashboard is open". `meta` is a short muted note at the
 * right ("standaard", "gedeeld"). A group or column without items is not
 * drawn. Choosing an item calls its `onClick`, emits `select` and closes the
 * menu.
 *
 * The menu is a WAI-ARIA menu: the arrow keys move through every item over
 * both columns, Home and End jump to the first and last, Escape closes it
 * and returns focus to the button.
 *
 * ```vue
 * <CnGroupedMenu :columns="[[{ id: 'boards', title: 'Dashboards', items }], [{ id: 'this', title: 'Dit dashboard', items: actions }]]" />
 * ```
 *
 * @spec openspec/changes/lpvandaag-start-page/specs/lpvandaag-start-page/spec.md#requirement-one-more-button-holds-the-pages-actions-in-groups
 */
export default {
	name: 'CnGroupedMenu',

	components: {
		DotsHorizontal,
		NcButton,
		NcPopover,
	},

	props: {
		/**
		 * The menu's columns, each an array of groups (see the component
		 * description for the shapes).
		 *
		 * @type {Array<Array<object>>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},

		/**
		 * The button's text and the menu's accessible name. Empty for the
		 * library's "More".
		 */
		label: {
			type: String,
			default: '',
		},

		/** The button's NcButton variant while the menu is closed. */
		variant: {
			type: String,
			default: 'secondary',
		},
	},

	emits: [
		/** An item was chosen. Payload: the item. */
		'select',
	],

	data() {
		return {
			open: false,
			domId: `cn-grouped-menu-${++domIdCounter}`,
		}
	},

	computed: {
		/**
		 * The button's text.
		 *
		 * @return {string}
		 */
		triggerLabel() {
			return this.label || t('nextcloud-vue', 'More')
		},

		/**
		 * The columns with their empty groups, and then the empty columns,
		 * left out.
		 *
		 * @return {Array<Array<object>>}
		 */
		visibleColumns() {
			return visibleColumns(this.columns)
		},
	},

	watch: {
		open(isOpen) {
			if (isOpen) {
				this.$nextTick(() => this.focusItem(0))
			}
		},
	},

	methods: {
		/**
		 * The element an item renders as.
		 *
		 * @param {object} item The item.
		 * @return {string}
		 */
		itemTag(item) {
			if (item.href && item.disabled !== true) {
				return 'a'
			}
			if (item.to && item.disabled !== true) {
				return 'router-link'
			}
			return 'button'
		},

		/**
		 * The attributes of an item's element.
		 *
		 * @param {object} item The item.
		 * @return {object}
		 */
		itemAttributes(item) {
			const tag = this.itemTag(item)
			if (tag === 'a') {
				const target = item.target || undefined
				return { href: item.href, target, rel: target === '_blank' ? 'noopener noreferrer' : undefined }
			}
			if (tag === 'router-link') {
				return { to: item.to }
			}
			return { type: 'button', disabled: item.disabled === true }
		},

		/**
		 * Choose an item: run it, report it and close the menu.
		 *
		 * @param {MouseEvent} event The click.
		 * @param {object} item The item.
		 * @return {void}
		 */
		onItemClick(event, item) {
			if (item.disabled === true) {
				event.preventDefault()
				return
			}
			if (typeof item.onClick === 'function') {
				item.onClick(item)
			}
			this.$emit('select', item)
			this.open = false
		},

		/**
		 * The menu's items in reading order, as elements.
		 *
		 * @return {HTMLElement[]}
		 */
		itemElements() {
			const panel = this.$refs.panel
			return panel ? [...panel.querySelectorAll('.cn-grouped-menu__item')] : []
		},

		/**
		 * Move focus to the item at an index, wrapping around.
		 *
		 * @param {number} index The index.
		 * @return {void}
		 */
		focusItem(index) {
			const items = this.itemElements()
			if (items.length === 0) {
				return
			}
			const at = ((index % items.length) + items.length) % items.length
			items[at].focus()
		},

		/**
		 * The menu's arrow keys, Home and End.
		 *
		 * @param {KeyboardEvent} event The key.
		 * @return {void}
		 */
		onKeydown(event) {
			const items = this.itemElements()
			const current = items.indexOf(document.activeElement)
			const moves = {
				ArrowDown: current + 1,
				ArrowUp: current < 0 ? items.length - 1 : current - 1,
				Home: 0,
				End: items.length - 1,
			}
			if (!(event.key in moves)) {
				return
			}
			event.preventDefault()
			this.focusItem(moves[event.key])
		},

		/**
		 * Where focus goes when the menu closes: back to the button.
		 *
		 * @return {HTMLElement|false}
		 */
		returnFocus() {
			return this.$refs.trigger?.$el ?? false
		},
	},
}

/**
 * The columns with their empty groups, and then the empty columns, left out.
 *
 * @param {Array<Array<object>>} columns The menu's columns.
 * @return {Array<Array<object>>}
 */
export function visibleColumns(columns) {
	return (Array.isArray(columns) ? columns : [])
		.map((column) => (Array.isArray(column) ? column : [])
			.filter((group) => group && Array.isArray(group.items) && group.items.length > 0))
		.filter((column) => column.length > 0)
}
</script>

<style scoped>
.cn-grouped-menu__panel {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 4px 12px;
	box-sizing: border-box;
	width: min(600px, calc(100vw - 32px));
	max-height: calc(100vh - 120px);
	overflow: auto;
	padding: 10px 10px 12px;
}

.cn-grouped-menu__panel--single {
	grid-template-columns: minmax(0, 1fr);
	width: min(320px, calc(100vw - 32px));
}

.cn-grouped-menu__column,
.cn-grouped-menu__group {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.cn-grouped-menu__group--divided {
	margin-top: 4px;
	padding-top: 4px;
	border-top: 1px solid var(--color-border);
}

.cn-grouped-menu__title {
	padding: 10px 10px 4px;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color-text-maxcontrast);
}

.cn-grouped-menu__item {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	min-height: 34px;
	margin: 0;
	padding: 6px 10px;
	border: none;
	border-radius: var(--border-radius-element, 8px);
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
	font-size: 15px;
	text-align: start;
	text-decoration: none;
	cursor: pointer;
}

.cn-grouped-menu__item:hover,
.cn-grouped-menu__item:focus-visible {
	background: var(--color-background-hover);
}

.cn-grouped-menu__item:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-grouped-menu__item[aria-disabled='true'] {
	cursor: default;
	opacity: 0.6;
}

.cn-grouped-menu__item--checked {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-weight: 600;
}

.cn-grouped-menu__item--destructive {
	color: var(--color-error-text, var(--color-error));
}

.cn-grouped-menu__icon {
	display: inline-flex;
	flex: none;
	width: 18px;
	justify-content: center;
}

.cn-grouped-menu__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-grouped-menu__meta {
	flex: none;
	font-size: 12px;
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}

@media (max-width: 640px) {
	.cn-grouped-menu__panel {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
