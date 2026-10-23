/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * With `savedViewTitle` on, an applied saved view names the page and its side
 * panel (DqFilterInMenu "Termijn deze week").
 *
 * @spec openspec/changes/saved-view-names-the-page/specs/saved-view-names-the-page/spec.md#requirement-an-applied-saved-view-can-name-the-page
 */
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const shownTitle = CnIndexPage.computed.shownTitle

/**
 * The bits of the page `shownTitle` reads.
 *
 * @param {object} over Overrides.
 * @return {object}
 */
function ctx(over = {}) {
	return {
		savedViewTitle: true,
		appliedSavedView: { id: 5, name: 'Termijn deze week' },
		presented: () => 'Alle zaken',
		cnTranslate: (s) => s,
		sourceTerm: '',
		...over,
	}
}

describe('CnIndexPage savedViewTitle', () => {
	it('titles the page after the applied view', () => {
		expect(shownTitle.call(ctx())).toBe('Termijn deze week')
	})

	it('keeps the page title without an applied view', () => {
		expect(shownTitle.call(ctx({ appliedSavedView: null }))).toBe('Alle zaken')
	})

	it('keeps the page title when the option is off', () => {
		expect(shownTitle.call(ctx({ savedViewTitle: false }))).toBe('Alle zaken')
	})

	it('hands the same title to the side panel', () => {
		const src = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnIndexPage/CnIndexPage.vue'), 'utf8')
		expect(src).toMatch(/<CnIndexSidebar[\s\S]*?:title="shownTitle"/)
		expect(src).toMatch(/title: this\.shownTitle,/)
	})

	it('is off by default', () => {
		expect(CnIndexPage.props.savedViewTitle.default).toBe(false)
	})
})
