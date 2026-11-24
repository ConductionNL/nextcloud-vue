/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/audit-tab-action-labels/specs/audit-trail/spec.md#requirement-the-sidebar-history-tab-words-an-action-by-its-label
 */
import { shallowMount } from '@vue/test-utils'
import CnAuditTrailTab from '../../src/components/CnObjectSidebar/CnAuditTrailTab.vue'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const entries = [
	{ id: 3, action: 'mcp.search', toolId: 'stackiq.module.search', created: '2026-01-03T10:00:00Z', userName: 'Anna', changed: {} },
	{ id: 2, action: 'update', created: '2026-01-02T10:00:00Z', userName: 'Anna', changed: {} },
]

async function mountTab(propsData = {}, provide = {}) {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: entries, total: 2 }) })
	const w = shallowMount(CnAuditTrailTab, {
		propsData: { objectId: 'abc', register: 'catalogue', schema: 'module', ...propsData },
		provide,
		stubs: { CnConfirmDialog: { template: '<div />' } },
	})
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('CnAuditTrailTab action labels', () => {
	it('shows the recorded action without labels', async () => {
		const w = await mountTab()
		expect(w.vm.actionText(entries[0])).toBe('mcp.search')
	})

	it('words an assistant action through a wildcard label with its tool', async () => {
		const w = await mountTab({ actionLabels: { 'mcp.*': 'Assistant: {toolId}' } })
		expect(w.vm.actionText(entries[0])).toBe('Assistant: stackiq.module.search')
		expect(w.vm.actionText(entries[1])).toBe('update')
	})

	it('shows the label in the user\'s language through the app lookup', async () => {
		const cnTranslate = (text) => ({ 'Assistant: {toolId}': 'Assistent: {toolId}' })[text] || text
		const w = await mountTab({ actionLabels: { 'mcp.*': 'Assistant: {toolId}' } }, { cnTranslate })
		expect(w.vm.actionText(entries[0])).toBe('Assistent: stackiq.module.search')
	})

	it('fills the actor', async () => {
		const w = await mountTab({ actionLabels: { update: 'Changed by {actor}' } })
		expect(w.vm.actionText(entries[1])).toBe('Changed by Anna')
	})

	it('passes the words to the row', async () => {
		const w = await mountTab({ actionLabels: { 'mcp.*': 'Assistant: {toolId}' } })
		const rows = w.findAllComponents({ name: 'NcListItem' })
		expect(rows.at(0).props('details') ?? rows.at(0).attributes('details')).toBe('Assistant: stackiq.module.search')
	})
})
