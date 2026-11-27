/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * hasFlagsTransform: build-time half of the board look's `:has()` flags.
 *
 * Blink re-styles the whole subtree of an element that anchors a `:has()`
 * written OUTSIDE the subject (`.a:has(.b) .c`) whenever a node is inserted
 * below it. Vue and GridStack insert nodes all through a page load, so the
 * board look's ~160 such selectors cost a board-look dashboard hundreds of
 * milliseconds of style recalculation per load (measured on dossiq: 137 rules,
 * and removing only part of them does not help).
 *
 * This rewrites every non-subject compound that holds a `:has()` into a flag
 * class with the same specificity: `.a:has(.b) .c` becomes
 * `:where(.cn-h-1x2y3z):not(.cn-h) .c`. The table it returns (flag, compound,
 * key) is carried in the build; at run time hasFlags.js sets each flag on the
 * elements that match its compound, so the rule selects exactly what it did.
 *
 * Only for the build (rollup.config.js); imports postcss, so never import it
 * from runtime code.
 *
 * @module utils/hasFlagsTransform
 */

import postcss from 'postcss'

/**
 * Pseudo-classes whose state a MutationObserver cannot see. A compound holding
 * one stays as it is.
 *
 * @type {RegExp}
 */
const DYNAMIC_PSEUDO = /:(?:hover|focus|focus-visible|focus-within|active|checked|indeterminate|target|target-within|visited|link|any-link|placeholder-shown|valid|invalid|user-valid|user-invalid|in-range|out-of-range|required|optional|read-only|read-write|disabled|enabled|default|autofill|open|popover-open|modal|fullscreen|playing|paused|defined|state|scope|host|current|past|future)(?![\w-])/

/**
 * Pseudo-classes that are written with one colon but are pseudo-elements.
 *
 * @type {Set<string>}
 */
const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter'])

/**
 * Split at a character outside brackets, parentheses and strings.
 *
 * @param {string} text The text.
 * @param {string} sep The separator character.
 * @return {string[]} The parts, trimmed.
 */
export function splitTop(text, sep) {
	const parts = []
	let depth = 0
	let quote = ''
	let current = ''
	for (let i = 0; i < text.length; i++) {
		const ch = text[i]
		if (ch === '\\') {
			current += ch + (text[i + 1] || '')
			i++
			continue
		}
		if (quote) {
			if (ch === quote) {
				quote = ''
			}
			current += ch
			continue
		}
		if (ch === '"' || ch === '\'') {
			quote = ch
		} else if (ch === '(' || ch === '[') {
			depth++
		} else if (ch === ')' || ch === ']') {
			depth--
		} else if (ch === sep && depth === 0) {
			parts.push(current.trim())
			current = ''
			continue
		}
		current += ch
	}
	parts.push(current.trim())
	return parts
}

/**
 * Split a complex selector into compounds and the combinators between them.
 *
 * @param {string} selector One complex selector (no top-level commas).
 * @return {Array<{compound: string, combinator: string}>} Each compound with the combinator before it (`''` for the first, `' '` for descendant).
 */
export function splitCompounds(selector) {
	const out = []
	let depth = 0
	let quote = ''
	let current = ''
	let pending = ''
	const flush = () => {
		if (current !== '') {
			out.push({ compound: current, combinator: out.length === 0 ? '' : (pending || ' ') })
			current = ''
			pending = ''
		}
	}
	const text = selector.trim()
	for (let i = 0; i < text.length; i++) {
		const ch = text[i]
		if (ch === '\\') {
			current += ch + (text[i + 1] || '')
			i++
			continue
		}
		if (quote) {
			if (ch === quote) {
				quote = ''
			}
			current += ch
			continue
		}
		if (depth === 0 && (ch === '>' || ch === '+' || ch === '~' || /\s/.test(ch))) {
			flush()
			if (ch !== ' ' && !/\s/.test(ch)) {
				pending = ch
			}
			continue
		}
		if (ch === '"' || ch === '\'') {
			quote = ch
		} else if (ch === '(' || ch === '[') {
			depth++
		} else if (ch === ')' || ch === ']') {
			depth--
		}
		current += ch
	}
	flush()
	return out
}

/**
 * Join compounds back into a selector.
 *
 * @param {Array<{compound: string, combinator: string}>} parts The compounds.
 * @return {string} The selector.
 */
