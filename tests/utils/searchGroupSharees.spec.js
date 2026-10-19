/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The sharee search behind the saved-filter share picker.
 *
 * @spec openspec/changes/saved-filters-manage-and-defaults/tasks.md#task-5
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateOcsUrl: (path) => `/ocs/v2.php/${path}` }))

const axios = require('@nextcloud/axios').default
const { searchGroupSharees, searchUserAndGroupSharees } = require('../../src/utils/searchGroupSharees.js')

const sharee = (shareWith, label) => ({ label, value: { shareWith } })

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({
		data: {
			ocs: {
				data: {
					exact: { users: [sharee('fatma', 'Fatma Yilmaz')], groups: [] },
					users: [sharee('fatma', 'Fatma Yilmaz'), sharee('joris', 'Joris')],
					groups: [sharee('desk', 'Handling desk')],
				},
			},
		},
	})
})

describe('searchUserAndGroupSharees', () => {
	it('asks for users and groups and answers both, exact first, without repeats', async () => {
		const found = await searchUserAndGroupSharees('fa')
		expect(axios.get.mock.calls[0][1].params.shareType).toEqual([0, 1])
		expect(found).toEqual([
			{ id: 'fatma', kind: 'user', label: 'Fatma Yilmaz' },
			{ id: 'joris', kind: 'user', label: 'Joris' },
			{ id: 'desk', kind: 'group', label: 'Handling desk' },
		])
	})

	it('answers nobody when the API fails', async () => {
		axios.get.mockRejectedValue(new Error('sharing off'))
		expect(await searchUserAndGroupSharees('')).toEqual([])
	})
})

describe('searchGroupSharees', () => {
	it('still asks for groups only and answers id and label', async () => {
		const found = await searchGroupSharees('')
		expect(axios.get.mock.calls[0][1].params.shareType).toEqual([1])
		expect(found).toEqual([{ id: 'desk', label: 'Handling desk' }])
	})
})
