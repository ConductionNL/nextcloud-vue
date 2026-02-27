<template>
	<div class="cn-facet-sidebar">
		<div class="cn-facet-sidebar__header">
			<h3 class="cn-facet-sidebar__title">{{ title }}</h3>
			<NcButton
				v-if="hasActiveFilters"
				type="tertiary"
				class="cn-facet-sidebar__clear"
				@click="$emit('clear-all')">
				{{ clearLabel }}
			</NcButton>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="cn-facet-sidebar__loading">
			<NcLoadingIcon :size="20" />
		</div>

		<!-- Filter groups -->
		<div v-else class="cn-facet-sidebar__filters">
			<div
				v-for="filter in effectiveFilters"
				:key="filter.key"
				class="cn-facet-sidebar__group">
				<label class="cn-facet-sidebar__label">{{ filter.label }}</label>

				<!-- Checkbox filter (boolean) -->
				<NcCheckboxRadioSwitch
					v-if="filter.type === 'checkbox'"
					:checked="getFilterValue(filter.key) === true"
					@update:checked="onFilterChange(filter.key, $event)">
					{{ filter.label }}
				</NcCheckboxRadioSwitch>

				<!-- Select filter (enum / facet values) -->
				<NcSelect
					v-else-if="filter.type === 'select'"
					class="cn-facet-sidebar__select"
					:value="getSelectedOptions(filter)"
					:options="getFilterOptions(filter)"
					:placeholder="filter.label"
					:input-label="filter.label"
					:multiple="true"
					:clearable="true"
					@input="onSelectChange(filter.key, $event)" />

				<!-- Text filter (fallback) -->
				<NcTextField
					v-else
					:value="getFilterValue(filter.key) || ''"
					:placeholder="filter.label"
					:label="filter.label"
					@update:value="onFilterChange(filter.key, $event)" />
			</div>
		</div>
	</div>
</template>

<script>
import { NcButton, NcSelect, NcTextField, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import { filtersFromSchema } from '../../utils/schema.js'

/**
 * CnFacetSidebar — Auto-generated faceted search sidebar from schema properties.
 *
 * Reads properties marked `facetable: true` in the schema and generates
 * appropriate filter widgets. Accepts live facet data from the API for
 * dynamic option values with counts.
 *
 * @example
 * <CnFacetSidebar
 *   :schema="schema"
 *   :facet-data="facetData"
 *   :active-filters="filters"
 *   @filter-change="onFilterChange"
 *   @clear-all="clearFilters" />
 */
export default {
	name: 'CnFacetSidebar',

	components: {
		NcButton,
		NcSelect,
		NcTextField,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
	},

	props: {
		/** Schema definition — reads facetable properties */
		schema: {
			type: Object,
			required: true,
		},
		/** Live facet data from API: { fieldName: { values: [{value, count}] } } */
		facetData: {
			type: Object,
			default: () => ({}),
		},
		/** Current active filters: { fieldName: value | [values] } */
		activeFilters: {
			type: Object,
			default: () => ({}),
		},
		/** Whether facet data is loading */
		loading: {
			type: Boolean,
			default: false,
		},
		/** Sidebar title */
		title: {
			type: String,
			default: 'Filters',
		},
		/** Clear all button label */
		clearLabel: {
			type: String,
			default: 'Clear all',
		},
	},

	computed: {
		effectiveFilters() {
			return filtersFromSchema(this.schema)
		},

		hasActiveFilters() {
			return Object.values(this.activeFilters).some((v) => {
				if (Array.isArray(v)) return v.length > 0
				return v !== null && v !== undefined && v !== '' && v !== false
			})
		},
	},

	methods: {
		getFilterValue(key) {
			return this.activeFilters[key] ?? null
		},

		getFilterOptions(filter) {
			// Use facet data if available (live values with counts)
			const facet = this.facetData[filter.key]
			if (facet?.values?.length > 0) {
				return facet.values.map((v) => ({
					id: v.value,
					label: v.count !== undefined ? `${v.value} (${v.count})` : String(v.value),
				}))
			}
			// Fall back to static enum options from schema
			return filter.options || []
		},

		getSelectedOptions(filter) {
			const value = this.getFilterValue(filter.key)
			if (!value) return []
			const values = Array.isArray(value) ? value : [value]
			const options = this.getFilterOptions(filter)
			return values.map((v) => options.find((o) => o.id === v) || { id: v, label: String(v) })
		},

		onSelectChange(key, selected) {
			const values = selected ? selected.map((o) => o.id) : []
			this.$emit('filter-change', { key, values })
		},

		onFilterChange(key, value) {
			this.$emit('filter-change', { key, values: value })
		},
	},
}
</script>

<style scoped>
.cn-facet-sidebar {
	padding: 16px;
	border-right: 1px solid var(--color-border);
	min-width: 240px;
	max-width: 300px;
}

.cn-facet-sidebar__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}

.cn-facet-sidebar__title {
	margin: 0;
	font-size: 15px;
	font-weight: 600;
}

.cn-facet-sidebar__loading {
	display: flex;
	justify-content: center;
	padding: 20px;
}

.cn-facet-sidebar__filters {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-facet-sidebar__group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-facet-sidebar__label {
	font-size: 12px;
	font-weight: 500;
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
	letter-spacing: 0.3px;
}

.cn-facet-sidebar__select {
	width: 100%;
}
</style>
