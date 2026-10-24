/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A menu entry's count with `@myTeam` in its filter waits for the team and
 * counts the cases of every team the app answers, as the list does (the team
 * queue's badge, tile and list read one definition). A reader in no team gets
 * the filter without the team, as the list does.
 *
 * @spec openspec/changes/my-team-source-may-answer-several-teams/specs/schema-utilities/spec.md#requirement-a-menu-count-resolves-myteam-as-the-list-does
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

const axios = require('@nextcloud/axios').default
const { registerMyTeamSource } = require('../../src/utils/myTeam.js')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const item = { id: 'Queue', count: { register: 'dossiq', schema: 'case', filter: { assignee: 'IS NULL', assignedGroup: '@myTeam' } } }

afterEach(() => {
	registerMyTeamSource(null)
	axios.get.mockReset()
})

describe('a menu count on @myTeam', () => {
	it('counts every team the app answers', async () => {
		registerMyTeamSource(() => Promise.resolve(['woo', 'vergunningen']))
		axios.get.mockResolvedValue({ data: { total: 11 } })
		const ctx = { cnMenuItemCounts: {} }
		await CnAppRoot.methods._fetchMenuItemCount.call(ctx, item)
		expect(axios.get.mock.calls[0][1].params).toEqual({ _limit: 1, assignee: 'IS NULL', assignedGroup: ['woo', 'vergunningen'] })
		expect(ctx.cnMenuItemCounts.Queue).toBe(11)
	})

	it('drops the team for a reader in no team', async () => {
		registerMyTeamSource(() => Promise.resolve(''))
		axios.get.mockResolvedValue({ data: { total: 3 } })
		await CnAppRoot.methods._fetchMenuItemCount.call({ cnMenuItemCounts: {} }, item)
		expect(axios.get.mock.calls[0][1].params).toEqual({ _limit: 1, assignee: 'IS NULL' })
	})
})
