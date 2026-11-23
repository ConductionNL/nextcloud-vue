/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Blocks the boards sink into a card (DqZaaktype phase groups, DqInspectie
 * device frames, DqZaakContact's other side's bubbles) sit on the page's own
 * ground. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-sunken-ground/specs/board-sunken-ground/spec.md#requirement-sunken-blocks-take-the-boards-sunken-ground
 */
const fs = require('fs')
const path = require('path')

/**
 * The bodies of the rules in a stylesheet whose selector list holds this selector.
 *
 * @param {string} file The stylesheet under src/css.
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(file, selector) {
	const css = fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('look-board: the sunken ground', () => {
	it('defines the token as the content surface, the hover grey as fallback', () => {
		expect(rulesFor('look-board.css', '.cn-look-board')).toContain('--cn-board-sunken-ground: var(--nldesign-component-content-surface-background-color, var(--color-background-hover))')
	})

	it.each([
		'.cn-look-board .cn-grouped-cards__group.cn-grouped-cards__group',
		'.cn-look-board .cn-device-frames-widget__frame.cn-device-frames-widget__frame',
		'.cn-look-board .cn-conversation-thread__message:not(.cn-conversation-thread__message--us) .cn-conversation-thread__bubble',
	])('%s takes it', (selector) => {
		expect(rulesFor('look-board-detail.css', selector)).toContain('background: var(--cn-board-sunken-ground)')
	})
})
