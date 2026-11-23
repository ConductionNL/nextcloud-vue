/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row action of `type: "open-modal"` opens its modal through the app root,
 * with the row as `object` and its key as `objectId`; a dialog that acted
 * signals `cn:page:refresh`, and an endpoint-sourced list reads its rows again.
 * That is how a list over an app endpoint restores, revokes or files a row
 * behind a confirm (CnActionDialog) that shows the server's refusal sentence.
 *
 * @spec openspec/changes/index-row-open-modal/specs/index-page/spec.md#requirement-a-row-action-can-open-a-modal-on-the-row
 */

var mockGet = jest.fn(() => Promise.resolve({ data: { results: [{ id: 'c-1', title: 'Case 1' }] } }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args) },
}))

import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
const { dispatchAction, resolveActionHandler } = require('../../src/components/CnIndexPage/manifestActionDispatch.js')
const { useNamedSource } = require('../../src/components/CnIndexPage/useNamedSource.js')

describe('row action open-modal', () => {
	it('opens the target with the row and its key', () => {
		const openModal = jest.fn()
		const handler = resolveActionHandler({ id: 'restore', type: 'open-modal', target: 'CnActionDialog', props: { config: { title: 'Restore' } } }, { rowKey: 'id', openModal })
		handler({ id: 'c-1', title: 'Case 1' })
		expect(openModal).toHaveBeenCalledWith('CnActionDialog', { object: { id: 'c-1', title: 'Case 1' }, objectId: 'c-1', config: { title: 'Restore' } })
	})

	it('lets the action name its own objectId', () => {
		const openModal = jest.fn()
		resolveActionHandler({ id: 'file', type: 'open-modal', target: 'FileDialog', props: { objectId: 'fixed' } }, { rowKey: 'id', openModal })({ id: 'c-1' })
		expect(openModal.mock.calls[0][1].objectId).toBe('fixed')
	})

	it('falls back to the @action event without an app root to open it in', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		expect(resolveActionHandler({ id: 'x', type: 'open-modal', target: 'CnActionDialog' }, { rowKey: 'id' })).toBeNull()
		expect(dispatchAction({ id: 'x', type: 'open-modal', target: 'CnActionDialog' }, { rowKey: 'id' }).handler).toBeUndefined()
		warn.mockRestore()
	})
})

describe('an endpoint list after a dialog acted', () => {
	it('reads its rows again on cn:page:refresh', async () => {
		mockGet.mockClear()
		const wrapper = mount({
			template: '<div />',
			setup() {
				return { named: useNamedSource({ entitySource: 'endpoint', objects: [], quickFilters: null, sourceConfig: { url: '/apps/myapp/api/cases/deleted' } }, { activeQuickFilterIndex: ref(null) }) }
			},
		})
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(1)
		emit('cn:page:refresh', {})
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(2)
		wrapper.unmount()
		emit('cn:page:refresh', {})
		await flushPromises()
		expect(mockGet).toHaveBeenCalledTimes(2)
	})
})
