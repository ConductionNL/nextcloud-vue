/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Under the board look the toolbar draws the saved views as chips, which wrap
 * onto a second and third row on a list with many views. The boards draw no
 * chips on DqZaken, DqZakenSorteren, DqZakenKaart, DqWerkbord or
 * DqFilterBeheren: the views live in the side panel's Weergaven tab. With
 * `chips: false` (CnIndexPage `savedViewChips: false`) the toolbar keeps only
 * Save view.
 *
 * @spec openspec/changes/saved-view-chips-switch/specs/saved-views/spec.md#requirement-an-index-page-can-leave-the-saved-view-chips-out-of-the-toolbar
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
}))

const { mount } = require('@vue/test-utils')
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const VIEWS = [
	{ id: 'v1', slug: 'v1', name: 'Termijn deze week', owner: 'alice' },
	{ id: 'v2', slug: 'v2', name: 'Mijn zaken', owner: 'alice' },
]

function mountControl(props = {}) {
	return mount(CnSavedViewsControl, {
		props: { views: VIEWS, currentUserId: 'alice', ...props },
		global: { provide: { cnLook: 'board' } },
	})
}

describe('CnSavedViewsControl chips switch', () => {
	it('draws the views as chips under the board look by default', () => {
		expect(mountControl().findAll('[data-testid="cn-saved-views-chip"]')).toHaveLength(2)
	})

	it('draws no chips with chips: false, and keeps Save view', () => {
		const w = mountControl({ chips: false })
		expect(w.find('[data-testid="cn-saved-views-chips"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-saved-views-control"]').exists()).toBe(true)
	})

	it('CnIndexPage takes savedViewChips, on by default', () => {
		expect(CnIndexPage.props.savedViewChips).toMatchObject({ type: Boolean, default: true })
	})
})
