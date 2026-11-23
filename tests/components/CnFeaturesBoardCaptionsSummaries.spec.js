/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board DqFunctionaliteiten: group captions read in the reader's language, and
 * `board.summaries: false` draws a rows-layout feature as its title and status
 * only.
 *
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(() => Promise.resolve({ items: [], degraded: null })),
}))

const { mount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default
const CnFeaturesAndRoadmapView = require('../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue').default

const DUTCH = { 'Case handling': 'Zaakbehandeling', 'On the roadmap': 'Op de roadmap' }
const FEATURES = [
	{ slug: 'intake', title: 'Cases from every channel', summary: 'Phone, mail and the counter.', status: 'stable', category: 'cases' },
	{ slug: 'flow', title: 'Visual flow editor', summary: 'Per case type.', status: 'planned', category: 'roadmap' },
]
const stubs = { CnBuildiqEditButton: true, CnRoadmapTab: true, NcActions: true, NcActionLink: true, NcActionButton: true, NcButton: true, NcNoteCard: true }

function mountBoard(props) {
	return mount(CnFeaturesBoard, {
		propsData: { features: FEATURES, categories: { cases: 'Case handling', roadmap: 'On the roadmap' }, tabs: false, next: 0, ...props },
		provide: { cnTranslate: (s) => DUTCH[s] || s },
		stubs,
	})
}

describe('CnFeaturesBoard captions and summaries', () => {
	it('translates the group captions', () => {
		const titles = mountBoard({ layout: 'rows' }).findAll('.cn-features-board__group-title').map((h) => h.text())
		expect(titles).toEqual(['Zaakbehandeling', 'Op de roadmap'])
	})

	it('draws the summary in rows by default and hides it with summaries false', () => {
		expect(mountBoard({ layout: 'rows' }).findAll('.cn-features-board__row-summary')).toHaveLength(2)
		const bare = mountBoard({ layout: 'rows', summaries: false })
		expect(bare.findAll('.cn-features-board__row-summary')).toHaveLength(0)
		expect(bare.findAll('.cn-features-board__row-title').map((t) => t.text())).toEqual(['Cases from every channel', 'Visual flow editor'])
		expect(bare.findAll('[data-testid="cn-features-board-status"]')).toHaveLength(2)
	})

	it('passes summaries through the view board options', () => {
		const board = { name: 'CnFeaturesBoard', props: ['summaries'], template: '<div />' }
		const wrapper = mount(CnFeaturesAndRoadmapView, {
			propsData: { repo: 'ConductionNL/dossiq', features: [], board: { layout: 'rows', summaries: false } },
			provide: { cnLook: 'board' },
			stubs: { CnFeaturesBoard: board, CnSupportDialog: true },
		})
		expect(wrapper.findComponent(board).props('summaries')).toBe(false)
	})
})
