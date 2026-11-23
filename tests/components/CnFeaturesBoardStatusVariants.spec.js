/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page can name the tone of a feature status (board DqFunctionaliteiten
 * draws a planned feature neutral, "Gepland, 2027"); a status it does not
 * name keeps the library's tone. Passes through the page's board config.
 *
 * @spec openspec/changes/features-board-status-variants/specs/features-board-status-variants/spec.md
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(() => Promise.resolve({ items: [], degraded: null })),
}))

const { shallowMount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default

const FEATURES = [
	{ slug: 'a', title: 'A', status: 'stable', category: 'x' },
	{ slug: 'b', title: 'B', status: 'planned', category: 'x' },
]

function mountBoard(props = {}) {
	return shallowMount(CnFeaturesBoard, {
		propsData: { features: FEATURES, categories: { x: 'X' }, repo: 'ConductionNL/dossiq', next: 0, ...props },
		global: { provide: { cnTranslate: (key) => key } },
	})
}

describe('CnFeaturesBoard status tones', () => {
	it('keeps the library tones by default', () => {
		const w = mountBoard()
		expect(w.vm.variantOf('planned')).toBe('purple')
		expect(w.vm.variantOf('available')).toBe('success')
	})

	it('takes the tone the page names for a status, and the default for the rest', () => {
		const w = mountBoard({ statusVariants: { planned: 'default' } })
		expect(w.vm.variantOf('planned')).toBe('default')
		expect(w.vm.variantOf('available')).toBe('success')
	})

	it('passes statusVariants on from the page board config', () => {
		const source = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'), 'utf8')
		expect(source).toMatch(/const keys = \[[^\]]*'statusVariants'/)
	})
})
