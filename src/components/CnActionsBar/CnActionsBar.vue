<template>
	<div
		class="cn-actions-bar"
		:class="{ 'cn-actions-bar--board': isBoardLayout }"
		data-testid="cn-actions-bar"
		v-bind="$attrs">
		<!--
			Board look, row 1, in the order it is read and drawn: the quick-filter
			chips, the saved-view chips and Save view, the Filter button and the
			view switch. The act controls (sort, add, menus) follow in the
			cluster below; row 2 (search and the active filters) comes last.
		-->
		<div v-if="isBoardLayout" class="cn-actions-bar__row cn-actions-bar__row--views" data-testid="cn-actions-bar-row-views">
			<!-- @slot filters Inline filter controls (chips) at the start of the board look's row 1. -->
			<slot name="filters" />
			<!--
				@slot actions-end
				@description Under the board look: saved views as chips and the Save view button, in row 1 after the quick-filter chips.
			-->
			<slot name="actions-end" />
			<NcButton v-if="showSidebarToggle"
				variant="secondary"
				class="cn-actions-bar__filter-button"
				data-testid="cn-actions-bar-filter-button"
				:pressed="sidebarOpen"
				@click="$emit('toggle-sidebar')">
				<template #icon>
					<Tune :size="18" />
				</template>
				{{ t('nextcloud-vue', 'Filter') }}
				<span
					v-if="filterCount > 0"
					class="cn-actions-bar__filter-badge"
					data-testid="cn-actions-bar-filter-badge"
					:aria-label="filterCountLabel">{{ filterCount }}</span>
			</NcButton>
			<div v-if="showViewToggle && viewSegments.length > 1"
				class="cn-actions-bar__view-toggle"
				role="group"
				:aria-label="t('nextcloud-vue', 'View')">
				<button
					v-for="seg in viewSegments"
					:key="seg.mode"
					type="button"
					class="cn-actions-bar__view-toggle-btn"
					:class="{ 'cn-actions-bar__view-toggle-btn--active': viewMode === seg.mode }"
					:aria-pressed="viewMode === seg.mode"
					:aria-label="seg.label"
					:title="seg.label"
					@click="$emit('view-mode-change', seg.mode)">
					<CnIcon v-if="seg.icon"
						:name="seg.icon"
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
					<component :is="seg.fallback"
						v-else
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
				</button>
			</div>
		</div>
		<div v-if="!isBoardLayout" class="cn-actions-bar__info">
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
			<span v-else-if="showCount && hasTotal" class="cn-actions-bar__count">
				{{ countText }}
			</span>
			<!-- @slot after-search Refinement controls rendered beside the search field on the LEFT side of the bar (e.g. a filter menu button). Convention: the left side groups the VISUAL controls — search, filters, view toggle — while the right cluster holds the ACT controls (add, overflow); the standalone sort select is a display control too but keeps its legacy right-side placement. -->
			<slot name="after-search" />
			<!-- Counter beside the search (`showCountWithSearch`): after the search and its #after-search controls. The live region stays mounted while there is no total, so results coming back after none are announced too. -->
			<span v-if="showCount && showSearch && showCountWithSearch"
				class="cn-actions-bar__count cn-actions-bar__count--beside-search"
				:class="{ 'cn-actions-bar__count--empty': !hasTotal }"
				aria-live="polite">{{ hasTotal ? countText : '' }}</span>

			<!-- View mode toggle (Cards / Table / List) — segmented control with
			     a sliding thumb that animates between the N segments. Lives in
			     the LEFT info group: switching view is a visual control like
			     search and filters, it adds nothing — so it groups with them at
			     every width instead of riding with the act buttons. -->
			<div v-if="showViewToggle && viewSegments.length > 1"
				class="cn-actions-bar__view-toggle"
				role="group"
				:aria-label="isBoardLayout ? t('nextcloud-vue', 'View') : t('nextcloud-vue', 'View mode')">
				<!-- Sliding pill that sits behind the active segment. Width and
				     offset are driven by the segment count so the same markup
				     works for 2–4 segments (cards / table / list / map). -->
				<span
					v-if="!isBoardLayout"
					class="cn-actions-bar__view-toggle-thumb"
					:style="thumbStyle"
					aria-hidden="true" />
				<!--
					@event view-mode-change
					@description User clicked one of the view-mode toggle buttons (Cards / Table / List / Map). Payload is the selected mode string.
					@type {'cards' | 'table' | 'list' | 'map'}
				-->
				<button
					v-for="seg in viewSegments"
					:key="seg.mode"
					type="button"
					class="cn-actions-bar__view-toggle-btn"
					:class="{ 'cn-actions-bar__view-toggle-btn--active': viewMode === seg.mode }"
					:aria-pressed="viewMode === seg.mode"
					:aria-label="isBoardLayout ? seg.label : null"
					:title="isBoardLayout ? seg.label : null"
					@click="$emit('view-mode-change', seg.mode)">
					<CnIcon v-if="seg.icon"
						:name="seg.icon"
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
					<component :is="seg.fallback"
						v-else
						:size="24"
						class="cn-actions-bar__view-toggle-icon" />
					<span v-if="!isBoardLayout" class="cn-actions-bar__view-toggle-label">{{ seg.label }}</span>
				</button>
			</div>
		</div>
		<div class="cn-actions-bar__actions">
			<!-- Sort select (opt-in). A standalone sort control for card/list
			     views, which — unlike the table — have no sortable column
			     headers. A leading sort icon replaces a visible "Sort by"
			     label so the control stays on one line; the label is kept as
			     the combobox's accessible name. -->
			<div v-if="showSortSelect && sortOptions.length" class="cn-actions-bar__sort">
				<SortVariant :size="20" class="cn-actions-bar__sort-icon" :aria-label="sortLabel" />
				<NcSelect
					class="cn-actions-bar__sort-select"
					:modelValue="selectedSortOption"
					:options="sortOptions"
					:reduce="opt => opt.value"
					:clearable="false"
					:aria-label-combobox="sortLabel"
					label="label"
					@update:modelValue="onSortChange" />
			</div>

			<!-- @slot filters Inline filter controls rendered inside the action bar, between the view toggle and the add/actions (e.g. a CnQuickFilterBar segmented toggle). -->
			<slot v-if="!isBoardLayout" name="filters" />

			<!-- Search / Columns sidebar toggle (opt-in). Icon-only; reflects the
			     open state via aria-pressed so the index sidebar can default
			     closed and be opened on demand. -->
			<!--
				@event toggle-sidebar
				@description User clicked the Search/Columns sidebar toggle. No payload — the host flips the sidebar open state.
			-->
			<NcButton v-if="showSidebarToggle && !isBoardLayout"
				variant="tertiary"
				:aria-label="t('nextcloud-vue', 'Search and columns')"
				:title="t('nextcloud-vue', 'Search and columns')"
				:pressed="sidebarOpen"
				@click="$emit('toggle-sidebar')">
				<template #icon>
					<Tune :size="20" />
				</template>
			</NcButton>

			<!--
				@slot actions
				@description Custom buttons rendered between the sidebar toggle and the primary Add button.
			-->
			<slot name="actions" />

			<!--
				@event add
				@description User clicked the primary Add button. No payload.
			-->
			<!-- With `addHref` / `addTo` the button is a real link (middle-click, new tab), and still emits `add`, except on a modified click, which opens a new tab. -->
			<NcButton v-if="showAdd"
				variant="primary"
				:disabled="addDisabled"
				:href="addLink ? addLink.href : undefined"
				data-testid="cn-cta-primary"
				data-walkthrough-id="index-add"
				@click="onAddClick">
				<template #icon>
					<CnIcon v-if="addIcon" :name="addIcon" :size="20" />
					<Plus v-else :size="20" />
				</template>
				{{ addLabel }}
			</NcButton>

			<!--
				@slot actions-end
				@description Custom buttons (e.g. CnIndexPage's saved-views control) rendered AFTER the primary Add button, immediately before the overflow menu — for content that belongs grouped with "browse/manage" controls rather than with the app-specific buttons in `#actions`.
			-->
			<slot v-if="!isBoardLayout" name="actions-end" />

			<!-- In-app edit button (ADR-041): icon-only, self-wires from CnAppRoot.
			     The board look draws it in the page header instead. -->
			<CnBuildiqEditButton v-if="showBuildiqButton" />

			<!-- Actions menu (Refresh, Import, Export, mass actions) -->
			<NcActions
				v-if="showActionsMenu"
				:forceName="true"
				:inline="inlineActionCount"
				:menuName="actionsMenuName"
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
					target="_blank">
					<template #icon>
						<BookOpenVariantOutline :size="20" />
					</template>
					{{ documentationLabel }}
				</NcActionLink>

				<!-- Manifest-declared page-level header actions (overflow); an entry with `href` / `to` is a real link. -->
				<template v-for="{ entry, link } in renderedHeaderActions" :key="entry.id">
					<NcActionLink
						v-if="link"
						:href="link.href"
						:target="link.target"
						closeAfterClick
						@click="onHeaderLinkClick(entry, link, $event)">
						<template #icon>
							<CnIcon v-if="entry.icon && isMdiIconName(entry.icon)" :name="entry.icon" :size="20" />
							<span v-else-if="entry.icon"
								class="cn-actions-bar__header-action-icon"
								:class="[entry.icon]" />
						</template>
						{{ entry.label ? effectiveTranslate(entry.label) : entry.label }}
					</NcActionLink>
					<NcActionButton
						v-else
						:disabled="Boolean(entry.disabled)"
						@click="$emit('header-action', { action: entry.id, id: entry.id })">
						<template #icon>
							<CnIcon v-if="entry.icon && isMdiIconName(entry.icon)" :name="entry.icon" :size="20" />
							<span v-else-if="entry.icon"
								class="cn-actions-bar__header-action-icon"
								:class="[entry.icon]" />
						</template>
						{{ entry.label ? effectiveTranslate(entry.label) : entry.label }}
					</NcActionButton>
				</template>

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
				<slot name="mass-actions" :count="selectedIds.length" :selectedIds="selectedIds" />
			</NcActions>
		</div>

		<!-- Board look, row 2: the search field, then the active filters. -->
		<div v-if="isBoardLayout" class="cn-actions-bar__row cn-actions-bar__row--search" data-testid="cn-actions-bar-row-search">
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
			<span v-else-if="showCount && hasTotal" class="cn-actions-bar__count">
				{{ countText }}
			</span>
			<slot name="after-search" />
			<!-- Board look, row 2: the active filters as removable chips and a
			     "Clear all" link, after the search field. -->
			<template v-if="activeFilterChips.length > 0">
				<span class="cn-actions-bar__active-label" data-testid="cn-actions-bar-active-label">{{ t('nextcloud-vue', 'Active:') }}</span>
				<span
					v-for="chip in activeFilterChips"
					:key="chip.key"
					class="cn-actions-bar__filter-chip"
					data-testid="cn-actions-bar-filter-chip">
					<span class="cn-actions-bar__filter-chip-label">{{ chip.label }}</span>
					<button
						type="button"
						class="cn-actions-bar__filter-chip-remove"
						:aria-label="removeFilterLabel(chip)"
						@click="$emit('remove-filter', chip)">
						<Close :size="14" aria-hidden="true" />
					</button>
				</span>
				<button
					type="button"
					class="cn-actions-bar__clear-all"
					data-testid="cn-actions-bar-clear-all"
					@click="$emit('clear-filters')">
					{{ t('nextcloud-vue', 'Clear all') }}
				</button>
			</template>
			<span v-if="showCount && showSearch && showCountWithSearch"
				class="cn-actions-bar__count cn-actions-bar__count--beside-search"
				:class="{ 'cn-actions-bar__count--empty': !hasTotal }"
				aria-live="polite">{{ hasTotal ? countText : '' }}</span>
		</div>

		<!-- Always-present live region for the selection count (WCAG 2.1
		     SC 4.1.3 Status Messages): a `role="status"` element must exist
		     BEFORE its content changes for assistive tech to announce it, so
		     it cannot live inside the v-if'd strip below. -->
		<span class="cn-actions-bar__sr-status" role="status">
			{{ selectable && selectedIds.length > 0 ? selectionCountText : '' }}
		</span>

		<!-- Contextual selection strip (the Proton Pass / Gmail / Files
		     pattern): appears while a selection is active, carrying the
		     visible count, the built-in selection-scoped mass actions, the
		     host's own bulk buttons (#selection-actions) and a Clear control.
		     This strip is the discoverable surface for bulk actions; the
		     BUILT-IN Copy/Delete-selected also stay listed in the overflow
		     menu above, while a host decides for its own actions (strip-only
		     is fine — keepiq does exactly that). -->
		<div
			v-if="!isBoardLayout && selectable && selectedIds.length > 0"
			class="cn-actions-bar__selection"
			data-testid="cn-selection-strip">
			<span class="cn-actions-bar__selection-count" aria-hidden="true">
				{{ selectionCountText }}
			</span>
			<NcButton
				v-if="showMassCopy"
				variant="secondary"
				@click="$emit('show-copy')">
				<template #icon>
					<ContentCopy :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Copy selected') }}
			</NcButton>
			<NcButton
				v-if="showMassDelete"
				variant="secondary"
				@click="$emit('show-delete')">
				<template #icon>
					<TrashCanOutline :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Delete selected') }}
			</NcButton>
			<!--
				Declarative bulk actions, from `bulkActions`. They render in the
				SAME strip as a host's slot buttons and before them, so a page
				that declares some in its manifest and hand-writes others gets
				one row of buttons rather than two groups in different places.
				@event bulk-action
				@description User clicked a declarative bulk action. Payload carries the action id AND the selection, because a bulk action without its selection is not a bulk action.
			-->
			<NcButton
				v-for="entry in bulkActions"
				:key="entry.id"
				variant="secondary"
				:disabled="entry.disabled === true"
				:data-testid="`cn-bulk-action-${entry.id}`"
				:lang="bulkLang(entry)"
				@click="$emit('bulk-action', { id: entry.id, action: entry.id, selectedIds, count: selectedIds.length })">
				{{ entry.label ? effectiveTranslate(entry.label) : entry.label }}
			</NcButton>
			<!--
				@slot selection-actions The host app's bulk-action buttons (NcButton family), rendered inside the contextual selection strip that appears while a selection is active. This strip is the primary bulk-actions surface; #mass-actions remains available for hosts that ALSO want the actions listed in the overflow menu (optional — strip-only is fine).
				@binding {number} count Length of the current selection.
				@binding {Array<string|number>} selected-ids The selected row ids.
			-->
			<slot
				name="selection-actions"
				:count="selectedIds.length"
				:selectedIds="selectedIds" />
			<!--
				@event clear-selection
				@description User clicked the selection strip's Clear control. The host should empty its selection (CnIndexPage does this for you and re-emits `select` with an empty array).
			-->
			<!-- No aria-label: the visible "Clear selection" text IS the
			     accessible name (review: an override here is redundant). -->
			<NcButton
				class="cn-actions-bar__selection-clear"
				variant="tertiary"
				@click="$emit('clear-selection')">
				<template #icon>
					<Close :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Clear selection') }}
			</NcButton>
		</div>
	</div>

	<!--
		Board look: the bulk band is its own row between the toolbar and the
		table card, outside the toolbar element, and only while rows are
		selected. The count stays announced by the live region above.
	-->
	<div
		v-if="isBoardLayout && selectable && selectedIds.length > 0"
		class="cn-actions-bar__band"
		role="region"
		:aria-label="t('nextcloud-vue', 'Actions for the selection')"
		data-testid="cn-bulk-band">
		<strong class="cn-actions-bar__band-lead">{{ bulkBandLead }}</strong>
		<NcButton
			v-if="showMassCopy"
			variant="secondary"
			@click="$emit('show-copy')">
			{{ t('nextcloud-vue', 'Copy selected') }}
		</NcButton>
		<NcButton
			v-if="showMassDelete"
			variant="secondary"
			@click="$emit('show-delete')">
			{{ t('nextcloud-vue', 'Delete selected') }}
		</NcButton>
		<NcButton
			v-for="entry in bulkActions"
			:key="entry.id"
			variant="secondary"
			:disabled="entry.disabled === true"
			:data-testid="`cn-bulk-action-${entry.id}`"
			:lang="bulkLang(entry)"
			@click="$emit('bulk-action', { id: entry.id, action: entry.id, selectedIds, count: selectedIds.length })">
			{{ entry.label ? effectiveTranslate(entry.label) : entry.label }}
		</NcButton>
		<slot
			name="selection-actions"
			:count="selectedIds.length"
			:selectedIds="selectedIds" />
		<span v-if="bulkHint" class="cn-actions-bar__band-hint" data-testid="cn-bulk-band-hint">{{ bulkHint }}</span>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActionLink, NcActions, NcActionSeparator, NcButton, NcLoadingIcon, NcSelect } from '@nextcloud/vue'
