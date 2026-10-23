<template>
	<NcAppSidebar
		ref="appSidebar"
		v-model:open="internalOpen"
		class="cn-index-sidebar-panel"
		:name="resolvedName"
		:title="resolvedName"
		:subname="resolvedSubname"
		:active="internalActiveTab"
		:compact="!!resolvedIcon"
		@close="$emit('update:open', false)"
		@update:active="onTabChange">
		<!-- Schema icon in sidebar header -->
		<template v-if="resolvedIcon" #header>
			<div class="cn-index-sidebar__header-icon">
				<CnIcon :name="resolvedIcon" :size="32" />
			</div>
		</template>

		<!-- Search Tab -->
		<NcAppSidebarTab
			id="search-tab"
			:name="searchTabLabel"
			:order="1">
			<template #icon>
				<FilterOutline :size="20" />
			</template>

			<div class="cn-index-sidebar__tab-content">
				<div v-if="$slots['search-above']" class="cn-index-sidebar__section">
					<slot name="search-above" />
				</div>

				<div class="cn-index-sidebar__section">
					<NcTextField
						:modelValue="searchValue || ''"
						:placeholder="searchPlaceholder"
						:label="searchLabel"
						@update:modelValue="$emit('search', $event)" />
				</div>

				<!-- Sort (list, card and map views; the table sorts by its headers):
				     the field, the direction and the order the list has now. -->
				<div v-if="sortOptions.length > 0" class="cn-index-sidebar__section cn-index-sidebar__sort" data-testid="cn-index-sidebar-sort">
					<h3>{{ t('nextcloud-vue', 'Sort') }}</h3>
					<NcSelect
						:modelValue="sortSelected"
						:options="sortOptions"
						label="label"
						:clearable="false"
						:inputLabel="t('nextcloud-vue', 'Sort by')"
						@update:modelValue="onSortField" />
					<template v-if="isBoardLook">
						<h4 :id="sortDirectionLabelId" class="cn-index-sidebar__sort-direction-label">
							{{ t('nextcloud-vue', 'Direction') }}
						</h4>
						<CnSegmentedControl
							class="cn-index-sidebar__sort-direction-segments"
							data-testid="cn-index-sidebar-sort-direction-segments"
							stretch
							:options="sortDirectionOptions"
							:modelValue="sortDirection"
							:ariaLabelledby="sortDirectionLabelId"
							@update:modelValue="onSortDirection">
							<template #option="{ option }">
								<ArrowUp v-if="option.value === 'asc'" :size="16" />
								<ArrowDown v-else :size="16" />
								<span class="cn-segmented-control__label">{{ option.label }}</span>
							</template>
						</CnSegmentedControl>
					</template>
					<div v-else
						class="cn-index-sidebar__sort-direction"
						role="radiogroup"
						:aria-label="t('nextcloud-vue', 'Direction')">
						<NcCheckboxRadioSwitch
							type="radio"
							name="cn-index-sidebar-sort-direction"
							value="asc"
							:modelValue="sortDirection"
							:disabled="!sortSelected || sortSelected.fixed === true"
							@update:modelValue="onSortDirection">
							{{ t('nextcloud-vue', 'Ascending') }}
						</NcCheckboxRadioSwitch>
						<NcCheckboxRadioSwitch
							type="radio"
							name="cn-index-sidebar-sort-direction"
							value="desc"
							:modelValue="sortDirection"
							:disabled="!sortSelected || sortSelected.fixed === true"
							@update:modelValue="onSortDirection">
							{{ t('nextcloud-vue', 'Descending') }}
						</NcCheckboxRadioSwitch>
					</div>
					<p class="cn-index-sidebar__sort-current" data-testid="cn-index-sidebar-sort-current">
						{{ currentSortText }}
					</p>
				</div>

				<div v-if="hasActiveFilters" class="cn-index-sidebar__section">
					<NcButton variant="tertiary" @click="onClearAll">
						<template #icon>
							<FilterRemoveOutline :size="20" />
						</template>
						{{ clearAllLabel }}
					</NcButton>
				</div>

				<div v-if="schemaFilters.length > 0" class="cn-index-sidebar__section">
					<h3>{{ filtersLabel }}</h3>
					<div
						v-for="filter in schemaFilters"
						:key="filter.key"
						class="cn-index-sidebar__filter-group">
						<div class="cn-index-sidebar__filter-header">
							<span class="cn-index-sidebar__filter-label">{{ filter.label }}</span>
							<NcPopover v-if="filter.description" popupRole="dialog">
								<template #trigger>
									<NcButton
										variant="tertiary-no-background"
										:aria-label="filter.label + ' info'"
										class="cn-index-sidebar__info-btn">
										<template #icon>
											<InformationOutline :size="16" />
										</template>
									</NcButton>
								</template>
								<p class="cn-index-sidebar__filter-description">
									{{ filter.description }}
								</p>
							</NcPopover>
						</div>
						<!-- A window, not a list of values: two bounds and a
						     preset, emitted as the `{ from, to }` the range
						     filters upstream are already spelled in. -->
						<CnDateRangePicker
							v-if="filter.type === 'date-range'"
							class="cn-index-sidebar__date-range"
							:modelValue="getRangeValue(filter)"
							:presets="filter.presets || rangePresets"
							:fromLabel="filter.fromLabel || fromLabel"
							:toLabel="filter.toLabel || toLabel"
							:presetLabel="filter.label"
							@update:modelValue="onRangeChange(filter.key, $event)" />
						<NcTextField
							v-else-if="filter.type === 'text'"
							class="cn-index-sidebar__filter-text"
							:modelValue="getTextValue(filter)"
							:label="filter.label"
							:placeholder="filter.label"
							@update:modelValue="onTextChange(filter.key, $event)" />
						<NcSelect
							v-else
							class="cn-index-sidebar__select"
							:modelValue="getSelectedFilterOptions(filter)"
							:options="getFilterOptions(filter)"
							:loading="isLoadingOptions(filter)"
							placeholder="Select..."
							:inputLabel="filter.label"
							:multiple="filter.multiple !== false"
							:keepOpen="filter.multiple !== false"
							:clearable="true"
							@update:modelValue="onFilterChange(filter.key, $event)" />
					</div>
				</div>

				<slot name="search-extra" />
			</div>
		</NcAppSidebarTab>

		<!-- Columns Tab -->
		<NcAppSidebarTab
			id="columns-tab"
			:name="columnsTabLabel"
			:order="2">
			<template #icon>
				<ViewColumnOutline :size="20" />
			</template>

			<div class="cn-index-sidebar__tab-content">
				<div class="cn-sidebar-columns">
					<h3>{{ columnsHeading }}</h3>
					<p class="cn-sidebar-columns__description">
						{{ columnsDescription }}
					</p>

					<!-- Order and pin the visible columns. Drag and the Move buttons
					     call the same method (moveColumn); the table header is not a drag target. -->
					<div
						v-if="personalColumns && orderedVisible.length > 0"
						class="cn-sidebar-columns__order"
						data-testid="cn-sidebar-columns-order">
						<h4>{{ t('nextcloud-vue', 'Order and pin') }}</h4>
						<ol class="cn-sidebar-columns__order-list">
							<li
								v-for="(item, index) in orderedVisible"
								:key="item.key"
								class="cn-sidebar-columns__order-item"
								:class="{ 'cn-sidebar-columns__order-item--pinned': index < pinnedCount }"
								draggable="true"
								data-testid="cn-sidebar-columns-order-item"
								@dragstart="dragFrom = index"
								@dragover.prevent
								@drop.prevent="onDropColumn(index)">
								<DragVertical :size="18" class="cn-sidebar-columns__handle" aria-hidden="true" />
								<span class="cn-sidebar-columns__order-label">{{ item.label }}</span>
								<NcButton
									variant="tertiary"
									:disabled="index === 0 || index === pinnedCount"
									:aria-label="t('nextcloud-vue', 'Move {column} up', { column: item.label })"
									data-testid="cn-sidebar-columns-up"
									@click="moveColumn(index, index - 1)">
									<template #icon>
										<ChevronUp :size="18" />
									</template>
								</NcButton>
								<NcButton
									variant="tertiary"
									:disabled="index === orderedVisible.length - 1 || index === pinnedCount - 1"
									:aria-label="t('nextcloud-vue', 'Move {column} down', { column: item.label })"
									data-testid="cn-sidebar-columns-down"
									@click="moveColumn(index, index + 1)">
									<template #icon>
										<ChevronDown :size="18" />
									</template>
								</NcButton>
								<NcButton
									variant="tertiary"
									:aria-pressed="String(index < pinnedCount)"
									:aria-label="index < pinnedCount ? t('nextcloud-vue', 'Unpin {column}', { column: item.label }) : t('nextcloud-vue', 'Pin {column}', { column: item.label })"
									data-testid="cn-sidebar-columns-pin"
									@click="togglePin(index)">
									<template #icon>
										<Pin v-if="index < pinnedCount" :size="18" />
										<PinOutline v-else :size="18" />
									</template>
								</NcButton>
							</li>
						</ol>
						<NcButton
							variant="tertiary"
							data-testid="cn-sidebar-columns-reset"
							@click="$emit('columns-reset')">
							{{ t('nextcloud-vue', 'Reset columns') }}
						</NcButton>
					</div>

					<template v-if="allColumns.length > 0 || allGroups.length > 0">
						<!-- Schema properties group (collapsible) -->
						<div v-if="allColumns.length > 0" class="cn-sidebar-columns__group cn-sidebar-columns__group--collapsible">
							<div class="cn-sidebar-columns__group-header" @click="propertiesExpanded = !propertiesExpanded">
								<ChevronDown v-if="propertiesExpanded" :size="20" />
								<ChevronRight v-else :size="20" />
								<h4>{{ resolvedPropertiesLabel }}</h4>
								<NcCheckboxRadioSwitch
									:modelValue="isGroupAllVisible(allColumns)"
									class="cn-sidebar-columns__select-all"
									@click.stop
									@update:modelValue="toggleGroupAll(allColumns)">
									All
								</NcCheckboxRadioSwitch>
							</div>
							<div v-if="propertiesExpanded" class="cn-sidebar-columns__group-content">
								<NcCheckboxRadioSwitch
									v-for="col in allColumns"
									:key="col.key"
									:modelValue="isColumnVisible(col.key)"
									@update:modelValue="toggleColumn(col.key)">
									{{ col.label }}
								</NcCheckboxRadioSwitch>
							</div>
						</div>

						<!-- Extra column groups (built-in Metadata + external) -->
						<div
							v-for="group in allGroups"
							:key="group.id"
							class="cn-sidebar-columns__group cn-sidebar-columns__group--collapsible">
							<div class="cn-sidebar-columns__group-header" @click="toggleGroup(group.id)">
								<ChevronDown v-if="expandedGroups[group.id]" :size="20" />
								<ChevronRight v-else :size="20" />
								<h4 :lang="langOf(group.label)">
									{{ shown(group.label) }}
								</h4>
								<NcCheckboxRadioSwitch
									:modelValue="isGroupAllVisible(group.columns)"
									class="cn-sidebar-columns__select-all"
									@click.stop
									@update:modelValue="toggleGroupAll(group.columns)">
									All
								</NcCheckboxRadioSwitch>
							</div>
							<div v-if="expandedGroups[group.id]" class="cn-sidebar-columns__group-content">
								<NcCheckboxRadioSwitch
									v-for="col in group.columns"
									:key="col.key"
									:modelValue="isColumnVisible(col.key)"
									@update:modelValue="toggleColumn(col.key)">
									{{ shown(col.label) }}
								</NcCheckboxRadioSwitch>
							</div>
						</div>
					</template>

					<p v-else class="cn-sidebar-columns__empty">
						No columns available. Provide a schema to auto-generate columns.
					</p>
				</div>

				<slot name="columns-extra" />
			</div>
		</NcAppSidebarTab>

		<!-- Views tab (id filters-tab): the page's saved views (save, list, manage, add to menu). -->
		<NcAppSidebarTab
			v-if="savedViews"
			id="filters-tab"
			:name="t('nextcloud-vue', 'Views')"
			:order="3">
			<template #icon>
				<BookmarkOutline :size="20" />
			</template>

			<div class="cn-index-sidebar__tab-content">
				<div class="cn-index-sidebar__section">
					<CnSavedViewsPanel
						v-bind="savedViewsPanelProps"
						@apply="onSavedView('apply', $event)"
						@saveRequest="onSavedView('save', null)"
						@editRequest="onSavedView('edit', $event)"
						@shareRequest="onSavedView('share', $event)"
						@updateRequest="onSavedView('update', $event)"
						@copyRequest="onSavedView('copy', $event)"
						@menuToggle="onSavedView('menu', $event)"
						@deleteRequest="onSavedView('delete', $event)" />
				</div>
			</div>
		</NcAppSidebarTab>

		<!-- Extra tabs injected by the consumer -->
		<slot name="tabs" />
	</NcAppSidebar>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcAppSidebar, NcAppSidebarTab, NcButton, NcCheckboxRadioSwitch, NcPopover, NcSelect, NcTextField } from '@nextcloud/vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import BookmarkOutline from 'vue-material-design-icons/BookmarkOutline.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import DragVertical from 'vue-material-design-icons/DragVertical.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import FilterRemoveOutline from 'vue-material-design-icons/FilterRemoveOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import Pin from 'vue-material-design-icons/Pin.vue'
