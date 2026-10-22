/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stacked bar can read its groups from an app endpoint, colour each group
 * by a tone, show what is still to count as a remainder segment, and head
 * itself with a line filled from the numbers. DqZaakDocumenten draws
 * "4 van 7 beoordeeld" over Openbaar 2, Deels openbaar 1, Niet openbaar 1 and
 * Nog beoordelen 3, with "Nog 3 te gaan voor het besluit" beside the heading.
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStackedBarWidget from '../../src/components/CnStackedBarWidget/CnStackedBarWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const CONTENT = {
	endpointSource: { url: '/apps/dossiq/api/cases/@objectId/document-verdicts', responsePath: 'verdicts' },
	groupsPath: 'counts',
	totalPath: 'documents',
	order: ['openbaar', 'deels_openbaar', 'niet_openbaar'],
	labels: { openbaar: 'Openbaar', deels_openbaar: 'Deels openbaar', niet_openbaar: 'Niet openbaar' },
	colors: { openbaar: 'success', deels_openbaar: 'warning', niet_openbaar: 'error' },
	remainder: { key: 'open', label: 'Nog beoordelen' },
	heading: '{counted} van {total} beoordeeld',
	headingMeta: 'Nog {remaining} te gaan voor het besluit',
}

function mountBar(content = CONTENT) {
	return mount(CnStackedBarWidget, {
		props: { content },
		global: { provide: { cnObjectContext: { objectId: 'case-1' } } },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	invalidateEndpointSourceCache()
	axios.get.mockResolvedValue({ data: { verdicts: { documents: 7, counts: { openbaar: 2, deels_openbaar: 1, niet_openbaar: 1 } } } })
})

describe('CnStackedBarWidget from an endpoint', () => {
	it('reads the groups from the endpoint of the record on the page', async () => {
		const w = mountBar()
		await flush()
		expect(axios.get.mock.calls[0][0]).toContain('/apps/dossiq/api/cases/case-1/document-verdicts')
		const legend = w.findAll('[data-testid="cn-stacked-bar-legend-item"]').map((item) => item.text().replace(/\s+/g, ' '))
		expect(legend).toEqual(['Openbaar 2', 'Deels openbaar 1', 'Niet openbaar 1', 'Nog beoordelen 3'])
	})

	it('colours each group by its tone and the remainder as the neutral rest', async () => {
		const w = mountBar()
		await flush()
		const colors = w.findAll('.cn-stacked-bar__segment').map((segment) => segment.attributes('style'))
		expect(colors[0]).toContain('var(--color-success)')
		expect(colors[1]).toContain('var(--color-warning)')
		expect(colors[2]).toContain('var(--color-error)')
		expect(colors[3]).toContain('var(--color-background-darker)')
	})

	it('heads the bar with the numbers filled in', async () => {
		const w = mountBar()
		await flush()
		expect(w.find('[data-testid="cn-stacked-bar-heading"]').text()).toBe('4 van 7 beoordeeld')
		expect(w.find('[data-testid="cn-stacked-bar-heading-meta"]').text()).toBe('Nog 3 te gaan voor het besluit')
	})

	it('draws no remainder when everything is counted, and no heading when none is set', async () => {
		axios.get.mockResolvedValue({ data: { verdicts: { documents: 4, counts: { openbaar: 4 } } } })
		const { heading, headingMeta, ...rest } = CONTENT
		const w = mountBar(rest)
		await flush()
		const legend = w.findAll('[data-testid="cn-stacked-bar-legend-item"]').map((item) => item.text().replace(/\s+/g, ' '))
		expect(legend).toEqual(['Openbaar 4', 'Deels openbaar 0', 'Niet openbaar 0'])
		expect(w.find('[data-testid="cn-stacked-bar-heading"]').exists()).toBe(false)
	})
})
