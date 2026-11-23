/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a board dialog the access purpose's chosen row is filled, as DqZaakDoel
 * draws "Behandeling van de zaak": the light primary ground Nextcloud gives a
 * checked option only while it is hovered or focused. Read from the
 * stylesheet.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/dialog.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('dialog.css: the access purpose chosen row', () => {
	it('fills the chosen purpose with the light primary ground', () => {
		expect(bodyOf('.cn-dialog-board .cn-access-purpose__choices .checkbox-radio-switch--checked:not(.checkbox-radio-switch--disabled) .checkbox-content')).toContain('background-color: var(--color-primary-element-light-hover)')
	})
})
