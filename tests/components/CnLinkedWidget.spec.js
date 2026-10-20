/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkedWidget: one card for what other apps hold for a record (DqZaak
 * "Gekoppeld"). Each leaf runs out of sight and reports a summary; the card
 * draws the linked rows, one "...: nothing linked" line for the rest and the
 * actions of the empty leaves.
 *
 * @spec openspec/changes/linked-integrations-card/specs/linked-integrations-card/spec.md#requirement-one-card-lists-the-linked-integrations-of-a-record
 */
import { mount } from '@vue/test-utils'
import CnLinkedWidget from '../../src/components/CnLinkedWidget/CnLinkedWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { integrations } from '../../src/integrations/registry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnLinkedWidget/index.js'

/**
 * Register a mount-mode leaf that records what it was handed.
 *
 * @param {string} id The integration id.
 * @return {Array<object>} The props of every mount.
 */
function registerLeaf(id) {
	const mounts = []
	integrations.register({
		id,
		label: id,
		requiredApp: null,
		renderMode: 'mount',
		mount: (el, props) => {
			mounts.push(props)
		},
		unmount: () => {},
	})
	return mounts
}

/**
 * Mount the card on a case.
 *
 * @param {string[]} leaves The configured leaf ids.
 * @return {object} The wrapper.
 */
function mountCard(leaves) {
	return mount(CnLinkedWidget, {
		props: { content: { leaves }, objectId: 'case-1', register: 'dossiq', schema: 'case' },
		global: { stubs: { CnIcon: true } },
	})
}

describe('CnLinkedWidget', () => {
	afterEach(() => integrations.__resetForTests())

	it('is a content-only `linked` widget type, so the page draws its titled card', () => {
		expect(getWidgetTypeEntry('linked').renderer).toBe(CnLinkedWidget)
		expect(isContentOnlyWidgetDef({ type: 'linked' })).toBe(true)
	})

	it('mounts every configured leaf with the record and an onSummary callback, in order', () => {
		const fees = registerLeaf('fees')
		const projects = registerLeaf('projects')
		mountCard(['projects', 'absent', 'fees'])

		expect(projects[0]).toMatchObject({ surface: 'detail-page', register: 'dossiq', schema: 'case', objectId: 'case-1' })
		expect(typeof projects[0].onSummary).toBe('function')
		expect(typeof fees[0].onSummary).toBe('function')
	})

	it('draws the rows of linked leaves and one line plus the actions for the rest', async () => {
		const documents = registerLeaf('documents')
		const fees = registerLeaf('fees')
		const contract = registerLeaf('contract')
		const projects = registerLeaf('projects')
		const wrapper = mountCard(['documents', 'fees', 'contract', 'projects'])
		const run = jest.fn()

		documents[0].onSummary({ count: 3, noun: 'documenten', rows: [{ label: 'Dossier "Fietspad Lindelaan" (3 stukken)', href: '/f/1', icon: 'Folder' }] })
		fees[0].onSummary({ count: 0, noun: 'leges en betalingen' })
		contract[0].onSummary({ count: 0, noun: 'contract' })
		projects[0].onSummary({ count: 0, noun: 'projecten', actions: [{ label: 'Nieuw project', run }, { label: 'Openen in planninq', run }] })
		await wrapper.vm.$nextTick()

		const rows = wrapper.findAll('[data-testid="cn-linked-row"]')
		expect(rows.map((r) => r.text())).toEqual(['Dossier "Fietspad Lindelaan" (3 stukken)'])
		expect(rows[0].find('a').attributes('href')).toBe('/f/1')
		expect(wrapper.find('[data-testid="cn-linked-empty"]').text()).toBe('Leges en betalingen, contract, and projecten: nothing linked')
		const actions = wrapper.findAll('[data-testid="cn-linked-action"]')
		expect(actions.map((a) => a.text())).toEqual(['Nieuw project', 'Openen in planninq'])
		await actions[1].trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
	})

	it('falls back to a noun and count row for a linked leaf without rows', async () => {
		const projects = registerLeaf('projects')
		const wrapper = mountCard(['projects'])

		projects[0].onSummary({ count: 2, noun: 'projecten', actions: [{ label: 'Nieuw project', run: () => {} }] })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-linked-row"]').text()).toBe('projecten (2)')
		expect(wrapper.find('[data-testid="cn-linked-empty"]').exists()).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-linked-action"]')).toHaveLength(0)
	})

	it('draws nothing for a leaf that has not reported yet', () => {
		registerLeaf('projects')
		const wrapper = mountCard(['projects'])

		expect(wrapper.find('[data-testid="cn-linked-row"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-linked-empty"]').exists()).toBe(false)
	})
})
