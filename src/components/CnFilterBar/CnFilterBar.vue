<template>
	<div class="cn-filter-bar" data-testid="cn-filter-bar">
		<!-- Search input -->
		<div class="cn-filter-bar__search" data-testid="cn-filter-bar-search">
			<NcTextField
				:modelValue="searchValue"
				:placeholder="searchPlaceholder"
				:label="searchPlaceholder"
				trailingButtonIcon="close"
				:showTrailingButton="searchValue !== ''"
				@update:modelValue="$emit('search', $event)"
				@trailingButtonClick="$emit('search', '')">
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
					:modelValue="filter.value"
					:options="filter.options || []"
					:placeholder="filter.label"
					:inputLabel="filter.label"
					:clearable="true"
					@update:modelValue="onFilterChange(filter.key, $event)" />

				<!-- Text filter -->
				<NcTextField
					v-else-if="filter.type === 'text'"
					:key="filter.key"
					class="cn-filter-bar__filter"
					:modelValue="filter.value || ''"
					:placeholder="filter.label"
					:label="filter.label"
					@update:modelValue="onFilterChange(filter.key, $event)" />

				<!-- Checkbox filter -->
				<NcCheckboxRadioSwitch
					v-else-if="filter.type === 'checkbox'"
					:key="filter.key"
					:modelValue="!!filter.value"
					@update:modelValue="onFilterChange(filter.key, $event)">
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
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcSelect, NcTextField } from '@nextcloud/vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'

/**
 * CnFilterBar — Search and filter controls row for list views.
 *
 * Extracted from the repeated search + filter pattern in CaseList, ClientList,
 * LeadList, RequestList across Pipelinq and Dossiq. Supports text search,
 * select dropdowns, text inputs, and checkbox filters.
 *
 * ```vue
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
 * ```
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
		 * Filter definitions. Each item has `key`, `label`, `type` ('select'|'text'|'checkbox'),
		 * optional `options` (for select), and optional `value`.
		 *
		 * @type {Array<{key: string, label: string, type: 'select'|'text'|'checkbox', options: Array, value: any}>}
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
			default: () => t('nextcloud-vue', 'Search...'),
		},

		/** Whether to show the "Clear all" button */
		showClearAll: {
			type: Boolean,
			default: true,
		},

		/** Clear all button label */
		clearAllLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Clear filters'),
		},
	},

	emits: ['clear-all', 'filter-change', 'search'],

	computed: {
		hasActiveFilters() {
			return this.searchValue !== ''
				|| this.filters.some((f) => f.value !== null && f.value !== '' && f.value !== false)
		},
	},

	methods: {
		/**
		 * Emit filter change event.
		 *
		 * @param {string} key Filter key
		 * @param {*} value New filter value
		 */
		onFilterChange(key, value) {
			/**
			 * @event filter-change Emitted when any filter changes.
			 * @type {{ key: string, value: any }}
			 */
			this.$emit('filter-change', { key, value })
		},
	},
}
</script>
