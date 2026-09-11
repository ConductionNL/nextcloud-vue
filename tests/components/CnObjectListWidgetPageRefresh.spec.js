/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectListWidget answers `cn:page:refresh`.
 *
 * This is the widget behind the manifest's `object-list` and `table` types. It
 * fetches its own rows from OpenRegister on mount and subscribed to nothing,
 * so after a successful write elsewhere on the page it went on rendering the
 * result set it had — values the backend had already changed. The
 * endpoint-bound widgets have answered this channel since Wave 2
 * (`useEndpointSource`); the store-backed ones did not.
 *
 * The channel is a broadcast, so the second half of this file is about the
 * burst it invites: one write must not become a queue of overlapping reads.
 */

import { flushPromises, shallowMount } from '@vue/test-utils'

// `mock`-prefixed so jest's hoisted factory may close over them.
const mockGet = jest.fn()
const mockSubscribe = jest.fn()
const mockUnsubscribe = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p.register).replace('{schema}', p.schema) }))
jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: (...a) => mockSubscribe(...a),
	unsubscribe: (...a) => mockUnsubscribe(...a),
}))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const CHANNEL = 'cn:page:refresh'

/** @return {Function} The handler the widget registered for the channel. */
function busHandler() {
	const call = mockSubscribe.mock.calls.find(([channel]) => channel === CHANNEL)
	return call && call[1]
}

function mountWidget(content = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 's', limit: 5, ...content } },
		stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		mocks: { t: (_a, s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : s) },
	})
}

describe('CnObjectListWidget — cn:page:refresh', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: [{ id: '1', title: 'r1' }], total: 1 } })
	})

	it('subscribes to the channel on mount', () => {
		mountWidget()
		expect(busHandler()).toBeInstanceOf(Function)
	})

	it('refetches its rows when the channel fires', async () => {
		mountWidget()
		await flushPromises()
		mockGet.mockClear()

		busHandler()({})
		await flushPromises()

		// THE DEFECT. Pre-fix this was 0: the list answered nothing and kept
		// showing the rows it fetched on mount.
		expect(mockGet).toHaveBeenCalledTimes(1)
	})

	it('serves the refetched rows, not the ones it started with', async () => {
		const w = mountWidget()
		await flushPromises()
		expect(w.vm.rows.map((r) => r.title)).toEqual(['r1'])

		mockGet.mockResolvedValue({ data: { results: [{ id: '1', title: 'published' }], total: 1 } })
		busHandler()({})
		await flushPromises()

		expect(w.vm.rows.map((r) => r.title)).toEqual(['published'])
	})

	it('unsubscribes on unmount, so a destroyed widget cannot keep fetching', () => {
		const w = mountWidget()
		const handler = busHandler()
		w.unmount()
		expect(mockUnsubscribe).toHaveBeenCalledWith(CHANNEL, handler)
	})

	// THE BURST.

	it('does not stack a second read on top of one already in flight', async () => {
		let release
		const pending = new Promise((resolve) => {
			release = resolve
		})
		mockGet.mockImplementation(() => pending)
		const w = mountWidget()
		// Let the lazy axios/router imports resolve so the mount fetch has
		// actually reached the wire and is sitting there unresolved.
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()
		expect(mockGet).toHaveBeenCalledTimes(1)
		expect(w.vm.loading).toBe(true)
		mockGet.mockClear()

		busHandler()({})
		busHandler()({})
		// flushPromises, not one microtask: fetchRows awaits its lazy
		// axios/router imports before it reaches the wire, so a single tick
		// leaves the counter at 0 whether the guard is there or not — an
		// assertion that cannot fail. Watched it: removing the guard and
		// asserting after one microtask still read green.
		await flushPromises()

		expect(mockGet).toHaveBeenCalledTimes(0)
		release({ data: { results: [], total: 0 } })
		await flushPromises()
	})

	it('reads again once the in-flight read has settled', async () => {
		mountWidget()
		await flushPromises()
		mockGet.mockClear()

		busHandler()({})
		await flushPromises()
		busHandler()({})
		await flushPromises()

		expect(mockGet).toHaveBeenCalledTimes(2)
	})
})
