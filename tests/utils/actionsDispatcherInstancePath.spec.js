/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A navigate target that is a page of the instance outside the app
 * (`/index.php/...`, e.g. OpenRegister's schemas from DqCatalogus
 * "Objecttype toevoegen") is a page load, not a route of this app.
 *
 * @spec openspec/changes/dashboard-widget-header-actions/specs/dashboard-widget-header-actions/spec.md#requirement-a-navigate-target-can-be-an-instance-page
 */
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

describe('dispatchAction navigate to an instance page', () => {
	it('loads an /index.php/ target in the window instead of pushing it on the router', () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null)
		const router = { push: jest.fn() }
		try {
			dispatchAction({ type: 'navigate', target: '/index.php/apps/openregister/schemas' }, { router })
			expect(open).toHaveBeenCalledWith('/index.php/apps/openregister/schemas', '_self')
			expect(router.push).not.toHaveBeenCalled()
		} finally {
			open.mockRestore()
		}
	})

	it('keeps pushing an app route on the router', () => {
		const router = { push: jest.fn() }
		dispatchAction({ type: 'navigate', target: '/cases' }, { router })
		expect(router.push).toHaveBeenCalledWith('/cases')
	})
})
