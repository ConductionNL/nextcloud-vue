/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look Save view draws on the page's light primary (DqZaken
 * #eaf0f7). The control is a tertiary NcButton, and a theme may point
 * --color-primary-element-light at a tertiary's pressed ground on the button
 * itself (thematiq: #dce6f2), so the ground is read on the wrapper, where the
 * page's value still holds. jsdom draws no layout, so the rules are read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-save-view-ground/specs/board-save-view-ground/spec.md#requirement-save-view-draws-on-the-pages-light-primary
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

describe('look-board-index.css: Save view ground', () => {
	it('takes the light primary on the wrapper', () => {
		const body = bodiesOf('.cn-look-board .cn-saved-views__save')
		expect(body).toContain('--cn-save-view-ground: var(--color-primary-element-light);')
		expect(body).toContain('--cn-save-view-ground-hover: var(--color-primary-element-light-hover);')
	})

	it('draws the button and its hover on the wrapper values', () => {
		expect(bodiesOf('.cn-look-board .cn-saved-views__save .button-vue')).toContain('background: var(--cn-save-view-ground);')
		expect(bodiesOf('.cn-look-board .cn-saved-views__save .button-vue:hover')).toContain('background: var(--cn-save-view-ground-hover);')
	})
})
