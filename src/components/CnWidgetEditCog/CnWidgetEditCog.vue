<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<NcActions
		:aria-label="menuLabel"
		:force-menu="true"
		placement="bottom-end"
		type="tertiary"
		class="cn-widget-edit-cog"
		data-testid="cn-widget-edit-cog"
		@click.native.stop>
		<template #icon>
			<Cog :size="20" />
		</template>
		<NcActionButton
			:close-after-click="true"
			data-testid="cn-widget-edit-cog-edit"
			@click="onEdit">
			<template #icon>
				<Pencil :size="20" />
			</template>
			{{ editLabel }}
		</NcActionButton>
		<NcActionButton
			:close-after-click="true"
			data-testid="cn-widget-edit-cog-delete"
			@click="onRemove">
			<template #icon>
				<Delete :size="20" />
			</template>
			{{ deleteLabel }}
		</NcActionButton>
	</NcActions>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Delete from 'vue-material-design-icons/Delete.vue'

/**
 * CnWidgetEditCog — the single per-widget edit affordance for editable
 * dashboards.
 *
 * A white, rounded cog button (matching the widget chrome) that opens a small
 * action menu with Edit + Delete. Meant to be overlaid (absolute, top-right) by
 * the host over any widget surface — data widgets, NC dashboard widgets,
 * chromeless label/divider/header widgets, quick-access tiles — so every
 * dashboard widget shares one consistent edit control. Emits raw `edit` /
 * `remove`; the host decides what they act on. Labels are props so the consumer
 * supplies translated strings.
 *
 * ```vue
 * <CnWidgetEditCog
 *   :edit-label="t('myapp', 'Edit widget')"
 *   :delete-label="t('myapp', 'Delete widget')"
 *   @edit="onEdit(placement)"
 *   @remove="onRemove(placement.id)" />
 * ```
 */
export default {
	name: 'CnWidgetEditCog',

	components: {
		NcActions,
		NcActionButton,
		Cog,
		Pencil,
		Delete,
	},

	props: {
		/**
		 * Accessible name for the cog trigger / menu.
		 *
		 * @type {string}
		 */
		menuLabel: {
			type: String,
			default: 'Widget menu',
		},
		/**
		 * Label for the Edit action item.
		 *
		 * @type {string}
		 */
		editLabel: {
			type: String,
			default: 'Edit widget',
		},
		/**
		 * Label for the Delete action item.
		 *
		 * @type {string}
		 */
		deleteLabel: {
			type: String,
			default: 'Delete widget',
		},
	},

	emits: ['edit', 'remove'],

	methods: {
		/**
		 * Trigger the Edit action.
		 *
		 * @return {void}
		 */
		onEdit() {
			/**
			 * @event edit Emitted when the Edit action item is clicked. The host
			 * decides what it acts on (e.g. open the widget's config editor).
			 */
			this.$emit('edit')
		},

		/**
		 * Trigger the Delete action.
		 *
		 * @return {void}
		 */
		onRemove() {
			/**
			 * @event remove Emitted when the Delete action item is clicked. The
			 * host decides what it removes (e.g. the widget placement).
			 */
			this.$emit('remove')
		},
	},
}
</script>

<style scoped>
/* White rounded button matching the widget chrome — a persistent surface (not
   the default transparent tertiary) so the cog reads on any widget background.
   The trigger element is NcActions' menu toggle. */
.cn-widget-edit-cog :deep(.action-item__menutoggle),
.cn-widget-edit-cog :deep(.button-vue) {
	background-color: var(--color-main-background) !important;
	border: 1px solid var(--color-border) !important;
	border-radius: var(--border-radius, 8px) !important;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	color: var(--color-main-text) !important;
}

.cn-widget-edit-cog :deep(.action-item__menutoggle:hover),
.cn-widget-edit-cog :deep(.button-vue:hover) {
	background-color: var(--color-background-hover) !important;
}
</style>
