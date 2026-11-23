#!/usr/bin/env node
/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Git merge driver for the l10n catalogues (`l10n/*.json`).
 *
 * Every branch that adds a library string appends to the end of `translations`
 * (and sometimes `plurals`) in `l10n/en.json` and `l10n/nl.json`, so two
 * branches always edit the same last lines and git calls it a conflict on
 * every merge of development. A catalogue is a set of keys, not a sequence of
 * lines, so this driver merges the three versions key by key: a key one side
 * added is kept, a key one side removed is dropped, a key only one side
 * changed takes that side's text, and only a key BOTH sides changed to
 * different texts is a conflict.
 *
 * A conflict is written with `<<<<<<<` / `=======` / `>>>>>>>` markers around
 * the two one-line entries and exit code 1, so git marks the path unmerged and
 * the file does not parse until a person picks one. A side that does not
 * parse is not guessed at: exit 1, our version untouched.
 *
 * Order: our keys in our order, then the keys only their side added, in
 * theirs. Output is `JSON.stringify(doc, null, 2)` plus a newline, which is the
 * shape every catalogue in this repo already has byte for byte.
 *
 * `merge=union` is not used on purpose: it concatenates both hunks, which on
 * JSON drops a comma or doubles a brace, and a catalogue that does not parse
 * turns every string back into its English key.
 *
 * Registration is local git config (git never runs a command a repository
 * ships); `npm install` sets it through `prepare`, an existing clone runs:
 *
 *   git config merge.l10n.driver 'node scripts/merge-l10n.js %O %A %B %P'
 *
 * Without it git falls back to its ordinary merge, as before.
 *
 * Usage (what git invokes): node scripts/merge-l10n.js %O %A %B %P
 */

'use strict'

const fs = require('fs')

const MARKER_INDENT = '    '

/**
 * Whether two catalogue values are the same (a plural is an array of forms).
 *
 * @param {unknown} a One value, undefined for absent.
 * @param {unknown} b The other.
 * @return {boolean}
 */
function same(a, b) {
	return a === b || (a !== undefined && b !== undefined && JSON.stringify(a) === JSON.stringify(b))
}

/**
 * Three-way merge of one object of keys (a catalogue block).
 *
 * @param {object} base The ancestor's block.
 * @param {object} ours Our block.
 * @param {object} theirs Their block.
 * @return {{merged: object, conflicts: Array<{key: string, ours: unknown, theirs: unknown}>}}
 */
function mergeBlock(base, ours, theirs) {
	const merged = {}
	const conflicts = []
	const keys = [...Object.keys(ours), ...Object.keys(theirs).filter((key) => !Object.hasOwn(ours, key))]
	for (const key of keys) {
		const b = base[key]
		const o = ours[key]
		const t = theirs[key]
		let value
		if (same(o, t)) {
			value = o
		} else if (same(o, b)) {
			value = t
		} else if (same(t, b)) {
			value = o
		} else {
			conflicts.push({ key, ours: o, theirs: t })
			value = o === undefined ? t : o
		}
		if (value !== undefined) {
			merged[key] = value
		}
	}
	return { merged, conflicts }
}

/**
 * Whether a value is a plain object (a catalogue block).
 *
 * @param {unknown} value The value.
 * @return {boolean}
 */
function isBlock(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Merge three catalogue texts.
 *
 * @param {string} baseText The ancestor ('' when both sides added the file).
 * @param {string} oursText Our version.
 * @param {string} theirsText Their version.
 * @return {{text: string|null, conflicts: number}} The merged text (null when a side does not parse) and the number of conflicting keys.
 */
function mergeCatalogues(baseText, oursText, theirsText) {
	let base
	let ours
	let theirs
	try {
		base = baseText.trim() === '' ? {} : JSON.parse(baseText)
		ours = JSON.parse(oursText)
		theirs = JSON.parse(theirsText)
	} catch {
		return { text: null, conflicts: 0 }
	}
	if (!isBlock(base) || !isBlock(ours) || !isBlock(theirs)) {
		return { text: null, conflicts: 0 }
	}
	const doc = {}
	const conflicts = []
	const topKeys = [...Object.keys(ours), ...Object.keys(theirs).filter((key) => !Object.hasOwn(ours, key))]
	for (const key of topKeys) {
		const [b, o, t] = [base[key], ours[key], theirs[key]]
		if (isBlock(o) || isBlock(t)) {
			const result = mergeBlock(isBlock(b) ? b : {}, isBlock(o) ? o : {}, isBlock(t) ? t : {})
			doc[key] = result.merged
			result.conflicts.forEach((conflict) => conflicts.push({ block: key, ...conflict }))
			continue
		}
		const result = mergeBlock({ [key]: b }, o === undefined ? {} : { [key]: o }, t === undefined ? {} : { [key]: t })
		if (Object.hasOwn(result.merged, key)) {
			doc[key] = result.merged[key]
		}
		result.conflicts.forEach((conflict) => conflicts.push({ block: null, ...conflict }))
	}
	let text = JSON.stringify(doc, null, 2) + '\n'
	for (const conflict of conflicts) {
		text = markConflict(text, conflict)
	}
	return { text, conflicts: conflicts.length }
}

/**
 * Put conflict markers around one key's entry, both sides on one line each.
 *
 * @param {string} text The serialised merge.
 * @param {{block: string|null, key: string, ours: unknown, theirs: unknown}} conflict The conflict.
 * @return {string} The text with markers.
 */
function markConflict(text, conflict) {
	const indent = conflict.block ? MARKER_INDENT : '  '
	const entry = (value) => (value === undefined ? `${indent}(removed)` : `${indent}${JSON.stringify(conflict.key)}: ${JSON.stringify(value)},`)
	const lines = text.split('\n')
	const start = lines.findIndex((line) => line.startsWith(`${indent}${JSON.stringify(conflict.key)}: `))
	if (start < 0) {
		return text
	}
	let end = start
	if (/[[{]$/.test(lines[start])) {
		const close = indent + (lines[start].endsWith('[') ? ']' : '}')
		while (end < lines.length - 1 && !lines[end].startsWith(close)) {
			end += 1
		}
	}
	const block = ['<<<<<<< ours', entry(conflict.ours), '=======', entry(conflict.theirs), '>>>>>>> theirs']
	lines.splice(start, end - start + 1, ...block)
	return lines.join('\n')
}

module.exports = { mergeCatalogues }

if (require.main === module) {
	const [basePath, oursPath, theirsPath, label] = process.argv.slice(2)
	const read = (file) => {
		try {
			return fs.readFileSync(file, 'utf8')
		} catch {
			return ''
		}
	}
	const { text, conflicts } = mergeCatalogues(read(basePath), read(oursPath), read(theirsPath))
	if (text === null) {
		process.stderr.write(`merge-l10n: ${label || oursPath} does not parse on one side; resolve it by hand.\n`)
		process.exit(1)
	}
	fs.writeFileSync(oursPath, text)
	if (conflicts > 0) {
		process.stderr.write(`merge-l10n: ${conflicts} key(s) in ${label || oursPath} were translated differently on both sides.\n`)
		process.exit(1)
	}
	process.exit(0)
}
