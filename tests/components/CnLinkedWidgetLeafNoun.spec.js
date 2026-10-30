/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkedWidget: the host names a leaf in its own words. A leaf written as
 * `{ id, noun }` is the registered leaf of that id, and the card puts the
 * host's noun (through the host translate) in the "...: nothing linked" line
 * and the count row instead of the noun the leaf reports (DqZaak "Gekoppeld":
 * "Leges en betalingen, contract en projecten" where the finance leaf calls
 * itself "financial documents").
 *
 * @spec openspec/changes/linked-leaf-noun-from-host/specs/linked-integrations-card/spec.md#requirement-the-host-may-name-a-leaf-in-its-own-words
 */
import { mount } from '@vue/test-utils'
import CnLinkedWidget from '../../src/components/CnLinkedWidget/CnLinkedWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

jest.mock('../../src/utils/boardReferenceColumns.js', () => ({ __esModule: true, fetchReferenceObjects: jest.fn(() => Promise.resolve([])) }))
jest.mock('../../src/utils/appInstalled.js', () => ({ __esModule: true, isAppInstalled: jest.fn(() => true) }))

/**
 * Register a mount-mode leaf that records what it was handed.
 *
 * @param {string} id The integration id.
 * @return {Array<object>} The props of every mount.
 */
function registerLeaf(id) {
	const mounts = []
	integrations.register({ id, label: id, requiredApp: null, renderMode: 'mount', mount: (el, props) => mounts.push(props), unmount: () => {} })
	return mounts
}

/**
 * Mount the card on a case with a host translate that marks what it translated.
 *
 * @param {Array<string|object>} leaves The configured leaves.
 * @return {object} The wrapper.
 */
function mountCard(leaves) {
	return mount(CnLinkedWidget, {
		props: { content: { leaves }, objectId: 'case-1', register: 'dossiq', schema: 'case' },
		global: { stubs: { CnIcon: true }, provide: { cnTranslate: (key) => (key === 'fees and payments' ? 'leges en betalingen' : key) } },
	})
}

describe('CnLinkedWidget: a leaf named by the host', () => {
	afterEach(() => integrations.__resetForTests())

	it('mounts the registered leaf of `{ id, noun }` in its place', () => {
		const finance = registerLeaf('finance')
		const contract = registerLeaf('contract')
		mountCard([{ id: 'finance', noun: 'fees and payments' }, 'contract'])

		expect(finance).toHaveLength(1)
		expect(contract).toHaveLength(1)
		expect(typeof finance[0].onSummary).toBe('function')
	})

	it('puts the host\'s translated noun in the nothing-linked line', async () => {
		const finance = registerLeaf('finance')
		const contract = registerLeaf('contract')
		const wrapper = mountCard([{ id: 'finance', noun: 'fees and payments' }, 'contract'])

		finance[0].onSummary({ count: 0, noun: 'financiële documenten' })
		contract[0].onSummary({ count: 0, noun: 'contract' })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-linked-empty"]').text()).toBe('Leges en betalingen and contract: nothing linked')
	})

	it('names the count row with the host\'s noun too', async () => {
		const finance = registerLeaf('finance')
		const wrapper = mountCard([{ id: 'finance', noun: 'fees and payments' }])

		finance[0].onSummary({ count: 2, noun: 'financiële documenten' })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-linked-row"]').text()).toBe('leges en betalingen (2)')
	})

	it('keeps the leaf\'s own noun when the host names none', async () => {
		const finance = registerLeaf('finance')
		const wrapper = mountCard(['finance'])

		finance[0].onSummary({ count: 0, noun: 'financiële documenten' })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-linked-empty"]').text()).toBe('Financiële documenten: nothing linked')
	})
})
