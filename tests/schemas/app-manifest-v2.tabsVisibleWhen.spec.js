/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/tabs-widget-visible-if/tasks.md#task-1
 */
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const manifest = (tabs) => ({
	$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
	version: '1.0.0',
	menu: [],
	pages: [{
		id: 'case',
		route: '/cases/:id',
		type: 'detail',
		title: 'Case',
		config: { register: 'r', schema: 'case' },
		widgets: [{ widgetKey: 'tabs', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4, id: 'panels', props: { content: { tabs } } }],
	}],
})

describe('tabs widget: visibleWhen on a tab entry', () => {
	it('accepts a source-mode condition', () => {
		const result = validateManifestV2(manifest([{ id: 'participants', widgetId: 'w', visibleWhen: { source: { register: 'r', schema: 'role', filter: { case: '@objectId' } }, field: '@total', op: 'gt', value: 0 } }]))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts a local condition and a tab without the key', () => {
		expect(validateManifestV2(manifest([{ widgetId: 'a', visibleWhen: { field: 'decision', op: 'neq', value: null } }, { widgetId: 'b' }, 'c'])).valid).toBe(true)
	})

	it('refuses a condition that is not a visibleWhen predicate', () => {
		const result = validateManifestV2(manifest([{ id: 'participants', widgetId: 'w', visibleWhen: 'when-there-are-roles' }]))
		expect(result.valid).toBe(false)
		expect(JSON.stringify(result.errors)).toContain('visibleWhen')
	})
})
