<template>
	<div class="cn-list-layout">
		<!-- Header -->
		<div class="cn-list-layout__header">
			<div class="cn-list-layout__title">
				<h2>{{ title }}</h2>
				<span v-if="totalItems > 0" class="cn-list-layout__count">({{ totalItems }})</span>
			</div>
			<div class="cn-list-layout__actions">
				<slot name="actions" />
			</div>
		</div>

		<!-- Filters slot -->
		<slot name="filters" />

		<!-- Loading state -->
		<div v-if="loading" class="cn-loading-container">
			<NcLoadingIcon :size="32" />
		</div>

		<!-- Main content (table area) -->
		<template v-else>
			<slot />
		</template>

		<!-- Pagination slot -->
		<slot name="pagination" />
	</div>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'

/**
 * CnListViewLayout — Full list page layout wrapping header, filters, table, and pagination.
 *
 * Provides the standard page structure used by every list view: a header with
 * title + action buttons, a filter/search area, the main content (table), and pagination.
 *
 * @example
 * <CnListViewLayout title="Clients" :total-items="clients.length" :loading="isLoading">
 *   <template #actions>
 *     <NcButton type="primary" @click="createClient">New client</NcButton>
 *   </template>
 *   <template #filters>
 *     <CnFilterBar ... />
 *   </template>
 *   <CnDataTable :columns="columns" :rows="clients" />
 *   <template #pagination>
 *     <CnPagination ... />
 *   </template>
 * </CnListViewLayout>
 */
export default {
	name: 'CnListViewLayout',

	components: {
		NcLoadingIcon,
	},

	props: {
		/** Page title */
		title: {
			type: String,
			required: true,
		},
		/** Total items count (shown next to title) */
		totalItems: {
			type: Number,
			default: 0,
		},
		/** Whether data is loading */
		loading: {
			type: Boolean,
			default: false,
		},
	},
}
</script>
