/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The result of trying a flow with a record: each step reached in order, what
 * it did or would do, the fields it would change and the messages it would
 * send, and that nothing was changed or sent.
 *
 * @spec openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-the-result-shows-each-step-beside-the-canvas
 */
const { mount } = require('@vue/test-utils')
const CnFlowDryRunResult = require('../../src/components/CnFlowDetail/CnFlowDryRunResult.vue').default

const RESULT = {
	status: 'completed',
	steps: [
		{ nodeId: 'check', label: 'Large amount?', type: 'openregister.switch', status: 'completed', preview: { performed: true, summary: 'Switch' } },
		{ nodeId: 'write', label: '', type: 'openregister.object-write', status: 'completed', preview: { performed: false, summary: 'update an object in dossiq / case', changes: [{ field: 'status', value: 'closed' }] } },
		{ nodeId: 'tell', label: 'Tell the controller', type: 'openregister.send-email', status: 'completed', preview: { performed: false, summary: 'Send email would send 1 message(s)', messages: [{ channel: 'email', to: ['bob', 'carol'], subject: 'About Case 7', body: 'Hello' }] } },
	],
}

describe('CnFlowDryRunResult', () => {
	it('lists the steps in order, named by their label or else their type', () => {
		const w = mount(CnFlowDryRunResult, { props: { result: RESULT } })
		const steps = w.findAll('[data-testid="flow-dry-run-step"]')
		expect(steps.map((s) => s.find('.cn-flow-dry-run__step-name').text())).toEqual(['Large amount?', 'openregister.object-write', 'Tell the controller'])
		expect(steps[0].text()).toContain('Switch')
	})

	it('names the fields a step would change and the messages it would send', () => {
		const w = mount(CnFlowDryRunResult, { props: { result: RESULT } })
		const steps = w.findAll('[data-testid="flow-dry-run-step"]')
		expect(steps[1].find('[data-testid="flow-dry-run-change"]').text()).toBe('status: closed')
		const message = steps[2].find('[data-testid="flow-dry-run-message"]')
		expect(message.text()).toContain('bob, carol')
		expect(message.text()).toContain('About Case 7')
	})

	it('says nothing was changed or sent, and closes', async () => {
		const w = mount(CnFlowDryRunResult, { props: { result: RESULT } })
		expect(w.find('[data-testid="flow-dry-run-note"]').text()).toBe('Nothing was changed or sent.')
		await w.find('[data-testid="flow-dry-run-close"]').trigger('click')
		expect(w.emitted('close')).toHaveLength(1)
	})

	it('says why a step would fail', () => {
		const steps = [{ nodeId: 'w', type: 'write', status: 'failed', error: 'An object-write step needs an operation.', preview: null }]

		const list = mount(CnFlowDryRunResult, { props: { result: { status: 'failed', steps } } })
		expect(list.find('[data-testid="flow-dry-run-step-error"]').text()).toBe('An object-write step needs an operation.')

		const card = mount(CnFlowDryRunResult, { props: { card: true, result: { status: 'failed', steps } } })
		const row = card.find('[data-testid="flow-dry-run-row"]')
		expect(row.text()).toContain('Would fail')
		expect(row.text()).toContain('An object-write step needs an operation.')
	})

	it('shows the error a refused step left', () => {
		const w = mount(CnFlowDryRunResult, { props: { result: { status: 'failed', error: 'Step 2 is malformed', steps: [] } } })
		expect(w.find('[data-testid="flow-dry-run-error"]').text()).toBe('Step 2 is malformed')
	})

	describe('the test run card', () => {
		const card = (result) => mount(CnFlowDryRunResult, { props: { card: true, result } })

		it('stays the plain panel unless asked', () => {
			const w = mount(CnFlowDryRunResult, { props: { result: RESULT } })
			expect(w.find('[data-testid="flow-dry-run-card"]').exists()).toBe(false)
			expect(w.find('[data-testid="flow-dry-run-result"]').exists()).toBe(true)
		})

		it('draws one row per step with what it would do', () => {
			const rows = card(RESULT).findAll('[data-testid="flow-dry-run-row"]')
			expect(rows).toHaveLength(3)
			expect(rows[0].text()).toContain('Large amount?')
			expect(rows[1].text()).toContain('status: closed')
			expect(rows[2].text()).toContain('bob, carol')
		})

		it('names the record, or the example payload', () => {
			const onRecord = card({ ...RESULT, subject: { uuid: 'c-7' } })
			const onPayload = card({ ...RESULT, subject: { payload: { amount: 1 } } })
			expect(onRecord.find('th').text()).toBe('Record')
			expect(onRecord.find('[data-testid="flow-dry-run-row"]').text()).toContain('c-7')
			expect(onPayload.find('th').text()).toBe('Example')
			expect(onPayload.find('[data-testid="flow-dry-run-row"]').text()).toContain('Example payload')
		})

		it('words the outcome of a step', () => {
			const steps = [{ nodeId: 'a', status: 'failed' }, { nodeId: 'b', status: 'skipped' }, { nodeId: 'c', status: 'completed' }]
			const rows = card({ status: 'failed', steps }).findAll('[data-testid="flow-dry-run-row"]')
			expect(rows.map((row) => row.text())).toEqual([expect.stringContaining('Would fail'), expect.stringContaining('Skipped'), expect.stringContaining('Would succeed')])
		})

		it('says nothing was sent, shows the engine\'s error, tests again and closes', async () => {
			const w = card({ status: 'failed', error: 'Stopped at step two', steps: [] })
			expect(w.find('[data-testid="flow-dry-run-note"]').text()).toContain('Nothing was sent or changed')
			expect(w.find('[data-testid="flow-dry-run-error"]').text()).toBe('Stopped at step two')
			await w.find('[data-testid="flow-dry-run-again"]').trigger('click')
			await w.find('[data-testid="flow-dry-run-close"]').trigger('click')
			expect(w.emitted('again')).toHaveLength(1)
			expect(w.emitted('close')).toHaveLength(1)
		})
	})
})
