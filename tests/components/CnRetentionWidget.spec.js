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

	it('lets an archivist recompute with a reason, and shows others the role it needs', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = await mountWidget()
		expect(w.find('[data-testid="cn-retention-recompute"]').attributes('disabled')).toBeDefined()
		await w.find('[data-testid="cn-retention-reason"]').setValue('Selection list changed')
		await w.find('[data-testid="cn-retention-recompute"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/archival/objects/z-82/nomination/recompute', { reason: 'Selection list changed' })
		expect(axios.get).toHaveBeenCalledTimes(2)

		getCurrentUser.mockReturnValue({ uid: 'piet', isAdmin: false, groups: ['kcc'] })
		const other = await mountWidget()
		expect(other.find('[data-testid="cn-retention-recompute-denied"]').exists()).toBe(true)
	})
})
