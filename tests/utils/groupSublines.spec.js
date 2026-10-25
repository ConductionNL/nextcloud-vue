/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A team option's line: "{count} members · {description}" (board
 * DqOverdragen), the count from Nextcloud's group details where the viewer may
 * read them, the description from the app's own records.
 *
 * @spec openspec/changes/assign-team-option-subline/specs/assign-dialog/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))

const axios = require('@nextcloud/axios').default
const { fetchReferenceObjects } = require('../../src/utils/boardReferenceColumns.js')
const { clearGroupSublineCache, groupSublines } = require('../../src/utils/groupSublines.js')

const DESCRIBE = { register: 'dossiq', schema: 'organisatieRol' }

beforeEach(() => {
	clearGroupSublineCache()
	axios.get.mockReset()
	fetchReferenceObjects.mockReset()
})

describe('groupSublines', () => {
	it('reads the member count and the description, joined', async () => {
		axios.get.mockResolvedValue({ data: { ocs: { data: { groups: [{ id: 'juridische-zaken', usercount: 6 }, { id: 'jz-sociaal', usercount: 1 }] } } } })
		fetchReferenceObjects.mockResolvedValue([{ ncGroupId: 'juridische-zaken', description: 'bezwaar, beroep en Woo-advies' }])
		const lines = await groupSublines(['juridische-zaken', 'jz-sociaal', 'other'], 'juri', DESCRIBE)
		expect(lines['juridische-zaken']).toBe('6 members · bezwaar, beroep en Woo-advies')
		expect(lines['jz-sociaal']).toBe('1 member')
		expect(lines.other).toBe('')
	})

	it('leaves the count out when the viewer may not read group details', async () => {
		axios.get.mockRejectedValue(new Error('403'))
		fetchReferenceObjects.mockResolvedValue([{ ncGroupId: 'juridische-zaken', description: 'bezwaar, beroep en Woo-advies' }])
		const lines = await groupSublines(['juridische-zaken'], 'juri', DESCRIBE)
		expect(lines['juridische-zaken']).toBe('bezwaar, beroep en Woo-advies')
	})

	it('reads the app records once, and none without a source', async () => {
		axios.get.mockResolvedValue({ data: { ocs: { data: { groups: [] } } } })
		fetchReferenceObjects.mockResolvedValue([])
		await groupSublines(['a'], 'a', DESCRIBE)
		await groupSublines(['a'], 'a', DESCRIBE)
		expect(fetchReferenceObjects).toHaveBeenCalledTimes(1)
		await groupSublines(['a'], 'a', null)
		expect(fetchReferenceObjects).toHaveBeenCalledTimes(1)
	})
})
