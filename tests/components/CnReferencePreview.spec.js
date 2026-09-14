/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnReferencePreview: a reference shows what it points at.
 *
 * The request count is the load-bearing assertion. A cache that stores the
 * settled value and not the in-flight promise looks identical in every other
 * respect and still makes forty requests on a mouse sweep, because a sweep
 * starts all forty before any of them answers.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnReferencePreview from '../../src/components/CnReferencePreview/CnReferencePreview.vue'
import { clearReferenceCache, peekReference, referenceKey, summaryLines } from '../../src/components/CnReferencePreview/referenceCache.js'

const RECORD = { id: 'case-9', title: 'Vergunning Kerkstraat', status: 'In behandeling' }

/**
 * Mount a reference to `case-9`.
 *
 * @param {object} [props] Props to merge in.
 * @return {object} The wrapper.
 */
function mountReference(props = {}) {
	return shallowMount(CnReferencePreview, {
		props: {
			recordId: 'case-9',
			label: 'ZAAK-9',
			register: 'zaken',
			schema: 'case',
			fetchRecord: jest.fn().mockResolvedValue(RECORD),
			openDelay: 0,
			closeDelay: 0,
			...props,
		},
		global: { stubs: { teleport: true, NcPopover: { template: '<div><slot name="trigger" /><slot /></div>' } } },
	})
}

/**
 * Open the card and let the load settle.
 *
 * The load is a promise chain behind a timer, so a single `$nextTick` leaves
 * the card still rendering its spinner. Flushing the microtask queue is what
 * makes an assertion about the CARD rather than about the spinner.
 *
 * @param {object} w The wrapper.
 * @return {Promise<void>}
 */
async function openAndSettle(w) {
	w.vm.onShow()
	jest.runAllTimers()
	for (let i = 0; i < 10; i++) {
		await Promise.resolve()
		jest.runAllTimers()
	}
	await w.vm.$nextTick()
}

beforeEach(() => {
	clearReferenceCache()
	jest.useFakeTimers()
})

afterEach(() => {
	jest.useRealTimers()
})

describe('CnReferencePreview — focus, not only hover', () => {
	it('opens on focus, so it exists for a keyboard', async () => {
		const w = mountReference()

		w.find('[data-testid="cn-reference-preview-trigger"]').trigger('focus')
		jest.runAllTimers()
		await w.vm.$nextTick()

		expect(w.vm.open).toBe(true)
	})

	it('opens on hover too', async () => {
		const w = mountReference()

		w.find('[data-testid="cn-reference-preview-trigger"]').trigger('mouseenter')
		jest.runAllTimers()
		await w.vm.$nextTick()

		expect(w.vm.open).toBe(true)
	})

	it('closes on escape', async () => {
		const w = mountReference()
		w.vm.onShow()
		jest.runAllTimers()
		await w.vm.$nextTick()

		w.vm.onEscape()

		expect(w.vm.open).toBe(false)
	})

	it('closes on blur', async () => {
		const w = mountReference()
		w.vm.onShow()
		jest.runAllTimers()
		await w.vm.$nextTick()

		w.find('[data-testid="cn-reference-preview-trigger"]').trigger('blur')
		jest.runAllTimers()
		await w.vm.$nextTick()

		expect(w.vm.open).toBe(false)
	})

	it('never takes focus itself, so it cannot trap it', async () => {
		const w = mountReference()
		w.vm.onShow()
		jest.runAllTimers()
		await w.vm.$nextTick()

		const card = w.find('[data-testid="cn-reference-preview-card"]')

		expect(card.attributes('tabindex')).toBeUndefined()
		expect(card.element.querySelectorAll('[tabindex], button, a, input')).toHaveLength(0)
	})

	it('waits out a pointer that was only crossing the reference', async () => {
		const w = mountReference({ openDelay: 250 })

		w.vm.onShow()
		w.vm.onHide()
		jest.runAllTimers()
		await w.vm.$nextTick()

		expect(w.vm.open).toBe(false)
	})

	it('tells a screen reader the card is a summary, and of what', async () => {
		const w = mountReference()
		await openAndSettle(w)

		expect(w.find('[data-testid="cn-reference-preview-card"]').attributes('aria-label'))
			.toContain('Vergunning Kerkstraat')
	})

	it('points the trigger at the card it describes', async () => {
		const w = mountReference()
		w.vm.onShow()
		jest.runAllTimers()
		await w.vm.$nextTick()

		const trigger = w.find('[data-testid="cn-reference-preview-trigger"]')

		expect(trigger.attributes('aria-expanded')).toBe('true')
		expect(trigger.attributes('aria-describedby')).toBe(w.find('[data-testid="cn-reference-preview-card"]').attributes('id'))
	})
})

