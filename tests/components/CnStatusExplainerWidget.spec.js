/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatusExplainerWidget — what the status a record is in asks of it. Ported
 * from dossiq's CaseStatusDeclarationPanel specs (caseDerivedStatusReasons,
 * transitionWithheldReason, caseFieldRulesPanel).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-record-can-explain-its-status
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

import { mount } from '@vue/test-utils'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

import '../../src/components/CnStatusExplainerWidget/index.js'

const CnStatusExplainerWidget = require('../../src/components/CnStatusExplainerWidget/CnStatusExplainerWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const CONTENT = { endpointSource: { url: '/apps/x/api/item/@objectId/available-transitions' } }

async function mountExplainer(answer, record = { id: 'r-1' }, content = CONTENT) {
	if (answer instanceof Error) {
		mockGet.mockRejectedValue(answer)
	} else {
		mockGet.mockResolvedValue({ data: answer })
	}
	const wrapper = mount(CnStatusExplainerWidget, { props: { content, objectId: 'r-1', objectData: record } })
	for (let i = 0; i < 4; i++) {
		await flush()
	}
	return wrapper
}

beforeEach(() => {
	mockGet.mockReset()
	invalidateEndpointSourceCache()
})

describe('CnStatusExplainerWidget', () => {
	it('asks the transition endpoint of the record', async () => {
		await mountExplainer({ current: {} })
		expect(mockGet.mock.calls[0][0]).toBe('/index.php/apps/x/api/item/r-1/available-transitions')
	})

	it('names every missing thing, one per line, under a heading naming the status', async () => {
		const wrapper = await mountExplainer({ current: {}, derivation: { name: 'Complete', unmet: ['Permit drawing', ' ', 'Site plan'] } })
		expect(wrapper.find('[data-testid="cn-status-explainer-derivation"]').text()).toContain('Complete')
		expect(wrapper.findAll('[data-testid="cn-status-explainer-missing"]').map((m) => m.text())).toEqual(['Permit drawing', 'Site plan'])
	})

	it('takes the heading from the manifest when it names one', async () => {
		const wrapper = await mountExplainer({ current: {}, derivation: { name: 'Complete', unmet: ['x'] } }, { id: 'r-1' }, { ...CONTENT, labels: { derivationHeading: 'This item moves to {status} once these are on file' } })
		expect(wrapper.text()).toContain('This item moves to Complete once these are on file')
	})

	it('says who the record waits on and how long it has been here, with the breach', async () => {
		const wrapper = await mountExplainer({ current: { waitingOn: 'applicant', dwell: { days: 12, breached: true } } })
		expect(wrapper.find('[data-testid="cn-status-explainer-waiting"]').text()).toBe('Waiting on the applicant')
		expect(wrapper.find('[data-testid="cn-status-explainer-dwell"]').text()).toContain('12 working days in this status')
		expect(wrapper.find('[data-testid="cn-status-explainer-breached"]').exists()).toBe(true)
	})

	it('renders one line per withheld move, with its first reason, and drops one without a reason', async () => {
		const wrapper = await mountExplainer({ current: {}, withheld: [{ id: 'a', label: 'Decide', reasons: ['the advice request', 'other'] }, { id: 'b', label: 'Close', reasons: [] }] })
		const lines = wrapper.findAll('[data-testid="cn-status-explainer-withheld-entry"]').map((l) => l.text())
		expect(lines).toEqual(['Decide is waiting on the advice request'])
	})

	it('renders the explanation an administrator wrote on the status', async () => {
		const wrapper = await mountExplainer({ current: { statusDescription: 'Check the drawings first.' } })
		expect(wrapper.find('[data-testid="cn-status-explainer-explanation"]').text()).toBe('Check the drawings first.')
	})

	it('renders nothing at all with nothing to say', async () => {
		const wrapper = await mountExplainer({ current: { waitingOn: 'us', dwell: { days: 0 } } })
		expect(wrapper.find('[data-testid="cn-status-explainer"]').exists()).toBe(false)
	})

	it('renders nothing rather than erroring when the engine cannot answer', async () => {
		const wrapper = await mountExplainer(new Error('500'))
		expect(wrapper.find('[data-testid="cn-status-explainer"]').exists()).toBe(false)
	})

	it('tells the three kinds of field rule apart, also when the engine refuses', async () => {
		const record = { id: 'r-1', '@self': { fieldRules: { required: ['motivation'], readOnly: ['amount', 'date'], hidden: ['bsn'] } } }
		const wrapper = await mountExplainer(new Error('403'), record)
		const lines = wrapper.findAll('[data-testid="cn-status-explainer-field-rule"]').map((l) => l.text())
		expect(lines).toEqual(['Fill in: motivation', 'Cannot be changed here: amount, date', 'Not shown to you here: bsn'])
	})

	it('says nothing about field rules when every list is empty', async () => {
		const wrapper = await mountExplainer(new Error('403'), { id: 'r-1', '@self': { fieldRules: { required: [], readOnly: [], hidden: [] } } })
		expect(wrapper.find('[data-testid="cn-status-explainer-field-rules"]').exists()).toBe(false)
	})
})

describe('CnStatusExplainerWidget on the board (the case Status card)', () => {
	it('leaves the withheld moves out when the content says withheld: false', async () => {
		const answer = { current: { statusDescription: 'Documents are being gathered' }, withheld: [{ id: 'a', label: 'Decide', reasons: ['the advice request'] }] }
		const wrapper = await mountExplainer(answer, { id: 'r-1' }, { ...CONTENT, withheld: false })
		expect(wrapper.find('[data-testid="cn-status-explainer-withheld"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-status-explainer-explanation"]').text()).toBe('Documents are being gathered')
	})

	it('draws no box in the board look, and the explanation as the status line', () => {
		const fs = require('fs')
		const path = require('path')
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8')
		expect(css).toMatch(/\.cn-look-board \.cn-status-explainer\.cn-status-explainer \{[^}]*background-color: transparent;[^}]*padding: 0;/)
		expect(css).toMatch(/\.cn-look-board \.cn-status-explainer__muted\.cn-status-explainer__muted \{[^}]*font-weight: 600;/)
	})
})
