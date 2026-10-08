/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Header field chips of CnDetailPage (manifest `config.headerFields`).
 */
import { mount } from '@vue/test-utils'
import { normalizeHeaderFields, variantForColor } from '../../src/utils/headerFieldChips.js'

const mockFetchObject = jest.fn()
const mockStore = { objects: {}, registerObjectType: () => {}, fetchObject: (...a) => mockFetchObject(...a) }
jest.mock('../../src/store/useObjectStore.js', () => ({ useObjectStore: () => mockStore }))

const CnDetailHeaderChips = require('../../src/components/CnDetailPage/CnDetailHeaderChips.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const SCHEMA = {
	properties: {
		identifier: { type: 'string', title: 'Case number' },
		caseType: { type: 'string', $ref: 'caseType', title: 'Case type' },
		status: { type: 'string', $ref: 'status', title: 'Status' },
		assignee: { type: 'string', title: 'Assignee' },
		deadline: { type: 'string', title: 'Deadline' },
	},
}

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountChips(fields, object, extra = {}) {
	return mount(CnDetailHeaderChips, {
		propsData: { fields, object, schema: SCHEMA, register: 'dossiq', ...extra },
	})
}

describe('headerFields helpers', () => {
	it('normalises strings and objects, dropping unusable entries', () => {
		expect(normalizeHeaderFields(['identifier', { key: 'status', format: 'badge' }, '', { format: 'text' }, { key: 'x', format: 'nope' }, 'identifier']))
			.toEqual([
				{ key: 'identifier', format: 'text', labelField: '', colorField: '', warnWhenPast: false },
				{ key: 'status', format: 'badge', labelField: '', colorField: '', warnWhenPast: false },
			])
	})

	it('maps colours onto variants and unknown ones to neutral', () => {
		expect(variantForColor('warning')).toBe('warning')
		expect(variantForColor('neutral')).toBe('default')
		expect(variantForColor('chartreuse')).toBe('default')
	})
})

describe('CnDetailHeaderChips', () => {
	beforeEach(() => {
		mockFetchObject.mockReset()
		mockStore.objects = {}
	})

	it('renders chips in the declared order, each named by title and value', async () => {
		mockFetchObject.mockResolvedValue({ name: 'Bezwaar' })
		const w = mountChips(
			['identifier', { key: 'caseType', labelField: 'name' }, 'assignee'],
			{ identifier: 'Z-2026-001', caseType: 'ct-1', assignee: 'anna' },
		)
		await flush()
		const chips = w.findAll('.cn-detail-header-chips__chip')
		expect(chips.map((c) => c.attributes('data-testid'))).toEqual([
			'cn-detail-header-chip-identifier',
			'cn-detail-header-chip-caseType',
			'cn-detail-header-chip-assignee',
		])
		expect(chips.at(0).text()).toBe('Case number: Z-2026-001')
		expect(chips.at(1).text()).toBe('Case type: Bezwaar')
	})

	it('shows an unresolved reference as the id in mono, without throwing', async () => {
		mockFetchObject.mockRejectedValue(new Error('404'))
		const w = mountChips([{ key: 'caseType', labelField: 'name' }], { caseType: 'ct-gone' })
		await flush()
		const value = w.find('.cn-detail-header-chips__value')
		expect(value.text()).toBe('ct-gone')
		expect(value.classes()).toContain('cn-detail-header-chips__value--mono')
	})

	it('renders a badge from a reference with its colour variant, neutral when unknown', async () => {
		mockFetchObject.mockResolvedValue({ name: 'In review', color: 'warning' })
		const w = mountChips([{ key: 'status', format: 'badge', labelField: 'name', colorField: 'color' }], { status: 's-1' })
		await flush()
		const chip = w.find('.cn-detail-header-chips__chip')
		expect(chip.classes()).toContain('cn-detail-header-chips__chip--warning')
		expect(chip.text()).toContain('In review')

		mockFetchObject.mockResolvedValue({ name: 'Odd', color: 'chartreuse' })
		const w2 = mountChips([{ key: 'status', format: 'badge', labelField: 'name', colorField: 'color' }], { status: 's-2' })
		await flush()
		expect(w2.find('.cn-detail-header-chips__chip').classes()).toContain('cn-detail-header-chips__chip--default')
	})

	it('gives a past deadline the error variant and a title with the full date', () => {
		const yesterday = new Date(Date.now() - 86400000).toISOString()
		const w = mountChips([{ key: 'deadline', format: 'date', warnWhenPast: true }], { deadline: yesterday })
		const chip = w.find('.cn-detail-header-chips__chip')
		expect(chip.classes()).toContain('cn-detail-header-chips__chip--error')
		expect(w.find('time').attributes('title')).not.toBe('')
		expect(w.find('time').attributes('datetime')).toBe(yesterday)
	})

	it('leaves a future deadline unwarned', () => {
		const tomorrow = new Date(Date.now() + 86400000).toISOString()
		const w = mountChips([{ key: 'deadline', format: 'date', warnWhenPast: true }], { deadline: tomorrow })
		expect(w.find('.cn-detail-header-chips__chip').classes()).not.toContain('cn-detail-header-chips__chip--error')
	})

	it('renders no chip for an empty value, keeps the order, and no row when all are empty', () => {
		const w = mountChips(['identifier', 'assignee', 'deadline'], { identifier: 'Z-1', assignee: '', deadline: null })
		expect(w.findAll('.cn-detail-header-chips__chip').length).toBe(1)
		const empty = mountChips(['identifier'], { identifier: null })
		expect(empty.find('.cn-detail-header-chips').exists()).toBe(false)
	})

	it('hides the title from sight but not from assistive technology', () => {
		const w = mountChips(['identifier'], { identifier: 'Z-1' })
		const hidden = w.find('.hidden-visually')
		expect(hidden.text()).toBe('Case number:')
	})
})

describe('CnDetailPage headerFields', () => {
	it('declares the prop with an empty default, so a page without it renders no row', () => {
		expect(CnDetailPage.props.headerFields.default()).toEqual([])
	})
})

describe('headerFields in the manifest schema', () => {
	const manifest = (headerFields) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'case-detail', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'dossiq', schema: 'case', headerFields } }],
	})

	it('accepts strings and objects', () => {
		const result = validateManifestV2(manifest(['identifier', { key: 'status', format: 'badge', labelField: 'name', colorField: 'color' }, { key: 'deadline', format: 'date', warnWhenPast: true }]))
		expect(result.valid).toBe(true)
	})

	it('refuses an unknown format and an entry without a key', () => {
		expect(validateManifestV2(manifest([{ key: 'x', format: 'sparkle' }])).valid).toBe(false)
		expect(validateManifestV2(manifest([{ format: 'text' }])).valid).toBe(false)
	})
})
