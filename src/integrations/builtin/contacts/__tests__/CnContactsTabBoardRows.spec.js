/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnContactsTab in the board look draws a person as DqZaakBetrokkenen
 * "Partijen" does: no role badge under a group that already names the role
 * (r26a showed a role id as a badge), no count beside the group heading, the
 * contact details on one line, the period at the right in the board's short
 * date ("Vanaf 3 okt"), and the remove action in a "…" menu.
 *
 * @spec openspec/changes/board-contacts-rows/specs/contacts/spec.md
 */

const { flushPromises, mount } = require('@vue/test-utils')
const CnContactsTab = require('../CnContactsTab.vue').default
const { formatBoardDate } = require('../../../../utils/boardDate.js')

const ROWS = [{
	id: 1,
	contactUid: 'c1',
	displayName: 'Sanne de Vries',
	role: '3c0f5a00-0000-4000-a000-0000000c0001',
	email: 'sanne@example.nl',
	note: 'ingelogd met DigiD',
	validFrom: '2026-10-03',
}]

function mountTab(look) {
	return mount(CnContactsTab, {
		propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		global: { provide: { cnLook: look } },
	})
}

describe('CnContactsTab board rows', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: ROWS, total: 1 }) })
	})

	afterEach(() => {
		delete global.fetch
	})

	it('draws the board row in the board look', async () => {
		const w = mountTab('board')
		await flushPromises()
		const item = w.find('.cn-contacts-tab__item')
		expect(item.find('.cn-contacts-tab__group-count').exists()).toBe(false)
		expect(w.find('.cn-contacts-tab__group-count').exists()).toBe(false)
		expect(item.text()).not.toContain('3c0f5a00')
		expect(item.find('[data-testid="cn-contacts-tab-meta"]').text()).toBe('sanne@example.nl · ingelogd met DigiD')
		expect(item.find('[data-testid="cn-contacts-tab-board-period"]').text()).toBe(`From ${formatBoardDate('2026-10-03')}`)
		expect(item.find('.cn-contacts-tab__unlink').exists()).toBe(false)
		expect(item.find('[data-testid="cn-contacts-tab-menu"]').exists()).toBe(true)
		w.unmount()
	})

	it('keeps the Nextcloud row in the Nextcloud look', async () => {
		const w = mountTab('nextcloud')
		await flushPromises()
		const item = w.find('.cn-contacts-tab__item')
		expect(w.find('.cn-contacts-tab__group-count').exists()).toBe(true)
		expect(item.find('.cn-contacts-tab__unlink').exists()).toBe(true)
		expect(item.find('[data-testid="cn-contacts-tab-meta"]').exists()).toBe(false)
		w.unmount()
	})
})
