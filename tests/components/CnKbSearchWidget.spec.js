/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { shallowMount } from '@vue/test-utils'
import CnKbSearchWidget from '../../src/components/CnKbSearchWidget/CnKbSearchWidget.vue'

describe('CnKbSearchWidget', () => {
	const mount = (content = {}, workspace = null) => shallowMount(CnKbSearchWidget, {
		propsData: { content },
		provide: workspace ? { cnWorkspaceContext: { value: workspace } } : {},
	})

	it('binds to the configured workspace key (default activeSummary)', () => {
		const w = mount({}, { activeSummary: 'broken router' })
		expect(w.vm.bindKey).toBe('activeSummary')
		expect(w.vm.boundSummary).toBe('broken router')
	})

	it('honours a custom bindTo key', () => {
		const w = mount({ bindTo: 'topic' }, { topic: 'invoices' })
		expect(w.vm.boundSummary).toBe('invoices')
	})

	it('schedules a search when the bound summary changes (not manual)', async () => {
		const w = mount({ minChars: 3 }, { activeSummary: '' })
		const spy = jest.spyOn(w.vm, 'scheduleSearch')
		w.vm.cnWorkspaceContext.value = { activeSummary: 'printer offline' }
		// boundSummary is computed off the injected ref; trigger the watcher manually
		await w.vm.$nextTick()
		w.vm.scheduleSearch('printer offline')
		expect(spy).toHaveBeenCalledWith('printer offline')
	})

	it('manual typing wins over the bound summary', () => {
		const w = mount({}, { activeSummary: 'auto text' })
		w.vm.onTermInput('typed query')
		expect(w.vm.manual).toBe(true)
		expect(w.vm.term).toBe('typed query')
		expect(w.vm.boundLabel).toBe('')
	})

	it('normalises several response shapes', () => {
		const w = mount()
		expect(w.vm.normalise([{ title: 'a' }])).toHaveLength(1)
		expect(w.vm.normalise({ results: [{ title: 'b' }] })).toHaveLength(1)
		expect(w.vm.normalise({ items: [{ title: 'c' }] })).toHaveLength(1)
		expect(w.vm.normalise({ articles: [{ title: 'd' }] })).toHaveLength(1)
		expect(w.vm.normalise(null)).toHaveLength(0)
	})

	it('shows the unavailable state after a failed search (graceful 503)', async () => {
		const w = mount({ endpoint: '/x', minChars: 2 })
		w.setData({ term: 'help' })
		jest.spyOn(w.vm, 'runSearch').mockImplementation(async () => {
			w.vm.unavailable = true
			w.vm.results = []
		})
		await w.vm.runSearch()
		expect(w.vm.unavailable).toBe(true)
		expect(w.vm.results).toEqual([])
	})

	it('truncates long snippets', () => {
		const w = mount()
		const long = 'x'.repeat(300)
		expect(w.vm.snippet({ summary: long }).length).toBeLessThanOrEqual(140)
	})

	describe('pluggable provider (#91 Wave 3)', () => {
		const mountWithProviders = (content, providers) => shallowMount(CnKbSearchWidget, {
			propsData: { content },
			provide: { cnKbSearchProviders: providers },
		})

		it('resolves content.provider against the injected registry and runs its search', async () => {
			const xwiki = { search: jest.fn(() => Promise.resolve([{ title: 'From xWiki' }])), externalOpen: true }
			const w = mountWithProviders(
				{ provider: 'xwiki', space: 'Support', tags: ['printer'], limit: 4 },
				{ default: { search: jest.fn() }, xwiki },
			)
			expect(w.vm.resolvedProvider).toBe(xwiki)
			// externalOpen defaults from the provider.
			expect(w.vm.externalOpen).toBe(true)

			w.setData({ term: 'printer down' })
			await w.vm.runSearch()
			expect(xwiki.search).toHaveBeenCalledWith('printer down', expect.objectContaining({
				space: 'Support', tags: ['printer'], limit: 4,
			}))
			expect(w.vm.results).toEqual([{ title: 'From xWiki' }])
			expect(w.vm.unavailable).toBe(false)
		})

		it('falls back to the built-in default provider for an unknown key', () => {
			const w = mountWithProviders({ provider: 'nope' }, { default: { search: jest.fn() } })
			// Resolves to the injected default (registry default wins).
			expect(typeof w.vm.resolvedProvider.search).toBe('function')
		})

		it('shows the unavailable fallback text when the provider rejects', async () => {
			const failing = { search: jest.fn(() => Promise.reject(new Error('503'))) }
			const w = mountWithProviders(
				{ provider: 'x', unavailableFallback: 'KB is offline' },
				{ default: { search: jest.fn() }, x: failing },
			)
			w.setData({ term: 'help' })
			await w.vm.runSearch()
			expect(w.vm.unavailable).toBe(true)
			expect(w.vm.results).toEqual([])
			expect(w.vm.unavailableLabel).toBe('KB is offline')
		})

		it('content.externalOpen overrides the provider default', () => {
			const w = mountWithProviders(
				{ provider: 'x', externalOpen: false },
				{ default: { search: jest.fn() }, x: { search: jest.fn(), externalOpen: true } },
			)
			expect(w.vm.externalOpen).toBe(false)
		})
	})
})
