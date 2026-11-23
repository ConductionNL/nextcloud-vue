/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board header draws its buttons in the board's order: Documentation,
 * the Actions menu, the buildiq square, then the primary Suggest feature.
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(() => Promise.resolve({ items: [], degraded: null })),
}))

const { mount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default

const FEATURES = [{ slug: 'intake', title: 'Cases from every channel', summary: 'Phone and mail.', status: 'stable', category: 'cases' }]
const stubs = {
	CnBuildiqEditButton: { template: '<div data-testid="buildiq" />' },
	CnRoadmapTab: true,
	NcActions: { template: '<div><slot /></div>' },
	NcActionLink: true,
	NcActionButton: true,
	NcButton: { template: '<div><slot /></div>' },
	NcNoteCard: true,
}

/**
 * @param {object} props Extra props.
 * @return {string[]} The test ids of the header's direct buttons, in order.
 */
function headerOrder(props) {
	const wrapper = mount(CnFeaturesBoard, {
		propsData: { features: FEATURES, categories: { cases: 'Case handling' }, next: 0, documentationUrl: 'https://example.org', suggestUrl: 'https://example.org/new', ...props },
		stubs,
	})
	const actions = wrapper.find('.cn-features-board__header-actions').element
	return Array.from(actions.children).map((child) => child.getAttribute('data-testid'))
}

describe('CnFeaturesBoard header order', () => {
	it('draws Documentation, Actions, buildiq and Suggest feature in that order', () => {
		expect(headerOrder({ tabs: false, documentationButton: true, suggestButton: true })).toEqual([
			'cn-features-board-docs',
			'cn-features-board-actions',
			'buildiq',
			'cn-features-board-suggest',
		])
	})

	it('keeps buildiq after Documentation when the Actions menu moves to the tab row', () => {
		expect(headerOrder({ tabs: true, documentationButton: true, suggestButton: false })).toEqual([
			'cn-features-board-docs',
			'buildiq',
		])
	})
})
