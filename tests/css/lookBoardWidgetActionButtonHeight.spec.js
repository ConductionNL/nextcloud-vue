/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a widget's own labelled action buttons at the 40px control
 * height: the history's "Exporteren" (DqZaakHistorie), the files bar's
 * "Bestanden toevoegen" (DqZaakDocumenten), an empty list's "Toevoegen"
 * (DqZaakTaken) and the archiving card's "Nominatie herberekenen"
 * (DqZaakArchivering). NcButton draws 34px. Menu triggers and icon-only
 * buttons in the files bar keep their size. jsdom draws no layout, so the
 * rule is read from the stylesheet text.
 *
 * @spec openspec/changes/board-widget-action-button-height/specs/board-widget-action-button-height/spec.md#requirement-a-widgets-labelled-action-button-is-40px
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

describe('look-board.css: widget action buttons', () => {
	it.each([
		'.cn-look-board .cn-timeline-manage__header-actions .button-vue:where(:not(.cn-look-nextcloud *))',
		'.cn-look-board .cn-files-browser__bar .button-vue:not(.action-item__menutoggle):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):where(:not(.cn-look-nextcloud *))',
		'.cn-look-board .cn-widget-empty-state__action .button-vue:where(:not(.cn-look-nextcloud *))',
		'.cn-look-board .cn-retention__head .button-vue:where(:not(.cn-look-nextcloud *))',
	])('draws %s at the control height', (selector) => {
		const body = ruleFor(selector)
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
	})
})
