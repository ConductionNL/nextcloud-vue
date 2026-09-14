/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 *
 * `rowRoute` lets an app keep its own detail page for a named source's rows.
 *
 * An entity source knows where its rows live and navigates itself, and for a
 * source whose page belongs to ANOTHER app that is right: `tasks` sends a
 * click to openregister's task page, because pushing on this app's router
 * could not reach it.
 *
 * It is wrong for an app that HAS its own page. Dossiq keeps a task detail
 * page deliberately, so its handlers see a task in dossiq's vocabulary beside
 * the case it belongs to.
 *
 * 🔴 THIS CANNOT BE DONE BY LISTENING TO `row-click`. `openRow` calls
 * `window.location.assign()`, so the host's push never lands. That is why the
 * override is a prop the component honours BEFORE the source, and why the
 * assertion below is that `openRow` was NOT called at all rather than that a
 * push happened afterwards.
 */

var mockOpenRow = jest.fn()

// Mock the SOURCE REGISTRY, not the component's internals. `namedSource` is a
// setup() computed, so assigning to it on the vm does nothing and the test
// silently exercises the real tasks source instead of a stub.
jest.mock('../../src/composables/indexSources.js', () => ({
	__esModule: true,
	resolveIndexSource: () => ({
		load: () => Promise.resolve(),
		rows: () => [],
		loading: () => false,
		columns: [],
		openRow: (...args) => mockOpenRow(...args),
	}),
	indexSources: {},
}))

import { shallowMount } from '@vue/test-utils'

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

/**
 * Mount the index over the mocked source.
 *
 * @param {object} props Extra props for the page.
 * @return {object} The wrapper and the router spy.
 */
function mountIndex(props = {}) {
	const push = jest.fn()

	const wrapper = shallowMount(CnIndexPage, {
		//  defaults to true, and a selectable row click toggles
		// selection and returns before any navigation.  is
		// what a manifest task page sets, and it is what puts the click on
		// the navigation path at all.
		props: { entitySource: 'tasks', rowClickToView: true, ...props },
		global: {
			mocks: { $router: { push }, $route: { query: {}, params: {} } },
			stubs: { teleport: true },
		},
	})

	return { wrapper, push }
}

beforeEach(() => {
	mockOpenRow.mockClear()
})

describe('CnIndexPage rowRoute over a named source', () => {
	it('routes inside this app when rowRoute is set, and does NOT let the source navigate away', async () => {
		const { wrapper, push } = mountIndex({ rowRoute: 'TaskDetail' })

		wrapper.vm.onRowClick({ uuid: 'task-1' })

		expect(push).toHaveBeenCalledWith({ name: 'TaskDetail', params: { id: 'task-1' } })
		// The source must not also fire: it calls window.location.assign(),
		// which would leave the app regardless of the push.
		expect(mockOpenRow).not.toHaveBeenCalled()
	})

	it('reads the uuid or the id, whichever the row carries', async () => {
		const { wrapper, push } = mountIndex({ rowRoute: 'TaskDetail' })

		wrapper.vm.onRowClick({ id: 'from-id' })

		expect(push).toHaveBeenCalledWith({ name: 'TaskDetail', params: { id: 'from-id' } })
	})

	it('leaves the source in charge when rowRoute is unset, which is every current consumer', async () => {
		const { wrapper, push } = mountIndex()

		wrapper.vm.onRowClick({ uuid: 'task-1' })

		expect(mockOpenRow).toHaveBeenCalledWith({ uuid: 'task-1' })
		expect(push).not.toHaveBeenCalled()
	})

	it('navigates nowhere for a row with no identity', async () => {
		const { wrapper, push } = mountIndex({ rowRoute: 'TaskDetail' })

		wrapper.vm.onRowClick({ title: 'no id at all' })

		expect(push).not.toHaveBeenCalled()
		expect(mockOpenRow).not.toHaveBeenCalled()
	})
})
