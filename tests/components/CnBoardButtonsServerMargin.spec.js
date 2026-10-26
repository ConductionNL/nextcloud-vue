/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Nextcloud's server.css gives every button a 3px 3px 3px 0 margin. A
 * widget header action and a record-list row action reset it, so the
 * header row and the row are as tall as the control (DqZaakBesluiten
 * Beschikking "Document genereren", Adviezen "Herinneren").
 */
import fs from 'fs'
import path from 'path'

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} file The SFC path under src/components.
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(file, selector) {
	const css = fs.readFileSync(path.join(__dirname, '../../src/components', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board buttons without the server margin', () => {
	it('resets the margin on a widget header action', () => {
		expect(rule('CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue', '.cn-detail-page__catalog-action')).toContain('margin: 0;')
	})

	it('resets the margin on a record-list row action', () => {
		expect(rule('CnRecordListWidget/CnRecordListWidget.vue', '.cn-record-list__action')).toContain('margin: 0;')
	})
})
