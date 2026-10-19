/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `actionsMenu: false` drops the board's Actions menu (Acties), in the header
 * without tabs and in the tab row with them, for a page whose board draws
 * none.
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(() => Promise.resolve({ items: [], degraded: null })),
}))

const { mount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default

const FEATURES = [{ slug: 'intake', title: 'Cases from every channel', summary: 'Phone and mail.', status: 'stable', category: 'cases' }]
const stubs = { CnBuildiqEditButton: true, CnRoadmapTab: true, NcActions: { template: '<div><slot /></div>' }, NcActionLink: true, NcActionButton: true, NcButton: true, NcNoteCard: true }

/**
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountBoard(props) {
	return mount(CnFeaturesBoard, {
		propsData: { features: FEATURES, categories: { cases: 'Case handling' }, next: 0, ...props },
		stubs,
	})
}

const menu = (w) => w.find('[data-testid="cn-features-board-actions"]')

describe('CnFeaturesBoard actionsMenu', () => {
	it('draws the Actions menu by default, with and without tabs', () => {
		expect(menu(mountBoard({ tabs: false })).exists()).toBe(true)
		expect(menu(mountBoard({ tabs: true })).exists()).toBe(true)
	})

	it('drops it with actionsMenu: false', () => {
		expect(menu(mountBoard({ tabs: false, actionsMenu: false })).exists()).toBe(false)
		expect(menu(mountBoard({ tabs: true, actionsMenu: false })).exists()).toBe(false)
	})
})

describe('CnFeaturesAndRoadmapView board options', () => {
	it('passes actionsMenu to the board', () => {
		const CnFeaturesAndRoadmapView = require('../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue').default
		const options = CnFeaturesAndRoadmapView.computed.boardOptions.call({ board: { tabs: false, actionsMenu: false } })
		expect(options).toEqual({ tabs: false, actionsMenu: false })
	})
})
