/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a settings card's save row sits under the fields without
 * a hairline above it, as the Dq boards draw it (DqBeheerinstellingen
 * "Serviceaccount", "Zaak-e-mail", "AI-ondersteunde verwerking";
 * DqInstellingen "Kadaster"). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-save-row/specs/board-settings-save-row/spec.md#requirement-a-board-settings-save-row-has-no-divider-above-it
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: the settings save row', () => {
	it('draws no hairline above the save row', () => {
		const at = css.indexOf('.cn-look-board .cn-settings-section__save {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).not.toMatch(/border-top:\s*1px/)
		expect(body).toContain('justify-content: flex-end')
	})
})
