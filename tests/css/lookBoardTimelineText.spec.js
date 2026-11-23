/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The manage timeline's lines in the board look, as DqZaakHistorie draws
 * them (r26b): the subtitle and the event count 14px muted (a theme's
 * paragraph tokens set them 15px ink), the count line under a hairline, and
 * the note form card 12px under its heading. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-timeline-text/specs/timeline/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const G = ':not(.cn-look-nextcloud *)'

describe('look-board.css: timeline text', () => {
	it('sets the subtitle and the count 14px muted, over the theme paragraph tokens', () => {
		const body = rule(`.cn-look-board .cn-timeline-manage__subtitle${G},\n.cn-look-board .cn-timeline-manage__count${G}`)
		expect(body).toContain('--nldesign-component-paragraph-font-size: 14px')
		expect(body).toContain('--nldesign-component-paragraph-color: var(--color-text-maxcontrast)')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('color: var(--color-text-maxcontrast)')
	})

	it('rules the footer with a hairline 12px above it', () => {
		const body = rule(`.cn-look-board .cn-timeline-manage__footer${G}`)
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline)')
		expect(body).toContain('padding-top: 12px')
	})

	it('starts the note form 12px under its heading, label 6px over its field', () => {
		expect(rule(`.cn-look-board .cn-timeline-manage--composer-only .cn-timeline-manage__header${G}`)).toContain('margin-block-end: 12px')
		expect(rule(`.cn-look-board .cn-timeline-manage__composer${G}`)).toContain('gap: 6px')
		expect(rule(`.cn-look-board .cn-timeline-manage__draft-label${G}`)).toContain('margin-block-start: 6px')
	})
})
