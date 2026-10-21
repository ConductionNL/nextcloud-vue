/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget's manifest `headerActions`: buttons in its card's title row
 * ("Flow uitvoeren", "Notitie toevoegen", "Bewerken"), gated by `visibleWhen`
 * and dispatched through the page's action dispatcher with the record's
 * tokens resolved.
 *
 * @spec openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-a-widget-declares-buttons-for-its-card-header
 */
import { resolveWidgetHeaderActions } from '../../src/utils/widgetHeaderActions.js'

const WIDGET = {
	id: 'case-flow-runs',
	type: 'flow-runs',
	headerActions: [
		{ label: 'Run flow', icon: 'Play', action: { type: 'open-modal', target: 'CnActionDialog', props: { objectId: '@objectId' } } },
		{ label: 'Edit', variant: 'primary', visibleWhen: { field: 'status', op: 'eq', value: 'open' }, action: { type: 'navigate', route: 'CaseEdit', params: { id: '@object.id' } } },
		{ label: 'No action' },
		{ action: { type: 'navigate' } },
	],
}

describe('resolveWidgetHeaderActions', () => {
	it('keeps the entries with a label and an action, translated, secondary by default', () => {
		const actions = resolveWidgetHeaderActions(WIDGET, { object: { id: 'c1', status: 'open' }, objectId: 'c1', translate: (k) => (k === 'Run flow' ? 'Flow uitvoeren' : k), dispatch: jest.fn() })
		expect(actions.map((a) => [a.label, a.icon, a.variant])).toEqual([['Flow uitvoeren', 'Play', 'secondary'], ['Edit', '', 'primary']])
	})

	it('drops an entry whose visibleWhen does not hold for the record', () => {
		const actions = resolveWidgetHeaderActions(WIDGET, { object: { id: 'c1', status: 'closed' }, objectId: 'c1', dispatch: jest.fn() })
		expect(actions.map((a) => a.label)).toEqual(['Run flow'])
	})

	it('drops an entry whose visibleWhen it cannot decide on the page', () => {
		const widget = { headerActions: [{ label: 'X', visibleWhen: { endpoint: '/api/can' }, action: { type: 'navigate' } }] }
		expect(resolveWidgetHeaderActions(widget, { object: {}, dispatch: jest.fn() })).toEqual([])
	})

	it('dispatches the action with the record tokens resolved', () => {
		const dispatch = jest.fn()
		const [run, edit] = resolveWidgetHeaderActions(WIDGET, { object: { id: 'c1', status: 'open' }, objectId: 'c1', dispatch })
		run.run()
		edit.run()
		expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'open-modal', target: 'CnActionDialog', props: { objectId: 'c1' } })
		expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'navigate', route: 'CaseEdit', params: { id: 'c1' } })
	})

	it('answers nothing for a widget without headerActions', () => {
		expect(resolveWidgetHeaderActions({ id: 'w' }, { object: {}, dispatch: jest.fn() })).toEqual([])
		expect(resolveWidgetHeaderActions(null, {})).toEqual([])
	})
})

describe('the manifest schema takes a widget\'s headerActions', () => {
	const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

	it('validates a detail page widget that declares them', () => {
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '2.139.0',
			menu: [],
			pages: [{
				id: 'CaseDetail',
				route: '/cases/:id',
				type: 'detail',
				title: 'Case',
				config: {
					register: 'r',
					schema: 's',
					widgets: [{ id: 'case-flow-runs', type: 'flow-runs', title: 'Flows', headerActions: WIDGET.headerActions.slice(0, 2) }],
					layout: [{ id: '1', widgetId: 'case-flow-runs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }],
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})
})
