/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnConnectionsPanel: the connections an app declares, as integriq checks
 * them (board PqIntegrations): a card each, status chips with counts, a text
 * filter, and what needs attention beside them.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConnectionsPanel, { checkedMoment } from '../../src/components/CnConnectionsPanel/CnConnectionsPanel.vue'

jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn() }))
const { fetchReferenceObjects } = require('../../src/utils/boardReferenceColumns.js')

const ROWS = [
	{ id: '2', key: 'social-x', title: 'X', status: 'unconfigured', order: 23, settingsUrl: '/apps/pipelinq/social-accounts' },
	{ id: '1', key: 'cti', title: 'Telephony (CTI)', status: 'configured', order: 10, checkedAt: '2026-10-07T06:12:00Z', statusMessage: 'Asterisk answers.', settingsUrl: '/settings/admin/pipelinq?tab=connections', declaration: { kind: 'Telephony', icon: 'Headset' } },
	{ id: '3', key: 'social-facebook', title: 'Facebook page', status: 'error', order: 24, statusMessage: 'The page token expired.', declaration: { kind: 'Social network' } },
	{ id: '4', key: 'social-linkedin', title: 'LinkedIn', status: 'limited', order: 22, statusMessage: 'The company page needs admin rights.' },
]

/**
 * Mount the panel over the rows.
 *
 * @return {Promise<object>} The wrapper.
 */
async function panel() {
	fetchReferenceObjects.mockResolvedValue(ROWS)
	const wrapper = mount(CnConnectionsPanel, {
		props: { app: 'pipelinq', appName: 'Pipelinq', addUrl: '/apps/integriq/connections', kinds: { 'social-x': { kind: 'Social network', icon: 'ShareVariant' } } },
		global: { stubs: { CnIcon: true } },
	})
	await flushPromises()
	return wrapper
}

describe('CnConnectionsPanel', () => {
	it('reads the app\'s connections and draws a card each, in their order', async () => {
		const wrapper = await panel()
		expect(fetchReferenceObjects).toHaveBeenCalledWith({ register: 'integriq', schema: 'app_connection', filter: { app: 'pipelinq' }, limit: 200 })
		const titles = wrapper.findAll('[data-testid="cn-connections-card"] strong').map((n) => n.text())
		expect(titles).toEqual(['Telephony (CTI)', 'LinkedIn', 'X', 'Facebook page'])
		expect(wrapper.find('[data-testid="cn-connections-card"]').text()).toContain('Telephony · checked')
	})

	it('counts each status on its chip and filters by chip and by text', async () => {
		const wrapper = await panel()
		const chips = wrapper.findAll('.cn-connections__chip').map((n) => n.text().replace(/\s+/g, ' '))
		expect(chips).toEqual(['All connections 4', 'Configured 1', 'Limited 1', 'Not set up 1', 'Error 1'])
		await wrapper.find('[data-testid="cn-connections-chip-error"]').trigger('click')
		expect(wrapper.findAll('[data-testid="cn-connections-card"]')).toHaveLength(1)
		await wrapper.find('[data-testid="cn-connections-chip-all"]').trigger('click')
		wrapper.vm.query = 'social'
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('[data-testid="cn-connections-card"]')).toHaveLength(2)
	})

	it('lists the limited and failing connections as needing attention', async () => {
		const wrapper = await panel()
		expect(wrapper.find('[data-testid="cn-connections-attention"]').text()).toContain('LinkedIn')
		expect(wrapper.find('[data-testid="cn-connections-attention"]').text()).toContain('Facebook page')
		expect(wrapper.find('[data-testid="cn-connections-attention"]').text()).not.toContain('Telephony')
	})

	it('says it could not read the connections, and writes a check moment without a year', async () => {
		fetchReferenceObjects.mockRejectedValue(new Error('500'))
		const wrapper = mount(CnConnectionsPanel, { props: { app: 'pipelinq' }, global: { stubs: { CnIcon: true } } })
		await flushPromises()
		expect(wrapper.text()).toContain('The connections could not be read.')
		expect(checkedMoment('')).toBe('')
		expect(checkedMoment('2026-10-07T06:12:00Z')).toMatch(/7/)
	})

	it('takes a connection\'s kind from the host when its declaration names none', async () => {
		const wrapper = await panel()
		const x = wrapper.findAll('[data-testid="cn-connections-card"]').find((card) => card.text().includes('X'))
		expect(x.text()).toContain('Social network · never checked')
	})
})
