/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * detailWidgetVisibility: the records a detail page reads beside the loaded
 * one, and whether a widget's `visibleWhen` lets it show.
 *
 * @spec openspec/changes/detail-widgets-visible-when/specs/detail-widgets-visible-when/spec.md
 */
const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => ({
	__esModule: true,
	cnFetchJson: (...a) => mockFetchJson(...a),
}))

import {
	detailWidgetVisible,
	fetchVisibilityRows,
	visibilityContextRefs,
	widgetConditionData,
} from '../../src/utils/detailWidgetVisibility.js'

const CONTEXT = { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } }
const FAMILY = { field: '@context.caseType.category', op: 'in', value: ['Sociaal domein'] }

beforeEach(() => {
	mockFetchJson.mockReset()
})

describe('visibilityContextRefs', () => {
	it('names the record the loaded one points at', () => {
		expect(visibilityContextRefs(CONTEXT, { caseType: 'ct-1' }))
			.toEqual([{ key: 'caseType', register: 'dossiq', schema: 'caseType', id: 'ct-1' }])
	})

	it('reads an extended reference by its id', () => {
		expect(visibilityContextRefs(CONTEXT, { caseType: { id: 'ct-2', title: 'Woo' } })[0].id).toBe('ct-2')
	})

	it('gives an empty id when the record holds no reference', () => {
		expect(visibilityContextRefs(CONTEXT, { caseType: null })[0].id).toBe('')
	})

	it('reads nothing without a record or with an unusable entry', () => {
		expect(visibilityContextRefs(CONTEXT, null)).toEqual([])
		expect(visibilityContextRefs({ caseType: { field: 'caseType' } }, { caseType: 'x' })).toEqual([])
		expect(visibilityContextRefs(undefined, { caseType: 'x' })).toEqual([])
	})
})

describe('fetchVisibilityRows', () => {
	it('reads each named record from OpenRegister and caches it', async () => {
		mockFetchJson.mockResolvedValue({ id: 'ct-1', category: 'Sociaal domein' })
		const cache = new Map()
		const refs = visibilityContextRefs(CONTEXT, { caseType: 'ct-1' })
		const rows = await fetchVisibilityRows(refs, cache)
		expect(rows).toEqual({ caseType: { id: 'ct-1', category: 'Sociaal domein' } })
		expect(mockFetchJson).toHaveBeenCalledWith('/apps/openregister/api/objects/dossiq/caseType/ct-1')
		await fetchVisibilityRows(refs, cache)
		expect(mockFetchJson).toHaveBeenCalledTimes(1)
	})

	it('resolves a failed read and a missing reference as absent', async () => {
		mockFetchJson.mockRejectedValue(new Error('404'))
		expect(await fetchVisibilityRows(visibilityContextRefs(CONTEXT, { caseType: 'gone' }))).toEqual({ caseType: null })
		expect(await fetchVisibilityRows(visibilityContextRefs(CONTEXT, {}))).toEqual({ caseType: null })
		expect(mockFetchJson).toHaveBeenCalledTimes(1)
	})
})

describe('detailWidgetVisible', () => {
	const data = (category) => widgetConditionData({ id: 'c-1' }, { caseType: category ? { category } : null })

	it('shows a widget without visibleWhen, also before the record loads', () => {
		expect(detailWidgetVisible({ id: 'w' }, null)).toBe(true)
		expect(detailWidgetVisible({ id: 'w' }, data('Transparantie'))).toBe(true)
	})

	it('shows a widget only for the case types its condition names', () => {
		const widget = { id: 'family-plan', visibleWhen: FAMILY }
		expect(detailWidgetVisible(widget, data('Sociaal domein'))).toBe(true)
		expect(detailWidgetVisible(widget, data('Transparantie'))).toBe(false)
	})

	it('hides a conditional widget while the record or a named record is on its way', () => {
		const widget = { id: 'family-plan', visibleWhen: FAMILY }
		expect(detailWidgetVisible(widget, null)).toBe(false)
		expect(detailWidgetVisible(widget, data('Sociaal domein'), { pending: true })).toBe(false)
	})

	it('fails safe when the named record could not be read', () => {
		expect(detailWidgetVisible({ id: 'w', visibleWhen: FAMILY }, data(null))).toBe(false)
	})

	it('reads the record itself for a plain field condition', () => {
		const widget = { id: 'w', visibleWhen: { field: 'status', op: 'eq', value: 'open' } }
		expect(detailWidgetVisible(widget, widgetConditionData({ status: 'open' }))).toBe(true)
		expect(detailWidgetVisible(widget, widgetConditionData({ status: 'closed' }))).toBe(false)
	})

	it('takes a remote condition from its answer, hidden until there is one', () => {
		const widget = { id: 'w', visibleWhen: { source: { register: 'r', schema: 's' }, op: 'gt', value: 0 } }
		expect(detailWidgetVisible(widget, data('x'))).toBe(false)
		expect(detailWidgetVisible(widget, data('x'), { answers: { w: true } })).toBe(true)
	})

	it('composes conditions with any', () => {
		const widget = { id: 'w', visibleWhen: { any: [FAMILY, { field: 'gezinsplanId', op: 'notEmpty' }] } }
		expect(detailWidgetVisible(widget, widgetConditionData({ gezinsplanId: 'p-1' }, { caseType: null }))).toBe(true)
		expect(detailWidgetVisible(widget, data('Transparantie'))).toBe(false)
	})
})
