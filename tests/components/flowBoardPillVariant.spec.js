/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The page's pill beside the flow's name takes the tone the page names
 * (DqFlow draws "Flow van zaaktype" teal); without one it stays neutral, and
 * a lifecycle pill (draft, retired) stays neutral either way.
 *
 * @spec openspec/changes/flow-page-pill-variant/specs/flow-page-pill-variant/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { flushPromises, mount } = require('@vue/test-utils')
const { createPinia, setActivePinia } = require('pinia')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const CnFlowEditorPage = require('../../src/components/CnFlowsPage/CnFlowEditorPage.vue').default
const CnStatusBadge = require('../../src/components/CnStatusBadge/CnStatusBadge.vue').default

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div><slot /></div>' } }

beforeEach(() => setActivePinia(createPinia()))

/**
 * The variant of the pill beside the title.
 *
 * @param {object} wrapper The mounted board.
 * @return {string|undefined} The variant.
 */
function titlePillVariant(wrapper) {
	const pill = wrapper.findAllComponents(CnStatusBadge).find((badge) => badge.props('label') === 'Case type flow')
	return pill ? pill.props('variant') : undefined
}

describe('the flow board title pill', () => {
	it('takes the tone the page names', async () => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', pill: 'Case type flow', pillVariant: 'teal' }, global: { stubs } })
		await flushPromises()
		expect(titlePillVariant(w)).toBe('teal')
	})

	it('stays neutral without one', async () => {
		const w = mount(CnFlowBoard, { props: { id: 'f1', pill: 'Case type flow' }, global: { stubs } })
		await flushPromises()
		expect(titlePillVariant(w)).toBe('default')
	})

	it('is handed on by the flow page from its config', () => {
		expect(CnFlowEditorPage.props.pillVariant).toBeDefined()
	})
})
