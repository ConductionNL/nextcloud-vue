<template>
	<NcAppSidebar
		:name="resolvedName"
		:title="resolvedName"
		:subname="resolvedSubname"
		:open.sync="internalOpen"
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
				<Magnify :size="20" />
			</template>

			<div class="cn-index-sidebar__tab-content">
				<div v-if="$slots['search-above']" class="cn-index-sidebar__section">
					<slot name="search-above" />
				</div>

				<div class="cn-index-sidebar__section">
					<h3>{{ searchLabel }}</h3>
					<NcTextField
						:value="searchValue"
						:placeholder="searchPlaceholder"
						:label="searchLabel"
						@update:value="$emit('search', $event)" />
				</div>

				<div v-if="schemaFilters.length > 0" class="cn-index-sidebar__section">
					<h3>{{ filtersLabel }}</h3>
					<div
						v-for="filter in schemaFilters"
						:key="filter.key"
						class="cn-index-sidebar__filter-group">
						<div class="cn-index-sidebar__filter-header">
							<span class="cn-index-sidebar__filter-label">{{ filter.label }}</span>
							<NcPopover v-if="filter.description" popup-role="dialog">
								<template #trigger>
									<NcButton
										type="tertiary-no-background"
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
						<NcSelect
							class="cn-index-sidebar__select"
							:value="getSelectedFilterOptions(filter)"
							:options="getFilterOptions(filter)"
							placeholder="Select..."
							:input-label="filter.label"
							:multiple="true"
							:clearable="true"
							@input="onFilterChange(filter.key, $event)" />
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
				<FormatColumns :size="20" />
			</template>

			<div class="cn-index-sidebar__tab-content">
				<div class="cn-sidebar-columns">
					<h3>{{ columnsHeading }}</h3>
					<p class="cn-sidebar-columns__description">
						{{ columnsDescription }}
					</p>

					<template v-if="allColumns.length > 0 || allGroups.length > 0">
						<!-- Schema properties group (collapsible) -->
						<div v-if="allColumns.length > 0" class="cn-sidebar-columns__group cn-sidebar-columns__group--collapsible">
							<div class="cn-sidebar-columns__group-header" @click="propertiesExpanded = !propertiesExpanded">
								<ChevronDown v-if="propertiesExpanded" :size="20" />
								<ChevronRight v-else :size="20" />
								<h4>{{ resolvedPropertiesLabel }}</h4>
								<NcCheckboxRadioSwitch
									:checked="isGroupAllVisible(allColumns)"
									class="cn-sidebar-columns__select-all"
									@click.native.stop
									@update:checked="toggleGroupAll(allColumns)">
									All
								</NcCheckboxRadioSwitch>
							</div>
							<div v-if="propertiesExpanded" class="cn-sidebar-columns__group-content">
								<NcCheckboxRadioSwitch
									v-for="col in allColumns"
									:key="col.key"
									:checked="isColumnVisible(col.key)"
									@update:checked="toggleColumn(col.key)">
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
								<h4>{{ group.label }}</h4>
								<NcCheckboxRadioSwitch
									:checked="isGroupAllVisible(group.columns)"
									class="cn-sidebar-columns__select-all"
									@click.native.stop
									@update:checked="toggleGroupAll(group.columns)">
									All
								</NcCheckboxRadioSwitch>
							</div>
							<div v-if="expandedGroups[group.id]" class="cn-sidebar-columns__group-content">
								<NcCheckboxRadioSwitch
									v-for="col in group.columns"
									:key="col.key"
									:checked="isColumnVisible(col.key)"
									@update:checked="toggleColumn(col.key)">
									{{ col.label }}
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

		<!-- Extra tabs injected by the consumer -->
		<slot name="tabs" />
	</NcAppSidebar>
</template>

<script>
import { NcAppSidebar, NcAppSidebarTab, NcTextField, NcSelect, NcCheckboxRadioSwitch, NcPopover, NcButton } from '@nextcloud/vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import FormatColumns from 'vue-material-design-icons/FormatColumns.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import { CnIcon } from '../CnIcon/index.js'
import { columnsFromSchema, filtersFromSchema } from '../../utils/schema.js'
import { METADATA_COLUMNS } from '../../constants/metadata.js'

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
 * @example
 * <!-- Minimal usage — schema drives everything -->
 * <CnIndexSidebar
 *   :schema="schema"
 *   :visible-columns="visibleCols"
 *   :search-value="search"
 *   @search="onSearch"
 *   @columns-change="onColumnsChange" />
 *
 * @slot search-above - Content rendered above the search field in the Search tab (e.g. hints, quick actions).
 * @slot search-extra - Content rendered below the search field and filters in the Search tab (e.g. saved searches).
 */
