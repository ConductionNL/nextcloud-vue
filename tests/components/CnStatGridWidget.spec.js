/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatGridWidget — figures in a grid inside one card (DqDagAfsluiten "Uw
 * dag": Geopend, Vastgelegd, Uren, Klaar te zetten). The cells read one shared
 * endpoint, and a cell can read its own; a cell with `visibleWhen` shows only
 * once its condition holds.
 *
 * @spec openspec/changes/stat-grid-widget/specs/stat-grid-widget/spec.md
 */
jest.mock('../../src/utils/visibleWhen.js', () => ({ evaluateVisibleWhen: jest.fn() }))

import { flushPromises, mount } from '@vue/test-utils'
import CnStatGridWidget from '../../src/components/CnStatGridWidget/CnStatGridWidget.vue'
import { evaluateVisibleWhen } from '../../src/utils/visibleWhen.js'

const CnStatWidget = { name: 'CnStatWidget', props: ['content'], template: '<div class="stat" :data-label="content.label" />' }

const DAY = { url: '/apps/dossiq/api/personal-queue/end-of-day' }
const HOURS = { url: '/apps/humaniq/api/time-entries/summary' }

/**
 * @param {object} content The widget content.
 * @return {Promise<object>} The mounted grid.
 */
async function mountGrid(content) {
	const wrapper = mount(CnStatGridWidget, { props: { content }, global: { stubs: { CnStatWidget } } })
	await flushPromises()
	return wrapper
}

const cells = (wrapper) => wrapper.findAllComponents({ name: 'CnStatWidget' })

describe('CnStatGridWidget', () => {
	beforeEach(() => evaluateVisibleWhen.mockReset())

	it('draws a flat stacked figure per cell, in columns, over the shared endpoint', async () => {
		const wrapper = await mountGrid({
			columns: 2,
			endpointSource: DAY,
			cells: [
				{ label: 'Opened', valueField: 'figures.0.value', caption: '{figures.0.note}' },
				{ label: 'Recorded', valueField: 'figures.1.value', caption: '{figures.1.note}' },
			],
		})
		expect(wrapper.find('[data-testid="cn-stat-grid"]').attributes('style')).toContain('--cn-stat-grid-columns: 2')
		expect(cells(wrapper).map((cell) => cell.props('content'))).toEqual([
			{ label: 'Opened', valueField: 'figures.0.value', caption: '{figures.0.note}', endpointSource: DAY, layout: 'stacked', flat: true },
			{ label: 'Recorded', valueField: 'figures.1.value', caption: '{figures.1.note}', endpointSource: DAY, layout: 'stacked', flat: true },
		])
	})

	it('lets a cell read its own endpoint', async () => {
		evaluateVisibleWhen.mockResolvedValue(true)
		const wrapper = await mountGrid({
			endpointSource: DAY,
			cells: [{ label: 'Opened', valueField: 'opened' }, { label: 'Hours', valueField: 'hours', endpointSource: HOURS }],
		})
		expect(cells(wrapper).map((cell) => cell.props('content').endpointSource)).toEqual([DAY, HOURS])
	})

	it('shows a cell with visibleWhen only once its condition holds, and never on a no', async () => {
		const condition = { appInstalled: 'humaniq' }
		evaluateVisibleWhen.mockResolvedValue(false)
		const hidden = await mountGrid({ endpointSource: DAY, cells: [{ label: 'Opened', valueField: 'opened' }, { label: 'Hours', valueField: 'hours', endpointSource: HOURS, visibleWhen: condition }] })
		expect(evaluateVisibleWhen).toHaveBeenCalledWith(condition, expect.any(Object))
		expect(cells(hidden).map((cell) => cell.props('content').label)).toEqual(['Opened'])

		evaluateVisibleWhen.mockResolvedValue(true)
		const shown = await mountGrid({ endpointSource: DAY, cells: [{ label: 'Opened', valueField: 'opened' }, { label: 'Hours', valueField: 'hours', endpointSource: HOURS, visibleWhen: condition }] })
		expect(cells(shown).map((cell) => cell.props('content').label)).toEqual(['Opened', 'Hours'])
		expect(cells(shown)[1].props('content').visibleWhen).toBeUndefined()
	})

	it('draws nothing for a content without cells', async () => {
		const wrapper = await mountGrid({ endpointSource: DAY })
		expect(cells(wrapper)).toHaveLength(0)
	})
})
