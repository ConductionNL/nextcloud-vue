/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZoekresultaten saves a search from its header ("Zoekopdracht opslaan")
 * and draws no "Weergave opslaan" in the toolbar. When the page header
 * carries a save-view button, the toolbar leaves its own Save view out.
 *
 * @spec openspec/changes/saved-views-hide-toolbar-save/specs/saved-views/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
}))

const { mount } = require('@vue/test-utils')
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

function mountControl(props = {}) {
	return mount(CnSavedViewsControl, {
		props: { views: [], currentUserId: 'alice', ...props },
		global: { provide: { cnLook: 'board' } },
	})
}

describe('Save view in the toolbar', () => {
	it('draws Save view by default', () => {
		expect(mountControl().find('[data-testid="cn-saved-views-control"]').exists()).toBe(true)
	})

	it('leaves Save view out with save: false', () => {
		expect(mountControl({ save: false }).find('[data-testid="cn-saved-views-control"]').exists()).toBe(false)
	})

	it('is given up when the page header carries a save-view button', () => {
		const headerSavesView = CnIndexPage.computed.headerSavesView
		expect(headerSavesView.call({ headerButtonsShown: true, resolvedHeaderButtons: [{ action: 'export' }, { action: 'save-view' }] })).toBe(true)
		expect(headerSavesView.call({ headerButtonsShown: true, resolvedHeaderButtons: [{ action: 'export' }] })).toBe(false)
		expect(headerSavesView.call({ headerButtonsShown: false, resolvedHeaderButtons: [{ action: 'save-view' }] })).toBe(false)
	})
})

describe('Save view switched off for a page (DqTaken, DqOrganisaties draw none)', () => {
	it('is left out with savedViewSave: false, kept by default', () => {
		const toolbarSave = CnIndexPage.computed.toolbarSavesView
		expect(toolbarSave.call({ headerSavesView: false, savedViewSave: true })).toBe(true)
		expect(toolbarSave.call({ headerSavesView: false, savedViewSave: false })).toBe(false)
		expect(toolbarSave.call({ headerSavesView: true, savedViewSave: true })).toBe(false)
		expect(CnIndexPage.props.savedViewSave.default).toBe(true)
	})
})
