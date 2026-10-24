/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The manage timeline's visibility filter without a visible label
 * (board DqZaakHistorie), its accessible name kept.
 *
 * @spec openspec/changes/timeline-visibility-filter-unlabelled/specs/timeline/spec.md
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'

const NcSelect = { name: 'NcSelect', props: ['inputLabel', 'labelOutside', 'ariaLabelCombobox', 'placeholder'], template: '<div class="nc-select" />' }
const stubs = {
	NcButton: { template: '<button><slot /></button>' },
	NcSelect,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcNoteCard: true,
	NcCheckboxRadioSwitch: true,
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockImplementation((url) => Promise.resolve({ data: url === TIMELINE ? { canManage: true, results: [] } : { results: [] } }))
})

async function filterProps(content) {
	const w = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true, ...content } },
		global: { stubs },
	})
	await flushPromises()
	return w.find('[data-testid="cn-timeline-visibility-filter"]').findComponent(NcSelect).props()
}

describe('the visibility filter label', () => {
	it('draws no label with visibilityLabel false, and keeps the accessible name', async () => {
		const props = await filterProps({ visibilityLabel: false })
		expect(props.inputLabel).toBeUndefined()
		expect(props.labelOutside).toBe(true)
		expect(props.ariaLabelCombobox).toBe('Visibility')
	})

	it('keeps the label by default', async () => {
		const props = await filterProps({})
		expect(props.inputLabel).toBe('Visibility')
		expect(props.labelOutside).toBe(false)
	})
})
