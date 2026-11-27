/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The build rewrites each `:has()` outside a board-look selector's subject
 * into a flag class with the same specificity.
 *
 * @spec openspec/changes/board-look-has-flags/specs/library-stylesheet/spec.md#requirement-the-board-look-anchors-no-has-outside-the-subject
 */
import fs from 'fs'
import path from 'path'
import {
	compoundKey,
	compoundSpecificity,
	flagNonSubjectHas,
	selectorSpecificity,
	splitCompounds,
	splitTop,
} from '../../src/utils/hasFlagsTransform.js'

const BOARD_FILES = ['look-board.css', 'look-board-index.css', 'look-board-detail.css', 'look-board-reports.css']
const boardCss = () => BOARD_FILES.map((file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8')).join('\n')

/** Every selector of a sheet, in order. */
function selectorsOf(css) {
	const out = []
	const re = /([^{}]+)\{/g
	let m
	while ((m = re.exec(css.replace(/\/\*[\s\S]*?\*\//g, ''))) !== null) {
		const head = m[1].trim()
		if (!head.startsWith('@')) {
			out.push(...splitTop(head, ','))
		}
	}
	return out
}

/** Whether a selector still has a :has() outside its subject. */
function hasNonSubjectHas(selector) {
	const parts = splitCompounds(selector)
	return parts.slice(0, -1).some((part) => part.compound.includes(':has('))
}

describe('hasFlagsTransform', () => {
	test('a :has() outside the subject becomes a flag with the same specificity', () => {
		const { css, flags } = flagNonSubjectHas('.cn-look-board .a:has(> .b .c) .d{color:red}')
		expect(flags).toHaveLength(1)
		const [flag, compound, key] = flags[0]
		expect(compound).toBe('.a:has(> .b .c)')
		expect(key).toBe('.a')
		expect(css).toBe('.cn-look-board :where(.' + flag + '):not(.cn-h.cn-h.cn-h) .d{color:red}')
		expect(selectorSpecificity(css.slice(0, css.indexOf('{')))).toEqual(selectorSpecificity('.cn-look-board .a:has(> .b .c) .d'))
	})

	test('a :has() in the subject stays', () => {
		const input = '.cn-look-board .a:has(.b){color:red}.x .y:not(:has(.z)){color:blue}'
		expect(flagNonSubjectHas(input)).toEqual({ css: input, flags: [], attributes: [] })
	})

	test('a compound with a state the DOM cannot report (hover, focus...) stays', () => {
		const input = '.a:hover:has(.b) .c{color:red}.a:has(.b:focus-visible) .c{color:red}'
		expect(flagNonSubjectHas(input).flags).toEqual([])
	})

	test('the same compound gets the same flag across rules, selector lists and at-rules', () => {
		const { css, flags } = flagNonSubjectHas('@media (min-width:1px){body:has(.k) .a,body:has(.k) .b{color:red}}body:has(.k)>.c{color:blue}')
		expect(flags).toHaveLength(1)
		expect(flags[0][2]).toBe('body')
		expect(css.match(new RegExp(flags[0][0], 'g'))).toHaveLength(3)
		expect(css).toContain('@media (min-width:1px)')
		expect(css).toContain('>.c{color:blue}')
	})

	test('attributes read by the compounds are watched', () => {
		const { attributes } = flagNonSubjectHas('.p:has([data-testid^="x"]) .c{color:red}#i:has(.y) .c{color:red}')
		expect(attributes).toEqual(['class', 'data-testid', 'id'])
	})

	test('specificity follows Selectors Level 4', () => {
		expect(compoundSpecificity('body:has(.a):not(:has(.b))')).toEqual([0, 2, 1])
		expect(compoundSpecificity(':where(.a:has(.b))')).toEqual([0, 0, 0])
		expect(compoundSpecificity('.x:not(.n *):has(> .y .z)')).toEqual([0, 4, 0])
		expect(compoundSpecificity('a#i[href]:is(.p, #q)')).toEqual([2, 1, 1])
		expect(selectorSpecificity('a.b > c::before')).toEqual([0, 1, 3])
	})

	test('the key is a top-level class or type, never one inside a pseudo', () => {
		expect(compoundKey('.a:has(.b)')).toBe('.a')
		expect(compoundKey('td:has(> .b)')).toBe('td')
		expect(compoundKey(':not(.a):has(> .b)')).toBe('')
		expect(compoundKey(':where(.a:has(.b))')).toBe('')
	})

	test('the board-look sheets keep no :has() outside a subject, and every selector its specificity', () => {
		const source = boardCss()
		const before = selectorsOf(source)
		const { css, flags } = flagNonSubjectHas(source)
		const after = selectorsOf(css)
		expect(after).toHaveLength(before.length)
		expect(before.some(hasNonSubjectHas)).toBe(true)
		expect(flags.length).toBeGreaterThan(40)
		before.forEach((selector, i) => {
			expect(hasNonSubjectHas(after[i])).toBe(false)
			expect(selectorSpecificity(after[i])).toEqual(selectorSpecificity(selector))
		})
	})
})
