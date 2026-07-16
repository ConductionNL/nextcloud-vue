/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

const { mergeDashboardWidgetsAndLayout } = require('./transforms/mergeDashboardWidgetsAndLayout')
const { liftSidebarTabWidgets } = require('./transforms/liftSidebarTabWidgets')
const { flattenSettingsSectionWidgets } = require('./transforms/flattenSettingsSectionWidgets')
const { flattenSettingsTabs } = require('./transforms/flattenSettingsTabs')
const { migrateCardComponent } = require('./transforms/migrateCardComponent')
const { addExplicitActionTypes } = require('./transforms/addExplicitActionTypes')
const { carryForwardVerbatimFields } = require('./transforms/carryForwardVerbatimFields')
const { handleCustomPages } = require('./transforms/handleCustomPages')
const { migrateCustomComponents } = require('./transforms/migrateCustomComponents')
const { updateSchemaField } = require('./transforms/updateSchemaField')
const { createReportBuilder } = require('./reportBuilder')
const { runConvergence } = require('./convergence')

/**
 * Run the full v1 → v2 transformation pipeline on a manifest object.
 *
 * Applies transformation rules in order:
 *  1. Verify verbatim carry-forward fields (assertion pass — no mutation)
 *  2. Migrate customComponents → registry
 *  3. Handle custom pages (add _note, emit report entries)
 *  4. For each page: merge dashboard widgets+layout
 *  5. For each page: lift sidebar tab widgets
 *  6. For each page: flatten settings section widgets
 *  7. For each page: flatten settings tabs
 *  8. For each page: migrate cardComponent
 *  9. For each page: add explicit action types
 * 10. Set $schema to v2 URL
 *
 * Returns the transformed manifest and a rendered Markdown report.
 *
 * @param {object} manifest Deep-cloned v1 manifest (not mutated)
 * @param {object} [opts]
 * @param {string} [opts.inputFile] Source file path (used in report header)
 * @return {{ transformed: object, report: string, reportItems: Array<object> }}
 */
function runPipeline(manifest, opts = {}) {
	const builder = createReportBuilder()
	let current = JSON.parse(JSON.stringify(manifest)) // deep clone

	// Step 1: Assert verbatim carry-forward fields (no mutation)
	const { carriedFields } = carryForwardVerbatimFields(current)
	if (carriedFields.length > 0) {
		builder.add({
			kind: 'carried-forward',
			message: `${carriedFields.length} verbatim field(s) will be preserved unchanged`,
			data: carriedFields,
		})
	}

	// Step 2: Migrate customComponents → registry
	const { manifest: afterCustomComponents, count: ccCount, registrySuggestions } = migrateCustomComponents(current)
	current = afterCustomComponents
	if (ccCount > 0) {
		builder.add({
			kind: 'custom-component-migrated',
			message: `Migrated ${ccCount} customComponents to registry`,
			data: { registry: current.registry, keys: registrySuggestions },
		})
	}

	// Step 3: Handle custom pages (add _note markers, emit report entries)
	const { manifest: afterCustomPages, reportEntries: customPageEntries } = handleCustomPages(current)
	current = afterCustomPages
	for (const entry of customPageEntries) {
		builder.add({ ...entry, pageId: entry.pageId })
	}

	// Steps 4-9: Per-page transforms
	if (Array.isArray(current.pages)) {
		current = {
			...current,
			pages: current.pages.map((page) => {
				if (!page || typeof page !== 'object') return page

				// 4. Merge dashboard widgets + layout
				const { page: p1, count: mergeCount } = mergeDashboardWidgetsAndLayout(page)
				if (mergeCount > 0) {
					builder.add({ kind: 'merge-dashboard', pageId: page.id, data: { count: mergeCount } })
				}

				// 5. Lift sidebar tab widgets
				const { page: p2, count: liftCount, unconvertedTabs } = liftSidebarTabWidgets(p1)
				if (liftCount > 0) {
					builder.add({ kind: 'lift-sidebar', pageId: page.id, data: { count: liftCount } })
				}
				for (const tabId of (unconvertedTabs || [])) {
					builder.add({
						kind: 'todo',
						pageId: page.id,
						componentName: null,
						reason: `Sidebar tab "${tabId}" uses component (not widgets) — manual migration required`,
					})
				}

				// 6. Flatten settings section widgets
				const { page: p3, count: sectionCount } = flattenSettingsSectionWidgets(p2)
				if (sectionCount > 0) {
					builder.add({ kind: 'flatten-section', pageId: page.id, data: { count: sectionCount } })
				}

				// 7. Flatten settings tabs
				const { page: p4, count: tabCount } = flattenSettingsTabs(p3)
				if (tabCount > 0) {
					builder.add({ kind: 'flatten-tab', pageId: page.id, data: { count: tabCount } })
				}

				// 8. Migrate cardComponent
				const { page: p5, count: cardCount } = migrateCardComponent(p4)
				if (cardCount > 0) {
					builder.add({ kind: 'migrate-card', pageId: page.id })
				}

				// 9. Add explicit action types
				const { page: p6, count: actionCount } = addExplicitActionTypes(p5)
				if (actionCount > 0) {
					builder.add({ kind: 'normalize-action', pageId: page.id, data: { count: actionCount } })
				}

				return p6
			}),
		}
	}

	// Step 10: Set $schema to v2 URL
	current = updateSchemaField(current)

	// Step 11: Widget-dialect convergence pass (idempotent). Runs after the
	// mechanical v1→v2 rules so a freshly-migrated manifest also lands on the
	// single canonical widget dialect. See convergence.js.
	const convergence = runConvergence(current, { inputFile: opts.inputFile })
	current = convergence.transformed
	for (const item of convergence.reportItems) {
		builder.add(item)
	}

	const reportItems = builder.getItems()
	const report = builder.render({ inputFile: opts.inputFile })

	return { transformed: current, report, reportItems }
}

module.exports = { runPipeline }
