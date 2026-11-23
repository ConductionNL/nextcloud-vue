/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/schema-utilities/spec.md#requirement-mygroups-resolves-to-the-current-users-group-ids
 */
import axios from '@nextcloud/axios'
import { computed } from 'vue'
import {
	hasUnresolvedTokens,
	resolveFilterTokens,
	resolveFilterValue,
} from '../../src/utils/resolveFilterTokens.js'
import { peekCurrentUserGroups, resetVisibilityCache } from '../../src/utils/widgetVisibility.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({
	generateOcsUrl: (path, params) => '/ocs/v2.php' + path.replace('{userId}', params && params.userId),
	generateUrl: (path) => path,
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Answer the groups request with these ids.
 *
 * @param {string[]} groups The group ids.
 */
function answerGroups(groups) {
	axios.get.mockResolvedValue({ data: { ocs: { data: { groups } } } })
}

describe('@myGroups', () => {
	beforeEach(() => {
		resetVisibilityCache()
		axios.get.mockReset()
		window.OC = { currentUser: 'jan' }
	})

	it('stays unresolved while the groups load, then resolves to the ids', async () => {
		answerGroups(['behandelaars', 'toezicht'])
		expect(resolveFilterValue('@myGroups')).toBe('@myGroups')
		await flush()
		expect(resolveFilterValue('@myGroups')).toEqual(['behandelaars', 'toezicht'])
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][0]).toBe('/ocs/v2.php/cloud/users/jan/groups')
	})

	it('makes a team queue an IN filter next to the other conditions', async () => {
		answerGroups(['behandelaars', 'toezicht'])
		peekCurrentUserGroups()
		await flush()
		expect(resolveFilterTokens({ assignedGroup: '@myGroups', assignee: 'IS NULL' })).toEqual({
			assignedGroup: ['behandelaars', 'toezicht'],
			assignee: 'IS NULL',
		})
	})

	it('spreads the ids inside an IN list and in the operator form', async () => {
		answerGroups(['a', 'b'])
		peekCurrentUserGroups()
		await flush()
		expect(resolveFilterTokens({ g: ['@myGroups', 'archive'] })).toEqual({ g: ['a', 'b', 'archive'] })
		expect(resolveFilterTokens({ g: { in: '@myGroups' } })).toEqual({ g: { in: ['a', 'b'] } })
	})

	it('a person in no team waits instead of seeing every team', async () => {
		answerGroups([])
		peekCurrentUserGroups()
		await flush()
		expect(resolveFilterValue('@myGroups')).toBe('@myGroups')
		expect(hasUnresolvedTokens(resolveFilterTokens({ assignedGroup: '@myGroups' }))).toBe(true)
	})

	it('a failed lookup waits too', async () => {
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		axios.get.mockRejectedValue(new Error('down'))
		peekCurrentUserGroups()
		await flush()
		expect(resolveFilterValue('@myGroups')).toBe('@myGroups')
		spy.mockRestore()
	})

	it('ctx.myGroups wins and asks nothing', () => {
		expect(resolveFilterValue('@myGroups', { myGroups: ['x'] })).toEqual(['x'])
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('a computed filter re-runs when the groups arrive', async () => {
		answerGroups(['toezicht'])
		const filter = computed(() => resolveFilterTokens({ assignedGroup: '@myGroups' }))
		expect(filter.value).toEqual({ assignedGroup: '@myGroups' })
		await flush()
		expect(filter.value).toEqual({ assignedGroup: ['toezicht'] })
	})
})
