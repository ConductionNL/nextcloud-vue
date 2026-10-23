/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The notice at the top of a detail page's side column (DqZaak "Advies
 * gevraagd") is one tinted block: only the side item's own child paints, the
 * card wrapper, the banner and its note card inside stay flat. A notice whose
 * condition does not hold leaves no empty tinted block behind. Read from the
 * stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of the rules whose selector list holds exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The rule bodies, joined.
 */
function rulesFor(selector) {
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

const item = '.cn-look-board .cn-detail-page__side-item--notice'

describe('look-board-detail.css: the side column notice', () => {
	it('paints the tint and the padding once, on the side item\'s child', () => {
		const outer = rulesFor(`${item} > *`)
		expect(outer).toContain('background: var(--cn-board-notice-bg)')
		expect(outer).toContain('padding: 14px 16px')
	})

	it('keeps the wrapper, the banner and its note card flat inside it', () => {
		for (const inner of [`${item} > * .cn-widget-wrapper`, `${item} .cn-banner-widget`, `${item} .cn-banner-widget__card`]) {
			expect(rulesFor(inner)).toContain('background: transparent')
			expect(rulesFor(inner)).toContain('padding: 0')
			expect(rulesFor(inner)).not.toContain('--cn-board-notice-bg')
		}
	})

	/**
	 * NcNoteCard paints its ground with `!important`, so a plain
	 * `background: transparent` left the note a second tinted box inside the
	 * notice (COMPDIFF r22, DqZaak "Advies gevraagd" on 12 case boards).
	 *
	 * @spec openspec/changes/board-side-notice-flat-note/specs/board-side-notice-flat-note/spec.md#requirement-the-note-inside-a-side-notice-paints-no-ground
	 */
	it('clears the note card\'s own ground, which NcNoteCard sets with !important', () => {
		expect(rulesFor(`${item} .cn-banner-widget__card.notecard`)).toContain('background-color: transparent !important')
	})

	/**
	 * @spec openspec/changes/board-notice-ink/specs/board-notice-ink/spec.md#requirement-the-side-notice-text-and-icon-take-the-notice-ink
	 */
	it('sets the text and icon in the notice ink, with the board\'s 18px icon 10px before the text', () => {
		const note = rulesFor(`${item} .cn-banner-widget__card.notecard.notecard:not(.cn-look-nextcloud *)`)
		expect(note).toContain('color: var(--cn-board-notice-ink) !important')
		expect(note).toContain('gap: 10px')
		const icon = rulesFor(`${item} .cn-banner-widget__card .notecard__icon:not(.cn-look-nextcloud *)`)
		expect(icon).toContain('color: var(--cn-board-notice-ink)')
		expect(icon).toContain('margin-top: 2px')
		const svg = rulesFor(`${item} .cn-banner-widget__card .notecard__icon svg:not(.cn-look-nextcloud *)`)
		expect(svg).toContain('height: 18px')
		expect(svg).toContain('width: 18px')
		expect(css).toContain('--cn-board-notice-ink: var(--color-warning-text, #7a4f00)')
	})

	it('takes no room when the banner does not render', () => {
		expect(rulesFor(`${item}:not(:has(.cn-banner-widget))`)).toContain('display: none')
	})
})
