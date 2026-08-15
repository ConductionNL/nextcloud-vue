/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

/**
 * Create a new report builder instance.
 *
 * Accumulates items during the transformation pipeline and renders a
 * Markdown report when `render()` is called.
 *
 * @return {object} Report builder API
 */
function createReportBuilder() {
	const items = []

	return {
		/**
		 * Record a migration event.
		 *
		 * @param {object} item Report item
		 * @param {'merge-dashboard'|'lift-sidebar'|'flatten-section'|'flatten-tab'|'migrate-card'|'normalize-action'|'registry-suggestion'|'todo'|'carried-forward'|'custom-component-migrated'} item.kind
		 * @param {string} [item.pageId]
		 * @param {string} [item.message]
		 * @param {object} [item.data]
		 */
		add(item) {
			items.push(item)
		},

		/**
		 * Retrieve all accumulated items.
		 *
		 * @return {Array<object>}
		 */
		getItems() {
			return items.slice()
		},

		/**
		 * Render the accumulated items as a Markdown document.
		 *
		 * @param {object} [opts]
		 * @param {string} [opts.inputFile] Path to the input file for the header
		 * @return {string} Markdown document
		 */
		render(opts = {}) {
			return renderReport(items, opts)
		},
	}
}

/**
 * Render a migration report as Markdown.
 *
 * @param {Array<object>} items Report items accumulated during transformation
 * @param {object} [opts]
 * @param {string} [opts.inputFile] Source file path for the header
 * @return {string} Markdown string
 */
function renderReport(items, opts = {}) {
	const lines = []

	const header = opts.inputFile ? `Migration Report: \`${opts.inputFile}\`` : 'Migration Report'
	lines.push(`# ${header}`)
	lines.push('')
	lines.push(`Generated: ${new Date().toISOString()}`)
	lines.push('')

	// --- Summary ---
	const summaryItems = {
		'dashboard widgets merged': items.filter((i) => i.kind === 'merge-dashboard'),
		'sidebar tab widgets lifted': items.filter((i) => i.kind === 'lift-sidebar'),
		'settings section widgets flattened': items.filter((i) => i.kind === 'flatten-section'),
		'settings tab widgets flattened': items.filter((i) => i.kind === 'flatten-tab'),
		'cardComponent migrations': items.filter((i) => i.kind === 'migrate-card'),
		'action type normalizations': items.filter((i) => i.kind === 'normalize-action'),
		'registry suggestions': items.filter((i) => i.kind === 'registry-suggestion'),
		'manual migration TODOs': items.filter((i) => i.kind === 'todo'),
		'carried-forward fields': items.filter((i) => i.kind === 'carried-forward'),
		'customComponents migrated': items.filter((i) => i.kind === 'custom-component-migrated'),
		'dialect-B widgets converged': items.filter((i) => i.kind === 'converge-widgets'),
		'data-binding keys renamed to dataSource': items.filter((i) => i.kind === 'rename-datasource'),
		'sidebar tabs normalised to slot:sidebar': items.filter((i) => i.kind === 'normalize-sidebar'),
		'custom dashboards promoted to type:dashboard': items.filter((i) => i.kind === 'promote-dashboard'),
	}

	lines.push('## Summary')
	lines.push('')

	let hasSomething = false
	for (const [label, group] of Object.entries(summaryItems)) {
		if (group.length > 0) {
			lines.push(`- **${group.length}** ${label}`)
			hasSomething = true
		}
	}

	if (!hasSomething) {
		lines.push('No migrations were performed. The manifest may already be in v2 shape.')
	}

	lines.push('')

	// --- Manual migration TODOs ---
	const todos = items.filter((i) => i.kind === 'todo')
	if (todos.length > 0) {
		lines.push('## Manual Migration Required')
		lines.push('')
		lines.push('The following pages require manual attention after running the codemod:')
		lines.push('')
		lines.push('| Page ID | Component | Reason |')
		lines.push('|---------|-----------|--------|')
		for (const todo of todos) {
			const pageId = todo.pageId || '(unknown)'
			const component = todo.componentName || '(none)'
			const reason = todo.reason || 'See _note field on page'
			lines.push(`| \`${pageId}\` | \`${component}\` | ${reason} |`)
		}
		lines.push('')
		lines.push('### TODO Checklist')
		lines.push('')
		for (const todo of todos) {
			lines.push(`- [ ] Page \`${todo.pageId}\`: ${todo.reason || 'Review and migrate manually'}`)
		}
		lines.push('')
	}

	// --- Registry suggestions ---
	const suggestions = items.filter((i) => i.kind === 'registry-suggestion')
	if (suggestions.length > 0) {
		lines.push('## Registry Suggestions')
		lines.push('')
		lines.push(
			'The following `type: "custom"` pages have components that were found in '
			+ '`customComponents`. The codemod has migrated `customComponents` to `registry` '
			+ '(see below). Review each suggested entry and confirm the `kind` is correct:',
		)
		lines.push('')
		for (const sug of suggestions) {
			lines.push(`### Page: \`${sug.pageId}\``)
			lines.push('')
			lines.push(`Component: \`${sug.componentName}\``)
			lines.push('')
			if (sug.registryEntry) {
				lines.push('Suggested registry entry:')
				lines.push('')
				lines.push('```json')
				lines.push(JSON.stringify(sug.registryEntry, null, 2))
				lines.push('```')
				lines.push('')
			}
		}
	}

	// --- customComponents migration ---
	const ccMigrations = items.filter((i) => i.kind === 'custom-component-migrated')
	if (ccMigrations.length > 0) {
		lines.push('## customComponents → registry Migration')
		lines.push('')
		lines.push(
			'The top-level `customComponents` map has been migrated to `registry`. '
			+ 'Each entry now has `"kind": "component"` added. Pass the `registry` '
			+ 'map to `CnAppRoot` as the `registry` prop (replacing `customComponents`):',
		)
		lines.push('')
		for (const cc of ccMigrations) {
			if (cc.data && cc.data.registry) {
				lines.push('```json')
				lines.push(JSON.stringify({ registry: cc.data.registry }, null, 2))
				lines.push('```')
				lines.push('')
			}
		}
	}

	// --- Carried-forward fields ---
	const carried = items.filter((i) => i.kind === 'carried-forward')
	if (carried.length > 0) {
		lines.push('## Carried-Forward Fields')
		lines.push('')
		lines.push(
			'The following fields were preserved verbatim in the output manifest '
			+ '(no transformation applied):',
		)
		lines.push('')
		const allFields = carried.flatMap((i) => i.data || [])
		if (allFields.length > 0) {
			lines.push('| Path | Key |')
			lines.push('|------|-----|')
			for (const f of allFields) {
				lines.push(`| \`${f.path}\` | \`${f.key}\` |`)
			}
		}
		lines.push('')
	}

	// --- Per-page details ---
	const pageItems = items.filter((i) => i.pageId)
	if (pageItems.length > 0) {
		const byPage = {}
		for (const item of pageItems) {
			if (!byPage[item.pageId]) {
				byPage[item.pageId] = []
			}
			byPage[item.pageId].push(item)
		}

		const pageIds = Object.keys(byPage).sort()
		if (pageIds.length > 0) {
			lines.push('## Per-Page Details')
			lines.push('')
			for (const pageId of pageIds) {
				const pageGroup = byPage[pageId]
				lines.push(`### \`${pageId}\``)
				lines.push('')
				for (const item of pageGroup) {
					const msg = item.message || formatItemMessage(item)
					lines.push(`- ${msg}`)
				}
				lines.push('')
			}
		}
	}

	return lines.join('\n')
}

