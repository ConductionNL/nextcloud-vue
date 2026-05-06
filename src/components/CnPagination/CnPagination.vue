<template>
	<div v-if="totalPages > 1 || totalItems > minItemsToShow" class="cn-pagination">
		<!-- Page info -->
		<div class="cn-pagination__info">
			<span class="cn-pagination__page-info">
				{{ pageInfoText }}
			</span>
		</div>

		<!-- Page navigation -->
		<div v-if="totalPages > 1" class="cn-pagination__nav">
			<NcButton
				:disabled="currentPage === 1"
				@click="changePage(1)">
				{{ firstLabel }}
			</NcButton>

			<NcButton
				:disabled="currentPage === 1"
				@click="changePage(currentPage - 1)">
				{{ previousLabel }}
			</NcButton>

			<div class="cn-pagination__numbers">
				<template v-for="page in visiblePages">
					<span v-if="page === '...'" :key="'ellipsis-' + page" class="cn-pagination__ellipsis">...</span>
					<NcButton
						v-else
						:key="page"
						:type="page === currentPage ? 'primary' : 'secondary'"
						:disabled="page === currentPage"
						@click="changePage(page)">
						{{ page }}
					</NcButton>
				</template>
			</div>

			<NcButton
				:disabled="currentPage === totalPages"
				@click="changePage(currentPage + 1)">
				{{ nextLabel }}
			</NcButton>

			<NcButton
				:disabled="currentPage === totalPages"
				@click="changePage(totalPages)">
				{{ lastLabel }}
			</NcButton>
		</div>

		<!-- Page size selector -->
		<div class="cn-pagination__page-size">
			<label :for="pageSizeId">{{ itemsPerPageLabel }}</label>
			<NcSelect
				:input-id="pageSizeId"
				class="cn-pagination__page-size-select"
				:value="currentPageSizeOption"
				:options="pageSizeOptions"
				:clearable="false"
				:input-label="itemsPerPageLabel"
				@option:selected="changePageSize" />
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcSelect } from '@nextcloud/vue'

/**
 * CnPagination — Full pagination with page numbers, navigation, and page size selector.
 *
 * Extracted from OpenRegister's PaginationComponent. Zero store dependencies.
 * Supports First/Previous/Next/Last buttons, smart page number display with
 * ellipsis, and configurable page size.
 *
 * NL Design tokens used:
 * - Inherits from cn-pagination CSS class (see css/pagination.css)
 *
 * ```vue
 * <CnPagination
 *   :current-page="page"
 *   :total-pages="totalPages"
 *   :total-items="totalItems"
 *   :current-page-size="limit"
 *   @page-changed="onPageChange"
 *   @page-size-changed="onPageSizeChange" />
 * ```
 */
export default {
	name: 'CnPagination',

	components: {
		NcButton,
		NcSelect,
	},

	props: {
		/** Current page number (1-based) */
		currentPage: {
			type: Number,
			default: 1,
		},
		/** Total number of pages */
		totalPages: {
			type: Number,
			default: 1,
		},
		/** Total number of items across all pages */
		totalItems: {
			type: Number,
			default: 0,
		},
		/** Current items per page */
		currentPageSize: {
			type: Number,
			default: 20,
		},
		/** Available page size options */
		pageSizeOptions: {
			type: Array,
			default: () => [
				{ value: 10, label: '10' },
				{ value: 20, label: '20' },
				{ value: 50, label: '50' },
				{ value: 100, label: '100' },
				{ value: 250, label: '250' },
				{ value: 500, label: '500' },
				{ value: 1000, label: '1000' },
			],
		},
		/** Minimum items before pagination is shown */
		minItemsToShow: {
			type: Number,
			default: 10,
		},
		/** Label for "First" button */
		firstLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'First'),
		},
		/** Label for "Previous" button */
		previousLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Previous'),
		},
		/** Label for "Next" button */
		nextLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Next'),
		},
		/** Label for "Last" button */
		lastLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Last'),
		},
		/** Label for "Items per page:" */
		itemsPerPageLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Items per page:'),
		},
		/**
		 * Page info format string. Use {current} and {total} as placeholders.
		 * "Page {current} of {total}"
		 */
		pageInfoFormat: {
			type: String,
			default: () => t('nextcloud-vue', 'Page {current} of {total}'),
		},
	},

	computed: {
		pageSizeId() {
			return 'cn-page-size-' + this._uid
		},

		currentPageSizeOption() {
			return this.pageSizeOptions.find(
				(option) => option.value === this.currentPageSize,
			) || this.pageSizeOptions[1]
		},

		pageInfoText() {
			return this.pageInfoFormat
				.replace('{current}', this.currentPage)
				.replace('{total}', this.totalPages)
		},

		/**
		 * Calculate visible page numbers with ellipsis for large page counts.
		 * Shows up to 7 page numbers at a time.
		 */
		visiblePages() {
			const current = this.currentPage
			const total = this.totalPages
			const pages = []

			if (total <= 7) {
				for (let i = 1; i <= total; i++) {
					pages.push(i)
				}
			} else {
				pages.push(1)

				if (current <= 4) {
					for (let i = 2; i <= 5; i++) {
						pages.push(i)
					}
					pages.push('...')
					pages.push(total)
				} else if (current >= total - 3) {
					pages.push('...')
					for (let i = total - 4; i <= total; i++) {
						pages.push(i)
					}
				} else {
					pages.push('...')
					for (let i = current - 1; i <= current + 1; i++) {
						pages.push(i)
					}
					pages.push('...')
					pages.push(total)
				}
			}

			return pages
		},
	},

	methods: {
		/**
		 * Navigate to a specific page.
		 * @param {number} page Target page number
		 */
		changePage(page) {
			if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
				/** @event page-changed Emitted when page changes. Payload: new page number. */
				this.$emit('page-changed', page)
			}
		},

		/**
		 * Change the page size.
		 * @param {object} option Selected page size option { value, label }
		 */
		changePageSize(option) {
			if (option.value !== this.currentPageSize) {
				/** @event page-size-changed Emitted when page size changes. Payload: new page size. */
				this.$emit('page-size-changed', option.value)
			}
		},
	},
}
</script>
