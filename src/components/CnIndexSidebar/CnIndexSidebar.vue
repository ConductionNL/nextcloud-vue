<template>
	<NcAppSidebar
		v-model:open="internalOpen"
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
								<h4>{{ group.label }}</h4>
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
import { translate as t } from '@nextcloud/l10n'
import { NcAppSidebar, NcAppSidebarTab, NcButton, NcCheckboxRadioSwitch, NcPopover, NcSelect, NcTextField } from '@nextcloud/vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import FilterOutline from 'vue-material-design-icons/FilterOutline.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'
import { METADATA_COLUMNS } from '../../constants/metadata.js'
import { facetOptionLabel } from '../../utils/facets.js'
import { columnsFromSchema, filtersFromSchema } from '../../utils/schema.js'
import { CnDateRangePicker } from '../CnDateRangePicker/index.js'
import { CnIcon } from '../CnIcon/index.js'

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
export default {
	name: 'CnIndexSidebar',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		NcTextField,
		NcSelect,
		CnDateRangePicker,
		NcCheckboxRadioSwitch,
		NcPopover,
		NcButton,
		CnIcon,
		FilterOutline,
		ViewColumnOutline,
		ChevronDown,
		ChevronRight,
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
		 * Whether the current user is an admin.
		 * When false, schema properties with `adminOnly: true` are hidden from filters.
		 */
		userIsAdmin: {
			type: Boolean,
			default: true,
		},
	},

	emits: ['columns-change', 'filter-change', 'search', 'tab-change', 'update:open'],

	data() {
		return {
			internalOpen: this.open,
			internalActiveTab: this.defaultTab,
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
		/** Resolved icon — explicit prop overrides schema.icon */
		resolvedIcon() {
			return this.icon || this.schema?.icon || ''
		},

		/** Sidebar name — schema title, shown as the h2 header */
		resolvedName() {
			if (this.title) {
				return this.title
			}
			return this.schema?.title || 'Search'
		},

		/** Sidebar subname — schema description, shown below the name */
		resolvedSubname() {
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
			if (!this.schema) {
				return []
			}
			return filtersFromSchema(this.schema, { isAdmin: this.userIsAdmin, translate: this.cnTranslate })
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
			return [{ id: 'custom', label: this.cnTranslate('Custom range'), days: null }]
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

	methods: {
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
			const facet = this.facetData[filter.key]
			if (facet?.values?.length > 0) {
				return facet.values.map((v) => ({
					id: v.value,
					label: facetOptionLabel(v),
				}))
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
	},
}
</script>

<!-- Styles in css/index-sidebar.css -->
