/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board draws a kanban column's "Toon 12 meer" in the soft ink with a
 * dashed edge in the 3:1 control colour, 6px in at the sides (DqWerkbord);
 * live drew it in the main ink, 12px in, edged in border-dark, which plain
 * Nextcloud draws at 1.4:1. jsdom draws no layout, so the rule is read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-kanban-show-more/specs/board-kanban-show-more/spec.md#requirement-a-board-columns-show-more-button-is-drawn-as-the-board-draws-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board-index.css: kanban show more', () => {
	it('draws the soft ink, the control edge dashed and 6px side padding', () => {
		const body = bodiesOf('.cn-look-board .cn-board-view .cn-board-view__show-more')
		expect(body).toContain('color: var(--cn-board-text-soft);')
		expect(body).toContain('border-color: var(--cn-board-control-border);')
		expect(body).toContain('padding: 0 6px;')
	})
})
