<template>
	<div
		v-if="totalPages > 1 || totalItems > minItemsToShow"
		class="cn-pagination"
		:class="{ 'cn-pagination--compact': compact }"
		data-testid="cn-pagination">
		<!-- Page info -->
		<div class="cn-pagination__info">
			<span class="cn-pagination__page-info">
				{{ pageInfoText }}
			</span>
		</div>

		<!--
		  Compact navigation — a single Previous / Next pair, for the inside of
		  a dashboard widget. The full control (First/Last, numbered pages, a
		  page-size select) is an index-page affordance; dropped into a widget
		  card it is wider than the card and taller than the rows it pages.
		-->
		<div v-if="compact && totalPages > 1" class="cn-pagination__nav cn-pagination__nav--compact">
			<NcButton
				:aria-label="previousLabel"
				:disabled="currentPage === 1"
				data-testid="cn-pagination-prev"
				@click="changePage(currentPage - 1)">
				<template #icon>
					<ChevronLeft :size="20" />
				</template>
			</NcButton>
			<NcButton
				:aria-label="nextLabel"
				:disabled="currentPage === totalPages"
				data-testid="cn-pagination-next"
				@click="changePage(currentPage + 1)">
				<template #icon>
					<ChevronRight :size="20" />
				</template>
			</NcButton>
		</div>

		<!-- Page navigation -->
		<div v-else-if="totalPages > 1" class="cn-pagination__nav">
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
		<div v-if="!compact" class="cn-pagination__page-size">
			<label :for="pageSizeId">{{ itemsPerPageLabel }}</label>
			<NcSelect
				:input-id="pageSizeId"
				class="cn-pagination__page-size-select"
				:model-value="currentPageSizeOption"
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
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import { nextUid } from '../../utils/uid.js'

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
		ChevronLeft,
		ChevronRight,
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
		/**
		 * Compact mode — one Previous / Next pair and the item range, sized to
		 * sit inside a dashboard widget's footer. Drops the First/Last
		 * buttons, the numbered pages and the page-size select, none of which
		 * fit in a widget card.
		 *
		 * @type {boolean}
		 */
		compact: {
			type: Boolean,
			default: false,
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
		/**
		 * Page info format used in `compact` mode. Placeholders: {from}, {to},
		 * {total} — the item range rather than the page number.
		 */
		compactInfoFormat: {
			type: String,
			default: () => t('nextcloud-vue', '{from}–{to} of {total}'),
		},
	},

	emits: ['page-changed', 'page-size-changed'],

	data() {
		return {
			// Per-instance id suffix. In `data()` rather than a computed so it is
			// fixed for the instance's lifetime — the value is referenced by a
			// `<label for>`, which breaks if the id changes between renders.
			uid: nextUid(),
		}
	},

	computed: {
		pageSizeId() {
			return 'cn-page-size-' + this.uid
		},

		currentPageSizeOption() {
			return this.pageSizeOptions.find(
				(option) => option.value === this.currentPageSize,
			) || this.pageSizeOptions[1]
		},

		pageInfoText() {
			// Compact mode names the ITEMS, not the pages: in a widget the row
			// range ("1–5 of 137") is what the reader is actually looking at,
			// and it is the only honest statement of how much is off-screen.
			if (this.compact) {
				const from = this.totalItems === 0 ? 0 : ((this.currentPage - 1) * this.currentPageSize) + 1
				const to = Math.min(this.currentPage * this.currentPageSize, this.totalItems)
				return this.compactInfoFormat
					.replace('{from}', from)
					.replace('{to}', to)
					.replace('{total}', this.totalItems)
			}
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
