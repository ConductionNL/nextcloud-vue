/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `?savedView=<uuid>` applies the view it names. OpenRegister answers a view
 * with a numeric `id` and its `uuid`, and a menu entry or a shared link names
 * the uuid, so a lookup by id or slug alone found nothing and the page stayed
 * on "Alle zaken" (DqFilterInMenu, COMPDIFF r23, view 551f656a).
 *
 * @spec openspec/changes/saved-view-route-uuid/specs/saved-views/spec.md
 */

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const VIEW = { id: 3, uuid: '551f656a-b8ba-4647-927c-25995d4d9c93', name: 'Termijn deze week' }

/**
 * A page context with the address naming a view.
 *
 * @param {string} savedView The address's savedView.
 * @return {object} The context.
 */
function page(savedView) {
	return {
		$route: { query: { savedView } },
		appliedSavedViewId: '',
		viewsForControl: [{ id: 1, uuid: 'other', name: 'Andere' }, VIEW],
		onApplySavedView: jest.fn(),
	}
}

describe('CnIndexPage — a saved view named in the address', () => {
	it('applies the view the address names by its uuid', () => {
		const ctx = page('551f656a-b8ba-4647-927c-25995d4d9c93')
		CnIndexPage.methods.applySavedViewFromRoute.call(ctx)
		expect(ctx.onApplySavedView).toHaveBeenCalledWith(VIEW, { keepSavedViewKey: true })
	})

	it('still applies a view named by its id', () => {
		const ctx = page('3')
		CnIndexPage.methods.applySavedViewFromRoute.call(ctx)
		expect(ctx.onApplySavedView).toHaveBeenCalledWith(VIEW, { keepSavedViewKey: true })
	})

	it('applies nothing for an unknown view', () => {
		const ctx = page('nope')
		CnIndexPage.methods.applySavedViewFromRoute.call(ctx)
		expect(ctx.onApplySavedView).not.toHaveBeenCalled()
	})
})
