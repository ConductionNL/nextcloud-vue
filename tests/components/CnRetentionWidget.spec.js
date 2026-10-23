/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRetentionWidget: the `retention` detail widget over OpenRegister's
 * stored retention decision (dossiq's CaseArchivalPanel; any app on
 * OpenRegister).
 *
 * @spec openspec/changes/retention-widget/specs/retention-widget/spec.md#requirement-a-record-shows-its-stored-retention
 */
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnRetentionWidget from '../../src/components/CnRetentionWidget/CnRetentionWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { __resetReferenceLabels } from '../../src/utils/referenceLabel.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p, generateFilePath: (p) => p, imagePath: (p) => p }))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'anouk', isAdmin: false, groups: ['archivaris'] })), getRequestToken: () => 'x', onRequestTokenUpdate: () => {} }))

const BOUND = { id: 'z-82', '@self': { id: 'z-82', register: 'dossiq', schema: 'case' } }

const DECIDED = {
	id: 'z-82',
	archiveStatus: 'nog_te_archiveren',
	'@self': {
		_retention: {
			appraisal: 'destroy',
			disposalDate: '2033-03-01',
			retentionPeriod: 'P5Y',
			selectionListRow: '1.1',
			nomination: { status: 'nominated', rule: 'Case type Kapvergunning', at: '2026-03-01' },
		},
	},
}

const STUBS = {
	NcEmptyContent: { props: ['name', 'description'], template: '<div class="empty">{{ name }} {{ description }}<slot name="action" /></div>' },
	NcNoteCard: { props: ['type'], template: '<div class="note"><slot /></div>' },
	NcTextField: { props: ['modelValue', 'label'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">' },
	NcLoadingIcon: true,
	CnDialog: { name: 'CnDialog', template: '<div data-testid="cn-retention-recompute-dialog"><slot /><slot name="actions" /></div>' },
}

/**
 * Mount the widget and let it read.
 *
 * @param {object} content The content.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The widget.
 */
async function mountWidget(content = { statusField: 'archiveStatus', archivedValues: ['archived', 'archived_retention_period_unknown'] }) {
	const w = mount(CnRetentionWidget, { props: { content, objectData: BOUND }, global: { stubs: STUBS } })
	await flushPromises()
	return w
}

describe('CnRetentionWidget', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: DECIDED })
	})

	it('is the retention detail widget and shows the stored facts read fresh from OpenRegister', async () => {
		expect(getWidgetTypeEntry('retention').renderer).toBe(CnRetentionWidget)
		const w = await mountWidget()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/dossiq/case/z-82')
		expect(w.find('[data-testid="cn-retention-disposal-date"]').text()).toBe('2033-03-01')
		expect(w.find('[data-testid="cn-retention-rule"]').text()).toBe('Case type Kapvergunning')
		expect(w.find('[data-testid="cn-retention-disagreement"]').exists()).toBe(false)
	})

	it('tells an unclosed record from one nothing could nominate', async () => {
		axios.get.mockResolvedValue({ data: { id: 'z-82', '@self': {} } })
		const open = await mountWidget({})
		expect(open.find('[data-testid="cn-retention-pending"]').text()).toContain('Decided when it closes')

		axios.get.mockResolvedValue({ data: { id: 'z-82', '@self': { _retention: { nomination: { status: 'unnominatable', unnominatableReason: 'No selection list row.' } } } } })
		const stuck = await mountWidget({})
		expect(stuck.find('[data-testid="cn-retention-unnominatable"]').text()).toContain('No selection list row.')
	})

	it('says when the record and the platform disagree about being archived', async () => {
		axios.get.mockResolvedValue({ data: { ...DECIDED, archiveStatus: 'archived', '@self': { ...DECIDED['@self'] } } })
		const w = await mountWidget()
		expect(w.find('[data-testid="cn-retention-disagreement"]').exists()).toBe(true)

		axios.get.mockResolvedValue({ data: { ...DECIDED, archiveStatus: 'archived', '@self': { ...DECIDED['@self'], archived: { at: '2026-04-01', by: 'anouk', reason: 'Closed.' } } } })
		const agreed = await mountWidget()
		expect(agreed.find('[data-testid="cn-retention-disagreement"]').exists()).toBe(false)
		expect(agreed.find('[data-testid="cn-retention-archived"]').text()).toBe('Archived on 2026-04-01 by anouk. Closed.')
	})

	it('fails closed with a retry', async () => {
		axios.get.mockRejectedValueOnce(new Error('Network down'))
		const w = await mountWidget()
		expect(w.find('[data-testid="cn-retention-error"]').text()).toContain('Network down')
		expect(w.find('[data-testid="cn-retention-facts"]').exists()).toBe(false)
		await w.find('[data-testid="cn-retention-retry"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-retention-facts"]').exists()).toBe(true)
	})

	it('lets an archivist recompute from the header, asking the reason in a dialog, and shows others the role it needs', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = await mountWidget()
		// The button sits in the card header, beside the title (board DqZaakArchivering).
		expect(w.find('.cn-retention__head [data-testid="cn-retention-recompute-open"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-retention-recompute-dialog"]').exists()).toBe(false)
		await w.find('[data-testid="cn-retention-recompute-open"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-retention-recompute-dialog"]').exists()).toBe(true)
		// The reason stays required.
		expect(w.find('[data-testid="cn-retention-recompute"]').attributes('disabled')).toBeDefined()
		await w.find('[data-testid="cn-retention-reason"]').setValue('Selection list changed')
		await w.find('[data-testid="cn-retention-recompute"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/archival/objects/z-82/nomination/recompute', { reason: 'Selection list changed' })
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(w.find('[data-testid="cn-retention-recompute-dialog"]').exists()).toBe(false)

		getCurrentUser.mockReturnValue({ uid: 'piet', isAdmin: false, groups: ['kcc'] })
		const other = await mountWidget()
		const denied = other.find('[data-testid="cn-retention-recompute-denied"]')
		expect(denied.attributes('disabled')).toBeDefined()
		expect(denied.attributes('title')).toBe('Recomputing needs the archivist role')
	})
})