import PinOutline from 'vue-material-design-icons/PinOutline.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import CnSavedViewsPanel from '../CnSavedViewsPanel/CnSavedViewsPanel.vue'
import CnSegmentedControl from '../CnSegmentedControl/CnSegmentedControl.vue'
import { normalizeLook } from '../../composables/useLook.js'
import { METADATA_COLUMNS } from '../../constants/metadata.js'
import { facetOptions } from '../../utils/facets.js'
import { labelLang } from '../../utils/manifestTranslate.js'
import { columnsFromSchema, filtersFromSchema } from '../../utils/schema.js'
/**
 * CnIndexSidebar — Reusable NcAppSidebar wrapper with Search + Columns tabs.
 *
 * Designed to be schema-driven: pass a schema and the sidebar auto-generates
 * search filters, column visibility controls, and the standard Metadata group.
 * Title and properties group label are derived from schema.title by default.
 *
 * Must be rendered at the App.vue level as a sibling of NcAppContent.
 * Use provide/inject to connect it to page components.
 *
 * @slot search-above - Content rendered above the search field in the Search tab (e.g. hints, quick actions).
 * @slot search-extra - Content rendered below the search field and filters in the Search tab (e.g. saved searches).
 */
import { labelSidePanelClose } from '../../utils/sidePanelCloseLabel.js'
import { reverseSortKeys, sameSortKeys } from '../../utils/sortOrder.js'
import { CnDateRangePicker, DEFAULT_DATE_RANGE_PRESETS } from '../CnDateRangePicker/index.js'
import { CnIcon } from '../CnIcon/index.js'
export default {
	name: 'CnIndexSidebar',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		CnSavedViewsPanel,
		CnSegmentedControl,
		ArrowDown,
		ArrowUp,
		BookmarkOutline,
		NcTextField,
		NcSelect,
		CnDateRangePicker,
		NcCheckboxRadioSwitch,
		NcPopover,
		NcButton,
		CnIcon,
		FilterOutline,
		FilterRemoveOutline,
		ViewColumnOutline,
		ChevronDown,
		ChevronRight,
		ChevronUp,
		DragVertical,
		Pin,
		PinOutline,
		InformationOutline,
	},

	inject: {
		/**
		 * Consumer translation function, provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). Column and
		 * filter labels come from schema property titles, authored in English as
		 * the canonical source; the visible label is resolved through this
		 * function so it follows the user's language. Defaults to identity when
		 * used standalone (no CnAppRoot ancestor).
		 */
		cnTranslate: { default: () => (key) => key },
		/** The look CnAppRoot provides; the board look draws the direction as a segmented control. */
		cnLook: { default: 'nextcloud' },
	},

	props: {
		/**
		 * The line under the title, in place of the schema's description: the
		 * page's count ("48 zaken, 8 op deze pagina", DqFilterBeheren).
		 */
		subtitle: {
			type: String,
			default: '',
		},

		/** Sidebar title. Defaults to schema.title when not set. */
		title: {
			type: String,
			default: '',
		},

		/** MDI icon name or emoji. Defaults to schema.icon when not set. */
		icon: {
			type: String,
			default: '',
		},

		/** Schema object for auto-generating filters, columns, and labels */
		schema: {
			type: Object,
			default: null,
		},

		/** Array of currently visible column keys */
		visibleColumns: {
			type: Array,
			default: null,
		},

		/**
		 * Show the Order and pin controls in the Columns tab, and Reset columns.
		 * Off keeps show and hide only.
		 */
		personalColumns: {
			type: Boolean,
			default: true,
		},

		/** How many of the first visible columns are pinned to the start of the table. */
		pinnedCount: {
			type: Number,
			default: 0,
		},

		/**
		 * The orders the Sort section offers, `[{ value, label, keys, fixed? }]`,
		 * each `keys` a `[{ key, order }]` list read as its ascending form. An
		 * option with `fixed: true` is an order of its own (the rows an endpoint
		 * ranks): it is chosen by its value, has no direction, and its keys are
		 * not matched against the current order. Empty draws no Sort section
		 * (the table view sorts by its headers).
		 */
		sortOptions: {
			type: Array,
			default: () => [],
		},

		/** The list's current order, `[{ key, order }]`. */
		currentSort: {
			type: Array,
			default: () => [],
		},

		/**
		 * The Sort option chosen by its value, for an order that is not a list
		 * of sort keys (an option with `fixed: true`, such as one whose rows an
		 * endpoint ranks). Wins over matching `currentSort`.
		 */
		currentSortValue: {
			type: String,
			default: '',
		},

		/** Current search term */
		searchValue: {
			type: String,
			default: '',
		},

		/** Whether sidebar is open */
		open: {
			type: Boolean,
			default: true,
		},

		/** Current active facet filters: { fieldName: [values] } */
		activeFilters: {
			type: Object,
			default: () => ({}),
		},

		/** Live facet data from the API: `{ fieldName: { values: [{ value, count?, label? }] } }` */
		facetData: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Additional column groups beyond schema properties and the built-in Metadata.
		 * Each group: { id: string, label: string, columns: Array<{key, label}>, expanded?: boolean }
		 */
		columnGroups: {
			type: Array,
			default: () => [],
		},

		/** Whether to include the built-in Metadata column group */
		showMetadata: {
			type: Boolean,
			default: true,
		},

		/** Search input placeholder */
		searchPlaceholder: {
			type: String,
			default: () => t('nextcloud-vue', 'Type to search…'),
		},

		/** Search tab label */
		searchTabLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Search'),
		},

		/** Columns tab label */
		columnsTabLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Columns'),
		},

		/** Search section heading */
		searchLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Search'),
		},

		/** Filters section heading */
		filtersLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Filters'),
		},

		/** "Clear all" button label, shown when search or a filter is active */
		clearAllLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Clear all'),
		},

		/**
		 * Filter declarations for a page with no schema of its own: `{ name: declaration }`, the same shape a schema property has. Wins over `schema`, and feeds the Search tab only.
		 *
		 * 🔑 A FILTER IS NOT A COLUMN, which is the whole reason this is its
		 * own prop rather than a synthetic `schema`. The schema feeds BOTH
		 * tabs, so a page that declared its filters there would also offer
		 * them in the Columns tab: the toggle would tick and no column would
		 * appear, because the table's columns come from somewhere else
		 * entirely. These reach the Search tab and nothing else.
		 *
		 * @type {object|null}
		 */
		filterFields: {
			type: Object,
			default: null,
		},

		/** Start-of-window label on a date-range filter. */
		fromLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'From'),
		},

		/** End-of-window label on a date-range filter. */
		toLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'To'),
		},

		/** Columns section heading */
		columnsHeading: {
			type: String,
			default: () => t('nextcloud-vue', 'Column visibility'),
		},

		/** Columns section description */
		columnsDescription: {
			type: String,
			default: () => t('nextcloud-vue', 'Select which columns to display in the table'),
		},

		/** Override label for the schema properties group. Defaults to schema.title. */
		propertiesGroupLabel: {
			type: String,
			default: '',
		},

		/**
		 * ID of the tab that should be active when the sidebar opens.
		 * Built-in IDs are 'search-tab' and 'columns-tab'.
		 * Use the id you set on your custom NcAppSidebarTab for custom tabs.
		 */
		defaultTab: {
			type: String,
			default: 'search-tab',
		},

		/**
		 * Switch to a tab while the sidebar is mounted, e.g. `'filters-tab'`
		 * after a view was saved from the toolbar. Empty leaves the tab alone.
		 */
		activeTab: {
			type: String,
			default: '',
		},

		/**
		 * The page's saved views, shown in the Filters tab:
		 * `{ views, loading, currentUserId, counts, selectedViewId, maxDepth, menuIds }`
		 * as `CnSavedViewsPanel` takes them. `null` shows no saved views.
		 * Every intent comes back as one `saved-view` event.
		 */
		savedViews: {
			type: Object,
			default: null,
		},

		/**
		 * Whether the current user is an admin.
		 * When false, schema properties with `adminOnly: true` are hidden from filters.
		 */
		userIsAdmin: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['clear-filters', 'columns-change', 'columns-reorder', 'columns-reset', 'pin-change', 'filter-change', 'saved-view', 'search', 'sort-change', 'tab-change', 'update:open'],

	data() {
		return {
			internalOpen: this.open,
			internalActiveTab: this.defaultTab,
			/** Index of the column being dragged in the Order and pin list, or -1. */
			dragFrom: -1,
			propertiesExpanded: true,
			expandedGroups: {},
			/**
			 * Options loaded for a `reference` filter, keyed by field.
			 *
			 * A reference picker lists rows from ANOTHER list (the cases a
			 * task can hang off, say), and neither the schema nor a facet
			 * bucket carries them. Loaded once per field and cached, because
			 * the sidebar re-renders on every keystroke in the search box.
			 *
			 * @type {Record<string, Array<{id: string, label: string}>>}
			 */
			referenceOptions: {},
			/** @type {Record<string, boolean>} Which reference loads are in flight. */
			referenceLoading: {},
		}
	},

	computed: {
		/**
		 * The Sort option the current order matches, as declared or reversed.
		 *
		 * @return {{option: object, direction: string}|null} The match, or null.
		 */
		sortMatch() {
			if (this.currentSortValue) {
				const chosen = this.sortOptions.find((o) => o.value === this.currentSortValue)
				if (chosen) {
					return { option: chosen, direction: 'asc' }
				}
			}
			const current = Array.isArray(this.currentSort) ? this.currentSort : []
			for (const option of this.sortOptions) {
				if (option.fixed === true) {
					continue
				}
				const keys = Array.isArray(option.keys) ? option.keys : []
				if (sameSortKeys(keys, current)) {
					return { option, direction: 'asc' }
				}
				if (sameSortKeys(reverseSortKeys(keys), current)) {
					return { option, direction: 'desc' }
				}
			}
			return null
		},

		/** @return {object|null} The Sort option shown as chosen. */
		sortSelected() {
			return this.sortMatch ? this.sortMatch.option : null
		},

		/** @return {string} The chosen direction, `asc` or `desc`. */
		sortDirection() {
			return this.sortMatch ? this.sortMatch.direction : 'asc'
		},

		/**
		 * Whether the board look applies.
		 *
		 * @return {boolean}
		 */
		isBoardLook() {
			const look = this.cnLook && typeof this.cnLook === 'object' && 'value' in this.cnLook ? this.cnLook.value : this.cnLook
			return normalizeLook(look) === 'board'
		},

		/**
		 * The two directions as segments, as board DqZakenSorteren draws them:
		 * "Oplopend" and "Aflopend" with an arrow each.
		 *
		 * @spec openspec/changes/sidebar-sort-direction-segmented/specs/index-sidebar/spec.md#requirement-the-board-look-draws-the-sort-direction-as-two-segments
		 * @return {Array<{value: string, label: string, disabled: boolean}>}
		 */
		sortDirectionOptions() {
			const disabled = !this.sortSelected || this.sortSelected.fixed === true
			return [
				{ value: 'asc', label: t('nextcloud-vue', 'Ascending'), disabled },
				{ value: 'desc', label: t('nextcloud-vue', 'Descending'), disabled },
			]
		},

		/**
		 * The id of the Direction heading that names the segments.
		 *
		 * @return {string}
		 */
		sortDirectionLabelId() {
			return `cn-index-sidebar-direction-${this.$.uid}`
		},

		/**
		 * The order the list has now, in words: "Current order: Created,
		 * descending", or that it is not sorted.
		 *
		 * @return {string} The sentence.
		 */
		currentSortText() {
			if (this.sortMatch && this.sortMatch.option.fixed === true) {
				return t('nextcloud-vue', 'Current order: {order}', { order: this.sortMatch.option.label })
			}
			const current = Array.isArray(this.currentSort) ? this.currentSort : []
			if (current.length === 0) {
				return t('nextcloud-vue', 'Not sorted')
			}
			const labelOf = (key) => {
				const single = this.sortOptions.find((o) => Array.isArray(o.keys) && o.keys.length === 1 && o.keys[0].key === key)
				return single ? single.label : key
			}
			const order = this.sortMatch && this.sortMatch.option.keys.length > 1
				? `${this.sortMatch.option.label}, ${this.sortDirection === 'desc' ? t('nextcloud-vue', 'descending') : t('nextcloud-vue', 'ascending')}`
				: current.map((entry) => `${labelOf(entry.key)}, ${entry.order === 'desc' ? t('nextcloud-vue', 'descending') : t('nextcloud-vue', 'ascending')}`).join('; ')
			return t('nextcloud-vue', 'Current order: {order}', { order })
		},

		/**
		 * The panel's props, from `savedViews`.
		 *
		 * @return {object}
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-6
		 */
		savedViewsPanelProps() {
			const f = this.savedViews || {}
			return {
				views: Array.isArray(f.views) ? f.views : [],
				loading: f.loading === true,
				currentUserId: f.currentUserId || '',
				counts: f.counts || null,
				selectedViewId: f.selectedViewId || '',
				maxDepth: typeof f.maxDepth === 'number' ? f.maxDepth : 3,
				menuIds: Array.isArray(f.menuIds) ? f.menuIds : null,
			}
		},

		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			return this.icon || this.schema?.icon || ''
		},

		/** Sidebar name — schema title, shown as the h2 header */
		resolvedName() {
			if (this.title) {
				return this.shown(this.title)
			}
			return this.schema?.title || 'Search'
		},

		/** Sidebar subname: the subtitle the page hands it, else the schema description */
		resolvedSubname() {
			if (typeof this.subtitle === 'string' && this.subtitle !== '') {
				return this.subtitle
			}
			return this.schema?.description || ''
		},

		/** Properties group label — derived from schema.title if not explicitly set */
		resolvedPropertiesLabel() {
			if (this.propertiesGroupLabel) {
				return this.propertiesGroupLabel
			}
			return this.schema?.title || 'Properties'
		},

		/** All available columns from schema */
		allColumns() {
			if (!this.schema) {
				return []
			}
			return columnsFromSchema(this.schema, { translate: this.cnTranslate })
		},

		/** Filter definitions from schema (facetable properties, respecting RBAC) */
		schemaFilters() {
			// An explicitly declared filter set wins: it is the page saying
			// "these are the questions", where a schema only says "these are
			// the properties" and the sidebar has to guess which of them are
			// worth asking about.
			if (this.filterFields && Object.keys(this.filterFields).length > 0) {
				return filtersFromSchema(
					{ properties: this.filterFields },
					{ isAdmin: this.userIsAdmin, translate: this.cnTranslate },
				)
			}
			if (!this.schema) {
				return []
			}
			return filtersFromSchema(this.schema, { isAdmin: this.userIsAdmin, translate: this.cnTranslate })
		},

		/** Whether a search term or any facet filter is currently active. */
		hasActiveFilters() {
			if ((this.searchValue || '').length > 0) {
				return true
			}
			return Object.values(this.activeFilters || {}).some((v) => (Array.isArray(v) ? v.length > 0 : !!v))
		},

		/** Combined column groups: built-in Metadata + external groups */
		allGroups() {
			const groups = []
			if (this.showMetadata && this.schema) {
				groups.push({
					id: 'metadata',
					label: 'Metadata',
					columns: METADATA_COLUMNS,
					expanded: true,
				})
			}
			return [...groups, ...this.columnGroups]
		},

		/** Label of each column key, from the schema properties and the groups. */
		columnLabels() {
			const map = {}
			this.allColumns.forEach((c) => {
				map[c.key] = c.label
			})
			this.allGroups.forEach((g) => g.columns.forEach((c) => {
				map[c.key] = c.label
			}))
			return map
		},

		/** The visible columns in their order, with labels (all columns when none were chosen). */
		orderedVisible() {
			const keys = this.visibleColumns === null ? this.allColumnKeys : this.visibleColumns
			return keys.filter((k) => this.columnLabels[k] !== undefined).map((key) => ({ key, label: this.columnLabels[key] }))
		},

		/** All column keys across schema properties and all groups */
		allColumnKeys() {
			return [
				...this.allColumns.map((c) => c.key),
				...this.allGroups.flatMap((g) => g.columns.map((c) => c.key)),
			]
		},

		/**
		 * The presets a date-range filter offers when it declares none.
		 *
		 * Just `custom`. Every shipped preset rolls BACKWARDS from today
		 * ("Last 30 days"), and a sidebar filter is as often a forward window
		 * ("due next week") as a backward one. Offering a preset that answers
		 * the wrong direction is worse than offering none: it is one click and
		 * it looks deliberate.
		 *
		 * @return {Array<object>} The preset list.
		 */
		rangePresets() {
			// Taken FROM the picker's own list rather than written out again, so
			// the one preset a filter offers carries the same id and the same
			// label as everywhere else it appears.
			return DEFAULT_DATE_RANGE_PRESETS
				.filter((preset) => preset.id === 'custom')
				.map((preset) => ({ ...preset }))
		},
	},

	watch: {
		activeTab(tab) {
			if (tab) {
				this.internalActiveTab = tab
			}
		},

		open(val) {
			this.internalOpen = val
		},

		internalOpen(val) {
			this.$emit('update:open', val)
		},

		defaultTab(val) {
			this.internalActiveTab = val
		},

		allGroups: {
			immediate: true,
			handler(groups) {
				for (const group of groups) {
					if (!(group.id in this.expandedGroups)) {
						this.expandedGroups[group.id] = group.expanded !== false
					}
				}
			},
		},

		// A reference picker's rows load once the schema naming them arrives,
		// which on a manifest page is after mount. Watching the FILTERS rather
		// than calling from `mounted()` covers both orders.
		schemaFilters: {
			immediate: true,
			handler() {
				this.loadReferenceOptions()
			},
		},
	},

	mounted() {
		labelSidePanelClose(this.$refs.appSidebar)
	},

	methods: {
		t,

		/**
		 * A field chosen in the Sort section: its order, in the direction
		 * already chosen.
		 *
		 * @param {object|null} option The chosen option.
		 * @return {void}
		 */
		onSortField(option) {
			const chosen = option && this.sortOptions.find((o) => o.value === option.value)
			if (!chosen) {
				return
			}
			this.emitSort(chosen, this.sortDirection)
		},

		/**
		 * A direction chosen in the Sort section, for the chosen field.
		 *
		 * @param {string} direction `asc` or `desc`.
		 * @return {void}
		 */
		onSortDirection(direction) {
			if (!this.sortSelected) {
				return
			}
			this.emitSort(this.sortSelected, direction === 'desc' ? 'desc' : 'asc')
		},

		/**
		 * Emit the order an option stands for in a direction.
		 *
		 * @param {object} option The Sort option.
		 * @param {string} direction `asc` or `desc`.
		 * @return {void}
		 */
		emitSort(option, direction) {
			const keys = Array.isArray(option.keys) ? option.keys : []
			/**
			 * @event sort-change The Sort section chose an order. Payload: `[{ key, order }]`,
			 *   and the chosen option's value, which names an order that is not keys (`fixed`).
			 */
			this.$emit('sort-change', direction === 'desc' ? reverseSortKeys(keys) : keys.map((k) => ({ key: k.key, order: k.order || 'asc' })), option.value)
		},

		/**
		 * Hand a saved-view intent to the page.
		 *
		 * @param {'apply'|'save'|'edit'|'share'|'presentation'|'update'|'copy'|'menu'|'delete'} action The intent.
		 * @param {object|null} view The view, or null for save.
		 * @spec openspec/changes/saved-views-manage-and-defaults/tasks.md#task-6
		 */
		onSavedView(action, view) {
			/**
			 * @event saved-view A saved-view intent from the Filters tab. Payload: `{ action, view }`.
			 * @type {{action: string, view: (object|null)}}
			 */
			this.$emit('saved-view', { action, view })
		},

		/**
		 * A manifest label through the injected lookup, or as written.
		 *
		 * @param {string} text The label as written.
		 * @return {string} The label in the user's language.
		 */
		shown(text) {
			return typeof this.cnTranslate === 'function' && typeof text === 'string' && text !== '' ? this.cnTranslate(text) : text
		},

		/**
		 * The `lang` of a label that fell back to its written text in another language.
		 *
		 * @param {string} text The label as written.
		 * @return {string|undefined} The source language, or undefined.
		 */
		langOf(text) {
			return labelLang(this.cnTranslate, text) || undefined
		},

		/**
		 * Handle tab change from NcAppSidebar
		 *
		 * @param {string} tabId Tab identifier
		 */
		onTabChange(tabId) {
			this.internalActiveTab = tabId
			this.$emit('tab-change', tabId)
		},

		/**
		 * Check if a column is currently visible
		 *
		 * @param {string} key Column key
		 */
		isColumnVisible(key) {
			if (this.visibleColumns === null) {
				return true
			}
			return this.visibleColumns.includes(key)
		},

		/**
		 * Check if all columns in a group are visible
		 *
		 * @param {string[]} columns Array of column keys
		 */
		isGroupAllVisible(columns) {
			return columns.every((col) => this.isColumnVisible(col.key))
		},

		/**
		 * Toggle a single column's visibility
		 *
		 * @param {string} key Column key
		 */
		toggleColumn(key) {
			let newVisible
			if (this.visibleColumns === null) {
				newVisible = this.allColumnKeys.filter((k) => k !== key)
			} else if (this.isColumnVisible(key)) {
				newVisible = this.visibleColumns.filter((k) => k !== key)
			} else {
				newVisible = [...this.visibleColumns, key]
			}
			this.$emit('columns-change', newVisible)
		},

		/**
		 * Select or deselect all columns in a group
		 *
		 * @param {string[]} columns Array of column keys
		 */
		toggleGroupAll(columns) {
			const groupKeys = columns.map((c) => c.key)
			const allVisible = this.isGroupAllVisible(columns)

			let newVisible
			if (this.visibleColumns === null) {
				// Currently all visible — deselect this group
				newVisible = this.allColumnKeys.filter((k) => !groupKeys.includes(k))
			} else if (allVisible) {
				// All in group visible — deselect them
				newVisible = this.visibleColumns.filter((k) => !groupKeys.includes(k))
			} else {
				// Not all visible — select them all
				const current = new Set(this.visibleColumns)
				groupKeys.forEach((k) => current.add(k))
				newVisible = [...current]
			}
			this.$emit('columns-change', newVisible)
		},

		/**
		 * Move a visible column to another place in the order. The drag and the
		 * Move buttons both call this. A column stays inside its block: pinned
		 * columns move among the pinned, the rest among the rest.
		 *
		 * @param {number} from Current index.
		 * @param {number} to Target index.
		 * @return {void}
		 */
		moveColumn(from, to) {
			const list = this.orderedVisible.map((c) => c.key)
			const lo = from < this.pinnedCount ? 0 : this.pinnedCount
			const hi = from < this.pinnedCount ? this.pinnedCount - 1 : list.length - 1
			const target = Math.min(hi, Math.max(lo, to))
			if (from < 0 || from >= list.length || target === from) {
				return
			}
			const [moved] = list.splice(from, 1)
			list.splice(target, 0, moved)
			/**
			 * @event columns-reorder Emitted when the user moves a column. Payload: the visible column keys in their new order.
			 * @type {string[]}
			 */
			this.$emit('columns-reorder', list)
		},

		/**
		 * Dropping a dragged column on another row.
		 *
		 * @param {number} index Index of the row it was dropped on.
		 * @return {void}
		 */
		onDropColumn(index) {
			const from = this.dragFrom
			this.dragFrom = -1
			if (from >= 0) {
				this.moveColumn(from, index)
			}
		},

		/**
		 * Pin a column (it joins the pinned block at the start) or unpin it (it
		 * leaves that block, to the first place after it).
		 *
		 * @param {number} index Index of the column.
		 * @return {void}
		 */
		togglePin(index) {
			const list = this.orderedVisible.map((c) => c.key)
			const [moved] = list.splice(index, 1)
			let count = this.pinnedCount
			if (index < count) {
				count -= 1
				list.splice(count, 0, moved)
			} else {
				list.splice(count, 0, moved)
				count += 1
			}
			this.$emit('columns-reorder', list)
			/**
			 * @event pin-change Emitted when a column is pinned or unpinned. Payload: the new number of pinned columns.
			 * @type {number}
			 */
			this.$emit('pin-change', count)
		},

		/**
		 * Toggle a group's expanded state
		 *
		 * @param {string} groupId Filter group identifier
		 */
		toggleGroup(groupId) {
			this.expandedGroups[groupId] = !this.expandedGroups[groupId]
		},

		/**
		 * Get filter options for a filter definition
		 *
		 * @param {object} filter Filter object
		 */
		getFilterOptions(filter) {
			const live = facetOptions(
				this.facetData[filter.key],
				(count) => t('nextcloud-vue', 'No value ({count})', { count }),
			)
			if (live !== null) {
				return live
			}
			// A reference picker's rows come from another list, and neither a
			// schema enum nor a facet bucket can carry them.
			if (filter.type === 'reference') {
				return this.referenceOptions[filter.key] || []
			}
			return filter.options || []
		},

		/**
		 * Whether a reference filter is still fetching its rows.
		 *
		 * Shown rather than hidden: an empty picker that is still loading and
		 * one that genuinely has nothing to pick look identical, and only one
		 * of them means the person should stop waiting.
		 *
		 * @param {object} filter The filter definition.
		 *
		 * @return {boolean} True while the load is in flight.
		 */
		isLoadingOptions(filter) {
			return this.referenceLoading[filter.key] === true
		},

		/**
		 * The `{ from, to }` window a date-range filter currently holds.
		 *
		 * @param {object} filter The filter definition.
		 *
		 * @return {object|null} The window, or null when none is set.
		 */
		getRangeValue(filter) {
			const value = this.activeFilters[filter.key]
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				return value
			}
			return null
		},

		/**
		 * A date-range filter changed.
		 *
		 * Emitted in the SAME `filter-change` shape every other control uses,
		 * with the window as the payload's `values`, so a consumer has one
		 * event to listen to and not two.
		 *
		 * @param {string} key The filter key.
		 * @param {object|null} window The `{ from, to, preset }` value.
		 *
		 * @return {void}
		 */
		onRangeChange(key, window) {
			const from = (window && window.from) || ''
			const to = (window && window.to) || ''
			if (from === '' && to === '') {
				this.$emit('filter-change', { key, values: [] })
				return
			}
			this.$emit('filter-change', { key, values: { from, to } })
		},

		/**
		 * The text a `text` filter currently holds.
		 *
		 * @param {object} filter The filter definition.
		 *
		 * @return {string} The current value.
		 */
		getTextValue(filter) {
			const value = this.activeFilters[filter.key]
			if (Array.isArray(value)) {
				return value.length > 0 ? String(value[0]) : ''
			}
			return (value === undefined || value === null) ? '' : String(value)
		},

		/**
		 * A text filter changed.
		 *
		 * @param {string} key The filter key.
		 * @param {string} value The typed value.
		 *
		 * @return {void}
		 */
		onTextChange(key, value) {
			const text = String(value ?? '').trim()
			this.$emit('filter-change', { key, values: text === '' ? [] : [text] })
		},

		/**
		 * Load the rows a `reference` filter picks from.
		 *
		 * Reads `optionsSource` off the schema property:
		 * `{ register, schema, labelField, valueField, limit }`. The VALUE is
		 * the referenced object's uuid, because that is what the server
		 * filters on; the label is only what the person reads.
		 *
		 * Failures are logged and leave the picker empty rather than throwing:
		 * one unreachable list must not take the whole sidebar with it.
		 *
		 * @return {Promise<void>} Resolves when every reference filter settled.
		 */
		async loadReferenceOptions() {
			const pending = this.schemaFilters.filter((filter) => filter.type === 'reference'
				&& filter.optionsSource
				&& this.referenceOptions[filter.key] === undefined
				&& this.referenceLoading[filter.key] !== true)
			if (pending.length === 0) {
				return
			}

			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])

			await Promise.all(pending.map(async (filter) => {
				const source = filter.optionsSource
				if (!source.register || !source.schema) {
					return
				}
				this.referenceLoading = { ...this.referenceLoading, [filter.key]: true }
				try {
					const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}', {
						register: source.register,
						schema: source.schema,
					})
					const response = await axios.get(url, { params: { _limit: source.limit || 200 } })
					const rows = response?.data?.results || response?.data || []
					const valueField = source.valueField || '@self.uuid'
					const labelField = source.labelField || 'title'
					const options = rows
						.map((row) => ({
							id: this.readPath(row, valueField),
							label: String(this.readPath(row, labelField) ?? this.readPath(row, valueField) ?? ''),
						}))
						.filter((option) => option.id !== null && option.id !== undefined && option.id !== '')
						.sort((a, b) => a.label.localeCompare(b.label))
					this.referenceOptions = { ...this.referenceOptions, [filter.key]: options }
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error(`[CnIndexSidebar] the reference filter "${filter.key}" could not load its options`, error)
					this.referenceOptions = { ...this.referenceOptions, [filter.key]: [] }
				} finally {
					this.referenceLoading = { ...this.referenceLoading, [filter.key]: false }
				}
			}))
		},

		/**
		 * Read a dotted path off a row (`@self.uuid`, `title`).
		 *
		 * @param {object} row The row.
		 * @param {string} path The dotted path.
		 *
		 * @return {unknown} The value, or undefined.
		 */
		readPath(row, path) {
			return String(path).split('.').reduce((acc, part) => ((acc === null || acc === undefined) ? acc : acc[part]), row)
		},

		/**
		 * Get currently selected options for a filter
		 *
		 * @param {object} filter Filter object
		 */
		getSelectedFilterOptions(filter) {
			const value = this.activeFilters[filter.key]
			if (!value) {
				return []
			}
			const values = Array.isArray(value) ? value : [value]
			const options = this.getFilterOptions(filter)
			return values.map((v) => options.find((o) => o.id === v) || { id: v, label: String(v) })
		},

		/**
		 * Handle filter select change
		 *
		 * @param {string} key Filter key
		 * @param {Array} selected Selected values
		 */
		onFilterChange(key, selected) {
			// 🔴 A SINGLE-VALUED SELECT EMITS AN OBJECT, NOT AN ARRAY. NcSelect
			// changes the SHAPE of its payload with `multiple`, and `.map` on
			// the object shape throws inside an event handler, where Vue logs
			// it and carries on: the picker looks inert and the console says
			// why in a place nobody is looking.
			const chosen = Array.isArray(selected) ? selected : (selected ? [selected] : [])
			const values = chosen.map((o) => ((o && typeof o === 'object' && 'id' in o) ? o.id : o))
			this.$emit('filter-change', { key, values })
		},

		/**
		 * "Clear all" click: reset search and every active facet filter in
		 * one shot, so the parent does one fetch instead of one per field.
		 */
		onClearAll() {
			/**
			 * @event clear-filters "Clear all" clicked; reset search and every active filter.
			 */
			this.$emit('clear-filters')
		},
	},
}
</script>

<!-- Styles in css/index-sidebar.css -->
