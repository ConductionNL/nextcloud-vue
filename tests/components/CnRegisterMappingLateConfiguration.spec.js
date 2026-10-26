/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An app reads its settings after the mapping mounted (dossiq's admin page):
 * the configuration arrives while the registers are still loading. The mapped
 * register's schemas must still be read, or every schema select stays empty
 * under "No schemas available in this register" (r31 DqBeheerinstellingen).
 *
 * @spec openspec/changes/register-mapping-late-configuration/specs/register-mapping/spec.md
 */
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, k) => String((params || {})[k] ?? `{${k}}`)),
	translatePlural: (app, one, many, count) => (count === 1 ? one : many).replace('%n', String(count)),
}))

const { mount } = require('@vue/test-utils')
const CnRegisterMapping = require('../../src/components/CnRegisterMapping/CnRegisterMapping.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const GROUPS = [{ name: 'Configuration', registerConfigKey: 'register', types: [{ slug: 'case', label: 'Case schema' }] }]

describe('CnRegisterMapping with a late configuration', () => {
	it('reads the mapped register schemas once the registers have loaded', async () => {
		let releaseRegisters
		global.fetch = jest.fn((url) => {
			if (url.includes('/registers/23/schemas')) {
				return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ id: 172, title: 'Zaak' }] }) })
			}
			return new Promise((resolve) => {
				releaseRegisters = () => resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [{ id: 23, title: 'dossiq', schemas: [172] }] }) })
			})
		})
		const wrapper = mount(CnRegisterMapping, {
			props: { groups: GROUPS, configuration: {}, look: 'board', boardLayout: 'selects' },
			global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } } },
		})
		await flush()
		await wrapper.setProps({ configuration: { register: '23', case_schema: '172' } })
		releaseRegisters()
		await flush()
		await flush()
		await flush()

		expect(global.fetch.mock.calls.some(([url]) => url.includes('/registers/23/schemas'))).toBe(true)
		expect(wrapper.vm.schemaSelectOptions(0)).toEqual([{ label: 'Zaak', value: '172' }])
	})
})
