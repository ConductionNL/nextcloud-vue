/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnJourney from '../../src/components/CnJourney/CnJourney.vue'
import CnJourneyDialog from '../../src/components/CnJourneyDialog/CnJourneyDialog.vue'
import { currentTitle, fakeRunApi, fillAndNext, flush, journey, stubs } from '../support/journeyHarness.js'

jest.mock('../../src/utils/cnFetch.js', () => ({
	cnFetchJson: (...args) => global.__runApi(...args),
}))

let server
beforeEach(() => {
	server = fakeRunApi()
	global.__runApi = server.api
})

describe('CnJourneyDialog', () => {
	it('keeps staged answers when closed and resumes at the recorded step on reopen', async () => {
		const w = mount(CnJourneyDialog, { props: { journey, open: true }, global: { stubs } })
		await flush()
		await flush()
		await fillAndNext(w, { name: 'Jan' })
		expect(currentTitle(w)).toBe('Kind')

		await w.setProps({ open: false })
		expect(w.find('.cn-journey').exists()).toBe(false)
		expect(server.calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)

		await w.setProps({ open: true })
		await flush()
		await flush()
		expect(currentTitle(w)).toBe('Kind')
		await w.get('[data-testid="cn-journey-back"]').trigger('click')
		await flush()
		expect(w.findComponent({ name: 'CnFormPage' }).vm.formData.name).toBe('Jan')
	})

	it('emits close when dismissed', async () => {
		const w = mount(CnJourneyDialog, { props: { journey }, global: { stubs: { ...stubs, NcDialog: { template: '<div><button class="x" @click="$emit(\'closing\')" /><slot /></div>', emits: ['closing'] } } } })
		await w.get('.x').trigger('click')
		expect(w.emitted('close')).toHaveLength(1)
	})

	it('a run started in the dialog resumes in a page at the same step', async () => {
		const w = mount(CnJourneyDialog, { props: { journey }, global: { stubs } })
		await flush()
		await flush()
		await fillAndNext(w, { name: 'Jan' })
		const runId = w.emitted('run-started')[0][0]

		const page = mount(CnJourney, { props: { journey, runId }, global: { stubs } })
		await flush()
		await flush()
		expect(currentTitle(page)).toBe('Kind')
		expect(page.vm.answers.who).toEqual({ name: 'Jan' })
	})
})
