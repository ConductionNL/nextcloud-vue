#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Gate: a host mounting CnJourney / CnJourneyDialog supplies mount, chrome and
 * theme only. It must not register a step type, field type, validation rule or
 * branch operator, nor declare a journey step of a type outside the closed set.
 *
 * Usage: node scripts/gates/journey-vocabulary.mjs [dir ...]   (default: .)
 * Exit 1 naming the host (nearest package.json name) and the addition.
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-5
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const STEP_TYPES = ['form', 'review']
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'tests', 'docs', 'docusaurus', 'openspec', 'coverage'])
const CODE = /\.(js|mjs|cjs|ts|vue)$/
const REGISTRATIONS = [
	[/\bregister(?:Journey)?StepType\s*\(/, 'step type'],
	[/\bregister(?:Journey)?FieldType\s*\(/, 'field type'],
	[/\bregister(?:Journey)?ValidationRule\s*\(/, 'validation rule'],
	[/\bregister(?:Journey)?BranchOperator\s*\(/, 'branch operator'],
]

/**
 * @param {string} dir Directory to walk.
 * @return {string[]} Files to inspect.
 */
function walk(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) {
				out.push(...walk(path.join(dir, entry.name)))
			}
		} else if (CODE.test(entry.name) || /\.journey\.json$/.test(entry.name)) {
			out.push(path.join(dir, entry.name))
		}
	}
	return out
}

/**
 * @param {string} file A file inside a host.
 * @return {string} The host's package name, else its directory name.
 */
function hostOf(file) {
	let dir = path.dirname(file)
	while (dir !== path.dirname(dir)) {
		const pkg = path.join(dir, 'package.json')
		if (fs.existsSync(pkg)) {
			try {
				return JSON.parse(fs.readFileSync(pkg, 'utf8')).name || path.basename(dir)
			} catch {
				return path.basename(dir)
			}
		}
		dir = path.dirname(dir)
	}
	return path.basename(path.dirname(file))
}

/**
 * @param {object} step A journey step.
 * @param {string[]} types Collects the step types found.
 */
function collectTypes(step, types) {
	if (step && typeof step === 'object') {
		if (typeof step.type === 'string' && !Array.isArray(step.steps)) {
			types.push(step.type)
		}
		for (const sub of Array.isArray(step.steps) ? step.steps : []) {
			collectTypes(sub, types)
		}
	}
}

/**
 * @param {string[]} dirs Directories to scan.
 * @return {Array<{host: string, file: string, line: number, addition: string}>} Violations.
 */
export function scan(dirs) {
	const violations = []
	for (const dir of dirs) {
		for (const file of walk(dir)) {
			const text = fs.readFileSync(file, 'utf8')
			const host = hostOf(file)
			if (file.endsWith('.journey.json')) {
				try {
					const types = []
					for (const step of JSON.parse(text).steps || []) {
						collectTypes(step, types)
					}
					for (const type of types.filter((t) => !STEP_TYPES.includes(t))) {
						violations.push({ host, file, line: 1, addition: `step type "${type}"` })
					}
				} catch {
					// Not a journey document.
				}
				continue
			}
			text.split('\n').forEach((lineText, i) => {
				for (const [pattern, what] of REGISTRATIONS) {
					if (pattern.test(lineText)) {
						violations.push({ host, file, line: i + 1, addition: `${what} registration` })
					}
				}
			})
		}
	}
	return violations
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	const dirs = process.argv.slice(2)
	const found = scan(dirs.length > 0 ? dirs : ['.'])
	for (const v of found) {
		console.error(`journey-vocabulary: host "${v.host}" adds a ${v.addition} (${v.file}:${v.line})`)
	}
	if (found.length > 0) {
		console.error('A host supplies mount, chrome and theme only; the journey vocabulary is closed.')
		process.exit(1)
	}
	console.log('journey-vocabulary: OK')
}
