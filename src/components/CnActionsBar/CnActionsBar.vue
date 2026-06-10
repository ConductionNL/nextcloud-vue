<template>
	<div class="cn-actions-bar" data-testid="cn-actions-bar">
		<div class="cn-actions-bar__info">
			<span v-if="pagination && pagination.total > 0" class="cn-actions-bar__count">
				{{ countText }}
			</span>
		</div>
		<div class="cn-actions-bar__actions">
			<!-- View mode toggle (Cards / Table) -->
			<div v-if="showViewToggle" class="cn-actions-bar__view-toggle">
				<NcCheckboxRadioSwitch
					:model-value="viewMode"
					:button-variant="true"
					value="cards"
					name="cn_view_mode"
					type="radio"
					button-variant-grouped="horizontal"
					@update:model-value="$emit('view-mode-change', 'cards')">
					{{ t('nextcloud-vue', 'Cards') }}
				</NcCheckboxRadioSwitch>
				<NcCheckboxRadioSwitch
					:model-value="viewMode"
					:button-variant="true"
					value="table"
					name="cn_view_mode"
					type="radio"
					button-variant-grouped="horizontal"
					@update:model-value="$emit('view-mode-change', 'table')">
					{{ t('nextcloud-vue', 'Table') }}
				</NcCheckboxRadioSwitch>
			</div>

			<!-- Add button (primary) -->
			<NcButton v-if="showAdd"
				variant="primary"
				:disabled="addDisabled"
				data-testid="cn-cta-primary"
				@click="$emit('add')">
				<template #icon>
					<CnIcon v-if="addIcon" :name="addIcon" :size="20" />
					<Plus v-else :size="20" />
				</template>
				{{ addLabel }}
			</NcButton>

			<slot name="actions" />

			<!-- Actions menu (Refresh, Import, Export, mass actions) -->
			<NcActions
				:force-name="true"
				:inline="inlineActionCount"
				menu-name="Actions"
				data-testid="cn-actions">
				<NcActionButton :disabled="refreshing || refreshDisabled" @click="$emit('refresh')">
					<template #icon>
						<NcLoadingIcon v-if="refreshing" :size="20" />
						<Refresh v-else :size="20" />
					</template>
					{{ refreshing ? t('nextcloud-vue', 'Refreshing…') : t('nextcloud-vue', 'Refresh') }}
				</NcActionButton>

				<!-- Manifest-declared page-level header actions (overflow) -->
				<NcActionButton
					v-for="entry in headerActions"
					:key="entry.id"
					:disabled="Boolean(entry.disabled)"
					@click="$emit('header-action', { action: entry.id, id: entry.id })">
					<template #icon>
						<CnIcon v-if="entry.icon && isMdiIconName(entry.icon)" :name="entry.icon" :size="20" />
						<span v-else-if="entry.icon"
							:class="['cn-actions-bar__header-action-icon', entry.icon]" />
					</template>
					{{ entry.label }}
				</NcActionButton>

				<!-- Custom primary action items (overflow) -->
				<slot name="action-items" />

				<!-- Separator between primary and mass actions. Hidden when the
				     inline-action-count hoists every pre-separator item out of the
				     overflow, which would otherwise leave the separator orphaned. -->
				<NcActionSeparator v-if="showActionsSeparator" />

				<!-- Mass actions (overflow) -->
				<NcActionButton
					v-if="showMassImport"
					@click="$emit('show-import')">
					<template #icon>
						<Import :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Import') }}
				</NcActionButton>
				<NcActionButton
					v-if="showMassExport"
					@click="$emit('show-export')">
					<template #icon>
						<Export :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Export') }}
				</NcActionButton>
				<NcActionButton
					v-if="showMassCopy"
					:disabled="selectedIds.length < 1"
					:title="selectedIds.length < 1 ? t('nextcloud-vue', 'Select 1 or more items to copy') : ''"
					@click="$emit('show-copy')">
					<template #icon>
						<ContentCopy :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Copy selected') }}
				</NcActionButton>
				<NcActionButton
					v-if="showMassDelete"
					:disabled="selectedIds.length < 1"
					:title="selectedIds.length < 1 ? t('nextcloud-vue', 'Select 1 or more items to delete') : ''"
					@click="$emit('show-delete')">
					<template #icon>
						<TrashCanOutline :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Delete selected') }}
				</NcActionButton>

				<!-- Custom mass actions (overflow) -->
				<slot name="mass-actions" :count="selectedIds.length" :selected-ids="selectedIds" />
			</NcActions>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActions, NcActionSeparator, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Export from 'vue-material-design-icons/Export.vue'
