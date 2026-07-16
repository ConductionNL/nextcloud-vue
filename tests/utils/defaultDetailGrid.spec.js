// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

import { defaultDetailGrid } from '../../src/utils/defaultDetailGrid.js'

describe('defaultDetailGrid', () => {
	it('returns a Data + Related grid by default', () => {
		const { widgets, layout } = defaultDetailGrid({ register: 'r', schema: 'dogs' })
		expect(widgets.map((w) => w.widgetId)).toEqual(['data', 'related'])
		expect(layout.map((l) => l.widgetId)).toEqual(['data', 'related'])
		expect(widgets[0].type).toBe('data')
		expect(widgets[1].type).toBe('related')
	})

	it('seeds the Data widget content with register/schema + empty overrides', () => {
		const { widgets } = defaultDetailGrid({ register: 'r', schema: 'dogs' })
		expect(widgets[0].content).toEqual({ register: 'r', schema: 'dogs', columns: 3, overrides: {} })
	})

	it('lays the widgets full-width, stacked (related below data)', () => {
		const { layout } = defaultDetailGrid({ register: 'r', schema: 'dogs' })
		expect(layout[0]).toMatchObject({ gridX: 0, gridY: 0, gridWidth: 12 })
		expect(layout[1].gridY).toBeGreaterThan(layout[0].gridY)
		expect(layout[1].gridWidth).toBe(12)
	})

	it('drops the Related widget when showRelated is false', () => {
		const { widgets, layout } = defaultDetailGrid({ register: 'r', schema: 'dogs', showRelated: false })
		expect(widgets.map((w) => w.widgetId)).toEqual(['data'])
		expect(layout.map((l) => l.widgetId)).toEqual(['data'])
	})

	it('tolerates missing register/schema', () => {
		const { widgets } = defaultDetailGrid()
		expect(widgets[0].content).toMatchObject({ register: '', schema: '' })
	})
})
