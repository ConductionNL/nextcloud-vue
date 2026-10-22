/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The status filter's accessible name can be configured (board
 * DqFunctionaliteiten names the group "Toon"), through the host translate,
 * and passes through the features-and-roadmap page's board config.
 *
 * @spec openspec/changes/features-board-filter-label/specs/features-board-filter-label/spec.md#requirement-the-status-filter-can-be-named
 */
jest.mock('../../src/utils/roadmapIssues.js', () => ({
	...jest.requireActual('../../src/utils/roadmapIssues.js'),
	fetchRoadmapIssues: jest.fn(() => Promise.resolve({ items: [], degraded: null })),
}))

const { shallowMount } = require('@vue/test-utils')
const CnFeaturesBoard = require('../../src/components/CnFeaturesBoard/CnFeaturesBoard.vue').default

const FEATURES = [{ slug: 'a', title: 'A', status: 'stable', category: 'x' }]

function mountBoard(props = {}) {
	return shallowMount(CnFeaturesBoard, {
		propsData: { features: FEATURES, categories: { x: 'X' }, repo: 'ConductionNL/dossiq', filter: 'segmented', ...props },
		global: { provide: { cnTranslate: (key) => `T(${key})` } },
	})
}

describe('CnFeaturesBoard status filter name', () => {
	it('names the group Status by default', () => {
		expect(mountBoard().find('[data-testid="cn-features-board-filter"]').attributes('aria-label')).toBe('Status')
	})

	it('names the group by filterLabel, through the host translate', () => {
		expect(mountBoard({ filterLabel: 'Show' }).find('[data-testid="cn-features-board-filter"]').attributes('aria-label')).toBe('T(Show)')
	})

	it('passes filterLabel on from the page board config', () => {
		const source = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue'), 'utf8')
		expect(source).toMatch(/const keys = \[[^\]]*'filterLabel'/)
	})
})
