/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten has "Zoekopdracht opslaan" as its primary header button. A
 * header button with `action: "save-view"` opens the save-current-view dialog;
 * without a label it reads "Save view".
 */
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/**
 * The header buttons a context resolves.
 *
 * @param {Array<object>} buttons The declared buttons.
 * @return {Array<object>} The resolved ones.
 */
function resolve(buttons) {
	const ctx = {
		presented: (key) => (key === 'headerButtons' ? buttons : undefined),
		cnTranslate: (text) => text,
		isBoardLook: true,
		resolvedAddLabel: 'Add',
		headerMenuEntries: () => [],
	}
	return CnIndexPage.computed.resolvedHeaderButtons.call(ctx)
}

describe('CnIndexPage save-view header button', () => {
	it('reads "Save view" without a label, and keeps the page\'s own label and variant', () => {
		expect(resolve([{ action: 'save-view' }])[0]).toMatchObject({ label: 'Save view', action: 'save-view', variant: 'secondary' })
		expect(resolve([{ action: 'save-view', label: 'Zoekopdracht opslaan', variant: 'primary' }])[0]).toMatchObject({ label: 'Zoekopdracht opslaan', variant: 'primary' })
	})

	it('opens the save-current-view dialog', () => {
		const ctx = { showSaveViewDialog: false, onHeaderAction: jest.fn() }
		CnIndexPage.methods.onHeaderButton.call(ctx, { action: 'save-view' })
		expect(ctx.showSaveViewDialog).toBe(true)
		expect(ctx.onHeaderAction).not.toHaveBeenCalled()
	})
})
