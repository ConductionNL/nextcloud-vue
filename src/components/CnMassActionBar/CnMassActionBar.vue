<template>
	<NcActions
		v-if="count > 0"
		:menu-name="menuLabel"
		:inline="0">
		<template #icon>
			<TuneVariant :size="20" />
		</template>

		<!-- Built-in: Import -->
		<NcActionButton
			v-if="showImport"
			@click="$emit('mass-import')">
			<template #icon>
				<Import :size="20" />
			</template>
			{{ importLabel }}
		</NcActionButton>

		<!-- Built-in: Export -->
		<NcActionButton
			v-if="showExport"
			@click="$emit('mass-export')">
			<template #icon>
				<Export :size="20" />
			</template>
			{{ exportLabel }}
		</NcActionButton>

		<!-- Built-in: Copy -->
		<NcActionButton
			v-if="showCopy"
			@click="$emit('mass-copy')">
			<template #icon>
				<ContentCopy :size="20" />
			</template>
			{{ copyLabel }}
		</NcActionButton>

		<!-- Built-in: Delete -->
		<NcActionButton
			v-if="showDelete"
			@click="$emit('mass-delete')">
			<template #icon>
				<TrashCanOutline :size="20" />
			</template>
			{{ deleteLabel }}
		</NcActionButton>

		<!-- Custom actions slot -->
		<slot name="actions" :count="count" :selected-ids="selectedIds" />
	</NcActions>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActions, NcActionButton } from '@nextcloud/vue'
import TuneVariant from 'vue-material-design-icons/TuneVariant.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Import from 'vue-material-design-icons/Import.vue'
import Export from 'vue-material-design-icons/Export.vue'

/**
 * CnMassActionBar — Mass action dropdown button for selected items.
 *
 * Renders as a single "Mass Actions (N)" dropdown button with built-in
 * Import, Export, Copy, and Delete actions plus a slot for custom actions.
 * Place this in the header/action bar of your index page.
 *
 * ## Adding Custom Mass Actions
 *
 * Use the `#actions` scoped slot to add app-specific mass actions.
 * Slot content should use `NcActionButton` components:
 *
 * ```vue
 * <CnMassActionBar :selected-ids="selectedIds" :count="selectedIds.length">
 *   <template #actions="{ count, selectedIds }">
 *     <NcActionButton @click="migrateSelected(selectedIds)">
 *       <template #icon><SwapHorizontal :size="20" /></template>
 *       Migrate
 *     </NcActionButton>
 *     <NcActionButton @click="publishSelected(selectedIds)">
 *       <template #icon><Publish :size="20" /></template>
 *       Publish
 *     </NcActionButton>
 *   </template>
 * </CnMassActionBar>
 * ```
 *
 * Basic usage
 * ```vue
 * <CnMassActionBar
 *   :selected-ids="selectedIds"
 *   :count="selectedIds.length"
 *   @mass-copy="openCopyDialog"
 *   @mass-delete="openDeleteDialog"
 *   @mass-import="openImportDialog"
 *   @mass-export="openExportDialog" />
 * ```
 */
export default {
	name: 'CnMassActionBar',

	components: {
		NcActions,
		NcActionButton,
		TuneVariant,
		ContentCopy,
		TrashCanOutline,
		Import,
		Export,
	},

	props: {
		/** Array of selected item IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},
		/** Number of selected items */
		count: {
			type: Number,
			default: 0,
		},
		/** Whether to show the built-in Import action */
		showImport: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the built-in Export action */
		showExport: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the built-in Copy action */
		showCopy: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the built-in Delete action */
		showDelete: {
			type: Boolean,
			default: true,
		},
		/** Label template for the menu button. Use {count} for the count. */
		menuLabelTemplate: {
			type: String,
			default: () => t('nextcloud-vue', 'Mass actions ({count})'),
		},
		importLabel: { type: String, default: () => t('nextcloud-vue', 'Import') },
		exportLabel: { type: String, default: () => t('nextcloud-vue', 'Export') },
		copyLabel: { type: String, default: () => t('nextcloud-vue', 'Copy') },
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
	},

	computed: {
		menuLabel() {
			return this.menuLabelTemplate.replace('{count}', String(this.count))
		},
	},
}
</script>
