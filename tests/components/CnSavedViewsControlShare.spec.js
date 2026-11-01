/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqTicketsSelectie draws "Delen: Klachten deze week" beside Weergave opslaan:
 * with `savedViewShare` the toolbar offers to share the open view when it is
 * the reader's own, through the side panel's share dialog.
 *
 * @spec openspec/changes/saved-view-share-from-toolbar/specs/saved-views/spec.md#requirement-an-index-page-can-share-the-open-view-from-the-toolbar
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, vars) => text.replace(/\{(\w+)\}/g, (m, key) => (vars && key in vars ? vars[key] : m)),
}))

const { mount } = require('@vue/test-utils')
const CnSavedViewsControl = require('../../src/components/CnSavedViewsControl/CnSavedViewsControl.vue').default
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

function mountControl(props = {}) {
	return mount(CnSavedViewsControl, {
		props: { views: [], currentUserId: 'pieter', ...props },
		global: { provide: { cnLook: 'board' } },
	})
}

const ownView = { id: 7, name: 'Klachten deze week', owner: 'pieter' }

describe('Share the open view from the toolbar', () => {
	it('draws no share button without a view to share', () => {
		expect(mountControl().find('[data-testid="cn-saved-views-share-current"]').exists()).toBe(false)
	})

	it('names the view and asks to share it', async () => {
		const wrapper = mountControl({ shareView: ownView })
		const button = wrapper.find('[data-testid="cn-saved-views-share-current"]')
		expect(button.text()).toBe('Share: Klachten deze week')
		await button.trigger('click')
		expect(wrapper.emitted('share-request')).toEqual([[ownView]])
	})

	it('keeps the share button when Save view is off', () => {
		const wrapper = mountControl({ shareView: ownView, save: false })
		expect(wrapper.find('[data-testid="cn-saved-views-control"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-saved-views-share-current"]').exists()).toBe(true)
	})

	it('offers only a stored view the reader owns, and only with savedViewShare', () => {
		const shares = CnIndexPage.computed.toolbarSharesView
		const page = (view, extra = {}) => ({ savedViewShare: true, appliedSavedView: view, currentSavedViewsUserId: 'pieter', ...extra })
		expect(shares.call(page(ownView))).toBe(ownView)
		expect(shares.call(page(ownView, { savedViewShare: false }))).toBe(null)
		expect(shares.call(page(null))).toBe(null)
		expect(shares.call(page({ id: 'default:my-work', slug: 'my-work', name: 'Mijn werk', seeded: true }))).toBe(null)
		expect(shares.call(page({ id: 8, name: 'Van Fatma', owner: 'fatma' }))).toBe(null)
		expect(shares.call(page({ id: 9, name: 'Samen', owner: 'fatma', '@self': { access: 'write' } }))).toBe(null)
		expect(CnIndexPage.props.savedViewShare.default).toBe(false)
	})

	it('opens the share dialog for the view the toolbar names', () => {
		const ctx = { viewPendingShare: null }
		CnIndexPage.methods.onShareViewRequest.call(ctx, ownView)
		expect(ctx.viewPendingShare).toBe(ownView)
	})
})
