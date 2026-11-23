/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnObjectPermissionsTab renders OpenRegister's answer: one row per rule, a
 * named list of the sources it could not read, the refusal sentence on a 403,
 * a labelled history date input, and the field-rules section only when the
 * manifest says where the rules are declared. It is a built-in sidebar widget.
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnObjectPermissionsTab from '../CnObjectPermissionsTab.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/index.php${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Answer axios.get per URL suffix.
 *
 * @param {object} table Map of URL suffix to `{status?, data}` or an Error.
 */
function answer(table) {
	axios.get.mockImplementation((url) => {
		const key = Object.keys(table).find((k) => url.endsWith(k))
		const value = key ? table[key] : null
		if (value instanceof Error) {
			return Promise.reject(value)
		}
		if (value === null) {
			const error = new Error('not found')
			error.response = { status: 404 }
			return Promise.reject(error)
		}
		return Promise.resolve({ status: value.status || 200, data: value.data })
	})
}

async function mountTab(props = {}) {
	const wrapper = mount(CnObjectPermissionsTab, {
		propsData: { objectId: 'obj-1', register: 'reg', schema: 'sch', ...props },
		stubs: { NcLoadingIcon: true },
	})
	await flush()
	await flush()
	await wrapper.vm.$nextTick()
	return wrapper
}

beforeEach(() => {
	axios.get.mockReset()
})

describe('CnObjectPermissionsTab', () => {
	it('renders one row per rule of the object set, a deny as its own row', async () => {
		answer({
			'/obj-1/permissions/history': { data: { changes: [] } },
			'/obj-1/permissions': {
				data: {
					denyEnforcement: 'enforcing',
					holders: [{ rules: [{ principal: 'waarnemers', action: 'read', level: 'schema' }] }],
					denied: [{ principal: 'waarnemers', action: 'read', level: 'object' }],
				},
			},
			'/api/permissions': { data: { permissions: [{ action: 'read', description: 'Open it' }] } },
			'/api/scopes': { data: { user: 'alice', scopes: [{ schema: 'sch', provenance: {} }] } },
		})
		const wrapper = await mountTab()
		const rows = wrapper.findAll('tbody tr')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).toContain('A rule that refuses')
		expect(wrapper.text()).toContain('A refusal below is in force now.')
		expect(wrapper.text()).toContain('Open it')
	})

	it('names every source it could not read instead of drawing an empty list', async () => {
		answer({
			'/obj-1/permissions': null,
			'/api/permissions': new Error('down'),
			'/obj-1/shares': new Error('down'),
			'/compare-roles': new Error('down'),
			'/deny-preview': new Error('down'),
			'/api/scopes': new Error('down'),
		})
		const wrapper = await mountTab()
		const text = wrapper.text()
		expect(text).toContain('This list is incomplete, not empty.')
		expect(text).toContain('the shares on this record')
		expect(text).toContain('the roles')
		expect(text).toContain('the refusals')
		expect(text).toContain('your own rights')
	})

	it('says the reader may not review grants on a 403, without calling it a failed read', async () => {
		const refusal = new Error('forbidden')
		refusal.response = { status: 403 }
		answer({
			'/obj-1/permissions': refusal,
			'/api/permissions': { data: { permissions: [] } },
			'/obj-1/shares': { data: { results: [] } },
			'/compare-roles': { data: { roles: [] } },
			'/deny-preview': { data: { rules: [] } },
			'/api/scopes': { data: { scopes: [{ schema: 'sch' }] } },
		})
		const wrapper = await mountTab()
		expect(wrapper.text()).toContain('You may open this record. You may not review who else can.')
		expect(wrapper.text()).not.toContain('incomplete, not empty')
	})

	it('offers a labelled date for the history only when the object answered', async () => {
		answer({
			'/obj-1/permissions/history': { data: { changes: [], asOf: null } },
			'/obj-1/permissions': { data: { holders: [] } },
			'/api/permissions': { data: {} },
			'/api/scopes': { data: { scopes: [{ schema: 'sch' }] } },
		})
		const wrapper = await mountTab()
		const input = wrapper.find('input[type="date"]')
		expect(input.exists()).toBe(true)
		expect(input.element.closest('label').textContent).toContain('Report the rights as they stood on')

		input.setValue('2019-03-01')
		await input.trigger('change')
		await flush()
		expect(wrapper.text()).toContain('The trail does not reach 2019-03-01')
		expect(axios.get.mock.calls.some(([url, opts]) => url.includes('/permissions/history') && opts.params.at === '2019-03-01T23:59:59')).toBe(true)
	})

	it('names the ancestor of an inherited grant inside a sentence', async () => {
		answer({
			'/obj-1/permissions': null,
			'/obj-1/shares': { data: { results: [{ principal: 'alice', actions: ['read'], inheritedFrom: 'parent-1' }] } },
			'/api/permissions': { data: {} },
			'/compare-roles': { data: { roles: [] } },
			'/deny-preview': { data: { rules: [] } },
			'/api/scopes': { data: { scopes: [{ schema: 'sch' }] } },
		})
		const wrapper = await mountTab()
		expect(wrapper.text()).toContain('Granted on record parent-1, which this one hangs under')
		expect(wrapper.text()).toContain('A grant on a record this one hangs under')
	})

	it('leaves the field rules out unless the manifest says where they are declared', async () => {
		answer({ '/obj-1/permissions': { data: { holders: [] } }, '/api/scopes': { data: { scopes: [] } }, '/api/permissions': { data: {} } })
		const wrapper = await mountTab()
		expect(wrapper.find('.cn-object-permissions-tab__fields').exists()).toBe(false)
		expect(axios.get.mock.calls.some(([url]) => url.endsWith('/objects/reg/sch/obj-1'))).toBe(false)
	})

	it('lists the declared field rules, marking the one OpenRegister applied to the reader', async () => {
		answer({
			'/objects/reg/kind/type-1': { data: { rules: [{ field: 'score', rule: 'hidden', groups: ['handlers'] }] } },
			'/obj-1/permissions': { data: { holders: [] } },
			'/objects/reg/sch/obj-1': { data: { '@self': { fieldRules: { hidden: ['score'] } }, kind: 'type-1' } },
			'/api/scopes': { data: { scopes: [] } },
			'/api/permissions': { data: {} },
		})
		const wrapper = await mountTab({ fieldRules: { typeField: 'kind', typeSchema: 'kind', declarationField: 'rules' } })
		const section = wrapper.find('.cn-object-permissions-tab__fields')
		expect(section.exists()).toBe(true)
		expect(section.text()).toContain('Not shown')
		expect(section.text()).toContain('applies to you')
		expect(section.text()).toContain('handlers do not see this field.')
	})

	it('lets the manifest relabel a source', async () => {
		answer({
			'/obj-1/permissions': { data: { holders: [{ rules: [{ principal: 'p', action: 'read', level: 'group' }] }] } },
			'/api/scopes': { data: { scopes: [] } },
			'/api/permissions': { data: {} },
		})
		const wrapper = await mountTab({ sourceLabels: { group: 'A grant on a group of case types' } })
		expect(wrapper.text()).toContain('A grant on a group of case types')
	})
})

describe('CnObjectSidebar built-in', () => {
	it('resolves the object-permissions widget type', () => {
		const fs = require('fs')
		const path = require('path')
		const source = fs.readFileSync(path.resolve(__dirname, '../../CnObjectSidebar/CnObjectSidebar.vue'), 'utf8')
		expect(source).toMatch(/'object-permissions': CnObjectPermissionsTab/)
	})
})
