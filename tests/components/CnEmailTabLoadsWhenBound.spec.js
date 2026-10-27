/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnEmailTab lists the linked mail once it knows the record, its register and
 * its schema, in whichever order they arrive. On a detail page the record id
 * is there first and the register and schema follow; the list stayed empty
 * (DqZaakEmail r33: three mails linked, none listed, no request sent).
 */
const { flushPromises, mount } = require('@vue/test-utils')
const CnEmailTab = require('../../src/integrations/builtin/email/CnEmailTab.vue').default

beforeEach(() => {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [{ id: 2, subject: 'Vraag aan Mobiliteit' }], total: 1 }) }))
})

afterEach(() => {
	delete global.fetch
})

describe('CnEmailTab binding', () => {
	it('asks for nothing while the register or schema is unknown', async () => {
		mount(CnEmailTab, { props: { objectId: 'c1', register: '', schema: '' } })
		await flushPromises()
		expect(global.fetch).not.toHaveBeenCalled()
	})

	it('loads the linked mail when the register and schema arrive after the id', async () => {
		const wrapper = mount(CnEmailTab, { props: { objectId: 'c1', register: '', schema: '' } })
		await flushPromises()
		await wrapper.setProps({ register: 'dossiq', schema: 'case' })
		await flushPromises()
		const urls = global.fetch.mock.calls.map((call) => String(call[0]))
		expect(urls.some((url) => url.includes('/objects/dossiq/case/c1/integrations/email'))).toBe(true)
	})

	it('loads once when everything is there from the start', async () => {
		mount(CnEmailTab, { props: { objectId: 'c1', register: 'dossiq', schema: 'case' } })
		await flushPromises()
		const listCalls = global.fetch.mock.calls.filter((call) => String(call[0]).includes('/integrations/email'))
		expect(listCalls).toHaveLength(1)
	})
})

describe('CnMailTab linked mail binding', () => {
	const CnMailTab = require('../../src/components/CnMailTab/CnMailTab.vue').default
	const STUB = { name: 'CnEmailTab', props: ['objectId', 'register', 'schema', 'showActions'], template: '<div class="linked-mail-stub" />' }

	it('takes the register and schema from the record when the host passes none', () => {
		const record = { id: 'c1', '@self': { id: 'c1', register: 23, schema: 172 } }
		const wrapper = mount(CnMailTab, {
			props: { content: { linkedMail: true }, objectId: 'c1', objectData: record },
			global: { stubs: { CnEmailTab: STUB } },
		})
		const linked = wrapper.findComponent({ name: 'CnEmailTab' })
		expect(linked.props('register')).toBe('23')
		expect(linked.props('schema')).toBe('172')
	})

	it('keeps the register and schema the host passes', () => {
		const record = { id: 'c1', '@self': { id: 'c1', register: 23, schema: 172 } }
		const wrapper = mount(CnMailTab, {
			props: { content: { linkedMail: true }, objectId: 'c1', objectData: record, register: 'dossiq', schema: 'case' },
			global: { stubs: { CnEmailTab: STUB } },
		})
		expect(wrapper.findComponent({ name: 'CnEmailTab' }).props('register')).toBe('dossiq')
	})
})
