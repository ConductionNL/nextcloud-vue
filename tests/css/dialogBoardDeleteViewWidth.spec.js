/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The delete-view confirm is 520px wide in the board look, as
 * DqFilterVerwijderen draws it; other confirms keep 560px. Read from the
 * stylesheet and the index page source.
 *
 * @spec openspec/changes/board-delete-view-confirm-header/specs/board-delete-view-confirm-header/spec.md#requirement-the-board-delete-view-confirm-is-520px-wide
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const indexPage = fs.readFileSync(path.join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('the board delete-view confirm width', () => {
	it('sets 520px on the board dialog container of the delete-view confirm', () => {
		expect(rulesFor('.modal-mask.cn-dialog-board.cn-index-page__delete-view-confirm .modal-container')).toContain('--cn-dialog-width: 520px')
	})

	it('puts the class on the index page\'s delete-view confirm', () => {
		const at = indexPage.indexOf('ref="deleteViewConfirmDialog"')
		const tag = indexPage.slice(at, indexPage.indexOf('/>', at))
		expect(tag).toContain('class="cn-index-page__delete-view-confirm"')
	})
})
