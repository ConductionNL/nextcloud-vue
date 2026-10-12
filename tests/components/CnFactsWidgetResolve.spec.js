/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget `resolve`: a fact whose value is a reference (an id, or a list
 * of ids) shows the label of the referenced object, not the id. The ids go to
 * the shared label resolver once per register and schema.
 */
var mockResolve = jest.fn()

jest.mock('../../src/composables/useRefLabels.js', () => ({
	__esModule: true,
	useRefLabels: () => ({ resolve: (...args) => mockResolve(...args) }),
}))

import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const task = { id: 't-1', caseType: 'ct-1', status: 'st-9', tags: ['a-1', 'a-2'], title: 'Check the plan' }

function mountFacts(content, objectData = task) {
	return mount(CnFactsWidget, {
		propsData: { content, objectData },
		provide: { cnTranslate: (key) => key },
		stubs: { NcLoadingIcon: true },
	})
}

describe('CnFactsWidget resolve', () => {
	beforeEach(() => {
		mockResolve.mockReset()
		mockResolve.mockImplementation(async (register, schema, ids) => Object.fromEntries(ids.map((id) => [id, schema === 'caseType' ? 'Building permit' : schema === 'status' ? 'In review' : `Label ${id}`])))
	})

	it('shows the label of the referenced object instead of the id', async () => {
		const w = mountFacts({
			fields: [
				{ path: 'caseType', label: 'Case type', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'name' } },
				{ path: 'status', label: 'Status', resolve: { register: 'dossiq', schema: 'status' } },
			],
		})
		await flush()
		expect(w.find('[data-testid="cn-fact-caseType"] .cn-facts-widget__value').text()).toBe('Building permit')
		expect(w.find('[data-testid="cn-fact-status"] .cn-facts-widget__value').text()).toBe('In review')
		expect(mockResolve).toHaveBeenCalledWith('dossiq', 'caseType', ['ct-1'], 'name')
		expect(w.text()).not.toContain('ct-1')
	})

	it('joins the labels of a list of references and resolves a line part', async () => {
		const w = mountFacts({
			fields: [
				{ path: 'tags', label: 'Tags', resolve: { register: 'dossiq', schema: 'tag' } },
				{ as: 'line', parts: ['title', { path: 'caseType', resolve: { register: 'dossiq', schema: 'caseType' } }] },
			],
		})
		await flush()
		expect(w.find('[data-testid="cn-fact-tags"] .cn-facts-widget__value').text()).toBe('Label a-1, Label a-2')
		expect(w.text()).toContain('Check the plan · Building permit')
	})

	it('shows nothing, never the id, while the label is unknown or cannot be read', async () => {
		mockResolve.mockImplementation(async (register, schema, ids) => Object.fromEntries(ids.map((id) => [id, null])))
		const w = mountFacts({ fields: [{ path: 'caseType', label: 'Case type', resolve: { register: 'dossiq', schema: 'caseType' } }], emptyText: 'Nothing' })
		await flush()
		expect(w.find('[data-testid="cn-fact-caseType"]').exists()).toBe(false)
		expect(w.text()).not.toContain('ct-1')
	})

	it('leaves a fact without resolve alone and asks for no labels', async () => {
		const w = mountFacts({ fields: [{ path: 'caseType', label: 'Case type' }] })
		await flush()
		expect(w.find('[data-testid="cn-fact-caseType"] .cn-facts-widget__value').text()).toBe('ct-1')
		expect(mockResolve).not.toHaveBeenCalled()
	})
	it('draws a resolved value as a pill: map on the resolved label, tone by label then by id', async () => {
		mockResolve.mockImplementation(async (register, schema, ids) => Object.fromEntries(ids.map((id) => [id, 'open'])))
		const w = mountFacts({
			fields: [
				{ as: 'pill', path: 'status', resolve: { register: 'dossiq', schema: 'status', labelField: 'state' }, map: { open: 'In behandeling' }, variantMap: { open: 'warning' } },
				{ as: 'pill', path: 'caseType', resolve: { register: 'dossiq', schema: 'status', labelField: 'state' }, colorMap: { 'ct-1': 'success' } },
			],
		})
		await flush()
		const pills = w.findAll('.cn-status-badge')
		expect(pills).toHaveLength(2)
		expect(pills[0].text()).toBe('In behandeling')
		expect(pills[0].classes().join(' ')).toContain('warning')
		expect(pills[1].text()).toBe('open')
		expect(pills[1].classes().join(' ')).toContain('success')
		expect(w.text()).not.toContain('st-9')
	})

	it('colours a resolved pill by a field of the referenced object (`resolve.toneField`)', async () => {
		mockResolve.mockImplementation(async (register, schema, ids, labelField) => Object.fromEntries(ids.map((id) => [id, labelField === 'state' ? 'closed' : 'Afgehandeld'])))
		const w = mountFacts({
			fields: [
				{ as: 'pill', path: 'status', resolve: { register: 'dossiq', schema: 'status', labelField: 'name', toneField: 'state' }, colorMap: { closed: 'success', Afgehandeld: 'error', 'st-9': 'error' } },
			],
		})
		await flush()
		const pill = w.find('.cn-status-badge')
		expect(pill.text()).toBe('Afgehandeld')
		expect(pill.classes().join(' ')).toContain('success')
		expect(mockResolve).toHaveBeenCalledWith('dossiq', 'status', ['st-9'], 'state')
		expect(mockResolve).toHaveBeenCalledWith('dossiq', 'status', ['st-9'], 'name')
	})
})