import Import from 'vue-material-design-icons/Import.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import { CnIcon } from '../CnIcon/index.js'

/**
 * CnActionsBar — Reusable actions toolbar with count, mass actions, and primary actions.
 *
 * ```vue
 * <CnActionsBar
 *   :pagination="pagination"
 *   :object-count="items.length"
 *   add-label="Add Client"
 *   add-icon="AccountGroup"
 *   @add="createNew"
 *   @refresh="reload" />
 * ```
 */
export default {
	name: 'CnActionsBar',

	components: {
		NcActions,
		NcActionButton,
		NcActionSeparator,
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
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
			default: () => t('nextcloud-vue', 'Add'),
		},

		/** MDI icon name for the Add button (e.g. 'AccountGroup'). Falls back to Plus icon. */
		addIcon: {
			type: String,
			default: '',
		},

		/** How many action buttons to show inline (rest go in overflow dropdown) */
		inlineActionCount: {
			type: Number,
			default: 0,
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

		/** Whether the refresh action is currently in progress */
		refreshing: {
			type: Boolean,
			default: false,
		},

		/** Whether the refresh action is disabled (e.g. when required selections are missing) */
		refreshDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether the Add button is disabled (e.g. when required selections are missing) */
		addDisabled: {
			type: Boolean,
			default: false,
		},

		/** Whether to show the Add button */
		showAdd: {
			type: Boolean,
			default: true,
		},

		/**
		 * Manifest-declared page-level actions rendered in the overflow
		 * dropdown between Refresh and the `#action-items` slot. Each
		 * entry is `{ id, label, icon?, disabled? }`. The bar emits
		 * `@header-action({ action: id, id })` on click; handler
		 * resolution happens upstream (CnIndexPage).
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, disabled?: boolean }>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},
	},

	computed: {
		countText() {
			if (!this.pagination) return ''
			return t('nextcloud-vue', 'Showing {count} of {total}', { count: this.objectCount, total: this.pagination.total })
		},

		hasMassActions() {
			return this.showMassImport || this.showMassExport || this.showMassCopy || this.showMassDelete
		},

		/**
		 * Count meaningful VNodes in the `#action-items` slot (excludes whitespace
		 * text nodes and comments). Used to decide whether the mass-actions
		 * separator would be orphaned by `inlineActionCount`.
		 */
		actionItemsCount() {
			const slot = this.$scopedSlots['action-items']
			if (!slot) return 0
			const vnodes = slot() || []
			return vnodes.filter(n => n && (n.tag !== undefined || n.componentOptions !== undefined)).length
		},

		/**
		 * The separator is meaningful only when at least one pre-separator action
		 * button (Refresh + #action-items) still ends up inside the overflow
		 * dropdown after NcActions hoists the first `inlineActionCount` buttons
		 * inline. Pre-separator items: 1 (Refresh) + actionItemsCount.
		 */
		showActionsSeparator() {
			if (!this.hasMassActions) return false
			if (!this.$scopedSlots['action-items']) return false
			const preSeparatorOverflow = 1 + this.actionItemsCount - this.inlineActionCount
			return preSeparatorOverflow > 0
		},
	},

	methods: {
		t,
		/**
		 * Heuristic: a "plain" name like `History` is an MDI Vue
		 * component name (rendered via `CnIcon`). A name like
		 * `icon-history` or any string starting with `icon-` is a
		 * Nextcloud core CSS icon class (rendered as a `<span>`).
		 *
		 * @param {string} name Icon string from a headerActions entry.
		 * @return {boolean} `true` when `name` should be passed to
		 *   `CnIcon` as `:name`; `false` for CSS-class icons or empty.
		 */
		isMdiIconName(name) {
			if (!name || typeof name !== 'string') return false
			if (name.startsWith('icon-')) return false
			return true
		},
	},
}
</script>

<!-- Styles in css/actions-bar.css -->
