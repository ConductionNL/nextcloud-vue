/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-1
 */
import Ajv2020 from 'ajv/dist/2020.js'
import schema from '../../schemas/app-manifest.schema.json'
import {
	isValidWidgetPlaceholder,
	normalizeWidgetPlaceholder,
	resolveWidgetPlaceholder,
	WIDGET_PLACEHOLDER_SHAPES,
} from '../resolveWidgetPlaceholder.js'

describe('normalizeWidgetPlaceholder', () => {
	it.each(WIDGET_PLACEHOLDER_SHAPES)('accepts the shape name %s', (shape) => {
		expect(normalizeWidgetPlaceholder(shape)).toEqual({ shape })
	})

	it('accepts a shape with a count from 1 to 24', () => {
		expect(normalizeWidgetPlaceholder({ shape: 'rows', count: 5 })).toEqual({ shape: 'rows', count: 5 })
		expect(normalizeWidgetPlaceholder({ shape: 'tiles', count: 1 })).toEqual({ shape: 'tiles', count: 1 })
		expect(normalizeWidgetPlaceholder({ shape: 'lines', count: 24 })).toEqual({ shape: 'lines', count: 24 })
		expect(normalizeWidgetPlaceholder({ shape: 'block' })).toEqual({ shape: 'block' })
	})

	it.each([
		['spinner'], [''], [null], [undefined], [3], [[]], [{}],
		[{ shape: 'grid' }], [{ shape: 'rows', count: 0 }], [{ shape: 'rows', count: 25 }],
		[{ shape: 'rows', count: 2.5 }], [{ shape: 'rows', count: '5' }],
	])('refuses %p', (value) => {
		expect(normalizeWidgetPlaceholder(value)).toBeNull()
		expect(isValidWidgetPlaceholder(value)).toBe(false)
	})
})

describe('resolveWidgetPlaceholder', () => {
	it('the manifest wins over the registry', () => {
		expect(resolveWidgetPlaceholder({ type: 'chart', placeholder: 'counter' }, { placeholder: 'block' }, null)).toEqual({ shape: 'counter' })
	})

	it('the registry wins over the Nextcloud descriptor', () => {
		expect(resolveWidgetPlaceholder({}, { placeholder: { shape: 'rows', count: 3 } }, { placeholder: 'counter' })).toEqual({ shape: 'rows', count: 3 })
	})

	it('a Conduction Nextcloud widget uses its descriptor', () => {
		expect(resolveWidgetPlaceholder({ type: 'shillinq_revenue' }, undefined, { placeholder: 'counter' })).toEqual({ shape: 'counter' })
	})

	it('a widget of another vendor draws rows', () => {
		expect(resolveWidgetPlaceholder({ type: 'weather_status' }, undefined, { id: 'weather_status' })).toEqual({ shape: 'rows' })
		expect(resolveWidgetPlaceholder()).toEqual({ shape: 'rows' })
	})

	it('an invalid declaration is skipped so the next step decides', () => {
		expect(resolveWidgetPlaceholder({ placeholder: 'spinner' }, { placeholder: 'block' })).toEqual({ shape: 'block' })
		expect(resolveWidgetPlaceholder({ placeholder: 'spinner' }, null, { placeholder: { shape: 'rows', count: 99 } })).toEqual({ shape: 'rows' })
	})

	it('an app-registered type covers every widget of the type, one widget overrides it', () => {
		const entry = { placeholder: 'counter' }
		const widgets = [{ id: 'a' }, { id: 'b' }, { id: 'c', placeholder: 'block' }, { id: 'd' }]
		expect(widgets.map((w) => resolveWidgetPlaceholder(w, entry).shape)).toEqual(['counter', 'counter', 'block', 'counter'])
	})
})

describe('widgetDef.placeholder in the manifest schema', () => {
	const ajv = new Ajv2020({ allErrors: true, strict: false })
	const validate = ajv.compile({ ...schema.$defs.widgetDef, $defs: schema.$defs })

	it('accepts a shape name and a shape with a count', () => {
		expect(validate({ id: 'open-cases', title: 'Open', type: 'custom', placeholder: { shape: 'rows', count: 5 } })).toBe(true)
		expect(validate({ id: 'kpi', title: 'KPI', type: 'custom', placeholder: 'counter' })).toBe(true)
	})

	it('refuses an unknown shape, a count out of range and unknown keys', () => {
		expect(validate({ id: 'x', title: 'X', type: 'custom', placeholder: 'spinner' })).toBe(false)
		expect(validate({ id: 'x', title: 'X', type: 'custom', placeholder: { shape: 'rows', count: 25 } })).toBe(false)
		expect(validate({ id: 'x', title: 'X', type: 'custom', placeholder: { shape: 'rows', size: 2 } })).toBe(false)
	})
})
