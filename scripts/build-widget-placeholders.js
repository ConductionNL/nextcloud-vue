#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Writes dist/widget-placeholders.json: every library dashboard widget type
 * mapped to the placeholder shape its registration declares,
 * `{ "<type>": { "shape": "rows", "count"?: n } }` (widget-placeholder-shape,
 * design D3). A PHP host cannot run the registry, so the build hands it the
 * declarations as data; the package exports the file as
 * `@conduction/nextcloud-vue/widget-placeholders.json`.
 *
 * The declarations are read from the `registerDashboardWidget('<type>', {`
 * calls under src/components, where `placeholder` is the entry's first
 * property. tests/build/widgetPlaceholders.spec.js compares the result with the
 * registry after every widget type has registered, so the two cannot drift.
 *
 * Run after rollup (`npm run build`); `--print` writes to stdout instead.
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-4
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHAPES = ['rows', 'lines', 'block', 'tiles', 'counter', 'heading']
const CALL = /registerDashboardWidget\('([^']+)',\s*\{\s*placeholder:\s*('([a-z]+)'|\{\s*shape:\s*'([a-z]+)'\s*(?:,\s*count:\s*(\d+)\s*)?,?\s*\})\s*,/g

/**
 * List the .js and .vue files under a directory, tests excluded.
 *
 * @param {string} dir The directory.
 * @return {string[]} Absolute file paths, sorted.
 */
function sourceFiles(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			if (entry.name !== '__tests__') {
				out.push(...sourceFiles(full))
			}
		} else if (/\.(js|vue)$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out.sort()
}

/**
 * Collect the declared placeholder of every library widget type.
 *
 * @param {string} [root] The package root.
 * @return {Record<string, {shape: string, count?: number}>} The declarations, keyed by type, in type order.
 */
function collectWidgetPlaceholders(root = ROOT) {
	const found = {}
	for (const file of sourceFiles(path.join(root, 'src', 'components'))) {
		const text = fs.readFileSync(file, 'utf8')
		for (const match of text.matchAll(CALL)) {
			const [, type, , name, objectShape, count] = match
			const shape = name ?? objectShape
			if (!SHAPES.includes(shape)) {
				throw new Error(`build-widget-placeholders: ${path.relative(root, file)} declares "${shape}" for "${type}", not one of ${SHAPES.join(', ')}`)
			}
			found[type] = count === undefined ? { shape } : { shape, count: Number(count) }
		}
	}
	return Object.fromEntries(Object.keys(found).sort().map((type) => [type, found[type]]))
}

/**
 * Write dist/widget-placeholders.json.
 *
 * @param {string} [root] The package root.
 * @return {string} The path written.
 */
function writeWidgetPlaceholders(root = ROOT) {
	const out = path.join(root, 'dist', 'widget-placeholders.json')
	fs.mkdirSync(path.dirname(out), { recursive: true })
	fs.writeFileSync(out, JSON.stringify(collectWidgetPlaceholders(root), null, '\t') + '\n')
	return out
}

module.exports = { collectWidgetPlaceholders, writeWidgetPlaceholders }

if (require.main === module) {
	if (process.argv.includes('--print')) {
		process.stdout.write(JSON.stringify(collectWidgetPlaceholders(), null, '\t') + '\n')
	} else {
		const out = writeWidgetPlaceholders()
		console.log(`build-widget-placeholders: wrote ${path.relative(ROOT, out)} (${Object.keys(collectWidgetPlaceholders()).length} types)`)
	}
}
