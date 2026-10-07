/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import axios from '@nextcloud/axios'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateOcsUrl: (path) => `/ocs/v2.php/${path}`,
}))

import { resolveNextcloudGroup, searchNextcloudGroups } from '@/utils/groupAutocomplete.js'

beforeEach(() => {
	axios.get = jest.fn()
})

describe('searchNextcloudGroups', () => {
	it('asks the autocomplete endpoint for groups and maps gid + display name', async () => {
		axios.get.mockResolvedValue({
			data: { ocs: { data: [
				{ id: 'sales', label: 'Sales team', source: 'groups' },
				{ id: 'henk', label: 'Henk', source: 'users' },
			] } },
		})
		const groups = await searchNextcloudGroups('sal')
		const [url, config] = axios.get.mock.calls[0]
		expect(url).toBe('/ocs/v2.php/core/autocomplete/get')
		expect(config.params['shareTypes[]']).toBe(1)
		expect(config.params.search).toBe('sal')
		expect(groups).toEqual([{ id: 'sales', label: 'Sales team' }])
	})

	it('falls back to cloud/groups when autocomplete yields no groups', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { ocs: { data: [] } } })
			.mockResolvedValueOnce({ data: { ocs: { data: { groups: ['admin', 'sales'] } } } })
		const groups = await searchNextcloudGroups('')
		expect(axios.get.mock.calls[1][0]).toBe('/ocs/v2.php/cloud/groups')
		expect(groups).toEqual([{ id: 'admin', label: 'admin' }, { id: 'sales', label: 'sales' }])
	})

	it('fails soft to an empty list', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		await expect(searchNextcloudGroups('x')).resolves.toEqual([])
	})

	it('resolves a stored gid to its display name, else the gid', async () => {
		axios.get.mockResolvedValue({ data: { ocs: { data: [{ id: 'sales', label: 'Sales team', source: 'groups' }] } } })
		await expect(resolveNextcloudGroup('sales')).resolves.toEqual({ id: 'sales', label: 'Sales team' })
		await expect(resolveNextcloudGroup('other')).resolves.toEqual({ id: 'other', label: 'other' })
	})
})
