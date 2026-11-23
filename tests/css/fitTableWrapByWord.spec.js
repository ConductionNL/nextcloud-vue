/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a table fitted to its tile a wrapping column breaks between words, not
 * between letters (DqDoorlooptijd "Prestaties per zaaktype": heads 327px tall
 * with one letter a line). Read from the stylesheet.
 *
 * @spec openspec/changes/fit-table-wrap-by-word/specs/fit-table-wrap-by-word/spec.md#requirement-a-wrapping-column-in-a-fitted-table-breaks-between-words
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('table.css: a wrapping column in a fitted table', () => {
	it('breaks between words', () => {
		const re = /([^{}]+)\{([^{}]*)\}/g
		let body = ''
		let m
		while ((m = re.exec(css))) {
			if (m[1].split(',').map((s) => s.trim()).includes('.cn-data-table--fit th.cn-cell--wrap')) {
				body = m[2]
			}
		}
		expect(body).toMatch(/overflow-wrap:\s*break-word/)
	})
})
