/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board draws a side Gekoppeld card's first row 10px under its title and
 * its actions on one 17px line. The rows read at the normal line height, so
 * no half-leading comes off the 10px; the actions are buttons, which
 * Nextcloud's `button:not(.button-vue, ...)` rule (0,2,1) gives a 3px margin
 * that the widget's scoped single-class rule cannot take back.
 *
 * @spec openspec/changes/side-card-text-normal-leading/specs/side-card-text-normal-leading/spec.md#requirement-a-side-cards-texts-read-at-normal-leading
 */
const fs = require('fs')
const path = require('path')

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const css = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8'))
const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnLinkedWidget/CnLinkedWidget.vue'), 'utf8')
const scoped = strip(sfc.slice(sfc.indexOf('<style')))

/**
 * The body of the first rule whose selector list holds the given selector.
 *
 * @param {string} source Stylesheet text without comments.
 * @param {string} selector One selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleHolding(source, selector) {
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[,{]')
	const m = re.exec(source)
	if (!m) {
		return ''
	}
	const open = source.indexOf('{', m.index)
	return source.slice(open, source.indexOf('}', open))
}

describe('Gekoppeld side card rhythm', () => {
	it('starts a side card that opens on the linked widget 10px under its title', () => {
		expect(ruleHolding(css, '.cn-look-board .cn-detail-page__side .cn-widget-wrapper__content:has(> .cn-linked-widget):not(.cn-look-nextcloud *)')).toMatch(/padding-top: 10px;/)
	})

	it.each([
		'.cn-linked-widget__action.cn-linked-widget__action',
		'button.cn-linked-widget__link.cn-linked-widget__link',
	])('takes the server button margin off %s', (selector) => {
		expect(ruleHolding(scoped, selector)).toMatch(/margin: 0;/)
	})
})
