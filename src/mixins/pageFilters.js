/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { isOptionsFrom, loadOptionsFrom } from '../utils/optionsFrom.js'
import { generatedPageFilterOptions } from '../utils/periodOptions.js'

/**
 * Page-level filters (manifest `config.pageFilters`), shared by CnDashboardPage
 * and CnDetailPage: seeding each filter's value, reading its options and
 * writing a choice into the page's workspace context, where a widget reads it
 * through `@page.<key>` / `@workspace.<key>`.
 *
 * The host provides `pageFilters` (the declared filters), `workspaceContext`
 * (the reactive bag it provides as `cnWorkspaceContext`) and
 * `effectiveTranslate` (the host app's translate).
 *
 * @spec openspec/changes/detail-page-filters/specs/detail-page/spec.md#requirement-a-detail-page-can-draw-page-filters-that-its-widgets-read
 */
export const pageFilters = {
	data() {
		return {
			/** Options read through a page filter's `optionsFrom`, by filter key. */
			pageFilterFetched: {},
			/** Whether a page filter's `optionsFrom` read is in flight, by filter key. */
			pageFilterLoading: {},
		}
	},

	methods: {
		/**
		 * Seed the reactive workspace context with each page filter's default
		 * (its `default`, else the first option's value) so endpoint-bound
		 * widgets have a value to interpolate on first render. Only writes keys
		 * that aren't already present, so a value another widget set survives.
		 *
		 * @return {void}
		 */
		initPageFilters() {
			for (const pf of this.pageFilters || []) {
				if (!pf || !pf.key) {
					continue
				}
				if (this.workspaceContext[pf.key] !== undefined) {
					continue
				}
				const listed = Array.isArray(pf.options) ? pf.options : generatedPageFilterOptions(pf)
				const fallback = (listed && listed.length && pf.clearable !== true) ? listed[0].value : undefined
				const value = pf.default !== undefined ? pf.default : fallback
				if (value !== undefined) {
					this.workspaceContext[pf.key] = value
				}
			}
		},

		/**
		 * The currently-selected option object for a page filter's NcSelect
		 * (matched by `value` against the workspace context), or null.
		 *
		 * @param {object} pf The page-filter descriptor.
		 * @return {object|null}
		 */
		selectedPageFilterOption(pf) {
			if (!pf || !pf.key) {
				return null
			}
			const current = this.workspaceContext[pf.key]
			return this.pageFilterSegments(pf).find((o) => o.value === current) || null
		},

		/**
		 * A page filter's options, labels through the host translate: the
		 * segments of a segmented filter and the options of a select.
		 *
		 * @spec openspec/changes/dashboard-board-termijnen/specs/dashboard-page/spec.md#requirement-a-page-filter-as-a-segmented-group-on-the-description-line
		 * @param {object} pf The page-filter descriptor.
		 * @return {Array<{value: (string|number), label: string}>}
		 */
		pageFilterSegments(pf) {
			const options = Array.isArray(pf.options) ? pf.options : (generatedPageFilterOptions(pf) || this.pageFilterFetched[pf.key] || [])
			return options.map((o) => ({ value: o.value, label: o.label ? this.effectiveTranslate(o.label) : String(o.value) }))
		},

		/**
		 * Read the options of every page filter with `optionsFrom`, then seed
		 * a filter that is not clearable with its first option when it has no
		 * value yet.
		 *
		 * @spec openspec/changes/page-filter-options-from/specs/dashboard-page/spec.md#requirement-a-page-filter-can-read-its-options
		 * @return {Promise<void>}
		 */
		async loadPageFilterOptions() {
			const ctx = { workspace: this.workspaceContext || {} }
			await Promise.all((this.pageFilters || [])
				.filter((pf) => pf && pf.key && !Array.isArray(pf.options) && pf.optionsFrom && typeof pf.optionsFrom === 'object')
				.map(async (pf) => {
					const from = pf.optionsFrom
					if (!isOptionsFrom(from)) {
						return
					}
					this.pageFilterLoading = { ...this.pageFilterLoading, [pf.key]: true }
					let options
					try {
						options = (await loadOptionsFrom(from, ctx)).map((o) => ({ value: o.id, label: o.label }))
					} catch {
						options = []
					}
					this.pageFilterFetched = { ...this.pageFilterFetched, [pf.key]: options }
					this.pageFilterLoading = { ...this.pageFilterLoading, [pf.key]: false }
					if (pf.clearable !== true && pf.default === undefined && this.workspaceContext[pf.key] === undefined && options.length > 0) {
						this.workspaceContext[pf.key] = options[0].value
					}
				}))
		},

		/**
		 * Write a page filter's new selection into the reactive workspace
		 * context so every `@page.<key>` / `@workspace.<key>` token re-resolves.
		 *
		 * @param {object} pf The page-filter descriptor.
		 * @param {object|null} option The chosen NcSelect option (`{ value, label }`).
		 * @return {void}
		 */
		onPageFilterChange(pf, option) {
			if (!pf || !pf.key) {
				return
			}
			const value = option && typeof option === 'object' ? option.value : (option ?? null)
			this.workspaceContext[pf.key] = value
			/**
			 * @event page-filter-change Emitted when a page-level filter selection changes.
			 * @type {{ key: string, value: (string|number|null) }}
			 */
			this.$emit('page-filter-change', { key: pf.key, value })
		},
	},
}
