/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRegisterMapping with several register groups: each group starts closed
 * behind a heading button that shows its configured count, and opens on a
 * click (pipelinq's six groups were one ~2,700px card). One group stays open,
 * as before; `collapseGroups` forces either way.
 *
 * @spec openspec/changes/register-mapping-collapsed-groups/specs/register-mapping/spec.md#requirement-register-groups-start-closed-with-their-count
 */
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`),
}))

const { mount } = require('@vue/test-utils')
const CnRegisterMapping = require('../../src/components/CnRegisterMapping/CnRegisterMapping.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const GROUPS = [
	{ name: 'Pipelinq Objects', registerConfigKey: 'register', types: [{ slug: 'client', label: 'Client' }, { slug: 'lead', label: 'Lead' }] },
	{ name: 'Point of Sale', registerConfigKey: 'pos_register', types: [{ slug: 'order', label: 'Order' }] },
]

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper once the registers loaded.
 */
async function make(props = {}) {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [{ id: 5, title: 'Pipelinq', schemas: [{ id: 28, title: 'client' }] }] }) })
	const wrapper = mount(CnRegisterMapping, {
		props: { groups: GROUPS, configuration: { register: '5', client_schema: '28' }, ...props },
		global: { stubs: { NcSelect: true, NcNoteCard: { template: '<div><slot /></div>' } } },
	})
	await flush()
	return wrapper
}

const toggles = (wrapper) => wrapper.findAll('[data-testid="cn-register-mapping-group-toggle"]')
const bodies = (wrapper) => wrapper.findAll('[data-testid="cn-register-mapping-group-body"]')
// v-show writes display: none inline; read that rather than layout, which jsdom does not do.
const shown = (body) => !String(body.attributes('style') || '').includes('display: none')

describe('CnRegisterMapping collapsed groups', () => {
	it('starts every group closed behind a heading button with its count', async () => {
		const wrapper = await make()
		expect(toggles(wrapper)).toHaveLength(2)
		expect(toggles(wrapper).map((toggle) => toggle.element.parentElement.tagName)).toEqual(['H4', 'H4'])
		expect(toggles(wrapper).map((toggle) => toggle.attributes('aria-expanded'))).toEqual(['false', 'false'])
		expect(wrapper.findAll('[data-testid="cn-register-mapping-group-count"]').map((c) => c.text())).toEqual(['1/2 configured', '0/1 configured'])
		expect(bodies(wrapper).map(shown)).toEqual([false, false])
		expect(toggles(wrapper)[0].attributes('aria-controls')).toBe(bodies(wrapper)[0].attributes('id'))
	})

	it('opens one group on a click and closes it on the next', async () => {
		const wrapper = await make()
		await toggles(wrapper)[1].trigger('click')
		expect(toggles(wrapper)[1].attributes('aria-expanded')).toBe('true')
		expect(bodies(wrapper).map(shown)).toEqual([false, true])
		await toggles(wrapper)[1].trigger('click')
		expect(shown(bodies(wrapper)[1])).toBe(false)
	})

	it('keeps a single group open without a toggle, as before', async () => {
		const wrapper = await make({ groups: [GROUPS[0]] })
		expect(toggles(wrapper)).toHaveLength(0)
		expect(wrapper.find('h4.cn-register-mapping__group-title').text()).toBe('Pipelinq Objects')
		expect(shown(bodies(wrapper)[0])).toBe(true)
	})

	it('collapseGroups forces either way', async () => {
		expect(toggles(await make({ collapseGroups: false }))).toHaveLength(0)
		const single = await make({ groups: [GROUPS[0]], collapseGroups: true })
		expect(toggles(single)).toHaveLength(1)
		expect(shown(bodies(single)[0])).toBe(false)
	})
})
