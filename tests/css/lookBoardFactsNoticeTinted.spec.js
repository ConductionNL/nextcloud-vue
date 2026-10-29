/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a facts card's error, warning or success notice is a
 * tinted rounded box in its own tone, with no edge bar (PqKassadienst
 * "Buiten de marge.": NcNoteCard drew a 4px left bar at radius 4). Read from
 * the stylesheet text.
 *
 * @spec openspec/changes/board-facts-notice-tinted/specs/board-facts-notice-tinted/spec.md#requirement-a-facts-cards-notice-is-a-tinted-box-in-its-tone
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const ruleBody = (selector) => {
	const at = css.indexOf(selector)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a facts card\'s notice', () => {
	it('is a rounded box without the edge bar', () => {
		const body = ruleBody('.cn-look-board .cn-facts-widget__notice.notecard:is(.notecard--error, .notecard--warning, .notecard--success):not(.cn-look-nextcloud *) {')
		expect(body).toContain('border-inline-start: 0;')
		expect(body).toContain('border-radius: 8px;')
		expect(body).toContain('padding: 10px 14px;')
		expect(body).toContain('background-color: var(--cn-facts-notice-ground) !important;')
		expect(body).toContain('color: var(--cn-facts-notice-ink) !important;')
		expect(body).toContain('--note-theme: var(--cn-facts-notice-ink);')
	})

	it.each([
		['error', '--cn-board-red-tag-ground', '--color-error-text'],
		['warning', '--cn-board-notice-bg', '--cn-board-notice-ink'],
		['success', '--cn-board-success-tint', '--cn-board-success-ink'],
	])('takes the %s tone', (tone, ground, ink) => {
		const body = ruleBody(`.cn-look-board .cn-facts-widget__notice.notecard--${tone}:not(.cn-look-nextcloud *) {`)
		expect(body).toContain(`--cn-facts-notice-ground: var(${ground}`)
		expect(body).toContain(`--cn-facts-notice-ink: var(${ink}`)
	})
})
