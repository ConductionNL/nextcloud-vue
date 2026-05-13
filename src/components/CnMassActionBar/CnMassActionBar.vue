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
import { NcActionButton, NcActions } from '@nextcloud/vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Export from 'vue-material-design-icons/Export.vue'
import Import from 'vue-material-design-icons/Import.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import TuneVariant from 'vue-material-design-icons/TuneVariant.vue'

/**
 * CnMassActionBar — Mass action dropdown button for selected items.
 *
 * Renders as a single "Mass Actions (N)" dropdown button with built-in
 * Import, Export, Copy, and Delete actions plus a slot for custom actions.
 * Place this in the header/action bar of your index page.
 *
 * Use the `#actions` scoped slot to add app-specific mass actions
 * (use `NcActionButton` for slot content).
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

		/** Label for the import action */
		importLabel: { type: String, default: () => t('nextcloud-vue', 'Import') },
		/** Label for the export action */
		exportLabel: { type: String, default: () => t('nextcloud-vue', 'Export') },
		/** Label for the copy action */
		copyLabel: { type: String, default: () => t('nextcloud-vue', 'Copy') },
		/** Label for the delete action */
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
	},

	computed: {
		menuLabel() {
			return this.menuLabelTemplate.replace('{count}', String(this.count))
		},
	},
}
</script>
