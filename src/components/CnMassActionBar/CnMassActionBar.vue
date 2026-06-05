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
			@click="emitMassImport">
			<template #icon>
				<Import :size="20" />
			</template>
			{{ importLabel }}
		</NcActionButton>

		<!-- Built-in: Export -->
		<NcActionButton
			v-if="showExport"
			@click="emitMassExport">
			<template #icon>
				<Export :size="20" />
			</template>
			{{ exportLabel }}
		</NcActionButton>

		<!-- Built-in: Copy -->
		<NcActionButton
			v-if="showCopy"
			@click="emitMassCopy">
			<template #icon>
				<ContentCopy :size="20" />
			</template>
			{{ copyLabel }}
		</NcActionButton>

		<!-- Built-in: Delete -->
		<NcActionButton
			v-if="showDelete"
			@click="emitMassDelete">
			<template #icon>
				<TrashCanOutline :size="20" />
			</template>
			{{ deleteLabel }}
		</NcActionButton>

		<!-- @slot actions Additional app-specific mass-action buttons. Slot scope: `{ count, selectedIds }`. -->
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
 * Use the `#actions` scoped slot to add app-specific mass actions
 * (use `NcActionButton` for slot content).
 *
 * @event mass-import Emitted when the Import action is clicked. No payload.
 * @event mass-export Emitted when the Export action is clicked. No payload.
 * @event mass-copy Emitted when the Copy action is clicked. No payload.
 * @event mass-delete Emitted when the Delete action is clicked. No payload.
 * @slot actions Additional app-specific mass-action buttons. Slot scope: `{ count, selectedIds }`.
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
		/** Label for the built-in Import mass-action button. */
		importLabel: { type: String, default: () => t('nextcloud-vue', 'Import') },
		/** Label for the built-in Export mass-action button. */
		exportLabel: { type: String, default: () => t('nextcloud-vue', 'Export') },
		/** Label for the built-in Copy mass-action button. */
		copyLabel: { type: String, default: () => t('nextcloud-vue', 'Copy') },
		/** Label for the built-in Delete mass-action button. */
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
	},

	computed: {
		menuLabel() {
			return this.menuLabelTemplate.replace('{count}', String(this.count))
		},
	},

	methods: {
		/**
		 * Emit the built-in Import click. No payload.
		 *
		 * @return {void}
		 */
		emitMassImport() {
			/**
			 * @event mass-import Emitted when the Import action is clicked. No payload.
			 */
			this.$emit('mass-import')
		},

		/**
		 * Emit the built-in Export click. No payload.
		 *
		 * @return {void}
		 */
		emitMassExport() {
			/**
			 * @event mass-export Emitted when the Export action is clicked. No payload.
			 */
			this.$emit('mass-export')
		},

		/**
		 * Emit the built-in Copy click. No payload.
		 *
		 * @return {void}
		 */
		emitMassCopy() {
			/**
			 * @event mass-copy Emitted when the Copy action is clicked. No payload.
			 */
			this.$emit('mass-copy')
		},

		/**
		 * Emit the built-in Delete click. No payload.
		 *
		 * @return {void}
		 */
		emitMassDelete() {
			/**
			 * @event mass-delete Emitted when the Delete action is clicked. No payload.
			 */
			this.$emit('mass-delete')
		},
	},
}
</script>
