/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-field-property-source/tasks.md#task-2
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

const mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
let mockInstalled = true
jest.mock('../../src/utils/appInstalled.js', () => ({ __esModule: true, isAppInstalled: () => mockInstalled }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

import CnPropertySourceField from '../../src/components/CnPropertySourceField/CnPropertySourceField.vue'

function mount(props = {}) {
	return shallowMount(CnPropertySourceField, {
		props: { provider: 'kvk', debounce: 0, ...props },
	})
}

beforeEach(() => {
	mockGet.mockReset()
	mockInstalled = true
})

describe('CnPropertySourceField', () => {
	it('does not suggest below three characters', async () => {
		const w = mount()
		w.vm.onSearch('En')
		await new Promise((r) => setTimeout(r, 5))
		expect(mockGet).not.toHaveBeenCalled()
	})

	it('suggests from three characters and lists the labels', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ identifier: '24502797', label: 'Eneco Energie B.V.' }] } })
		const w = mount()
		w.vm.onSearch('Enec')
		await new Promise((r) => setTimeout(r, 5))
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/apps/integriq/api/property-sources/kvk/suggest', { params: { q: 'Enec' } })
		expect(w.vm.options[0].label).toBe('Eneco Energie B.V.')
	})

	it('resolves a pick before setting the value and emits resolved', async () => {
		mockGet.mockResolvedValue({ data: { value: { naam: 'Eneco' }, provenance: { provider: 'kvk', readAt: '2026-10-07T10:00:00+02:00', origin: 'cache', cacheAgeSeconds: 600 } } })
		const w = mount()
		await w.vm.onPick({ identifier: '24502797', label: 'Eneco Energie B.V.' })
		expect(mockGet).toHaveBeenCalledWith('/apps/integriq/api/property-sources/kvk/resolve', { params: { identifier: '24502797' } })
		expect(w.emitted('update:modelValue')[0]).toEqual(['24502797'])
		expect(w.emitted('resolved')[0][0].value).toEqual({ naam: 'Eneco' })
		expect(w.vm.provenanceLine).toContain('kvk')
		expect(w.vm.provenanceLine).toContain('From cache')
	})

	it('keeps the identifier but skips resolved when the resolve fails', async () => {
		mockGet.mockRejectedValue({ response: { status: 409 } })
		const w = mount()
		await w.vm.onPick({ identifier: '1', label: 'x' })
		expect(w.emitted('update:modelValue')[0]).toEqual(['1'])
		expect(w.emitted('resolved')).toBeUndefined()
		expect(w.vm.reason).toBe('The source did not answer; type the value.')
	})

	it('falls back to a plain text field without integriq', () => {
		mockInstalled = false
		const w = mount()
		expect(w.vm.plain).toBe(true)
		expect(w.vm.reason).toBe('Registry lookup is not available on this server.')
		w.vm.onPlainInput('123')
		expect(w.emitted('update:modelValue')[0]).toEqual(['123'])
	})

	it('degrades with a reason on 404 and 403 from suggest', async () => {
		mockGet.mockRejectedValueOnce({ response: { status: 404 } })
		const w = mount()
		await w.vm.suggest('abc')
		expect(w.vm.plain).toBe(true)
		expect(w.vm.reason).toContain('kvk')
		mockGet.mockRejectedValueOnce({ response: { status: 403 } })
		const w2 = mount()
		await w2.vm.suggest('abc')
		expect(w2.vm.reason).toBe('You cannot look this up.')
	})
})
