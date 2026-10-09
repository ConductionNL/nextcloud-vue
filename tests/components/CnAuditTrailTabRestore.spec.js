/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/audit-trail-restore-version/tasks.md#task-2
 * @spec openspec/changes/audit-trail-restore-version/tasks.md#task-3
 */
import { emit } from '@nextcloud/event-bus'
import { shallowMount } from '@vue/test-utils'
import CnAuditTrailTab from '../../src/components/CnObjectSidebar/CnAuditTrailTab.vue'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const entries = [
	{ id: 9, action: 'update', created: '2026-01-02T10:00:00Z', userName: 'Anna', changed: {} },
	{ id: 8, action: 'delete', created: '2026-01-01T10:00:00Z', userName: 'Anna', changed: {} },
]

async function mountTab(propsData = {}) {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: entries, total: 2 }) })
	const w = shallowMount(CnAuditTrailTab, {
		propsData: { objectId: 'abc', register: 'permits', schema: 'permit', ...propsData },
		stubs: {
			CnConfirmDialog: { methods: { setResult() {} }, template: '<div />' },
			NcButton: { template: '<button class="nc-btn" :disabled="$attrs.disabled"><slot /></button>' },
		},
	})
	await new Promise((resolve) => setTimeout(resolve, 0))
	return w
}

describe('CnAuditTrailTab restore button', () => {
	it('is off by default', async () => {
		const w = await mountTab()
		w.vm.expandedId = 9
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-audit-restore"]').exists()).toBe(false)
	})

	it('shows for an update entry but not a delete entry', async () => {
		const w = await mountTab({ allowRestore: true })
		expect(w.vm.canRestore(entries[0])).toBe(true)
		expect(w.vm.canRestore(entries[1])).toBe(false)
	})

	it('is hidden when the reader cannot update, shown when actions is absent', async () => {
		const noUpdate = await mountTab({ allowRestore: true, objectData: { '@self': { actions: ['read'] } } })
		expect(noUpdate.vm.canRestore(entries[0])).toBe(false)
		const absent = await mountTab({ allowRestore: true, objectData: { '@self': {} } })
		expect(absent.vm.canRestore(entries[0])).toBe(true)
	})

	it('is blocked, naming the holder, when someone else holds the lock', async () => {
		const w = await mountTab({ allowRestore: true, objectData: { '@self': { locked: { user: 'sanne', displayName: 'Sanne' } } } })
		expect(w.vm.restoreBlocked).toBe(true)
		expect(w.vm.restoreLockedLabel).toBe('This record is locked by Sanne.')
		w.vm.askRestore(entries[0])
		expect(w.vm.restoreEntry).toBeNull()
	})
})

describe('CnAuditTrailTab restore flow', () => {
	it('sends the entry id, reloads page one, emits restored and a page refresh', async () => {
		const w = await mountTab({ allowRestore: true })
		w.vm.askRestore(entries[0])
		await w.vm.$nextTick()
		expect(w.vm.restoreMessage).toContain('Anna')
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'abc', status: 'in review' }) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ results: entries, total: 2 }) })
		await w.vm.confirmRestore()
		const [url, init] = global.fetch.mock.calls[0]
		expect(url).toContain('/revert')
		expect(JSON.parse(init.body)).toEqual({ auditTrailId: 9 })
		expect(global.fetch.mock.calls[1][0]).toContain('/audit-trails')
		expect(w.emitted('restored')[0][0]).toEqual({ id: 'abc', status: 'in review' })
		expect(emit).toHaveBeenCalledWith('cn:page:refresh')
	})

	it('refreshes the record and does not emit restored on a 423', async () => {
		const w = await mountTab({ allowRestore: true })
		w.vm.askRestore(entries[0])
		await w.vm.$nextTick()
		emit.mockClear()
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 423, json: async () => ({ '@self': { locked: { displayName: 'Sanne' } } }) })
		await w.vm.confirmRestore()
		expect(w.emitted('restored')).toBeUndefined()
		expect(emit).toHaveBeenCalledWith('cn:page:refresh')
	})
})
