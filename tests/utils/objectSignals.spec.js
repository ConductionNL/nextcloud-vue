/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import CnIndexPage from '@/components/CnIndexPage/CnIndexPage.vue'
import { dispatchObjectsChanged, OBJECTS_CHANGED_EVENT } from '@/utils/objectSignals.js'

describe('dispatchObjectsChanged', () => {
	it('sends register and schema as strings', () => {
		const events = []
		const listener = (e) => events.push(e.detail)
		window.addEventListener(OBJECTS_CHANGED_EVENT, listener)
		dispatchObjectsChanged({ register: 19, schema: 24, id: 'p-1' })
		window.removeEventListener(OBJECTS_CHANGED_EVENT, listener)
		expect(events).toEqual([{ register: '19', schema: '24', id: 'p-1' }])
	})
})

describe('CnIndexPage onObjectsChanged', () => {
	const onObjectsChanged = CnIndexPage.methods.onObjectsChanged
	const page = (props) => ({ register: '19', schema: '24', effectiveSchema: { id: 24, slug: 'publication' }, onRefreshEvent: jest.fn(), ...props })
	const signal = (detail) => ({ detail: { register: null, schema: null, ...detail } })

	it('refreshes on a matching register and schema id or slug', () => {
		const byId = page()
		onObjectsChanged.call(byId, signal({ register: '19', schema: '24' }))
		const bySlug = page()
		onObjectsChanged.call(bySlug, signal({ register: '19', schema: 'publication' }))
		expect(byId.onRefreshEvent).toHaveBeenCalledTimes(1)
		expect(bySlug.onRefreshEvent).toHaveBeenCalledTimes(1)
	})

	it('ignores another register or schema', () => {
		const ctx = page()
		onObjectsChanged.call(ctx, signal({ register: '20', schema: '24' }))
		onObjectsChanged.call(ctx, signal({ register: '19', schema: '25' }))
		expect(ctx.onRefreshEvent).not.toHaveBeenCalled()
	})

	it('treats a missing part as a match', () => {
		const ctx = page({ register: '' })
		onObjectsChanged.call(ctx, signal({ register: '19' }))
		expect(ctx.onRefreshEvent).toHaveBeenCalledTimes(1)
	})
})
