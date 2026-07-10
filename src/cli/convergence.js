/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

const { convergeTypedWidgets } = require('./transforms/convergeTypedWidgets')
const { renameDataSourceKeys } = require('./transforms/renameDataSourceKeys')
const { normalizeSidebarShapes } = require('./transforms/normalizeSidebarShapes')
const { promoteCustomDashboard } = require('./transforms/promoteCustomDashboard')
const { createReportBuilder } = require('./reportBuilder')

/**
 * Run the widget-dialect convergence pass over a manifest.
 *
 * Applies the four convergence transforms to every page, in order:
 *   1. promoteCustomDashboard  — type:"custom" bespoke dashboard → type:"dashboard"
 *   2. convergeTypedWidgets    — dialect-B typed defs + config.layout → canonical widgets[]
 *   3. normalizeSidebarShapes  — sidebarProps/sidebarTabs/sidebar.tabs → slot:"sidebar" widgets[]
 *   4. renameDataSourceKeys    — entry-level content.source / source → dataSource
 *
 * Every transform is idempotent, so the whole pass is idempotent: re-running on
 * an already-canonical manifest produces a byte-identical result.
 *
 * Unconvertible items (component-only sidebar tabs, bespoke dashboards with no
 * manifest-widget expression) are flagged for manual review, never dropped.
 *
 * @param {object} manifest A v2 manifest object (not mutated)
 * @param {object} [opts]
 * @param {string} [opts.inputFile] Source path for the report header
 * @return {{ transformed: object, report: string, reportItems: Array<object>, changed: boolean }}
 */
function runConvergence(manifest, opts = {}) {
	const builder = createReportBuilder()
	const before = JSON.stringify(manifest)
	const current = JSON.parse(before)

	if (!Array.isArray(current.pages)) {
		return { transformed: current, report: builder.render(opts), reportItems: builder.getItems(), changed: false }
	}

	current.pages = current.pages.map((page) => {
		if (!page || typeof page !== 'object') return page

		// 1. Promote bespoke custom dashboards.
		const { page: p1, promoted, flagged } = promoteCustomDashboard(page)
		if (promoted) {
			builder.add({ kind: 'promote-dashboard', pageId: page.id, data: { flagged } })
			if (flagged) {
				builder.add({
					kind: 'todo',
					pageId: page.id,
					componentName: flagged,
					reason: `Bespoke dashboard "${flagged}" has no manifest-widget expression — author widgets[] manually`,
				})
			}
		}

		// 2. Fold dialect-B typed widgets + layout into canonical widgets[].
		const { page: p2, count: convCount } = convergeTypedWidgets(p1)
		if (convCount > 0) {
			builder.add({ kind: 'converge-widgets', pageId: page.id, data: { count: convCount } })
		}

		// 3. Normalise legacy sidebar shapes.
		const { page: p3, count: sbCount, unconverted } = normalizeSidebarShapes(p2)
		if (sbCount > 0) {
			builder.add({ kind: 'normalize-sidebar', pageId: page.id, data: { count: sbCount } })
		}
		for (const tabId of unconverted) {
			builder.add({
				kind: 'todo',
				pageId: page.id,
				componentName: null,
				reason: `Sidebar tab "${tabId}" is component-only — cannot express as a canonical widget; retained for manual review`,
			})
		}

		// 4. Rename entry-level data-binding keys to dataSource.
		const { page: p4, count: dsCount } = renameDataSourceKeys(p3)
		if (dsCount > 0) {
			builder.add({ kind: 'rename-datasource', pageId: page.id, data: { count: dsCount } })
		}

		return p4
	})

	const after = JSON.stringify(current)
	return {
		transformed: current,
		report: builder.render(opts),
		reportItems: builder.getItems(),
		changed: after !== before,
	}
}

module.exports = { runConvergence }
