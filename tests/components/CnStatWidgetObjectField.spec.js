/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget — `content.objectField`, the third source mode.
 *
 * The other two ask a server "how many". This one reads a field off the record
 * the detail page has already loaded, so a KPI row can headline a case's type
 * beside its counts without a request. The behaviours worth pinning are that it
 * issues no fetch, that a reference uuid resolves to a label, and that an
 * unresolvable one shows the raw value rather than blanking.
 */
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

/**
 * Let every queued microtask and the store's fetch settle.
 *
 * @return {Promise<void>} Resolves once the queue is drained.
 */
async function flush() {
	// The chain is watcher -> resolveReference -> fetchObject -> response.json()
	// -> set label -> re-render, which is several microtask ticks deep. Drain
	// rather than guess a fixed number.
	for (let i = 0; i < 10; i++) {
		await Promise.resolve()
		await nextTick()
	}
}

function mountTile(content, record, provide = {}) {
	return mount(CnStatWidget, {
		props: { content },
		global: {
			provide: {
				cnObjectContext: ref({ objectId: 'obj-1', object: record, register: 'dossiq', schema: 'case' }),
				...provide,
			},
		},
	})
}

describe('CnStatWidget — objectField mode', () => {
	it('renders a scalar field off the bound record', () => {
		const w = mountTile(
			{ label: 'Priority', objectField: 'priority' },
			{ priority: 'High' },
		)
		expect(w.text()).toContain('High')
	})

	it('accepts the shorthand string form', () => {
		const w = mountTile({ objectField: 'status' }, { status: 'In behandeling' })
		expect(w.text()).toContain('In behandeling')
	})

	it('accepts the object form', () => {
		const w = mountTile({ objectField: { field: 'status' } }, { status: 'Ontvangen' })
		expect(w.text()).toContain('Ontvangen')
	})

	it('renders a non-numeric value as text rather than NaN', () => {
		// formatMetricValue returns String(value) for anything non-finite, which
		// is what lets a KPI tile carry a name instead of a count.
		const w = mountTile({ objectField: 'title' }, { title: 'Bezwaar 2026-0042' })
		expect(w.text()).toContain('Bezwaar 2026-0042')
		expect(w.text()).not.toContain('NaN')
	})

	it('still formats a numeric field', () => {
		const w = mountTile({ objectField: 'extensionCount' }, { extensionCount: 2 })
		expect(w.text()).toContain('2')
	})

	it('renders a dash for an unset field', () => {
		const w = mountTile({ objectField: 'deadline' }, { deadline: null })
		expect(w.text()).toContain('—')
	})

	it('renders a dash when the record has not arrived yet', () => {
		// The record is null for the first frames of a detail page.
		const w = mountTile({ objectField: 'title' }, null)
		expect(w.text()).toContain('—')
	})

	it('reads a nested field by dot path', () => {
		const w = mountTile({ objectField: '@self.owner' }, { '@self': { owner: 'admin' } })
		expect(w.text()).toContain('admin')
	})

	describe('a field holding a reference', () => {
		it('shows the raw uuid when no resolve target is configured', async () => {
			// Without register+schema there is nothing to look the label up in, and
			// guessing that a string looks like a uuid would turn a legitimate
			// identifier into a failed fetch.
			const w = mountTile({ objectField: 'caseType' }, { caseType: 'uuid-1' })
			await nextTick()
			expect(w.text()).toContain('uuid-1')
		})

		it('resolves the uuid to the referenced object\u2019s label', async () => {
			const spy = jest.spyOn(global, 'fetch').mockResolvedValue({
				ok: true,
				json: async () => ({ id: 'uuid-1', title: 'Bezwaarschrift' }),
			})
			const w = mountTile(
				{ objectField: { field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType' } } },
				{ caseType: 'uuid-1' },
			)
			await flush()

			expect(w.text()).toContain('Bezwaarschrift')
			expect(w.text()).not.toContain('uuid-1')
			spy.mockRestore()
		})

		it('falls back to the raw uuid when the lookup fails', async () => {
			// An unresolvable reference shows the id rather than blanking, the
			// same way CnFkResolveCell does. A blank KPI says nothing at all.
			const spy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('nope'))
			const w = mountTile(
				{ objectField: { field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType' } } },
				{ caseType: 'uuid-1' },
			)
			await flush()

			expect(w.text()).toContain('uuid-1')
			spy.mockRestore()
		})
	})

	it('issues no aggregation request in objectField mode', async () => {
		// The record is already loaded. A tile that aggregated as well would be
		// paying a round trip for what the page has in hand.
		const spy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) })
		mountTile({ objectField: 'priority' }, { priority: 'Low' })
		await flush()

		const aggregations = spy.mock.calls.filter(([url]) => String(url).includes('/aggregations/'))
		expect(aggregations).toHaveLength(0)
		spy.mockRestore()
	})
})