function joinCompounds(parts) {
	return parts.map(({ compound, combinator }, i) => {
		if (i === 0) {
			return compound
		}
		return combinator === ' ' ? ' ' + compound : combinator + compound
	}).join('')
}

/**
 * Read the argument of a functional pseudo starting at `open` (the index of its `(`).
 *
 * @param {string} text The compound.
 * @param {number} open Index of the opening parenthesis.
 * @return {{arg: string, end: number}} The argument and the index of the closing parenthesis.
 */
function readArgument(text, open) {
	let depth = 0
	let quote = ''
	for (let i = open; i < text.length; i++) {
		const ch = text[i]
		if (ch === '\\') {
			i++
			continue
		}
		if (quote) {
			if (ch === quote) {
				quote = ''
			}
			continue
		}
		if (ch === '"' || ch === '\'') {
			quote = ch
		} else if (ch === '(') {
			depth++
		} else if (ch === ')') {
			depth--
			if (depth === 0) {
				return { arg: text.slice(open + 1, i), end: i }
			}
		}
	}
	return { arg: text.slice(open + 1), end: text.length - 1 }
}

/**
 * Add two specificities.
 *
 * @param {number[]} a First.
 * @param {number[]} b Second.
 * @return {number[]} The sum.
 */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

/**
 * The larger of two specificities.
 *
 * @param {number[]} a First.
 * @param {number[]} b Second.
 * @return {number[]} The larger.
 */
const max = (a, b) => {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) {
			return a[i] > b[i] ? a : b
		}
	}
	return a
}

/**
 * Specificity of a selector list as `:is()` counts it: the largest of its selectors.
 *
 * @param {string} list The selector list (relative selectors allowed).
 * @return {number[]} [ids, classes, types].
 */
function listSpecificity(list) {
	return splitTop(list, ',').reduce((best, sel) => max(best, selectorSpecificity(sel.replace(/^[>+~]\s*/, ''))), [0, 0, 0])
}

/**
 * Specificity of one complex selector (Selectors Level 4).
 *
 * @param {string} selector The selector.
 * @return {number[]} [ids, classes, types].
 */
export function selectorSpecificity(selector) {
	return splitCompounds(selector).reduce((sum, part) => add(sum, compoundSpecificity(part.compound)), [0, 0, 0])
}

/**
 * Specificity of one compound selector.
 *
 * @param {string} compound The compound.
 * @return {number[]} [ids, classes, types].
 */
export function compoundSpecificity(compound) {
	let spec = [0, 0, 0]
	let i = 0
	const text = compound
	const ident = (from) => {
		let j = from
		while (j < text.length && (/[\w-]/.test(text[j]) || text[j] === '\\' || text.charCodeAt(j) > 127)) {
			j += text[j] === '\\' ? 2 : 1
		}
		return j
	}
	while (i < text.length) {
		const ch = text[i]
		if (ch === '#') {
			spec = add(spec, [1, 0, 0])
			i = ident(i + 1)
		} else if (ch === '.') {
			spec = add(spec, [0, 1, 0])
			i = ident(i + 1)
		} else if (ch === '[') {
			spec = add(spec, [0, 1, 0])
			i = text.indexOf(']', i) + 1 || text.length
		} else if (ch === ':') {
			const element = text[i + 1] === ':'
			const start = i + (element ? 2 : 1)
			const end = ident(start)
			const name = text.slice(start, end).toLowerCase()
			let next = end
			let arg = null
			if (text[end] === '(') {
				const read = readArgument(text, end)
				arg = read.arg
				next = read.end + 1
			}
			if (element || LEGACY_PSEUDO_ELEMENTS.has(name)) {
				spec = add(spec, [0, 0, 1])
			} else if (name === 'where') {
				// zero
			} else if (name === 'is' || name === 'not' || name === 'has' || name === 'matches' || name === '-webkit-any') {
				spec = add(spec, listSpecificity(arg || ''))
			} else if ((name === 'nth-child' || name === 'nth-last-child') && arg && / of /.test(arg)) {
				spec = add(spec, add([0, 1, 0], listSpecificity(arg.slice(arg.indexOf(' of ') + 4))))
			} else {
				spec = add(spec, [0, 1, 0])
			}
			i = next
		} else if (ch === '*') {
			i++
		} else if (/[\w-]/.test(ch) || ch === '\\' || text.charCodeAt(i) > 127) {
			spec = add(spec, [0, 0, 1])
			i = ident(i)
		} else {
			i++
		}
	}
	return spec
}

