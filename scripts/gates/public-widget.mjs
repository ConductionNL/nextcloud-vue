#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Gate: a portal-rendered page may only place widgets whose registry entry is
 * `public: true`.
 *
 * Usage: node scripts/gates/public-widget.mjs <manifest.json>...
 *        node scripts/gates/public-widget.mjs --registry <file> <manifest.json>...
 *
 * The set of public keys is read from the registrations in
 * `src/components/CnWidgetGrid/registerDashboardWidgets.js` (or `--registry`):
 * a key is public only when its `registerDashboardWidget('<key>', {...})`
 * block says `public: true`. Every `pages[].widgets[]` and
 * `pages[].config.widgets[]` entry of the given manifests is checked; each
 * offender is reported as `<page id>: <widgetKey>` and the exit code is 1.
 * It also exits 1 when it inspects nothing, so a silent gate cannot read as a
 * pass. The negative fixture under tests/fixtures/public-widget/ is run in CI.
 *
 * @spec openspec/changes/widget-registry-public-flag/tasks.md#task-3
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_REGISTRY = path.join(ROOT, 'src/components/CnWidgetGrid/registerDashboardWidgets.js')

/**
 * The keys registered `public: true`.
 *
 * @param {string} source The registration module's source.
 * @return {Set<string>} The public keys.
 */
export function publicKeysFromSource(source) {
	const keys = new Set()
	const parts = source.split(/registerDashboardWidget\(\s*'/).slice(1)
	for (const part of parts) {
		const key = part.slice(0, part.indexOf("'"))
		const body = part.slice(0, part.search(/\n\}\)/) === -1 ? undefined : part.search(/\n\}\)/))
		if (/\n\s*public:\s*true\b/.test(body)) {
			keys.add(key)
		}
	}
	return keys
}

/**
 * Every widget placement of a manifest, with its page id.
 *
 * @param {object} manifest The parsed manifest.
 * @return {Array<{page: string, key: string}>} The placements.
 */
export function placementsOf(manifest) {
	const out = []
	for (const page of Array.isArray(manifest.pages) ? manifest.pages : []) {
		const lists = [page.widgets, page.config && page.config.widgets]
		for (const list of lists) {
			for (const w of Array.isArray(list) ? list : []) {
				const key = w && (w.widgetKey || w.type)
				if (typeof key === 'string') {
					out.push({ page: String(page.id || page.route || '?'), key })
				}
			}
		}
	}
	return out
}

/**
 * Check manifests against the public keys.
 *
 * @param {Array<object>} manifests The parsed manifests.
 * @param {Set<string>} publicKeys The keys a public host may mount.
 * @return {{ inspected: number, offenders: Array<{page: string, key: string}> }} The result.
 */
export function checkManifests(manifests, publicKeys) {
	let inspected = 0
	const offenders = []
	for (const manifest of manifests) {
		for (const placement of placementsOf(manifest)) {
			inspected += 1
			if (!publicKeys.has(placement.key)) {
				offenders.push(placement)
			}
		}
	}
	return { inspected, offenders }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2)
	let registry = DEFAULT_REGISTRY
	const files = []
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--registry') {
			registry = path.resolve(args[++i])
		} else {
			files.push(args[i])
		}
	}
	const publicKeys = publicKeysFromSource(fs.readFileSync(registry, 'utf8'))
	const { inspected, offenders } = checkManifests(files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))), publicKeys)
	if (inspected === 0) {
		console.error('public-widget gate: inspected no widget placements; refusing to pass on nothing.')
		process.exit(1)
	}
	if (offenders.length > 0) {
		for (const o of offenders) {
			console.error(`public-widget gate: page "${o.page}" places "${o.key}", which is not registered public: true.`)
		}
		process.exit(1)
	}
	console.log(`public-widget gate: ${inspected} placement(s), all public.`)
}
