/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * A day of field work with no signal.
 *
 * The question these answer is the one an inspector actually has, standing in
 * a cellar with no bars: does what I am typing survive? So they assert on what
 * is still in IndexedDB after the component that wrote it is gone, rather than
 * on what the component said at the time.
 *
 * Nothing here is ever dropped: not on failure, not on age, not to make a
 * number smaller. A queue that loses a citizen's submission is worse than one
 * that refuses it at the door.
 */

/* eslint-disable perfectionist/sort-imports -- `fake-indexeddb/auto` is a
   POLYFILL and has to run before the module under test imports Dexie. */
import 'fake-indexeddb/auto'

import { mount } from '@vue/test-utils'
import Dexie from 'dexie'
import CnFieldInspectionCard from '../../../src/integrations/builtin/field-inspection/CnFieldInspectionCard.vue'
import {
	__resetDbForTests,
	__setDexie,
	getDb,
	getPlannedItems,
	listQueue,
	resolveDeviceId,
	storePlanning,
} from '../../../src/integrations/offline/offlineDb.js'
/* eslint-enable perfectionist/sort-imports */

const REGISTER = 'dossiq'
const SCHEMA = 'fieldInspection'

const TEMPLATE = {
	id: 'tpl-1',
	items: [
		{ questionId: 'q1', text: 'Is the fire door closed?', type: 'yes_no', required: true },
		{ questionId: 'q2', text: 'Anything else worth recording?', type: 'text', required: false },
	],
}

const PLANNED = { id: 'i-1', caseRef: 'Kerkstraat 4', checklistTemplateRef: 'tpl-1' }

const stubs = {
	CnDetailCard: { template: '<div><slot /></div>' },
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcLoadingIcon: { template: '<span />' },
	NcEmptyContent: { template: '<div />' },
}

/**
 * Force the browser's reported connection state.
 *
 * @param {boolean} online Whether the browser claims a connection.
 * @return {void}
 */
function setOnline(online) {
	Object.defineProperty(window.navigator, 'onLine', { value: online, configurable: true })
}

/**
 * Mount the widget against the fake IndexedDB.
 *
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountCard() {
	const wrapper = mount(CnFieldInspectionCard, {
		props: { register: REGISTER, schema: SCHEMA, objectId: 'case-1' },
		global: { stubs },
	})
	await wrapper.vm.loadLocal()
	await wrapper.vm.$nextTick()
	return wrapper
}

describe('a day of capture with no signal', () => {
	beforeEach(async () => {
		__setDexie(Dexie)
		await getDb().mutationQueue.clear()
		await getDb().objectCache.clear()
		await getDb().meta.clear()
		await storePlanning({
			register: REGISTER,
			schema: SCHEMA,
			items: [PLANNED],
			references: [TEMPLATE],
			referenceSchema: 'inspectionChecklist',
		})
		setOnline(false)
	})

	afterEach(() => {
		setOnline(true)
		__resetDbForTests()
	})

	it('completes a checklist and queues it with the browser reporting no connection', async () => {
		const wrapper = await mountCard()

		expect(wrapper.vm.offline).toBe(true)

		await wrapper.vm.openItem(PLANNED)
		wrapper.vm.answers.q1.answer = 'yes'
		wrapper.vm.answers.q2.answer = 'The cellar hatch was open.'
		await wrapper.vm.saveChecklist()

		const queue = await listQueue(resolveDeviceId())

		expect(queue).toHaveLength(1)
		expect(queue[0].status).toBe('pending')
		// The words, not just the fact of a row. This is the citizen's text.
		expect(JSON.stringify(queue[0].payload)).toContain('The cellar hatch was open.')

		wrapper.unmount()
	})

	it('refuses an incomplete checklist instead of queueing half of it', async () => {
		const wrapper = await mountCard()

		await wrapper.vm.openItem(PLANNED)
		// q1 is required and unanswered.
		await wrapper.vm.saveChecklist()

		expect(wrapper.vm.errors).toHaveLength(1)
		expect(await listQueue(resolveDeviceId())).toHaveLength(0)

		wrapper.unmount()
	})

	it('reports waiting work rather than a fault while offline', async () => {
		const wrapper = await mountCard()

		await wrapper.vm.openItem(PLANNED)
		wrapper.vm.answers.q1.answer = 'no'
		await wrapper.vm.saveChecklist()
		await wrapper.vm.$nextTick()

		// Being out of signal is the normal working state of a field device.
		// Red here every hour of every day is how a palette stops being read,
		// and it is now reserved for work that will not send on its own.
		expect(wrapper.vm.indicator.tone).toBe('warning')
		expect(wrapper.find('[data-testid="cn-fi-sync-indicator"]').text()).toContain('1')

		wrapper.unmount()
	})

	it('loses nothing across a reload that is still offline', async () => {
		const first = await mountCard()
		await first.vm.openItem(PLANNED)
		first.vm.answers.q1.answer = 'yes'
		await first.vm.saveChecklist()
		first.unmount()

		// The reload: every module-level handle is dropped, exactly as a page
		// load does. Only what reached IndexedDB can come back.
		__resetDbForTests()
		__setDexie(Dexie)

		expect(await listQueue(resolveDeviceId())).toHaveLength(1)
		expect(await getPlannedItems(REGISTER, SCHEMA)).toHaveLength(1)

		const second = await mountCard()

		expect(second.vm.pendingCount).toBe(1)
		expect(second.vm.plannedItems).toHaveLength(1)

		second.unmount()
	})

	it('offers the queue from the card once something is waiting', async () => {
		const wrapper = await mountCard()
		await wrapper.vm.openItem(PLANNED)
		wrapper.vm.answers.q1.answer = 'yes'
		await wrapper.vm.saveChecklist()
		await wrapper.vm.$nextTick()

		await wrapper.find('[data-testid="cn-fi-open-queue"]').trigger('click')
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-offline-queue"]').exists()).toBe(true)

		wrapper.unmount()
	})
})
