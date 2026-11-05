/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * graph-canvas-check-strip (DqFlow "Controle: 1 fout, 1 waarschuwing."):
 * what a check found, above the canvas, errors first; a finding on a step
 * brings that step into view.
 *
 * @spec openspec/changes/graph-canvas-check-strip/specs/graph-canvas-check-strip/spec.md#requirement-a-graph-canvas-shows-what-a-check-found
 */
import { shallowMount } from '@vue/test-utils'
import CnGraphCanvas from '../../src/components/CnGraphCanvas/CnGraphCanvas.vue'

const mockFitView = jest.fn()
jest.mock('@vue-flow/core', () => ({
	VueFlow: { name: 'VueFlow', template: '<div class="vue-flow"><slot /></div>' },
	useVueFlow: () => ({ project: jest.fn(), zoomIn: jest.fn(), zoomOut: jest.fn(), zoomTo: jest.fn(), fitView: mockFitView, viewport: { value: { zoom: 1 } } }),
	Handle: { template: '<div />' },
	Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
	BaseEdge: { template: '<g />' },
	EdgeLabelRenderer: { template: '<div><slot /></div>' },
	getSmoothStepPath: () => ['', 0, 0],
	getBezierPath: () => ['', 0, 0],
	getStraightPath: () => ['', 0, 0],
}))
jest.mock('@vue-flow/background', () => ({ Background: { template: '<div />' } }))
jest.mock('@vue-flow/minimap', () => ({ MiniMap: { template: '<div />' } }))

const ISSUES = [
	{ level: 'warning', text: 'De overgang van "Welstand nodig?" naar "Besluit publiceren" staat er twee keer.' },
	{ level: 'error', text: 'De stap "Ontvangstbericht" heeft geen uitgaande overgang.', nodeId: 'n-ontvangst' },
]

describe('CnGraphCanvas check strip', () => {
	it('draws the count and every finding, errors first, as a status', () => {
		const w = shallowMount(CnGraphCanvas, { props: { nodes: [], edges: [], issues: ISSUES } })
		const strip = w.find('[data-testid="cn-graph-canvas-issues"]')
		expect(strip.attributes('role')).toBe('status')
		expect(w.find('[data-testid="cn-graph-canvas-issues-title"]').text()).toBe('Check: 1 error, 1 warning.')
		expect(w.findAll('li').map((li) => li.text())[0]).toMatch(/^Error: De stap "Ontvangstbericht"/)
		expect(w.classes()).toContain('cn-graph-canvas--checked')
	})

	it('brings the step of a finding into view and emits it', async () => {
		mockFitView.mockReset()
		const w = shallowMount(CnGraphCanvas, { props: { nodes: [], edges: [], issues: ISSUES } })
		await w.find('[data-testid="cn-graph-canvas-issue-target"]').trigger('click')
		expect(mockFitView).toHaveBeenCalledWith(expect.objectContaining({ nodes: ['n-ontvangst'] }))
		expect(w.emitted('issue-select')[0]).toEqual(['n-ontvangst'])
	})

	it('takes the host title and draws nothing without findings', () => {
		const w = shallowMount(CnGraphCanvas, { props: { nodes: [], edges: [], issues: ISSUES, issuesTitle: 'Controle: {errors}, {warnings}.' } })
		expect(w.find('[data-testid="cn-graph-canvas-issues-title"]').text()).toBe('Controle: 1 error, 1 warning.')
		expect(shallowMount(CnGraphCanvas, { props: { nodes: [], edges: [] } }).find('[data-testid="cn-graph-canvas-issues"]').exists()).toBe(false)
	})
})