import BookOpenVariantOutline from 'vue-material-design-icons/BookOpenVariantOutline.vue'
import CalendarMonthOutline from 'vue-material-design-icons/CalendarMonthOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import Export from 'vue-material-design-icons/Export.vue'
import FormatListBulletedSquare from 'vue-material-design-icons/FormatListBulletedSquare.vue'
import Import from 'vue-material-design-icons/Import.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import MapMarkerOutline from 'vue-material-design-icons/MapMarkerOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Refresh from 'vue-material-design-icons/Refresh.vue'
import SortVariant from 'vue-material-design-icons/SortVariant.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Tune from 'vue-material-design-icons/Tune.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import ViewGridOutline from 'vue-material-design-icons/ViewGridOutline.vue'
import ViewListOutline from 'vue-material-design-icons/ViewListOutline.vue'
import CnBuildiqEditButton from '../CnBuildiqEditButton/CnBuildiqEditButton.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { followItemActionLink, resolveItemActionLink } from '../../utils/actionLink.js'
import { isModifiedClick } from '../../utils/linkNavigation.js'
import { labelLang } from '../../utils/manifestTranslate.js'
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
		CnBuildiqEditButton,
		NcActions,
		NcActionButton,
		NcActionLink,
		NcActionSeparator,
		NcButton,
		NcLoadingIcon,
		NcSelect,
		CnIcon,
		SortVariant,
		BookOpenVariantOutline,
		Close,
		Plus,
		Refresh,
		ContentCopy,
		TrashCanOutline,
		Import,
		Export,
		Magnify,
		Tune,
		ViewColumnOutline,
		ViewGridOutline,
		FormatListBulletedSquare,
		CalendarMonthOutline,
		MapMarkerOutline,
	},

	inject: {
		/** The look CnAppRoot provides; `board` draws the two-row toolbar. */
		cnLook: { default: 'nextcloud' },
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored `headerActions[].label` is run through it — the
		 * entry is keyed and emitted by `id`, so only the visible text
		 * changes. Defaults to an identity function so an untranslated key
		 * renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
	},

	// Attributes go on the toolbar element, not on the fragment (the toolbar
	// plus, under the board look, the bulk band).
	inheritAttrs: false,

	props: {
		/**
		 * `board` draws the toolbar of the board look: no band, two rows (saved
		 * views, Filter and the view switch; then the search field and the
		 * active filters). Empty follows the `cnLook` the app provides.
		 *
		 * @type {('' | 'board' | 'nextcloud')}
		 * @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-toolbar-sits-on-the-ground-in-two-rows
		 */
		layout: {
			type: String,
			default: '',
		},

		/**
		 * The active filters as chips for row 2 of the board toolbar:
		 * `{ key, label }`, the label reading "Team: Woo". Removing one emits
		 * `remove-filter` with the chip; "Clear all" emits `clear-filters`.
		 *
		 * @type {Array<{key: string, label: string}>}
		 */
		activeFilterChips: {
			type: Array,
			default: () => [],
		},

		/**
		 * The number on the Filter button's badge. Empty (`null`) counts the
		 * `activeFilterChips`.
		 *
		 * @type {(number|null)}
		 */
		activeFilterCount: {
			type: Number,
			default: null,
		},

		/**
		 * Whether the bar draws the in-app buildiq edit button. A page that
		 * draws it in its own header (the board look) passes false so there
		 * is one square, not two.
		 */
		showBuildiqButton: {
			type: Boolean,
			default: true,
		},

		/** The plural the board bulk band names ("With the selected cases"). */
		bulkNoun: {
			type: String,
			default: '',
		},

		/** The 13px hint after the board bulk band's buttons (`config.bulkHint`). */
		bulkHint: {
			type: String,
			default: '',
		},

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

		/**
		 * URL the Add button links to. Makes the button a real link (middle-click,
		 * open in new tab) that still emits `add` on click. `addTo` is ignored when set.
		 *
		 * @type {string|null}
		 */
		addHref: {
			type: String,
			default: null,
		},

		/**
		 * vue-router location (path or `{ name, params }`) the Add button links to.
		 * The button becomes a real link whose plain click routes in place and still
		 * emits `add`; the host must then not navigate on `add` itself. Ignored when
		 * the router cannot resolve it.
		 *
		 * @type {string|object|null}
		 */
		addTo: {
			type: [String, Object],
			default: null,
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

		/** Current view mode: 'table', 'cards', 'list', or 'map' */
		viewMode: {
			type: String,
			default: 'table',
			validator: (v) => ['table', 'cards', 'list', 'map', 'calendar'].includes(v),
		},

		/**
		 * Which view-mode segments to render, in order. Defaults to the
		 * historical two-segment control; add `'list'` to expose the list view.
		 *
		 * @type {Array<'cards' | 'table' | 'list' | 'calendar'>}
		 */
		availableViewModes: {
			type: Array,
			default: () => ['cards', 'table'],
			validator: (modes) => modes.every((m) => ['cards', 'table', 'list', 'calendar'].includes(m)),
		},

		/** Whether to show the view-mode toggle */
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

		/** Whether to render the "Map" segment in the view toggle (back-compat bridge; equivalent to adding 'map' to `availableViewModes`). */
		showMap: {
			type: Boolean,
			default: false,
		},

		/** Label for the map view-toggle option (defaults to "Map"). */
		mapLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the map option (defaults to the built-in map-marker icon). Resolved via CnIcon. */
		mapIcon: {
			type: String,
			default: '',
		},

		/** Label for the list view-toggle option (defaults to "List") */
		listLabel: {
			type: String,
			default: '',
		},

		/** MDI icon name for the list option (defaults to the built-in list icon). Resolved via CnIcon. */
		listIcon: {
			type: String,
			default: '',
		},

		/** Show a standalone sort dropdown (useful in card/list views). */
		showSortSelect: {
			type: Boolean,
			default: false,
		},

		/**
		 * Options for the sort dropdown.
		 *
		 * @type {Array<{ value: string, label: string }>}
		 */
		sortOptions: {
			type: Array,
			default: () => [],
		},

		/** The currently selected sort option value (controlled). */
		sortValue: {
			type: String,
			default: '',
		},

		/** Accessible label for the sort dropdown. */
		sortLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Sort by'),
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

		/**
		 * Keep the "Showing X of Y" counter visible beside the inline search field,
		 * after any `#after-search` controls. By default the search field takes the
		 * counter's place. No effect without `showSearch`.
		 */
		showCountWithSearch: {
			type: Boolean,
			default: false,
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
		 * Whether the "Showing 20 of 258" line renders where the search field
		 * is not. `false` drops it, for a page whose title line already says
		 * how many there are. True by default.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 */
		showCount: {
			type: Boolean,
			default: true,
		},

		/**
		 * Whether the overflow Actions menu (Refresh, Import, Export, mass
		 * actions, header actions) renders. `false` drops it, for a page that
		 * offers its actions as buttons elsewhere (CnIndexPage
		 * `headerButtons`). True by default.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-index-page-can-take-the-board-header
		 */
		showActionsMenu: {
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
		 * resolution happens upstream (CnIndexPage). An entry with `href`
		 * (URL) or `to` (vue-router location) renders as a real link, with
		 * `linkTarget` as its `target`; it still emits `header-action`, so the
		 * host must not navigate for it again.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, disabled?: boolean, href?: string, to?: string|object, linkTarget?: string }>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Declarative bulk actions, rendered in the contextual selection strip
		 * that appears while a selection is active.
		 *
		 * The strip already had a `#selection-actions` slot, which only a
		 * hand-written host component can fill — so a page declared in an app
		 * manifest could carry row actions and header actions but never a bulk
		 * one. This prop is that missing vocabulary; the slot stays, and both
		 * render side by side in one row.
		 *
		 * Clicking emits `bulk-action` with the id AND the current selection.
		 *
		 * @type {Array<{ id: string, label: string, icon?: string, disabled?: boolean }>}
		 */
		bulkActions: {
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

	emits: [
		'add',
		'bulk-action',
		'clear-filters',
		'clear-selection',
		'header-action',
		'refresh',
		'remove-filter',
		'search',
		'show-copy',
		'show-delete',
		'show-export',
		'show-import',
		'sort-change',
		'toggle-sidebar',
		'view-mode-change',
	],

	computed: {
		/**
		 * Whether the board toolbar is drawn: the `layout` prop, else the look
		 * the app provides.
		 *
		 * @return {boolean}
		 */
		isBoardLayout() {
			if (this.layout) {
				return this.layout === 'board'
			}
			return normalizeLook(this.cnLook) === 'board'
		},

		/**
		 * The number on the Filter button.
		 *
		 * @return {number}
		 */
		filterCount() {
			return typeof this.activeFilterCount === 'number' ? this.activeFilterCount : this.activeFilterChips.length
		},

		/**
		 * The accessible name of the Filter badge.
		 *
		 * @return {string}
		 */
		filterCountLabel() {
			return t('nextcloud-vue', '{count} active', { count: this.filterCount })
		},

		/**
		 * The bold lead of the board bulk band.
		 *
		 * @return {string}
		 */
		bulkBandLead() {
			return t('nextcloud-vue', 'With the selected {plural}', { plural: this.bulkNoun || t('nextcloud-vue', 'items') })
		},

		/**
		 * Name of the overflow Actions menu. Library chrome, so it resolves
		 * against the LIBRARY catalogue — it was a bare `menu-name="Actions"`
		 * literal, which rendered "Actions" in a Dutch session next to an
		 * otherwise fully translated toolbar even though the catalogue has
		 * carried "Acties" all along.
		 *
		 * @return {string}
		 */
		actionsMenuName() {
			return t('nextcloud-vue', 'Actions')
		},

		/**
		 * The selection strip's count text — also fed to the always-present
		 * `role="status"` live region (WCAG 2.1 SC 4.1.3), so assistive tech
		 * announces selection changes without focus moving.
		 *
		 * @return {string}
		 */
		selectionCountText() {
			return t('nextcloud-vue', '{count} selected', { count: this.selectedIds.length })
		},

		/**
		 * Effective translate function: the injected `cnTranslate` (the host
		 * app's bound `t()`), identity by default.
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
		},

		/**
		 * The link the Add button renders as, or null for a plain button.
		 *
		 * @return {object|null}
		 */
		addLink() {
			if (this.addDisabled) {
				return null
			}
			return resolveItemActionLink({ href: this.addHref, to: this.addTo }, null, this.$router)
		},

		/**
		 * Header actions paired with the link each renders as (null for a button).
		 *
		 * @return {Array<{entry: object, link: object|null}>}
		 */
		renderedHeaderActions() {
			return (this.headerActions || []).map((entry) => ({
				entry,
				link: entry.disabled ? null : resolveItemActionLink(entry, null, this.$router),
			}))
		},

		/**
		 * Whether there is a non-empty total for the "Showing X of Y" counter.
		 *
		 * @return {boolean}
		 */
		hasTotal() {
			return Boolean(this.pagination && this.pagination.total > 0)
		},

		countText() {
			if (!this.pagination) {
				return ''
			}
			return t('nextcloud-vue', 'Showing {count} of {total}', { count: this.objectCount, total: this.pagination.total })
		},

		/**
		 * The view-toggle segments (label + icon) derived from `availableViewModes`,
		 * with a back-compat bridge that appends the map segment when the beta-era
		 * `showMap` prop is set. `icon` is a CnIcon name (empty → the built-in
		 * `fallback` component).
		 */
		viewSegments() {
			const defs = {
				cards: { label: this.cardsLabel || t('nextcloud-vue', 'Cards'), icon: this.cardsIcon, fallback: ViewGridOutline },
				table: { label: this.tableLabel || t('nextcloud-vue', 'Table'), icon: this.tableIcon, fallback: FormatListBulletedSquare },
				list: { label: this.listLabel || t('nextcloud-vue', 'List'), icon: this.listIcon, fallback: ViewListOutline },
				map: { label: this.mapLabel || t('nextcloud-vue', 'Map'), icon: this.mapIcon, fallback: MapMarkerOutline },
				calendar: { label: t('nextcloud-vue', 'Calendar'), icon: '', fallback: CalendarMonthOutline },
			}
			const modes = [...this.availableViewModes]
			if (this.showMap && !modes.includes('map')) {
				modes.push('map')
			}
			if (this.isBoardLayout) {
				// The board look's fixed order: table, cards, board, map, each
				// only when the page offers it. A mode the board switch does not
				// name (list, calendar) follows, so it is never lost.
				defs.board = { label: t('nextcloud-vue', 'Board'), icon: '', fallback: ViewColumnOutline }
				const fixed = ['table', 'cards', 'board', 'map']
				const rest = modes.filter((mode) => !fixed.includes(mode))
				return [...fixed.filter((mode) => modes.includes(mode)), ...rest]
					.filter((mode) => defs[mode])
					.map((mode) => ({ mode, ...defs[mode] }))
			}
			return modes
				.filter((mode) => defs[mode])
				.map((mode) => ({ mode, ...defs[mode] }))
		},

		/** The full sort option object matching `sortValue` (for NcSelect). */
		selectedSortOption() {
			return this.sortOptions.find((o) => o.value === this.sortValue) || null
		},

		/** Sliding-thumb width + offset, driven by the active segment index. */
		thumbStyle() {
			const count = this.viewSegments.length || 1
			const activeIndex = Math.max(0, this.viewSegments.findIndex((s) => s.mode === this.viewMode))
			return {
				width: `calc((100% - 8px) / ${count})`,
				transform: `translateX(${activeIndex * 100}%)`,
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
			const slot = this.$slots['action-items']
			if (!slot) {
				return 0
			}
			const vnodes = slot() || []
			return vnodes.filter((n) => n && (n.tag !== undefined || n.componentOptions !== undefined)).length
		},

		/**
		 * The separator is meaningful only when at least one pre-separator action
		 * button (Refresh + #action-items) still ends up inside the overflow
		 * dropdown after NcActions hoists the first `inlineActionCount` buttons
		 * inline. Pre-separator items: 1 (Refresh) + actionItemsCount.
		 */
		showActionsSeparator() {
			if (!this.hasMassActions) {
				return false
			}
			if (!this.$slots['action-items']) {
				return false
			}
			const preSeparatorOverflow = 1 + this.actionItemsCount - this.inlineActionCount
			return preSeparatorOverflow > 0
		},
	},

	methods: {
		/**
		 * The accessible name of a filter chip's remove button.
		 *
		 * @param {{label: string}} chip The chip.
		 * @return {string}
		 */
		removeFilterLabel(chip) {
			return t('nextcloud-vue', 'Remove filter: {label}', { label: chip.label })
		},

		/**
		 * The `lang` of a bulk action label that fell back to its written text in another language.
		 *
		 * @param {object} entry The bulk action.
		 * @return {string|undefined} The source language, or undefined.
		 */
		bulkLang(entry) {
			return labelLang(this.cnTranslate, entry.label) || undefined
		},

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
		 * Forward the standalone sort dropdown's selection to the host.
		 *
		 * @param {string} value The chosen option's `value`.
		 * @return {void}
		 */
		onSortChange(value) {
			/**
			 * @event sort-change Emitted when the user picks an option from the standalone sort dropdown.
			 * @type {string} The chosen option's `value`.
			 */
			this.$emit('sort-change', value)
		},

		/**
		 * Add button click: a plain click on an in-app link routes in place,
		 * anything else on a link is the browser's. Emits `add`, except for a
		 * modified click on a link, which opens in a new tab: a host `@add`
		 * would otherwise run in the tab the user is leaving.
		 *
		 * @param {MouseEvent} event The click event.
		 */
		onAddClick(event) {
			if (this.addLink) {
				if (isModifiedClick(event)) {
					return
				}
				followItemActionLink(event, this.addLink, this.$router)
			}
			this.$emit('add')
		},

		/**
		 * A header link entry was clicked: route a plain in-app click and emit
		 * `header-action` as the button would. A modified click is the
		 * browser's alone (a new tab), so nothing is emitted for it.
		 *
		 * @param {object} entry The header action.
		 * @param {object} link The resolved link.
		 * @param {MouseEvent} event The click event.
		 */
		onHeaderLinkClick(entry, link, event) {
			if (isModifiedClick(event)) {
				return
			}
			followItemActionLink(event, link, this.$router)
			this.$emit('header-action', { action: entry.id, id: entry.id })
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
			if (!name || typeof name !== 'string') {
				return false
			}
			if (name.startsWith('icon-')) {
				return false
			}
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
			/**
			 * @event clear-selection User clicked the selection strip's Clear control. No payload — the host should empty its selection (CnIndexPage does this and re-emits `select` with an empty array).
			 */
			this.$emit('clear-selection')
			/**
			 * @event remove-filter User removed an active filter chip (board look). Payload: the chip `{ key, label }`.
			 */
			this.$emit('remove-filter')
			/**
			 * @event clear-filters User clicked "Clear all" beside the active filter chips (board look). No payload.
			 */
			this.$emit('clear-filters')
		},
	},
}
</script>

<!-- Styles in css/actions-bar.css -->
