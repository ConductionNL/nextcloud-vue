/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board rule that names its ink through --nldesign-color-on-surface also
 * sets that ink as `color`. The theme sets the body ink on `body` alone and
 * inherits it, so a rule that only set the variable would draw the inherited
 * body ink. The status badge is the exception: badge.css colours every badge
 * from its own --cn-status-badge-ink.
 *
 * @spec openspec/changes/board-ink-without-forcing/specs/board-ink-without-forcing/spec.md#requirement-a-board-rule-sets-its-own-ink
 */
const fs = require('fs')
const path = require('path')

const FILES = ['look-board.css', 'look-board-index.css', 'look-board-detail.css', 'board.css']

/**
 * The rules of a board sheet that set the on-surface ink, without comments.
 *
 * @param {string} name The file under src/css.
 * @return {Array<{selector: string, body: string}>} The rules.
 */
function inkRules(name) {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (/--nldesign-color-on-surface\s*:/.test(m[2])) {
			out.push({ selector: m[1].trim(), body: m[2] })
		}
	}
	return out
}

describe('board look: a rule that names its ink sets it as color', () => {
	it.each(FILES)('%s', (file) => {
		const missing = inkRules(file)
			.filter((rule) => !/\.cn-status-badge:not/.test(rule.selector))
			.filter((rule) => !/(^|[;\s])color\s*:/.test(rule.body))
			.map((rule) => rule.selector)
		expect(missing).toEqual([])
	})
})
