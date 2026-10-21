/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a text field's and a select's edge as a 1px border in the
 * 3:1 control colour all round (DqProcesanalyse "Filteren op zaaktype",
 * DqZakenSorteren "Zoek op zaak, nummer of verzoeker", DqTermijnen "Jaar").
 * NcInputField, which NcSelect's search box also is, draws it as a shadow:
 * a dark bottom line and a 30% grey on the other sides. The dialogs and the
 * settings cards already drew the board's edge; the look now does so for every
 * board field. jsdom draws no layout, so the rule is read from the stylesheet.
 *
 * @spec openspec/changes/board-field-edge/specs/board-field-edge/spec.md#requirement-a-board-field-draws-a-1px-edge-all-round
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

describe('look-board.css: field edge', () => {
	it.each([
		'.cn-look-board .input-field__input:not(.cn-look-nextcloud *)',
		'.cn-look-board .input-field__input:hover:not([disabled]):not(.cn-look-nextcloud *)',
		'.cn-look-board .textarea__input:not(.cn-look-nextcloud *)',
	])('%s draws a 1px control edge, no shadow', (selector) => {
		const body = ruleFor(selector)
		expect(body).not.toBeNull()
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('box-shadow: none;')
	})
})
