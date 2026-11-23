/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The facts card a record's programme and its work instruction need: a
 * progress figure that says what it means, a card that acts when it is
 * empty, a retry on a failed read, and a link into another app.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-card-can-show-progress
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-card-can-act-when-it-is-empty
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-a-facts-link-can-point-into-another-app
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const PROGRAMME = {
	source: { url: '/apps/x/api/items/@objectId/programme', path: 'programme' },
	fields: [
		{ as: 'title', path: 'name' },
		{
			as: 'progress',
			label: 'Progress of the programme',
			path: 'progress.progress',
			barWhen: { field: 'progress.computable', op: 'eq', value: true },
			lines: [
				{ when: { field: 'progress.computable', op: 'neq', value: true }, text: 'Progress cannot be computed.' },
				{ when: { field: 'progress.mode', op: 'eq', value: 'manual' }, text: '{progress.progress} percent done, entered by hand.' },
				{ text: '{progress.progress} percent done.' },
			],
		},
	],
	emptyText: 'This item does not hang under a programme.',
	emptyActions: [{ label: 'Link to a programme', type: 'open-modal', target: 'LinkDialog', props: { itemId: '@objectId', itemTitle: '@object.title' } }],
}

function mountFacts(content, provide = {}, record = { id: 'r-1', title: 'Fix the bridge' }) {
	return mount(CnFactsWidget, {
		props: { content, objectId: 'r-1', objectData: record },
		global: { provide, stubs: { NcLoadingIcon: true } },
	})
}

beforeEach(() => mockGet.mockReset())

describe('CnFactsWidget — progress', () => {
	it('draws the figure as a progressbar with the sentence that says what it means', async () => {
		mockGet.mockResolvedValue({ data: { available: true, programme: { name: 'Bridges', progress: { computable: true, progress: 40, mode: 'manual' } } } })
		const w = mountFacts(PROGRAMME)
		await flush()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/x/api/items/r-1/programme')
		const bar = w.find('[role="progressbar"]')
		expect(bar.attributes('aria-valuenow')).toBe('40')
		expect(bar.attributes('aria-label')).toBe('Progress of the programme')
		expect(w.text()).toContain('40 percent done, entered by hand.')
		expect(w.text()).toContain('Bridges')
	})

	it('never draws an uncomputable figure as zero', async () => {
		mockGet.mockResolvedValue({ data: { programme: { name: 'Bridges', progress: { computable: false, progress: null } } } })
		const w = mountFacts(PROGRAMME)
		await flush()
		expect(w.find('[role="progressbar"]').exists()).toBe(false)
		expect(w.text()).toContain('Progress cannot be computed.')
	})

	it('offers its empty actions, with the record tokens resolved, when the part is empty', async () => {
		mockGet.mockResolvedValue({ data: { available: true, programme: null } })
		const dispatch = jest.fn()
		const w = mountFacts(PROGRAMME, { cnDispatchAction: dispatch })
		await flush()
		expect(w.find('[data-testid="cn-facts-empty"]').text()).toBe('This item does not hang under a programme.')
		await w.find('[data-testid="cn-facts-empty-action"]').trigger('click')
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-modal', props: { itemId: 'r-1', itemTitle: 'Fix the bridge' } }))
	})

	it('leaves out an entry whose when does not hold', async () => {
		const w = mountFacts({ fields: [{ path: 'title', label: 'Title', when: { field: 'archived', op: 'eq', value: true } }], emptyText: 'Nothing' })
		await flush()
		expect(w.text()).toContain('Nothing')
	})
})

describe('CnFactsWidget — a failed read', () => {
	it('says so as an alert and offers to try again', async () => {
		mockGet.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({ data: { programme: { name: 'Bridges', progress: {} } } })
		const w = mountFacts({ ...PROGRAMME, errorText: 'The programme could not be read' })
		await flush()
		const error = w.find('[data-testid="cn-facts-error"]')
		expect(error.attributes('role')).toBe('alert')
		expect(error.text()).toContain('The programme could not be read')
		await w.find('[data-testid="cn-facts-retry"]').trigger('click')
		await flush()
		expect(w.text()).toContain('Bridges')
	})
})

describe('CnFactsWidget — a link into another app', () => {
	const INSTRUCTION = {
		source: { register: 'x', schema: 'itemType', id: '@object.itemType' },
		link: { label: 'Read how we handle this', href: '{knowledgeBasePage}', hrefBase: '/apps/collectives/', target: '_blank' },
	}

	it('puts a page path under the base and opens it in a new tab', async () => {
		mockGet.mockResolvedValue({ data: { id: 't-1', knowledgeBasePage: '/Handbook/Permits' } })
		const w = mountFacts(INSTRUCTION, {}, { id: 'r-1', itemType: 't-1' })
		await flush()
		const link = w.find('[data-testid="cn-facts-link"]')
		expect(link.attributes('href')).toBe('/index.php/apps/collectives/Handbook/Permits')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	it('keeps an http(s) URL and refuses any other scheme', async () => {
		mockGet.mockResolvedValue({ data: { knowledgeBasePage: 'https://wiki.example/x' } })
		const ok = mountFacts(INSTRUCTION, {}, { id: 'r-1', itemType: 't-1' })
		await flush()
		expect(ok.find('[data-testid="cn-facts-link"]').attributes('href')).toBe('https://wiki.example/x')
		mockGet.mockResolvedValue({ data: { knowledgeBasePage: 'javascript:alert(1)' } })
		const bad = mountFacts(INSTRUCTION, {}, { id: 'r-1', itemType: 't-1' })
		await flush()
		expect(bad.find('[data-testid="cn-facts-link"]').exists()).toBe(false)
	})

	it('says nothing when the type names no page', async () => {
		mockGet.mockResolvedValue({ data: { id: 't-1' } })
		const w = mountFacts(INSTRUCTION, {}, { id: 'r-1', itemType: 't-1' })
		await flush()
		expect(w.text()).toBe('')
	})
})
