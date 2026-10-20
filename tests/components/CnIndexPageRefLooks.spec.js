/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page reads the colour and icon of the records its badge columns
 * point at and hands them to the cells, in the table and in the list view.
 * The computed and the loader are called on a plain context: the page's other
 * thousands of lines have no part in this.
 *
 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record
 */
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const { refLookSpecs, refLookIds, renderedListConfig } = CnIndexPage.computed
const { loadRefLooks } = CnIndexPage.methods

const badge = { key: 'caseType', widget: 'badge', widgetProps: { variant: 'info', resolve: { colorField: 'colour', iconField: 'icon' } } }
const schema = { properties: { caseType: { type: 'string', format: 'uuid', $ref: 'caseType' }, title: { type: 'string' } } }

describe('CnIndexPage badge looks', () => {
	it('names the badge columns that resolve a colour or an icon, from the table and the list', () => {
		const ctx = { tableColumns: ['title', badge, { key: 'status', widget: 'badge' }], listConfig: { trailing: [badge] }, effectiveSchema: schema, register: 'dossiq' }
		expect(refLookSpecs.call(ctx)).toEqual([{ key: 'caseType', register: 'dossiq', schema: 'caseType', colorField: 'colour', iconField: 'icon' }])
	})

	it('collects the ids on screen and hands the looks to the list cells', () => {
		const specs = [{ key: 'caseType', register: 'dossiq', schema: 'caseType', colorField: 'colour', iconField: 'icon' }]
		const ids = refLookIds.call({ refLookSpecs: specs, displayObjects: [{ caseType: 't2' }, { caseType: 't1' }, { caseType: 't2' }] })
		expect(ids).toEqual({ caseType: ['t1', 't2'] })
		const looks = { t1: { color: 'red', icon: 'FileDocumentOutline' } }
		const config = renderedListConfig.call({ listConfig: { titleField: 'title', trailing: [badge] }, refLookSpecs: specs, refLooks: { caseType: looks } })
		expect(config.trailing[0].widgetProps).toEqual({ ...badge.widgetProps, looks })
		expect(config.titleField).toBe('title')
	})

	it('reads colour and icon strictly, once per column, for the ids it has not read', async () => {
		const resolve = jest.fn(async (register, schemaSlug, ids, field) => Object.fromEntries(ids.map((id) => [id, field === 'colour' ? 'red' : 'Gavel'])))
		const ctx = {
			refLookSpecs: [{ key: 'caseType', register: 'dossiq', schema: 'caseType', colorField: 'colour', iconField: 'icon' }],
			refLookIds: { caseType: ['t1', 't2'] },
			refLooks: { caseType: { t1: { color: 'blue', icon: null } } },
			_refLabelResolver: { resolve },
		}
		await loadRefLooks.call(ctx)
		expect(resolve).toHaveBeenCalledWith('dossiq', 'caseType', ['t2'], 'colour', { strict: true })
		expect(resolve).toHaveBeenCalledWith('dossiq', 'caseType', ['t2'], 'icon', { strict: true })
		expect(ctx.refLooks.caseType).toEqual({ t1: { color: 'blue', icon: null }, t2: { color: 'red', icon: 'Gavel' } })
	})
})