describe('CnReferencePreview — forty references, not forty requests', () => {
	it('asks once for a record even when every reference to it opens at once', async () => {
		// The mouse sweep: all of them start before any of them answers.
		const fetchRecord = jest.fn(() => new Promise((resolve) => setTimeout(() => resolve(RECORD), 10)))
		const references = Array.from({ length: 40 }, () => mountReference({ fetchRecord }))

		references.forEach((w) => w.vm.onShow())
		jest.runAllTimers()
		await Promise.resolve()
		await Promise.resolve()

		expect(fetchRecord).toHaveBeenCalledTimes(1)
	})

	it('asks once per distinct record, not once per reference', async () => {
		const fetchRecord = jest.fn().mockResolvedValue(RECORD)
		const ids = ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b']
		const references = ids.map((id) => mountReference({ recordId: id, fetchRecord }))

		references.forEach((w) => w.vm.onShow())
		jest.runAllTimers()
		await Promise.resolve()
		await Promise.resolve()

		expect(fetchRecord).toHaveBeenCalledTimes(3)
	})

	it('keys the cache by register and schema, so two registers never show each other records', () => {
		expect(referenceKey('zaken', 'case', '1')).not.toBe(referenceKey('documenten', 'case', '1'))
	})

	it('does not ask again after a record came back unreadable', async () => {
		const fetchRecord = jest.fn().mockRejectedValue(new Error('403'))
		const first = mountReference({ fetchRecord })
		first.vm.onShow()
		jest.runAllTimers()
		await Promise.resolve()
		await Promise.resolve()

		const second = mountReference({ fetchRecord })
		second.vm.onShow()
		jest.runAllTimers()
		await Promise.resolve()

		expect(fetchRecord).toHaveBeenCalledTimes(1)
	})
})

describe('CnReferencePreview — a reference you may not read', () => {
	it('renders plainly, with no card and no request', async () => {
		const fetchRecord = jest.fn()
		const w = mountReference({ readable: false, fetchRecord })

		w.vm.onShow()
		jest.runAllTimers()
		await w.vm.$nextTick()

		expect(w.find('[data-testid="cn-reference-preview-plain"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-reference-preview-trigger"]').exists()).toBe(false)
		expect(fetchRecord).not.toHaveBeenCalled()
		expect(w.vm.open).toBe(false)
	})

	it('still reads as the reference it is', () => {
		const w = mountReference({ readable: false })

		expect(w.find('[data-testid="cn-reference-preview-plain"]').text()).toBe('ZAAK-9')
	})

	it('renders plainly when there is no way to load anything at all', () => {
		const w = mountReference({ fetchRecord: null, objectStore: null })

		expect(w.find('[data-testid="cn-reference-preview-plain"]').exists()).toBe(true)
	})

	it('shows the record as absent rather than as an error, which would disclose it exists', async () => {
		const w = mountReference({ fetchRecord: jest.fn().mockResolvedValue(null) })
		await openAndSettle(w)

		expect(w.find('[data-testid="cn-reference-preview-card"]').text()).toContain('This reference has no summary')
	})
})

describe('CnReferencePreview — a glance, not a page', () => {
	it('shows only the fields the caller named, in that order', () => {
		const lines = summaryLines(
			{ title: 'A', status: 'Open', secret: 'nope' },
			['status', 'title'],
		)

		expect(lines.map((l) => l.key)).toEqual(['status', 'title'])
	})

	it('takes a label different from the key', () => {
		expect(summaryLines({ status: 'Open' }, [{ key: 'status', label: 'Stand van zaken' }])[0].label)
			.toBe('Stand van zaken')
	})

	it('reads a dotted path into a nested value', () => {
		expect(summaryLines({ '@self': { owner: 'ruben' } }, ['@self.owner'])[0].value).toBe('ruben')
	})

	it('leaves out a field the record does not carry, rather than an empty row', () => {
		expect(summaryLines({ title: 'A' }, ['title', 'status', 'missing'])).toHaveLength(1)
	})

	it('joins a list into one readable line', () => {
		expect(summaryLines({ tags: ['a', 'b'] }, ['tags'])[0].value).toBe('a, b')
	})

	it.each([[null], [undefined], ['not a record']])('answers %p with no lines', (record) => {
		expect(summaryLines(record, ['title'])).toEqual([])
	})
})

describe('referenceCache', () => {
	it('holds nothing before anything was asked for', () => {
		expect(peekReference(referenceKey('zaken', 'case', 'never'))).toBeUndefined()
	})

	it('holds the record once it settled, so a second hover is instant', async () => {
		const w = mountReference()
		await openAndSettle(w)

		expect(peekReference(referenceKey('zaken', 'case', 'case-9'))).toEqual(RECORD)
	})
})