describe('CnRetentionWidget before the record closes', () => {
	const OPEN = { id: 'z-82', caseType: 'ct-woo', '@self': { id: 'z-82', register: 'dossiq', schema: 'case' } }
	const RESULT_TYPES = [
		{ id: 'r1', archivalAction: 'vernietigen', archivalPeriod: 'P5Y', selectionListClass: '11.1.2, Woo-verzoeken' },
		{ id: 'r2', archivalAction: 'vernietigen', archivalPeriod: 'P5Y', selectionListClass: '11.1.2, Woo-verzoeken' },
	]
	const EXPECTED = {
		source: { register: 'dossiq', schema: 'resultType', filter: { caseType: '@object.caseType' } },
		fields: { appraisal: 'archivalAction', period: 'archivalPeriod', selectionListRow: 'selectionListClass' },
		appraisalLabels: { vernietigen: 'Destroy', bewaren: 'Keep' },
		periodText: '{period} after the decision',
		decidedBy: 'The case type, when it closes',
	}

	/**
	 * Answer the record read and the result type read.
	 *
	 * @param {object[]} types The result types.
	 * @return {void}
	 */
	function answer(types) {
		axios.get.mockImplementation(async (url) => (url.includes('/resultType')
			? { data: { results: types } }
			: { data: OPEN }))
	}

	/**
	 * The pending facts as label: value.
	 *
	 * @param {object} w The widget.
	 * @return {object} The facts.
	 */
	function pending(w) {
		return Object.fromEntries(w.findAll('[data-testid="cn-retention-pending"] .cn-retention__fact').map((f) => [f.find('dt').text(), f.find('dd').text()]))
	}

	beforeEach(() => {
		axios.get.mockReset()
		__resetReferenceLabels()
	})

	it('shows the outcome the record type expects, read from its result types', async () => {
		answer(RESULT_TYPES)
		const w = await mountWidget({ expected: EXPECTED })
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/dossiq/resultType', { params: { caseType: 'ct-woo', _limit: 100 } })
		expect(pending(w)).toEqual({
			Appraisal: 'Destroy',
			'Retention period': '5 years after the decision',
			'Selection list row': '11.1.2, Woo-verzoeken',
			'Disposal date': 'Decided when it closes',
			'Decided by': 'The case type, when it closes',
			'Written on': 'Not yet',
		})
	})

	it('reads a selection list URL as its code and name through the lookup', async () => {
		const url = 'https://selectielijst.openzaak.nl/api/v1/resultaten/3fc7002b-31b6-4abe-82af-b6d46a9a1736'
		axios.get.mockImplementation(async (path) => {
			if (path.includes('/resultType')) {
				return { data: { results: RESULT_TYPES.map((row) => ({ ...row, selectionListClass: url })) } }
			}
			if (path.includes('/selectielijst/resolve')) {
				return { data: { code: '6.1', name: 'Ingewilligd' } }
			}
			return { data: OPEN }
		})
		const w = await mountWidget({ expected: { ...EXPECTED, selectionListLookup: { url: '/apps/openregister/api/archival/selectielijst/resolve' } } })
		expect(pending(w)['Selection list row']).toBe('6.1, Ingewilligd')
	})

	it('says the selection list row depends on the result when the rows differ', async () => {
		answer([RESULT_TYPES[0], { ...RESULT_TYPES[1], selectionListClass: '6.2, Afgewezen' }])
		const w = await mountWidget({ expected: EXPECTED })
		expect(pending(w)['Selection list row']).toBe('Depends on the result')
	})

	it('shows each fact the result types agree on, and only the others depend on the result', async () => {
		answer([RESULT_TYPES[0], { ...RESULT_TYPES[1], archivalPeriod: 'P1Y' }])
		const w = await mountWidget({ expected: EXPECTED })
		expect(pending(w).Appraisal).toBe('Destroy')
		expect(pending(w)['Retention period']).toBe('Depends on the result')
		expect(pending(w)['Selection list row']).toBe('11.1.2, Woo-verzoeken')
	})

	it('says the outcome depends on the result when the result types disagree', async () => {
		answer([RESULT_TYPES[0], { id: 'r3', archivalAction: 'bewaren', archivalPeriod: 'P20Y' }])
		const w = await mountWidget({ expected: EXPECTED })
		expect(pending(w).Appraisal).toBe('Depends on the result')
		expect(pending(w)['Retention period']).toBe('Depends on the result')
	})

	it('keeps the plain pending facts when the expected outcome cannot be read', async () => {
		axios.get.mockImplementation(async (url) => {
			if (url.includes('/resultType')) {
				throw new Error('down')
			}
			return { data: OPEN }
		})
		const w = await mountWidget({ expected: EXPECTED })
		expect(pending(w).Appraisal).toBe('Decided when it closes')
	})

	it('draws the procedure hold and the e-Depot transfer as sections when asked', async () => {
		answer(RESULT_TYPES)
		const w = await mountWidget({ expected: EXPECTED, legalHold: true, transfer: { keepValues: ['bewaren'] } })
		expect(w.find('[data-testid="cn-retention-hold"]').text()).toContain('No legal hold')
		expect(w.find('[data-testid="cn-retention-transfer"]').text()).toContain('Not applicable')

		axios.get.mockImplementation(async (url) => (url.includes('/resultType')
			? { data: { results: [{ id: 'r9', archivalAction: 'bewaren', archivalPeriod: 'P20Y' }] } }
			: { data: { ...OPEN, '@self': { ...OPEN['@self'], _retention: { legalHold: { active: true, holds: [{ id: 'h1', reason: 'Bezwaar loopt', placedBy: 'anouk', placedDate: '2026-10-06' }] } } } } }))
		const held = await mountWidget({ expected: EXPECTED, legalHold: true, transfer: { keepValues: ['bewaren'] } })
		expect(held.find('[data-testid="cn-retention-hold"]').text()).toContain('Bezwaar loopt')
		expect(held.find('[data-testid="cn-retention-transfer"]').text()).toContain('Goes to the e-Depot')
	})
})
