<template>
	<div class="cn-actions-bar" data-testid="cn-actions-bar">
		<div class="cn-actions-bar__info">
			<!-- Inline search field (opt-in) -->
			<div v-if="showSearch" class="cn-actions-bar__search">
				<Magnify :size="18" class="cn-actions-bar__search-icon" />
				<input
					type="search"
					class="cn-actions-bar__search-input"
					:placeholder="searchPlaceholder || t('nextcloud-vue', 'Search…')"
					:value="searchValue"
					:aria-label="searchPlaceholder || t('nextcloud-vue', 'Search')"
					@input="onSearchInput">
			</div>
			<span v-else-if="pagination && pagination.total > 0" class="cn-actions-bar__count">
				{{ countText }}
			</span>
		</div>
		<div class="cn-actions-bar__actions">
			<!-- View mode toggle (Cards / Table) — segmented control with a
			     sliding thumb that animates between the two segments. -->
			<div v-if="showViewToggle"
				class="cn-actions-bar__view-toggle"
				:class="{ 'cn-actions-bar__view-toggle--three': showMap }"
				role="group"
				:aria-label="t('nextcloud-vue', 'View mode')">
				<!-- Sliding pill that sits behind the active segment. Its horizontal
				     position is a `--pos-N` class derived from the active segment's
				     index (0 = cards, 1 = table, 2 = map), so the same markup drives
				     both the two- and three-segment layouts. -->
				<span
					class="cn-actions-bar__view-toggle-thumb"
					:class="viewToggleThumbClass"
					aria-hidden="true" />
				<!--
					@event view-mode-change
					@description User clicked one of the view-mode toggle buttons (Cards / Table / Map). Payload is the selected mode string.
					@type {'cards' | 'table' | 'map'}
				-->
				<button
					type="button"
					class="cn-actions-bar__view-toggle-btn"
					:class="{ 'cn-actions-bar__view-toggle-btn--active': viewMode === 'cards' }"
					:aria-pressed="viewMode === 'cards'"
					@click="$emit('view-mode-change', 'cards')">
					<CnIcon v-if="cardsIcon"
						:name="cardsIcon"
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
					<ViewGridOutline v-else :size="24" class="cn-actions-bar__view-toggle-icon" />
					<span class="cn-actions-bar__view-toggle-label">{{ cardsLabel || t('nextcloud-vue', 'Cards') }}</span>
				</button>
				<button
					type="button"
					class="cn-actions-bar__view-toggle-btn"
					:class="{ 'cn-actions-bar__view-toggle-btn--active': viewMode === 'table' }"
					:aria-pressed="viewMode === 'table'"
					@click="$emit('view-mode-change', 'table')">
					<CnIcon v-if="tableIcon"
						:name="tableIcon"
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
					<FormatListBulletedSquare v-else :size="24" class="cn-actions-bar__view-toggle-icon" />
					<span class="cn-actions-bar__view-toggle-label">{{ tableLabel || t('nextcloud-vue', 'Table') }}</span>
				</button>
				<button
					v-if="showMap"
					type="button"
					class="cn-actions-bar__view-toggle-btn"
					:class="{ 'cn-actions-bar__view-toggle-btn--active': viewMode === 'map' }"
					:aria-pressed="viewMode === 'map'"
					@click="$emit('view-mode-change', 'map')">
					<CnIcon v-if="mapIcon"
						:name="mapIcon"
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
					<MapMarkerOutline v-else :size="24" class="cn-actions-bar__view-toggle-icon" />
					<span class="cn-actions-bar__view-toggle-label">{{ mapLabel || t('nextcloud-vue', 'Map') }}</span>
				</button>
			</div>

			<!-- @slot filters Inline filter controls rendered inside the action bar, between the view toggle and the add/actions (e.g. a CnQuickFilterBar segmented toggle). -->
			<slot name="filters" />

			<!-- Search / Columns sidebar toggle (opt-in). Icon-only; reflects the
			     open state via aria-pressed so the index sidebar can default
			     closed and be opened on demand. -->
			<!--
				@event toggle-sidebar
				@description User clicked the Search/Columns sidebar toggle. No payload — the host flips the sidebar open state.
			-->
			<NcButton v-if="showSidebarToggle"
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Search and columns')"
				:title="t('nextcloud-vue', 'Search and columns')"
				:pressed="sidebarOpen"
				@click="$emit('toggle-sidebar')">
				<template #icon>
					<Tune :size="20" />
				</template>
			</NcButton>

			<!-- Add button (primary) -->
			<!--
				@event add
				@description User clicked the primary Add button. No payload.
			-->
			<NcButton v-if="showAdd"
				variant="primary"
				:disabled="addDisabled"
				data-testid="cn-cta-primary"
				data-walkthrough-id="index-add"
				@click="$emit('add')">
				<template #icon>
					<CnIcon v-if="addIcon" :name="addIcon" :size="20" />
					<Plus v-else :size="20" />
				</template>
				{{ addLabel }}
			</NcButton>

			<!--
				@slot actions
				@description Custom buttons rendered between the Add button and the overflow Actions menu.
			-->
			<slot name="actions" />

			<!-- In-app edit button (ADR-041): icon-only, self-wires from CnAppRoot. -->
			<CnOpenBuildEditButton />

			<!-- Actions menu (Refresh, Import, Export, mass actions) -->
			<NcActions
				:force-name="true"
				:inline="inlineActionCount"
				menu-name="Actions"
				data-testid="cn-actions">
				<!--
					@event refresh
					@description User clicked the Refresh entry in the overflow Actions menu. The host should re-fetch the underlying list.
				-->
				<NcActionButton :disabled="refreshing || refreshDisabled" @click="$emit('refresh')">
					<template #icon>
						<NcLoadingIcon v-if="refreshing" :size="20" />
						<Refresh v-else :size="20" />
					</template>
					{{ refreshing ? t('nextcloud-vue', 'Refreshing…') : t('nextcloud-vue', 'Refresh') }}
				</NcActionButton>

				<NcActionLink v-if="documentationUrl"
					:href="documentationUrl"
					target="_blank"
					rel="noopener noreferrer">
					<template #icon>
						<BookOpenVariantOutline :size="20" />
					</template>
					{{ documentationLabel }}
				</NcActionLink>

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

				<!--
					@slot action-items
					@description Additional NcActionButton-family items rendered inside the overflow menu, between the built-in Refresh entry and the mass-actions separator. Use for app-level page actions.
				-->
				<slot name="action-items" />

				<!-- Separator between primary and mass actions. Hidden when the
				     inline-action-count hoists every pre-separator item out of the
				     overflow, which would otherwise leave the separator orphaned. -->
				<NcActionSeparator v-if="showActionsSeparator" />

				<!-- Mass actions (overflow) -->
				<!--
					@event show-import
					@description User clicked the Import mass action. Host should open the import modal.
				-->
				<NcActionButton
					v-if="showMassImport"
					@click="$emit('show-import')">
					<template #icon>
						<Import :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Import') }}
				</NcActionButton>
				<!--
					@event show-export
					@description User clicked the Export mass action. Host should open the export modal.
				-->
				<NcActionButton
					v-if="showMassExport"
					@click="$emit('show-export')">
					<template #icon>
						<Export :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Export') }}
				</NcActionButton>
				<!--
					@event show-copy
					@description User clicked the Copy-selected mass action. Disabled while no row is selected.
				-->
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
				<!--
					@event show-delete
					@description User clicked the Delete-selected mass action. Disabled while no row is selected.
				-->
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

				<!--
					@slot mass-actions
					@description Additional mass-action NcActionButtons rendered at the bottom of the overflow menu. Scope receives the current selection count and ids so the host can disable / label per selection.
					@binding {number} count Length of the current selection.
					@binding {Array<string|number>} selected-ids The selected row ids.
				-->
				<slot name="mass-actions" :count="selectedIds.length" :selected-ids="selectedIds" />
			</NcActions>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionLink, NcActions, NcActionSeparator, NcButton, NcLoadingIcon } from '@nextcloud/vue'
