/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board dashboard's switch row: the link pills in the deep primary ink and
 * the view switch as the board's segmented control (DqMijnWerk). Read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-switch-row/specs/board-dashboard-switch-row/spec.md#requirement-the-link-pills-take-the-deep-primary-ink
 * @spec openspec/changes/board-dashboard-switch-row/specs/board-dashboard-switch-row/spec.md#requirement-the-view-switch-is-the-boards-segmented-control
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule (also inside an at-rule) listing an exact selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim().replace(/^@media[^{]*$/, '')).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const ROW = '.cn-look-board .cn-dashboard-page__switch-row'
const NOT_NC = ':not(.cn-look-nextcloud *)'

describe('look-board.css: the board dashboard switch row', () => {
	it('draws the link pills in the deep primary ink, also as the theme\'s on-surface ink', () => {
		const body = bodyOf(`${ROW} .cn-dashboard-page__view-link${NOT_NC}`)
		expect(body).toMatch(/--cn-view-link-ink: var\(--color-primary-element-light-text\);/)
		expect(body).toMatch(/--nldesign-color-on-surface: var\(--cn-view-link-ink\);/)
		expect(body).toMatch(/(^|[\s;])color: var\(--cn-view-link-ink\);/)
	})

	it('sets the switch labels at 14px in the soft ink', () => {
		const body = bodyOf(`${ROW} .cn-page-view-switch .cn-segmented-control__option${NOT_NC}`)
		expect(body).toMatch(/font-size: 14px;/)
		expect(body).toMatch(/color: var\(--cn-board-text-soft\);/)
	})

	it('raises the chosen segment without an edge, keeping one in forced colours', () => {
		const selector = `${ROW} .cn-page-view-switch .cn-segmented-control__option--checked${NOT_NC}`
		expect(bodyOf(selector)).toMatch(/border-color: transparent;/)
		expect(css).toMatch(/@media \(forced-colors: active\)\s*\{\s*[^{]*cn-segmented-control__option--checked[^{]*\{\s*border-color: CanvasText;/)
	})
})
