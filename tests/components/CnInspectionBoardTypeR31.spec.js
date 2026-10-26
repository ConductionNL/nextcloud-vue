/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqInspectie type: the device frame title "Vandaag" on a 1.2 line, a compact
 * card's 15px/700 title on a dashboard page (where compact rows read 500),
 * and the checklist's photo card title "Foto bij vraag 7" on a 1.2 line.
 */
import fs from 'fs'
import path from 'path'

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} file The file under src.
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(file, selector) {
	const css = fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('DqInspectie type', () => {
	it('sets the device frame title on a 1.2 line', () => {
		expect(rule('components/CnDeviceFramesWidget/CnDeviceFramesWidget.vue', '.cn-device-frames-widget__title')).toContain('line-height: 1.2')
	})

	it('keeps a compact card title 700 on a dashboard page', () => {
		const body = rule('css/look-board.css', '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-record-list--compact .cn-record-list__card .cn-record-list__title')
		expect(body).toContain('font-weight: 700')
		expect(body).toContain('line-height: 1.2')
	})

	it('sets the photo card title 15px on a 1.2 line', () => {
		expect(rule('components/CnChecklistRunWidget/CnChecklistRunWidget.vue', '.cn-checklist-run__photos-title')).toContain('line-height: 1.2')
	})
})
