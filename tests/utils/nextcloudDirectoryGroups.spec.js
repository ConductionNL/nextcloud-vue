/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The groups pane reads every group, page after page. One page of 200 cut an
 * instance with 238 groups off before "zuiddrecht-…", so DqAfdelingen's
 * department tree read empty (r26c/r26d).
 *
 * @spec openspec/changes/groups-pane-reads-every-page/specs/index-page/spec.md#requirement-the-groups-pane-reads-every-group
 */
jest.mock('@nextcloud/router', () => ({ generateOcsUrl: (url) => `/ocs/v2.php/${url}` }))

const { fetchGroups } = require('../../src/utils/nextcloudDirectory.js')

/**
 * An OCS answer of these group ids.
 *
 * @param {Array<string>} ids The ids.
 * @return {object} The axios response.
 */
const page = (ids) => ({ data: { ocs: { data: { groups: ids.map((id) => ({ id, displayname: id, usercount: 1 })) } } } })

describe('fetchGroups', () => {
	it('reads the next page while a page comes back full', async () => {
		const all = Array.from({ length: 238 }, (_, i) => `g${String(i).padStart(3, '0')}`)
		const get = jest.fn(async (url, { params }) => page(all.slice(params.offset, params.offset + params.limit)))
		const groups = await fetchGroups({ get })
		expect(groups).toHaveLength(238)
		expect(groups[237].id).toBe('g237')
		expect(get.mock.calls.map(([, { params }]) => params.offset)).toEqual([0, 200])
	})

	it('stops after one page that is not full', async () => {
		const get = jest.fn(async () => page(['a', 'b']))
		expect(await fetchGroups({ get })).toHaveLength(2)
		expect(get).toHaveBeenCalledTimes(1)
	})
})