import CnOpenBuildEditButton from '../CnOpenBuildEditButton/CnOpenBuildEditButton.vue'
import BookOpenVariantOutline from 'vue-material-design-icons/BookOpenVariantOutline.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Export from 'vue-material-design-icons/Export.vue'
import FormatListBulletedSquare from 'vue-material-design-icons/FormatListBulletedSquare.vue'
import Import from 'vue-material-design-icons/Import.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Tune from 'vue-material-design-icons/Tune.vue'
import ViewGridOutline from 'vue-material-design-icons/ViewGridOutline.vue'
import MapMarkerOutline from 'vue-material-design-icons/MapMarkerOutline.vue'
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
		CnOpenBuildEditButton,
		NcActions,
		NcActionButton,
		NcActionLink,
		NcActionSeparator,
		NcButton,
		NcLoadingIcon,
		CnIcon,
		BookOpenVariantOutline,
		Plus,
		Refresh,
		ContentCopy,
		TrashCanOutline,
		Import,
		Export,
		Magnify,
		Tune,
		ViewGridOutline,
		FormatListBulletedSquare,
		MapMarkerOutline,
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

		/** Current view mode: 'table', 'cards' or 'map' */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards', 'map'].includes(v),
		},

		/** Whether to show the Cards/Table view toggle */
		showViewToggle: {
			type: Boolean,
			default: true,
		},

		/** Label for the cards/grid view-toggle option (defaults to "Cards") */
		cardsLabel: {
			type: String,
			default: '',
		},

		/** Label for the table/list view-toggle option (defaults to "Table") */
		tableLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the cards option (defaults to the built-in grid icon). Resolved via CnIcon. */
		cardsIcon: {
			type: String,
			default: '',
		},

		/** MDI icon name for the table option (defaults to the built-in list icon). Resolved via CnIcon. */
		tableIcon: {
			type: String,
			default: '',
		},

		/** Whether to render the third "Map" segment in the view toggle. Off by default so existing two-segment consumers are unchanged. */
		showMap: {
			type: Boolean,
			default: false,
		},

		/** Label for the map view-toggle option (defaults to "Map"). Only shown when `showMap`. */
		mapLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the map option (defaults to the built-in map-marker icon). Resolved via CnIcon. */
		mapIcon: {
			type: String,
			default: '',
		},

		/** Whether to show the inline search field on the left of the bar */
		showSearch: {
			type: Boolean,
			default: false,
		},

		/** Current value of the inline search field (controlled) */
		searchValue: {
			type: String,
			default: '',
		},

		/** Placeholder / accessible label for the inline search field */
		searchPlaceholder: {
			type: String,
			default: '',
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
		 * Whether to show the Search/Columns sidebar toggle button. Lets the
		 * index sidebar default to closed and be opened on demand.
		 */
		showSidebarToggle: {
			type: Boolean,
			default: false,
		},

		/** Current open state of the sidebar (controls the toggle's pressed state). */
		sidebarOpen: {
			type: Boolean,
			default: false,
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

		/**
		 * When set, adds a Documentation entry to the overflow menu (after
		 * Refresh, before headerActions). Opens the URL in a new tab.
		 * Empty string hides the entry.
		 */
		documentationUrl: {
			type: String,
			default: '',
		},

		/** Label for the Documentation overflow entry. */
		documentationLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Documentation'),
		},
	},

	computed: {
		countText() {
			if (!this.pagination) return ''
			return t('nextcloud-vue', 'Showing {count} of {total}', { count: this.objectCount, total: this.pagination.total })
		},

		/**
		 * Position class for the sliding thumb, derived from the active segment's
		 * index in the ordered mode list (cards, table, [map]). `--pos-1` shifts it
		 * one segment right (table), `--pos-2` two (map); index 0 (cards) needs no
		 * class. Works for both the two- and three-segment layouts because the
		 * thumb width scales with segment count, so one translate step always
		 * equals one segment.
		 */
		viewToggleThumbClass() {
			const modes = this.showMap ? ['cards', 'table', 'map'] : ['cards', 'table']
			const idx = Math.max(0, modes.indexOf(this.viewMode))
			return {
				'cn-actions-bar__view-toggle-thumb--pos-1': idx === 1,
				'cn-actions-bar__view-toggle-thumb--pos-2': idx === 2,
			}
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
		 * Forward the inline search field's input to the host.
		 *
		 * @param {Event} event The native input event.
		 * @return {void}
		 */
		onSearchInput(event) {
			/**
			 * @event search Emitted when the user types in the inline search field.
			 * @type {string}
			 */
			this.$emit('search', event.target.value)
		},

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

		/**
		 * Emit declarations — invoked via the template `$emit(...)` sites.
		 * Listed here so vue-docgen-api picks up the events for the
		 * generated docs.
		 *
		 * @private
		 */
		_emitDocs() {
			/**
			 * @event view-mode-change User clicked one of the view-mode toggle buttons (Cards / Table). Payload is the selected mode string.
			 * @type {'cards' | 'table'}
			 */
			this.$emit('view-mode-change')
			/**
			 * @event add User clicked the primary Add button. No payload.
			 */
			this.$emit('add')
			/**
			 * @event refresh User clicked the Refresh entry in the overflow Actions menu. The host should re-fetch the underlying list.
			 */
			this.$emit('refresh')
			/**
			 * @event show-import User clicked the Import mass action. Host should open the import modal.
			 */
			this.$emit('show-import')
			/**
			 * @event show-export User clicked the Export mass action. Host should open the export modal.
			 */
			this.$emit('show-export')
			/**
			 * @event show-copy User clicked the Copy-selected mass action. Disabled while no row is selected.
			 */
			this.$emit('show-copy')
			/**
			 * @event show-delete User clicked the Delete-selected mass action. Disabled while no row is selected.
			 */
			this.$emit('show-delete')
			/**
			 * @event header-action User clicked a manifest-declared page-level header action. Payload: `{ action: id, id }`.
			 */
			this.$emit('header-action')
			/**
			 * @event toggle-sidebar User clicked the Search/Columns sidebar toggle. No payload.
			 */
			this.$emit('toggle-sidebar')
		},
	},
}
</script>

<!-- Styles in css/actions-bar.css -->
