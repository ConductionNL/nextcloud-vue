<template>
	<div class="cn-actions-bar">
		<div class="cn-actions-bar__info">
			<span v-if="pagination && pagination.total > 0" class="cn-actions-bar__count">
				{{ countText }}
			</span>
		</div>
		<div class="cn-actions-bar__actions">
			<!-- View mode toggle (Cards / Table) -->
			<div v-if="showViewToggle" class="cn-actions-bar__view-toggle">
				<NcCheckboxRadioSwitch
					:checked="viewMode"
					:button-variant="true"
					value="cards"
					name="cn_view_mode"
					type="radio"
					button-variant-grouped="horizontal"
					@update:checked="$emit('view-mode-change', 'cards')">
					Cards
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch
					:checked="viewMode"
					:button-variant="true"
					value="table"
					name="cn_view_mode"
					type="radio"
					button-variant-grouped="horizontal"
					@update:checked="$emit('view-mode-change', 'table')">
					Table
				</NcCheckboxRadioSwitch>
			</div>

			<!-- Add button (primary) -->
			<NcButton type="primary" @click="$emit('add')">
				<template #icon>
					<CnIcon v-if="addIcon" :name="addIcon" :size="20" />
					<Plus v-else :size="20" />
				</template>
				{{ addLabel }}
			</NcButton>

			<!-- Actions menu (Refresh, Import, Export, mass actions) -->
			<NcActions
				:force-name="true"
				:inline="0"
				menu-name="Actions">
				<NcActionButton @click="$emit('refresh')">
					<template #icon>
						<Refresh :size="20" />
					</template>
					Refresh
				</NcActionButton>

				<!-- Custom primary action items (overflow) -->
				<slot name="action-items" />

				<!-- Separator between primary and mass actions -->
				<NcActionSeparator v-if="selectable" />

				<!-- Mass actions (overflow) -->
				<NcActionButton
					v-if="showMassImport"
					@click="$emit('show-import')">
					<template #icon>
						<Import :size="20" />
					</template>
					Import
				</NcActionButton>
				<NcActionButton
					v-if="showMassExport"
					@click="$emit('show-export')">
					<template #icon>
						<Export :size="20" />
					</template>
					Export
				</NcActionButton>
				<NcActionButton
					v-if="showMassCopy"
					:disabled="selectedIds.length < 1"
					:title="selectedIds.length < 1 ? 'Select 1 or more items to copy' : ''"
					@click="$emit('show-copy')">
					<template #icon>
						<ContentCopy :size="20" />
					</template>
					Copy selected
				</NcActionButton>
				<NcActionButton
					v-if="showMassDelete"
					:disabled="selectedIds.length < 1"
					:title="selectedIds.length < 1 ? 'Select 1 or more items to delete' : ''"
					@click="$emit('show-delete')">
					<template #icon>
						<TrashCanOutline :size="20" />
					</template>
					Delete selected
				</NcActionButton>

				<!-- Custom mass actions (overflow) -->
				<slot name="mass-actions" :count="selectedIds.length" :selected-ids="selectedIds" />
			</NcActions>

			<slot name="header-actions" />
		</div>
	</div>
</template>

<script>
import { NcActions, NcActionButton, NcActionSeparator, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'
import Plus from 'vue-material-design-icons/Plus.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Import from 'vue-material-design-icons/Import.vue'
import Export from 'vue-material-design-icons/Export.vue'

/**
 * CnActionsBar — Reusable actions toolbar with count, mass actions, and primary actions.
 *
 * @example
 * <CnActionsBar
 *   :pagination="pagination"
 *   :object-count="items.length"
 *   add-label="Add Client"
 *   add-icon="AccountGroup"
 *   @add="createNew"
 *   @refresh="reload" />
 */
export default {
	name: 'CnActionsBar',

	components: {
		NcActions,
		NcActionButton,
		NcActionSeparator,
		NcButton,
		NcCheckboxRadioSwitch,
		CnIcon,
		Plus,
		Refresh,
		ContentCopy,
		TrashCanOutline,
		Import,
		Export,
	},

	props: {
		/** Pagination state: { total, page, pages, limit } */
		pagination: {
			type: Object,
			default: null,
		},
		/** Number of currently visible objects (for "Showing X of Y") */
		objectCount: {
			type: Number,
			default: 0,
		},
		/** Whether rows/cards can be selected */
		selectable: {
			type: Boolean,
			default: true,
		},
		/** Currently selected IDs */
		selectedIds: {
			type: Array,
			default: () => [],
		},
		/** Label for the Add button */
		addLabel: {
			type: String,
			default: 'Add',
		},
		/** MDI icon name for the Add button (e.g. 'AccountGroup'). Falls back to Plus icon. */
		addIcon: {
			type: String,
			default: '',
		},
		/** How many action buttons to show inline (rest go in overflow dropdown) */
		inlineActionCount: {
			type: Number,
			default: 2,
		},
		/** Whether to show the built-in mass Import action */
		showMassImport: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the built-in mass Export action */
		showMassExport: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the built-in mass Copy action */
		showMassCopy: {
			type: Boolean,
			default: true,
		},
		/** Whether to show the built-in mass Delete action */
		showMassDelete: {
			type: Boolean,
			default: true,
		},
		/** Current view mode: 'table' or 'cards' */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards'].includes(v),
		},
		/** Whether to show the Cards/Table view toggle */
		showViewToggle: {
			type: Boolean,
			default: true,
		},
	},

	computed: {
		countText() {
			if (!this.pagination) return ''
			return `Showing ${this.objectCount} of ${this.pagination.total}`
		},
	},
}
</script>

<!-- Styles in css/actions-bar.css -->
