// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Tests for CnRegisterSchemaSelect — paired Register + Schema dropdowns that
 * self-fetch the OpenRegister register list and scope the schema picker to the
 * chosen register. Vue 2 `.sync`-style: emits update:register / update:schema.
 */
import { shallowMount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn().mockResolvedValue({
			data: {
				results: [
					{ slug: 'crm', title: 'CRM', schemas: [{ slug: 'contact', title: 'Contact' }, { slug: 'lead', title: 'Lead' }] },
					{ slug: 'hr', title: 'HR', schemas: [{ slug: 'employee', title: 'Employee' }] },
				],
			},
		}),
	},
}))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => p }))

const CnRegisterSchemaSelect = require('../../src/components/CnRegisterSchemaSelect/CnRegisterSchemaSelect.vue').default

// Let the dynamic import()s in mounted()->fetchRegisters() resolve.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function factory(propsData = {}) {
	return shallowMount(CnRegisterSchemaSelect, { propsData, mocks: { t: (app, str) => str } })
}

describe('CnRegisterSchemaSelect', () => {
	it('fetches registers and maps them to { id, label } options', async () => {
		const w = factory()
		await flush()
		expect(w.vm.registerOptions).toEqual([{ id: 'crm', label: 'CRM' }, { id: 'hr', label: 'HR' }])
	})

	it('scopes schema options to the selected register', async () => {
		const w = factory({ register: 'crm' })
		await flush()
		expect(w.vm.schemaOptions.map((o) => o.id)).toEqual(['contact', 'lead'])
	})

	it('emits update:register and clears the schema when the register changes', async () => {
		const w = factory({ register: 'crm', schema: 'contact' })
		await flush()
		w.vm.onRegister({ id: 'hr' })
		expect(w.emitted('update:register')[0]).toEqual(['hr'])
		expect(w.emitted('update:schema')[0]).toEqual([''])
	})

	it('emits update:schema on schema select', async () => {
		const w = factory({ register: 'crm' })
		await flush()
		w.vm.onSchema({ id: 'lead' })
		expect(w.emitted('update:schema')[0]).toEqual(['lead'])
	})

	it('falls back to a bare option for an unknown current slug', async () => {
		const w = factory({ register: 'zzz' })
		await flush()
		expect(w.vm.registerOption).toEqual({ id: 'zzz', label: 'zzz' })
	})
})
