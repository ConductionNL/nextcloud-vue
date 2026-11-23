<template>
	<div class="cn-filter-bar" data-testid="cn-filter-bar">
		<!-- Search input -->
		<div v-if="showSearch" class="cn-filter-bar__search" data-testid="cn-filter-bar-search">
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
					:data-testid="filter.testid || undefined"
					@update:modelValue="onFilterChange(filter.key, $event)" />

				<!-- Text filter -->
				<NcTextField
					v-else-if="filter.type === 'text'"
					:key="filter.key"
					class="cn-filter-bar__filter"
					:modelValue="filter.value || ''"
					:placeholder="filter.label"
					:label="filter.label"
					:data-testid="filter.testid || undefined"
					@update:modelValue="onFilterChange(filter.key, $event)" />

				<!-- Range filter: a number or date pair under one legend, each bound
				     with its own accessible name. The value is `{ gte, lte }`. -->
				<fieldset
					v-else-if="filter.type === 'range' || filter.type === 'dateRange'"
					:key="filter.key"
					class="cn-filter-bar__filter cn-filter-bar__range">
					<legend class="cn-filter-bar__range-legend">
						{{ filter.label }}
					</legend>
					<NcTextField
						:type="filter.type === 'range' ? 'number' : 'date'"
						:modelValue="rangeBound(filter, 'gte')"
						:label="fromLabel(filter)"
						:data-testid="filter.testid ? `${filter.testid}-from` : undefined"
						@update:modelValue="onRangeChange(filter, 'gte', $event)" />
					<NcTextField
						:type="filter.type === 'range' ? 'number' : 'date'"
						:modelValue="rangeBound(filter, 'lte')"
						:label="toLabel(filter)"
						:data-testid="filter.testid ? `${filter.testid}-to` : undefined"
						@update:modelValue="onRangeChange(filter, 'lte', $event)" />
				</fieldset>

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
 * select dropdowns, text inputs, checkbox filters, and `range` (numbers) and
 * `dateRange` (dates) filters whose value is `{ gte, lte }`. A range's two
 * bounds are named "{field}, from" and "{field}, up to" unless the filter
 * carries its own `fromLabel` / `toLabel`. `showSearch: false` drops the
 * search field for a bar of filters only.
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
		 * Filter definitions. Each item has `key`, `label`, `type`
		 * ('select'|'text'|'checkbox'|'range'|'dateRange'), optional `options`
		 * (for select), optional `value` (`{ gte, lte }` for a range), optional
		 * `fromLabel`/`toLabel` (a range's bound names) and optional `testid`.
		 *
		 * @type {Array<{key: string, label: string, type: 'select'|'text'|'checkbox'|'range'|'dateRange', options: Array, value: unknown, fromLabel: string, toLabel: string, testid: string}>}
		 */
		filters: {
			type: Array,
			default: () => [],
		},

		/** Whether to show the search field. */
		showSearch: {
			type: Boolean,
			default: true,
		},

		/** Current search text */
		searchValue: {
			type: String,
			default: '',
		},

		/** Search input placeholder text */
		searchPlaceholder: {
			type: String,
			default: () => t('nextcloud-vue', 'Search…'),
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
				|| this.filters.some((f) => this.isActive(f.value))
		},
	},

	methods: {
		/**
		 * Whether a filter value narrows anything. A range narrows when either
		 * bound is set.
		 *
		 * @param {unknown} value The filter value.
		 * @return {boolean} True when the filter is in use.
		 */
		isActive(value) {
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				return Object.values(value).some((bound) => bound !== null && bound !== undefined && bound !== '')
			}
			return value !== null && value !== undefined && value !== '' && value !== false
		},

		/**
		 * One bound of a range filter, as text for its input.
		 *
		 * @param {object} filter The filter.
		 * @param {'gte'|'lte'} bound The bound.
		 * @return {string} The value.
		 */
		rangeBound(filter, bound) {
			const value = filter.value && typeof filter.value === 'object' ? filter.value[bound] : ''
			return value === null || value === undefined ? '' : String(value)
		},

		/**
		 * @param {object} filter The filter.
		 * @return {string} The accessible name of a range's lower bound.
		 */
		fromLabel(filter) {
			return filter.fromLabel || t('nextcloud-vue', '{field}, from', { field: filter.label || '' })
		},

		/**
		 * @param {object} filter The filter.
		 * @return {string} The accessible name of a range's upper bound.
		 */
		toLabel(filter) {
			return filter.toLabel || t('nextcloud-vue', '{field}, up to', { field: filter.label || '' })
		},

		/**
		 * Emit a range filter's new value with one bound changed.
		 *
		 * @param {object} filter The filter.
		 * @param {'gte'|'lte'} bound The bound that changed.
		 * @param {string} value Its new value.
		 */
		onRangeChange(filter, bound, value) {
			const current = filter.value && typeof filter.value === 'object' ? filter.value : {}
			this.onFilterChange(filter.key, { ...current, [bound]: value })
		},

		/**
		 * Emit filter change event.
		 *
		 * @param {string} key Filter key
		 * @param {unknown} value New filter value
		 */
		onFilterChange(key, value) {
			/**
			 * @event filter-change Emitted when any filter changes.
			 * @type {{ key: string, value: unknown }}
			 */
			this.$emit('filter-change', { key, value })
		},
	},
}
</script>

<style scoped>
.cn-filter-bar__range {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 4px;
	border: none;
	margin: 0;
	padding: 0;
}

.cn-filter-bar__range-legend {
	inline-size: 100%;
	padding: 0;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}
</style>
