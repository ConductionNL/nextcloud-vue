/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A settings card's title-row actions are 34px, as the boards draw them
 * (DqVthInstellingen "Regel toevoegen", "Activiteit koppelen", "Checklist
 * toevoegen"; DqInstellingenAlgemeen "Dag toevoegen"). The rule that makes a
 * labelled button on the card 40px ("Opslaan", "Verbinding testen" in the body)
 * also caught them (COMPDIFF r24 h 34>40). It now leaves the title row alone.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-settings-title-actions-34/specs/board-settings-title-actions-34/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: buttons on a settings card', () => {
	it('makes a body button 40px but not a title-row action', () => {
		const at = css.indexOf('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .button-vue.button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty))')
		expect(at).toBeGreaterThan(-1)
		const selector = css.slice(at, css.indexOf('{', at))
		expect(selector).toContain(':not(.cn-settings-section__actions *)')
		expect(css.slice(at, css.indexOf('}', at))).toContain('--button-size: var(--cn-field-height, 40px);')
	})

	// DqInstellingenAlgemeen "Ander logo": the image field's button sits
	// beside the logo at 34px on the board; the 40px rule caught it (COMPDIFF r24).
	it('leaves the image field\'s button at 34px too', () => {
		const at = css.indexOf('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .button-vue.button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty))')
		expect(css.slice(at, css.indexOf('{', at))).toContain(':not(.cn-settings-field__image-row *)')
	})
})
