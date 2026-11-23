/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header action gated on `readerGroups` shows to members of a listed group
 * only (dossiq's advice request: Start deliberation, Issue advice and Declare
 * inadmissible for bezwaarcommissie and admin), with one group lookup for all.
 *
 * @spec openspec/changes/visible-when-reader-groups/specs/visible-when-reader-groups/spec.md#requirement-a-visiblewhen-condition-can-require-the-reader-to-be-in-a-group
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { resetVisibilityCache } from '../../src/utils/widgetVisibility.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({
	generateOcsUrl: (path, params) => '/ocs/v2.php' + path.replace('{userId}', params && params.userId),
	generateUrl: (path) => path,
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const COMMITTEE = { readerGroups: ['bezwaarcommissie', 'admin'] }
const when = (status) => ({ all: [COMMITTEE, { field: 'status', op: 'eq', value: status }] })
const actions = [
	{ id: 'start-deliberation', label: 'Start deliberation', type: 'api-call', url: '/apps/dossiq/api/x', visibleWhen: when('assigned') },
	{ id: 'issue-advice', label: 'Issue advice', type: 'api-call', url: '/apps/dossiq/api/x', visibleWhen: when('in-deliberation') },
	{ id: 'declare-inadmissible', label: 'Declare inadmissible', type: 'api-call', url: '/apps/dossiq/api/x', visibleWhen: when('in-deliberation') },
	{ id: 'always', label: 'Always', type: 'navigate', route: 'Home' },
]

/**
 * Mount the buttons on an advice request in deliberation, read by a user in these groups.
 *
 * @param {string[]} groups The reader's group ids.
 * @return {Promise<string[]>} The ids of the visible actions.
 */
async function visibleFor(groups) {
	axios.get.mockResolvedValue({ data: { ocs: { data: { groups } } } })
	const wrapper = mount(CnActionButtons, {
		propsData: { actions },
		provide: { cnObjectContext: ref({ objectId: 'ar-1', object: { id: 'ar-1', status: 'in-deliberation' } }) },
		mocks: { $router: { push: jest.fn() } },
	})
	await flush()
	await flush()
	return wrapper.vm.visibleActions.map((action) => action.id)
}

describe('CnActionButtons: readerGroups', () => {
	beforeEach(() => {
		resetVisibilityCache()
		axios.get.mockReset()
		window.OC = { currentUser: 'anouk' }
	})

	it('shows the committee actions to a member, by status', async () => {
		expect(await visibleFor(['bezwaarcommissie'])).toEqual(['issue-advice', 'declare-inadmissible', 'always'])
	})

	it('hides them from a case handler outside the committee', async () => {
		expect(await visibleFor(['behandelaars'])).toEqual(['always'])
	})

	it('shows them to an administrator', async () => {
		expect(await visibleFor(['admin'])).toEqual(['issue-advice', 'declare-inadmissible', 'always'])
	})

	it('asks for the groups once, not once per action', async () => {
		await visibleFor(['bezwaarcommissie'])
		const groupCalls = axios.get.mock.calls.filter(([url]) => String(url).includes('/groups'))
		expect(groupCalls).toHaveLength(1)
	})
})
