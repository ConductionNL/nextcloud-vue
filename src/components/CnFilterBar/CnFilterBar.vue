<template>
	<div class="cn-filter-bar">
		<!-- Search input -->
		<div class="cn-filter-bar__search">
			<NcTextField
				:value="searchValue"
				:placeholder="searchPlaceholder"
				:label="searchPlaceholder"
				trailing-button-icon="close"
				:show-trailing-button="searchValue !== ''"
				@update:value="$emit('search', $event)"
				@trailing-button-click="$emit('search', '')">
				<template #icon>
					<Magnify :size="20" />
				</template>
			</NcTextField>
		</div>

		<!-- Filter controls -->
		<div class="cn-filter-bar__filters">
			<template v-for="filter in filters">
				<!-- Select filter -->
				<NcSelect
					v-if="filter.type === 'select'"
					:key="filter.key"
					class="cn-filter-bar__filter"
					:value="filter.value"
					:options="filter.options || []"
					:placeholder="filter.label"
					:input-label="filter.label"
					:clearable="true"
					@input="onFilterChange(filter.key, $event)" />

				<!-- Text filter -->
				<NcTextField
					v-else-if="filter.type === 'text'"
					:key="filter.key"
					class="cn-filter-bar__filter"
					:value="filter.value || ''"
					:placeholder="filter.label"
					:label="filter.label"
					@update:value="onFilterChange(filter.key, $event)" />

				<!-- Checkbox filter -->
				<NcCheckboxRadioSwitch
					v-else-if="filter.type === 'checkbox'"
					:key="filter.key"
					:checked="!!filter.value"
					@update:checked="onFilterChange(filter.key, $event)">
					{{ filter.label }}
				</NcCheckboxRadioSwitch>
			</template>
		</div>

		<!-- Clear all -->
		<NcButton
			v-if="showClearAll && hasActiveFilters"
			class="cn-filter-bar__clear"
			@click="$emit('clear-all')">
			{{ clearAllLabel }}
		</NcButton>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'

/**
 * CnFilterBar — Search and filter controls row for list views.
 *
 * Extracted from the repeated search + filter pattern in CaseList, ClientList,
 * LeadList, RequestList across Pipelinq and Procest. Supports text search,
 * select dropdowns, text inputs, and checkbox filters.
 *
 * @example
 * <CnFilterBar
 *   :search-value="searchTerm"
 *   search-placeholder="Search clients..."
 *   :filters="[
 *     { key: 'type', label: 'All types', type: 'select', options: typeOptions, value: selectedType },
 *     { key: 'active', label: 'Active only', type: 'checkbox', value: showActiveOnly },
 *   ]"
 *   @search="onSearch"
 *   @filter-change="onFilterChange"
 *   @clear-all="clearFilters" />
 */
export default {
	name: 'CnFilterBar',

	components: {
		NcTextField,
		NcSelect,
		NcButton,
		NcCheckboxRadioSwitch,
		Magnify,
	},

	props: {
		/**
		 * Filter definitions.
		 * @type {Array<{key: string, label: string, type: 'select'|'text'|'checkbox', options?: Array, value?: *}>}
		 */
		filters: {
			type: Array,
			default: () => [],
		},
		/** Current search text */
		searchValue: {
			type: String,
			default: '',
		},
		/** Search input placeholder text */
		searchPlaceholder: {
			type: String,
			default: 'Search...',
		},
		/** Whether to show the "Clear all" button */
		showClearAll: {
			type: Boolean,
			default: true,
		},
		/** Clear all button label */
		clearAllLabel: {
			type: String,
			default: 'Clear filters',
		},
	},

	computed: {
		hasActiveFilters() {
			return this.searchValue !== ''
				|| this.filters.some((f) => f.value !== null && f.value !== '' && f.value !== false)
		},
	},

	methods: {
		/**
		 * Emit filter change event.
		 * @param {string} key Filter key
		 * @param {*} value New filter value
		 */
		onFilterChange(key, value) {
			/**
			 * @event filter-change Emitted when any filter changes.
			 * @type {{ key: string, value: * }}
			 */
			this.$emit('filter-change', { key, value })
		},
	},
}
</script>