/**
 * A short stable hash of a string (FNV-1a, base 36).
 *
 * @param {string} text The text.
 * @return {string} The hash.
 */
export function shortHash(text) {
	let h = 0x811c9dc5
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i)
		h = Math.imul(h, 0x01000193) >>> 0
	}
	return h.toString(36)
}

/**
 * A compound that matches no element and carries the given specificity, for `:not()`.
 *
 * @param {number[]} spec [ids, classes, types].
 * @return {string} The selector, or '' for zero.
 */
export function specificityPad(spec) {
	const [a, b, c] = spec
	if (a + b + c === 0) {
		return ''
	}
	const types = c > 0 ? Array(c).fill('cn-h').join(' ') : ''
	return types + '#cn-h'.repeat(a) + '.cn-h'.repeat(b)
}

/**
 * The simple selector an element must carry to match a compound, read from its
 * top level: the first class, else the type. Lets the run time skip a compound
 * whose class or type is not on the page.
 *
 * @param {string} compound The compound.
 * @return {string} `.class`, a type name, or ''.
 */
export function compoundKey(compound) {
	let depth = 0
	for (let i = 0; i < compound.length; i++) {
		const ch = compound[i]
		if (ch === '(' || ch === '[') {
			depth++
		} else if (ch === ')' || ch === ']') {
			depth--
		} else if (ch === '.' && depth === 0) {
			const match = /^\.(-?[_a-zA-Z][\w-]*)/.exec(compound.slice(i))
			if (match) {
				return '.' + match[1]
			}
		}
	}
	const type = /^([a-zA-Z][\w-]*)/.exec(compound)
	return type ? type[1].toLowerCase() : ''
}

/**
 * Attribute names a compound reads, so the run time watches them.
 *
 * @param {string} compound The compound.
 * @return {string[]} Attribute names.
 */
function compoundAttributes(compound) {
	const names = new Set(['class'])
	if (compound.includes('#')) {
		names.add('id')
	}
	const re = /\[\s*([\w-]+)/g
	let m
	while ((m = re.exec(compound)) !== null) {
		names.add(m[1].toLowerCase())
	}
	return [...names]
}

/**
 * Rewrite one complex selector. Non-subject compounds that hold `:has()` become flags.
 *
 * @param {string} selector The selector.
 * @param {Map<string, Array>} table Flag table, keyed by flag; filled in.
 * @return {string} The selector.
 */
export function flagSelector(selector, table) {
	if (!selector.includes(':has(')) {
		return selector
	}
	const parts = splitCompounds(selector)
	let changed = false
	for (let i = 0; i < parts.length - 1; i++) {
		const compound = parts[i].compound
		if (!compound.includes(':has(') || DYNAMIC_PSEUDO.test(compound)) {
			continue
		}
		const flag = 'cn-h-' + shortHash(compound)
		if (!table.has(flag)) {
			table.set(flag, [flag, compound, compoundKey(compound)])
		}
		const pad = specificityPad(compoundSpecificity(compound))
		parts[i] = { ...parts[i], compound: ':where(.' + flag + ')' + (pad ? ':not(' + pad + ')' : '') }
		changed = true
	}
	return changed ? joinCompounds(parts) : selector
}

/**
 * Rewrite a stylesheet: every non-subject compound holding `:has()` becomes a flag class.
 *
 * @param {string} css The stylesheet.
 * @return {{css: string, flags: Array<Array<string>>, attributes: string[]}}
 *   The rewritten sheet; the flags as [flag, compound, key]; the attributes the compounds read.
 */
export function flagNonSubjectHas(css) {
	const table = new Map()
	const root = postcss.parse(css)
	root.walkRules((rule) => {
		if (!rule.selector.includes(':has(')) {
			return
		}
		const parent = rule.parent
		if (parent && parent.type === 'atrule' && /keyframes$/i.test(parent.name)) {
			return
		}
		const selectors = splitTop(rule.selector, ',')
		const next = selectors.map((sel) => flagSelector(sel, table))
		if (next.some((sel, i) => sel !== selectors[i])) {
			rule.selector = next.join(',')
		}
	})
	const flags = [...table.values()]
	const attributes = [...new Set(flags.flatMap(([, compound]) => compoundAttributes(compound)))].sort()
	return { css: root.toString(), flags, attributes }
}
