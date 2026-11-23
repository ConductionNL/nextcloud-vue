/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The footer note can differ per view (`config.footerNoteByView`), as the
 * count line can (`countTextByView`): DqZakenSorteren's cards read
 * "gesorteerd op termijn, oplopend · sorteren via het zijpaneel · 20 per
 * pagina" where the table says "klik een kolomkop om te sorteren". A view
 * it does not name keeps `footerNote`; a saved view's or preset's own
 * `footerNote` stands in every view.
 *
 * @spec openspec/changes/footer-note-per-view/specs/footer-note-per-view/spec.md
 */
import { footerNoteForView } from '../../src/utils/countLine.js'
import { applyQueryPreset } from '../../src/utils/queryPresets.js'
import { applySavedViewOverrides } from '../../src/utils/savedViewOverrides.js'

jest.mock('@nextcloud/l10n', () => ({
	translate: (_app, s) => s,
	translatePlural: (_app, one, many, count) => (count === 1 ? one : many),
}))

describe('footerNoteForView', () => {
	const byView = { cards: 'sorted by deadline, ascending · sort in the side panel · 20 per page' }

	it('takes the open view\'s note', () => {
		expect(footerNoteForView(byView, 'cards', 'click a column header to sort · 20 per page')).toBe(byView.cards)
	})

	it('keeps the page note for a view it does not name, or without a map', () => {
		expect(footerNoteForView(byView, 'table', 'click a column header to sort · 20 per page')).toBe('click a column header to sort · 20 per page')
		expect(footerNoteForView(null, 'cards', 'note')).toBe('note')
		expect(footerNoteForView({ cards: '' }, 'cards', 'note')).toBe('note')
	})
})

describe('a view\'s own footer note stands in every view', () => {
	const page = { footerNote: 'page', footerNoteByView: { cards: 'cards' } }

	it('clears the per-view notes under a saved view that sets footerNote', () => {
		const out = applySavedViewOverrides(page, { footerNote: 'sorted by urgency' })
		expect(out.footerNote).toBe('sorted by urgency')
		expect(out.footerNoteByView).toBeNull()
	})

	it('clears them under a preset that sets footerNote', () => {
		const out = applyQueryPreset(page, { footerNote: 'preset' })
		expect(out.footerNoteByView).toBeNull()
	})

	it('keeps them under a view that sets none', () => {
		expect(applySavedViewOverrides(page, { title: 'x' }).footerNoteByView).toEqual({ cards: 'cards' })
	})
})