export default {
	name: 'CnIndexSidebar',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		NcTextField,
		NcSelect,
		NcCheckboxRadioSwitch,
		NcPopover,
		NcButton,
		CnIcon,
		Magnify,
		FormatColumns,
		ChevronDown,
		ChevronRight,
		InformationOutline,
	},

	props: {
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
		/** Live facet data from API: { fieldName: { values: [{value, count}] } } */
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
			default: 'Type to search...',
		},
		/** Search tab label */
		searchTabLabel: {
			type: String,
			default: 'Search',
		},
		/** Columns tab label */
		columnsTabLabel: {
			type: String,
			default: 'Columns',
		},
		/** Search section heading */
		searchLabel: {
			type: String,
			default: 'Search',
		},
		/** Filters section heading */
		filtersLabel: {
			type: String,
			default: 'Filters',
		},
		/** Columns section heading */
		columnsHeading: {
			type: String,
			default: 'Column Visibility',
		},
		/** Columns section description */
		columnsDescription: {
			type: String,
			default: 'Select which columns to display in the table',
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
		 * Whether the current user is an admin.
		 * When false, schema properties with `adminOnly: true` are hidden from filters.
		 */
		userIsAdmin: {
			type: Boolean,
			default: true,
		},
	},

	data() {
		return {
			internalOpen: this.open,
			internalActiveTab: this.defaultTab,
			propertiesExpanded: true,
			expandedGroups: {},
		}
	},

	computed: {
		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			return this.icon || this.schema?.icon || ''
		},

		/** Sidebar name — schema title, shown as the h2 header */
		resolvedName() {
			if (this.title) return this.title
			return this.schema?.title || 'Search'
		},

		/** Sidebar subname — schema description, shown below the name */
		resolvedSubname() {
			return this.schema?.description || ''
		},

		/** Properties group label — derived from schema.title if not explicitly set */
		resolvedPropertiesLabel() {
			if (this.propertiesGroupLabel) return this.propertiesGroupLabel
			return this.schema?.title || 'Properties'
		},

		/** All available columns from schema */
		allColumns() {
			if (!this.schema) return []
			return columnsFromSchema(this.schema, {})
		},

		/** Filter definitions from schema (facetable properties, respecting RBAC) */
		schemaFilters() {
			if (!this.schema) return []
			return filtersFromSchema(this.schema, { isAdmin: this.userIsAdmin })
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

		/** All column keys across schema properties and all groups */
		allColumnKeys() {
			return [
				...this.allColumns.map((c) => c.key),
				...this.allGroups.flatMap((g) => g.columns.map((c) => c.key)),
			]
		},
	},

	watch: {
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
						this.$set(this.expandedGroups, group.id, group.expanded !== false)
					}
				}
			},
		},
	},

	methods: {
		/**
		 * Handle tab change from NcAppSidebar
		 * @param {string} tabId Tab identifier
		 */
		onTabChange(tabId) {
			this.internalActiveTab = tabId
			this.$emit('tab-change', tabId)
		},

		/**
		 * Check if a column is currently visible
		 * @param {string} key Column key
		 */
		isColumnVisible(key) {
			if (this.visibleColumns === null) return true
			return this.visibleColumns.includes(key)
		},

		/**
		 * Check if all columns in a group are visible
		 * @param {string[]} columns Array of column keys
		 */
		isGroupAllVisible(columns) {
			return columns.every((col) => this.isColumnVisible(col.key))
		},

		/**
		 * Toggle a single column's visibility
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
		 * Toggle a group's expanded state
		 * @param {string} groupId Filter group identifier
		 */
		toggleGroup(groupId) {
			this.$set(this.expandedGroups, groupId, !this.expandedGroups[groupId])
		},

		/**
		 * Get filter options for a filter definition
		 * @param {object} filter Filter object
		 */
		getFilterOptions(filter) {
			const facet = this.facetData[filter.key]
			if (facet?.values?.length > 0) {
				return facet.values.map((v) => ({
					id: v.value,
					label: v.count !== undefined ? `${v.value} (${v.count})` : String(v.value),
				}))
			}
			return filter.options || []
		},

		/**
		 * Get currently selected options for a filter
		 * @param {object} filter Filter object
		 */
		getSelectedFilterOptions(filter) {
			const value = this.activeFilters[filter.key]
			if (!value) return []
			const values = Array.isArray(value) ? value : [value]
			const options = this.getFilterOptions(filter)
			return values.map((v) => options.find((o) => o.id === v) || { id: v, label: String(v) })
		},

		/**
		 * Handle filter select change
		 * @param {string} key Filter key
		 * @param {Array} selected Selected values
		 */
		onFilterChange(key, selected) {
			const values = selected ? selected.map((o) => o.id) : []
			this.$emit('filter-change', { key, values })
		},
	},
}
</script>

<!-- Styles in css/index-sidebar.css -->
