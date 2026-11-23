/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The assistant side card (DqZaakAssistent): its note in 14px text on a
 * 1.5 line with the info icon at the top of the first line rather than
 * centred on a long note, and its Actions menu as a 34px header control.
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/components/CnAiCompanion/CnAiChatPanel.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule written for exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule body, or ''.
 */
function rule(selector) {
	const at = css.indexOf('\n' + selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnAiChatPanel note', () => {
	it('sets the note at 14px on a 1.5 line', () => {
		expect(rule('.cn-ai-chat-window__note')).toContain('font-size: 14px')
		expect(rule('.cn-ai-chat-window__note')).toContain('line-height: 1.5')
	})

	it('draws the side card\'s Actions menu as a 34px control', () => {
		const detail = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
		const at = detail.indexOf('.cn-widget-wrapper:has(.cn-ai-chat-widget) .cn-widget-wrapper__actions .action-item .button-vue {')
		expect(at).toBeGreaterThan(-1)
		expect(detail.slice(at, detail.indexOf('}', at))).toContain('min-height: 34px')
	})

	it('keeps the icon at the top of the first line', () => {
		expect(rule('.cn-ai-chat-window__note-icon')).toContain('align-self: flex-start')
	})
})
