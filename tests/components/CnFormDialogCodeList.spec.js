/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-options-from-concept-scheme/tasks.md#task-2
 * @spec openspec/changes/form-options-from-concept-scheme/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))
jest.mock('@nextcloud/l10n', () => ({
	translate: (_a, s, v) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => v[k]) : s),
	getLanguage: () => 'nl',
	getLocale: () => 'nl',
	translatePlural: (_a, s) => s,
	getCanonicalLocale: () => 'nl',
	isRTL: () => false,
}))

const OPTIONS = { scheme: 'woo-categorieen', results: [{ value: 'https://x/klachten', label: 'Klachten' }, { value: 'https://x/besluiten', label: 'Besluiten' }] }

const schema = {
	id: 7,
	title: 'Publication',
	properties: {
		categorie: { type: 'string', conceptScheme: 'woo-categorieen' },
		zaaktype: { type: 'string' },
		themas: { type: 'array', items: { 'x-openregister-concepts': { scheme: 's' } } },
	},
}

function mountForm(item = null, sch = schema) {
	return shallowMount(CnFormDialog, { propsData: { schema: sch, item }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnFormDialog coded fields', () => {
	beforeEach(() => axios.get.mockReset())

	it('requests the options with schema, property and language and keeps their order', async () => {
		axios.get.mockResolvedValue({ data: OPTIONS })
		const w = mountForm()
		await tick()
		await tick()
		const call = axios.get.mock.calls.find(([u]) => u.includes('/vocabulary/options') && u.length)
		const first = axios.get.mock.calls.find(([, c]) => c && c.params && c.params.property === 'categorie')
		expect(call).toBeTruthy()
		expect(first[0]).toBe('/apps/openregister/api/vocabulary/options')
		expect(first[1].params).toEqual({ schema: '7', property: 'categorie', language: 'nl' })
		const field = w.vm.resolvedFields.find((f) => f.key === 'categorie')
		expect(w.vm.getEffectiveOptions(field).map((o) => o.label)).toEqual(['Klachten', 'Besluiten'])
	})

	it('stores the option value as a plain string, and an array of strings for several', async () => {
		axios.get.mockResolvedValue({ data: OPTIONS })
		const w = mountForm()
		await tick()
		const single = w.vm.resolvedFields.find((f) => f.key === 'categorie')
		w.vm.onEffectiveSelectChange(single, { id: 'https://x/klachten', label: 'Klachten' })
		expect(w.vm.formData.categorie).toBe('https://x/klachten')
		const multi = w.vm.resolvedFields.find((f) => f.key === 'themas')
		w.vm.onEffectiveMultiSelectChange(multi, [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }])
		expect(w.vm.formData.themas).toEqual(['a', 'b'])
	})

	it('falls back to a text input when the options cannot be loaded', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const w = mountForm()
		await tick()
		await tick()
		expect(w.vm.codedFailed.categorie).toBe(true)
		expect(w.html()).toContain('could not be loaded')
	})

	it('shows a retired value by its label with "no longer offered"', async () => {
		axios.get.mockImplementation((url) => Promise.resolve({
			data: url.includes('/options') ? OPTIONS : { label: 'Oude categorie' },
		}))
		const w = mountForm({ id: 'r1', categorie: 'https://x/oud' })
		await tick()
		await tick()
		await tick()
		const field = w.vm.resolvedFields.find((f) => f.key === 'categorie')
		expect(w.vm.getEffectiveSelectedOption(field).label).toBe('Oude categorie (no longer offered)')
		expect(w.vm.formData.categorie).toBe('https://x/oud')
	})

	it('asks again with context when the field it depends on changes, and keeps the chosen value', async () => {
		axios.get.mockResolvedValue({ data: OPTIONS })
		const bound = { id: 7, properties: { zaaktype: { type: 'string' }, categorie: { type: 'string', 'x-openregister-concepts': { scheme: 's', contextProperty: 'zaaktype' } } } }
		const w = mountForm({ id: 'r1', zaaktype: 'Melding', categorie: 'https://x/klachten' }, bound)
		await tick()
		await tick()
		axios.get.mockClear()
		w.vm.updateField('zaaktype', 'Vergunning')
		await tick()
		await tick()
		const call = axios.get.mock.calls.find(([, c]) => c && c.params && c.params.property === 'categorie')
		expect(call[1].params.context).toBe('Vergunning')
		expect(w.vm.formData.categorie).toBe('https://x/klachten')
	})
})
