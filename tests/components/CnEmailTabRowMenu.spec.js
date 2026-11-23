/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every linked mail carries a "more actions" menu (DqZaakEmail draws one per
 * mail): open it in Mail, or unlink it from the record.
 *
 * @spec openspec/changes/board-linked-mail-rows/specs/board-linked-mail-rows/spec.md
 */
const { flushPromises, mount } = require('@vue/test-utils')
const CnEmailTab = require('../../src/integrations/builtin/email/CnEmailTab.vue').default

const MAIL = { id: 7, subject: 'Vraag aan Mobiliteit', sender: 'pieter.jansen@zuiddrecht.example', mailAccountId: 4, mailMessageId: 44 }

beforeEach(() => {
	global.fetch = jest.fn((url, init) => {
		if (init && init.method === 'DELETE') {
			return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
		}
		return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [MAIL], total: 1 }) })
	})
})

afterEach(() => {
	delete global.fetch
})

/**
 * @return {object} The mounted tab, its list loaded.
 */
async function mountTab() {
	const wrapper = mount(CnEmailTab, {
		props: { objectId: 'c1', register: 'dossiq', schema: 'case' },
		global: { stubs: { NcActions: { props: ['ariaLabel', 'forceMenu'], template: '<div class="menu" :aria-label="ariaLabel"><slot /></div>' } } },
	})
	await flushPromises()
	return wrapper
}

describe('CnEmailTab row menu', () => {
	it('puts a "more actions" menu beside every mail, outside its link', async () => {
		const wrapper = await mountTab()
		const item = wrapper.find('.cn-email-tab__item')
		const menu = item.find('.cn-email-tab__menu')
		expect(menu.exists()).toBe(true)
		expect(item.find('.cn-email-tab__row .cn-email-tab__menu').exists()).toBe(false)
		expect(menu.attributes('aria-label')).toBe('More actions for this mail')
	})

	it('unlinks a mail from the record and reloads the list', async () => {
		const wrapper = await mountTab()
		await wrapper.vm.unlink(wrapper.vm.rows[0])
		await flushPromises()
		const del = global.fetch.mock.calls.find((call) => call[1] && call[1].method === 'DELETE')
		expect(String(del[0])).toContain('/objects/dossiq/case/c1/emails/7')
		const lists = global.fetch.mock.calls.filter((call) => String(call[0]).includes('/integrations/email'))
		expect(lists).toHaveLength(2)
	})
})
