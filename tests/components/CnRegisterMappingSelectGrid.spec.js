/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRegisterMapping with `boardLayout: "selects"` (DqBeheerinstellingen
 * Configuratie): the register select, then one schema select per type in a
 * grid of three, and the save button at the end; no inner group card, status
 * chip or type table.
 *
 * @spec openspec/changes/register-mapping-select-grid/specs/register-mapping-select-grid/spec.md
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

const TYPES = [['case', 'Case schema'], ['case_type', 'Case type schema'], ['status', 'Status schema'], ['role', 'Role schema']]
	.map(([slug, label]) => ({ slug, label }))
const GROUPS = [{ name: 'Configuration', registerConfigKey: 'register', types: TYPES }]

const NcSelect = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel', 'placeholder'],
	emits: ['update:modelValue'],
	template: '<div class="nc-select-stub" :data-label="inputLabel" />',
}

/**
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper once the registers and schemas loaded.
 */
async function make(props = {}) {
	global.fetch = jest.fn((url) => {
		if (url.includes('/registers/18/schemas')) {
			const schemas = TYPES.map((type, i) => ({ id: 40 + i, title: type.label }))
			return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: schemas, total: schemas.length }) })
		}
		return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ id: 18, title: 'dossiq', schemas: [40, 41, 42, 43] }] }) })
	})
	const wrapper = mount(CnRegisterMapping, {
		props: { groups: GROUPS, configuration: { register: '18', case_schema: '40' }, look: 'board', ...props },
		global: { stubs: { NcSelect, NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnRegisterMapping select grid', () => {
	it('draws the register select and a schema select per type in three columns', async () => {
		const wrapper = await make({ boardLayout: 'selects' })
		const grid = wrapper.find('[data-testid="cn-register-mapping-select-grid"]')
		expect(grid.exists()).toBe(true)
		const register = wrapper.find('[data-testid="cn-register-mapping-register"]').findComponent({ name: 'NcSelect' })
		expect(register.props('inputLabel')).toBe('Register')
		const selects = grid.findAllComponents({ name: 'NcSelect' })
		expect(selects.map((select) => select.props('inputLabel'))).toEqual(TYPES.map((type) => type.label))
		expect(grid.attributes('style')).toContain('--cn-register-mapping-columns: 3')
		expect(wrapper.find('[data-testid="cn-register-mapping-board-group"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-register-mapping-board-status"]').exists()).toBe(false)
		expect(wrapper.find('table').exists()).toBe(false)
	})

	it('saves a schema picked in the grid', async () => {
		const wrapper = await make({ boardLayout: 'selects' })
		const save = wrapper.find('[data-testid="cn-register-mapping-board-save"]')
		expect(save.attributes('disabled')).toBeDefined()
		const status = wrapper.find('[data-testid="cn-register-mapping-select-grid"]').findAllComponents({ name: 'NcSelect' })[2]
		status.vm.$emit('update:modelValue', { value: '42', label: 'Status schema' })
		await wrapper.vm.$nextTick()
		expect(save.attributes('disabled')).toBeUndefined()
		await save.trigger('click')
		expect(wrapper.emitted('save')[0][0]).toMatchObject({ register: '18', status_schema: '42' })
	})

	it('keeps the type table without it', async () => {
		const wrapper = await make()
		expect(wrapper.find('[data-testid="cn-register-mapping-select-grid"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-register-mapping-board-group"]').exists()).toBe(true)
	})
})