/**
 * Format a fallback message for a report item based on its kind.
 *
 * @param {object} item
 * @return {string}
 */
function formatItemMessage(item) {
	switch (item.kind) {
	case 'merge-dashboard':
		return `Merged ${item.data?.count || 0} dashboard widget(s) with layout into top-level widgets[]`
	case 'lift-sidebar':
		return `Lifted ${item.data?.count || 0} sidebar tab widget(s) to slot "sidebar"`
	case 'flatten-section':
		return `Flattened ${item.data?.count || 0} settings section widget(s) to slot "section:*"`
	case 'flatten-tab':
		return `Flattened ${item.data?.count || 0} settings tab widget(s) to slot "tab:*"`
	case 'migrate-card':
		return 'Migrated cardComponent to card-grid widget entry'
	case 'normalize-action':
		return `Normalized ${item.data?.count || 0} action(s) to explicit type: "handler"`
	case 'registry-suggestion':
		return `Registry suggestion for component "${item.componentName}": add to registry with kind: "page"`
	case 'todo':
		return `TODO: ${item.reason || 'Manual migration required'}`
	case 'carried-forward':
		return `Carried forward ${item.data?.length || 0} verbatim field(s)`
	case 'converge-widgets':
		return `Converged ${item.data?.count || 0} dialect-B widget(s) to canonical widgets[]`
	case 'rename-datasource':
		return `Renamed ${item.data?.count || 0} data-binding key(s) to dataSource`
	case 'normalize-sidebar':
		return `Normalised ${item.data?.count || 0} sidebar tab widget(s) to slot "sidebar"`
	case 'promote-dashboard':
		return 'Promoted custom-dashboard page to type: "dashboard"'
	default:
		return item.message || String(item.kind)
	}
}

module.exports = { createReportBuilder, renderReport }
