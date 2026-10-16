/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRegisterMapping in the board look (PqBeheer): one group open as a
 * type/schema table under a status chip, the other groups as compact rows,
 * the save button at the end. And the fetch: the register list comes without
 * expanded schemas, and only the mapped registers have their schemas fetched.
 *
 * @spec openspec/changes/register-mapping-board-look/specs/register-mapping/spec.md#requirement-the-board-look-draws-one-open-group-and-compact-rows
 * @spec openspec/changes/register-mapping-board-look/specs/register-mapping/spec.md#requirement-only-mapped-registers-have-their-schemas-fetched
 */
jest.mock('@nextcloud/l10n', () => {
	const fill = (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`)
	return {
		translate: (app, text, params) => fill(text, params),
		translatePlural: (app, one, many, count, params) => fill(count === 1 ? one : many, params).replace('%n', String(count)),
	}
})

const { mount } = require('@vue/test-utils')
const CnRegisterMapping = require('../../src/components/CnRegisterMapping/CnRegisterMapping.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const TYPES = ['client', 'contact', 'lead', 'ticket', 'request', 'product'].map((slug) => ({ slug, label: slug[0].toUpperCase() + slug.slice(1) }))

const GROUPS = [
	{ name: 'Pipelinq objects', registerConfigKey: 'register', types: TYPES },
	{ name: 'Point of sale', registerConfigKey: 'register', types: [{ slug: 'order', label: 'Order' }, { slug: 'till', label: 'Till' }] },
	{ name: 'Projects', registerConfigKey: 'register', types: [{ slug: 'project', label: 'Project' }] },
	{ name: 'Marketing', registerConfigKey: 'register', types: [{ slug: 'campaign', label: 'Campaign' }, { slug: 'segment', label: 'Segment' }] },
]

const ALL_TYPES_SET = Object.fromEntries(TYPES.map((type, i) => [type.slug + '_schema', String(40 + i)]))

/**
 * A fetch that answers the register list and one register's schemas.
 *
 * @return {jest.Mock}
 */
function mockFetch() {
	return jest.fn((url) => {
		if (url.includes('/registers/18/schemas')) {
			const schemas = TYPES.map((type, i) => ({ id: 40 + i, title: type.label }))
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: schemas, total: schemas.length }) })
		}
		return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ id: 18, title: 'Pipelinq', schemas: [40, 41] }, { id: 19, title: 'Portal', schemas: [90] }] }) })
	})
}

/**
 * @param {object} props Extra props.
 * @param {string} look The provided look.
 * @return {Promise<object>} The wrapper once the registers loaded.
 */
async function make(props = {}, look = 'board') {
	global.fetch = mockFetch()
	const wrapper = mount(CnRegisterMapping, {
		props: {
			groups: GROUPS,
			configuration: { register: '18', ...ALL_TYPES_SET, order_schema: '40', campaign_schema: '41' },
			...props,
		},
		global: {
			provide: { cnLook: look },
			stubs: { NcSelect: true, NcNoteCard: { template: '<div class="note"><slot /></div>' } },
		},
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnRegisterMapping board look', () => {
	it('opens the first group as a type and schema table with a status chip', async () => {
		const wrapper = await make()
		const group = wrapper.find('[data-testid="cn-register-mapping-board-group"]')
		expect(group.find('h3').text()).toBe('Pipelinq objects')
		expect(wrapper.find('[data-testid="cn-register-mapping-board-status"]').text()).toBe('All types set up')
		expect(group.findAll('th').map((th) => th.text())).toEqual(['Object type', 'Schema'])
		const rows = wrapper.findAll('[data-testid="cn-register-mapping-board-row"]')
		expect(rows).toHaveLength(4)
		expect(rows[0].text()).toContain('Client')
		expect(rows[0].find('.cn-register-mapping__board-check').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-register-mapping-group-toggle"]').exists()).toBe(false)
	})

	it('counts the types below the row limit and lists them on request', async () => {
		const wrapper = await make()
		expect(wrapper.find('[data-testid="cn-register-mapping-board-more"]').text()).toContain('And 2 more types in this group, all set up.')
		await wrapper.find('.cn-register-mapping__board-link').trigger('click')
		expect(wrapper.findAll('[data-testid="cn-register-mapping-board-row"]')).toHaveLength(6)
		expect(wrapper.find('[data-testid="cn-register-mapping-board-more"]').exists()).toBe(false)
	})

	it('draws the other groups as rows with their type count and status', async () => {
		const wrapper = await make()
		const rows = wrapper.findAll('[data-testid="cn-register-mapping-board-group-row"]')
		const cells = (row) => [row.find('strong').text(), row.find('.cn-register-mapping__board-group-count').text(), row.find('.cn-status-badge').text()]
		expect(rows.map(cells)).toEqual([
			['Point of sale', '2 types', '1 of 2 set up'],
			['Projects', '1 type', 'Not set'],
			['Marketing', '2 types', '1 of 2 set up'],
		])
	})

	it('opens a group from its row', async () => {
		const wrapper = await make()
		await wrapper.findAll('[data-testid="cn-register-mapping-board-group-row"]')[1].trigger('click')
		expect(wrapper.find('[data-testid="cn-register-mapping-board-group"] h3').text()).toBe('Projects')
		expect(wrapper.find('[data-testid="cn-register-mapping-board-status"]').text()).toBe('Not set')
		expect(wrapper.findAll('[data-testid="cn-register-mapping-board-group-row"]').map((row) => row.find('strong').text()))
			.toEqual(['Pipelinq objects', 'Point of sale', 'Marketing'])
	})

	it('saves from the end of the section, not the header', async () => {
		const wrapper = await make()
		expect(wrapper.find('.cn-settings-section__actions').exists()).toBe(false)
		const save = wrapper.find('[data-testid="cn-register-mapping-board-save"]')
		expect(save.text()).toBe('Save configuration')
	})

	it('keeps the default look without the board', async () => {
		const wrapper = await make({}, 'nextcloud')
		expect(wrapper.find('[data-testid="cn-register-mapping-board"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-register-mapping-group-toggle"]')).toHaveLength(4)
		expect(wrapper.find('.cn-settings-section__actions').text()).toContain('Save configuration')
	})
})

describe('CnRegisterMapping fetch', () => {
	it('lists registers without their schemas and fetches the mapped register only', async () => {
		const wrapper = await make({}, 'nextcloud')
		const urls = global.fetch.mock.calls.map(([url]) => url)
		expect(urls.some((url) => url.includes('_extend'))).toBe(false)
		expect(urls.filter((url) => url.endsWith('/apps/openregister/api/registers'))).toHaveLength(1)
		expect(urls.filter((url) => url.includes('/registers/18/schemas'))).toHaveLength(1)
		expect(urls.some((url) => url.includes('/registers/19'))).toBe(false)
		expect(wrapper.vm.schemaSelectOptions(0).map((o) => o.label)).toContain('Client')
	})

	it('fetches a mapped register that arrives with a later configuration', async () => {
		const wrapper = await make({ configuration: {} }, 'nextcloud')
		expect(global.fetch.mock.calls.some(([url]) => url.includes('/schemas'))).toBe(false)
		await wrapper.setProps({ configuration: { register: '18' } })
		await flush()
		expect(global.fetch.mock.calls.filter(([url]) => url.includes('/registers/18/schemas'))).toHaveLength(1)
	})

	it('falls back to the expanded register where the schemas route is missing', async () => {
		global.fetch = jest.fn((url) => {
			if (url.includes('/registers/18/schemas')) {
				return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
			}
			if (url.includes('/registers/18?')) {
				return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 18, schemas: [{ id: 40, title: 'Client' }] }) })
			}
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ id: 18, title: 'Pipelinq' }] }) })
		})
		const wrapper = mount(CnRegisterMapping, {
			props: { groups: [GROUPS[0]], configuration: { register: '18' } },
			global: { stubs: { NcSelect: true, NcNoteCard: true } },
		})
		await flush()
		await flush()
		expect(wrapper.vm.schemaSelectOptions(0)).toEqual([{ label: 'Client', value: '40' }])
	})
})
