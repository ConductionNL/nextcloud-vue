/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A half-width board settings card keeps its buttons in the title row:
 * DqVthInstellingen "Inspectiechecklists" + "Checklist toevoegen" and
 * DqInstellingenAlgemeen "Werkdagen en feestdagen" + "Dag toevoegen" stand
 * in a 550px card (about 504px inside). The buttons drop under the title only
 * in a card narrower than that, such as on a phone.
 *
 * @spec openspec/changes/board-half-card-title-actions/specs/board-half-card-title-actions/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: card head buttons in a half-width card', () => {
	it('drops the buttons under the title only below 400px of card width', () => {
		const at = css.indexOf('> .cn-settings-section__actions,\n\t.cn-look-board .settings-section:not(.cn-look-nextcloud *):has(> .settings-section__desc) > .cn-settings-section__actions {')
		expect(at).toBeGreaterThan(-1)
		const block = css.slice(css.lastIndexOf('@container', at), at)
		expect(block).toContain('@container (max-width: 400px)')
	})
})
