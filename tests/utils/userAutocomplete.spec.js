/**
 * Tests for the Nextcloud user-autocomplete helpers used by the CnFormDialog
 * user-picker. Verifies the core autocomplete OCS endpoint is called and that
 * suggestions map to `{ id: <uid>, label: <display name> }` options.
 */

import axios from '@nextcloud/axios'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateOcsUrl: (path) => `/ocs/v2.php/${path}`,
}))

// Import AFTER the router mock is registered.
// eslint-disable-next-line import/first
import { searchNextcloudUsers, resolveNextcloudUser } from '@/utils/userAutocomplete.js'

beforeEach(() => {
	axios.get = jest.fn()
})

describe('searchNextcloudUsers', () => {
	it('calls the core autocomplete OCS endpoint with the search term', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { ocs: { data: [] } } })
		await searchNextcloudUsers('ann')
		expect(axios.get).toHaveBeenCalledTimes(1)
		const [url, config] = axios.get.mock.calls[0]
		expect(url).toBe('/ocs/v2.php/core/autocomplete/get')
		expect(config.headers['OCS-APIRequest']).toBe('true')
		expect(config.params.search).toBe('ann')
		expect(config.params['shareTypes[]']).toBe(0)
	})

	it('maps user suggestions to { id: uid, label: displayName }', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				ocs: {
					data: [
						{ id: 'annemarie', label: 'Annemarie de Vries', source: 'users', shareType: 0 },
						{ id: 'henk', label: 'Henk Bakker', source: 'users', shareType: 0 },
					],
				},
			},
		})
		const options = await searchNextcloudUsers('')
		expect(options).toEqual([
			{ id: 'annemarie', label: 'Annemarie de Vries', subline: '' },
			{ id: 'henk', label: 'Henk Bakker', subline: '' },
		])
	})

	it('filters out non-user suggestions (e.g. groups)', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: {
				ocs: {
					data: [
						{ id: 'admin', label: 'Administrator', source: 'users', shareType: 0 },
						{ id: 'team', label: 'Team', source: 'groups', shareType: 1 },
					],
				},
			},
		})
		const options = await searchNextcloudUsers('a')
		expect(options).toEqual([{ id: 'admin', label: 'Administrator', subline: '' }])
	})

	it('fails soft (returns []) when the OCS call rejects', async () => {
		axios.get.mockRejectedValue(new Error('network'))
		const options = await searchNextcloudUsers('x')
		expect(options).toEqual([])
	})
})

describe('resolveNextcloudUser', () => {
	it('resolves a UID to its display-name option', async () => {
		axios.get.mockResolvedValue({
			status: 200,
			data: { ocs: { data: [{ id: 'henk', label: 'Henk Bakker', source: 'users', shareType: 0 }] } },
		})
		const option = await resolveNextcloudUser('henk')
		expect(option).toEqual({ id: 'henk', label: 'Henk Bakker', subline: '' })
	})

	it('falls back to { id: uid, label: uid } when the name cannot be resolved', async () => {
		axios.get.mockResolvedValue({ status: 200, data: { ocs: { data: [] } } })
		const option = await resolveNextcloudUser('ghost')
		expect(option).toEqual({ id: 'ghost', label: 'ghost' })
	})
})
