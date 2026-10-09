/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-4
 */
import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { dispatchAction } from '../../src/components/CnIndexPage/manifestActionDispatch.js'

jest.mock('../../src/components/CnIndexPage/manifestActionDispatch.js', () => ({
	dispatchAction: jest.fn((action) => action),
}))

describe('CnIndexPage row action dispatch context', () => {
	it('carries translate, so a row action\'s toasts translate like the labels around it', () => {
		const translate = (text) => `t:${text}`
		const w = shallowMount(CnIndexPage, {
			props: { actions: [{ id: 'approve', label: 'Goedkeuren', handler: 'approve' }], objects: [], schema: { properties: {} } },
			global: { provide: { cnTranslate: translate } },
		})
		expect(w.vm.mergedActions.length).toBeGreaterThan(0)
		expect(dispatchAction).toHaveBeenCalled()
		expect(dispatchAction.mock.calls[0][1].translate).toBe(translate)
	})
})
