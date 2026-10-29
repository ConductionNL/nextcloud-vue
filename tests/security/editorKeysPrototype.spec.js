/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Editors that write a value under a property name, a dot path or a cell name
 * never write through `__proto__`, `constructor` or `prototype` onto
 * Object.prototype (CodeQL js/prototype-polluting-assignment).
 */
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const { isPrototypeKey } = require('../../src/utils/prototypeKeys.js')
const CnSchemaPropertyActions = require('../../src/components/CnSchemaFormDialog/CnSchemaPropertyActions.vue').default
const CnFilterRowsEditor = require('../../src/components/CnFilterRowsEditor/CnFilterRowsEditor.vue').default
const CnStagesWidgetForm = require('../../src/components/CnStagesWidgetForm/CnStagesWidgetForm.vue').default
const CnLinksWidgetForm = require('../../src/components/CnLinksWidgetForm/CnLinksWidgetForm.vue').default
const CnObjectListWidgetForm = require('../../src/components/CnObjectListWidgetForm/CnObjectListWidgetForm.vue').default
const CnFormDialog = require('../../src/components/CnFormDialog/CnFormDialog.vue').default

const HOSTILE = ['__proto__', 'constructor', 'prototype']

afterEach(() => {
	delete Object.prototype.polluted
	delete Object.prototype.table
	delete Object.prototype.authorization
	delete Object.prototype.required
})

describe('isPrototypeKey', () => {
	it.each(HOSTILE)('flags %s', (key) => {
		expect(isPrototypeKey(key)).toBe(true)
	})

	it.each(['label', 'proto', '', 'Constructor'])('lets %j through', (key) => {
		expect(isPrototypeKey(key)).toBe(false)
	})
})

describe('CnSchemaPropertyActions', () => {
	/**
	 * @return {object} A component context with one real property.
	 */
	function ctx() {
		return {
			schema: { properties: { name: { type: 'file', items: {} } } },
			originalProperties: {},
			ensureRefIsString: () => {},
			isTableConfigDefault: () => false,
			getOriginalPropertyTableSetting: () => undefined,
		}
	}
	const m = CnSchemaPropertyActions.methods

	it.each(HOSTILE)('writes nothing for a property named %s', (key) => {
		const c = ctx()
		m.updatePropertySetting.call(c, key, 'polluted', 'yes')
		m.updatePropertyRequired.call(c, key, true)
		m.updateFilePropertySetting.call(c, key, 'polluted', 'yes')
		m.updateFileProperty.call(c, key, 'allowedTypes', 'a,b')
		m.updateFilePropertyTags.call(c, key, 'polluted', ['x'])
		m.updatePropertyTableSetting.call(c, key, 'polluted', 'yes')
		m.updatePropertyGroupPermission.call(c, key, 'admin', 'polluted', true)
		expect({}.polluted).toBeUndefined()
		expect({}.required).toBeUndefined()
		expect({}.table).toBeUndefined()
		expect({}.authorization).toBeUndefined()
	})

	it.each(HOSTILE)('writes no %s setting on a real property', (setting) => {
		const c = ctx()
		m.updatePropertySetting.call(c, 'name', setting, { polluted: 'yes' })
		m.updateFilePropertySetting.call(c, 'name', setting, { polluted: 'yes' })
		m.updatePropertyTableSetting.call(c, 'name', setting, { polluted: 'yes' })
		m.updatePropertyGroupPermission.call(c, 'name', 'admin', setting, true)
		expect({}.polluted).toBeUndefined()
		expect(Object.getPrototypeOf(c.schema.properties.name)).toBe(Object.prototype)
	})

	it('still writes an ordinary setting', () => {
		const c = ctx()
		m.updatePropertySetting.call(c, 'name', 'title', 'Name')
		m.updatePropertyRequired.call(c, 'name', true)
		m.updatePropertyTableSetting.call(c, 'name', 'default', true)
		m.updatePropertyGroupPermission.call(c, 'name', 'admin', 'read', true)
		expect(c.schema.properties.name).toMatchObject({
			title: 'Name',
			required: true,
			table: { default: true },
			authorization: { read: ['admin'] },
		})
	})
})

describe('cell and path editors', () => {
	it.each(HOSTILE)('CnFilterRowsEditor writes no %s cell', (cell) => {
		const c = { rows: [{ key: 'a', op: 'eq', value: '' }], emit: jest.fn() }
		CnFilterRowsEditor.methods.update.call(c, 0, cell, { polluted: 'yes' })
		expect({}.polluted).toBeUndefined()
		expect(c.emit).not.toHaveBeenCalled()
	})

	it('CnFilterRowsEditor still writes a value cell', () => {
		const c = { rows: [{ key: 'a', op: 'eq', value: '' }], emit: jest.fn() }
		CnFilterRowsEditor.methods.update.call(c, 0, 'value', 'x')
		expect(c.rows[0].value).toBe('x')
	})

	it.each(HOSTILE)('CnStagesWidgetForm walks no %s path segment', (key) => {
		const c = { draft: {}, emitChange: jest.fn() }
		CnStagesWidgetForm.methods.setPath.call(c, `${key}.polluted`, 'yes')
		CnStagesWidgetForm.methods.setPath.call(c, `a.${key}`, { polluted: 'yes' })
		expect({}.polluted).toBeUndefined()
		expect(c.emitChange).not.toHaveBeenCalled()
	})

	it('CnStagesWidgetForm still writes a dot path', () => {
		const c = { draft: {}, emitChange: jest.fn() }
		CnStagesWidgetForm.methods.setPath.call(c, 'transition.url', '/x')
		expect(c.draft).toEqual({ transition: { url: '/x' } })
	})

	it.each(HOSTILE)('CnLinksWidgetForm writes no %s field', (field) => {
		const c = { sections: [{ links: [{ label: 'a' }] }], emitUpdate: jest.fn() }
		CnLinksWidgetForm.methods.updateLink.call(c, 0, 0, field, { polluted: 'yes' })
		expect({}.polluted).toBeUndefined()
		expect(c.emitUpdate).not.toHaveBeenCalled()
	})

	it.each(HOSTILE)('CnObjectListWidgetForm writes no %s cell', (cell) => {
		const c = { columns: [{ key: 'a', label: 'A' }], emitChange: jest.fn(), humanizeKey: (k) => k }
		CnObjectListWidgetForm.methods.updateColumn.call(c, 0, cell, { polluted: 'yes' })
		expect({}.polluted).toBeUndefined()
		expect(c.emitChange).not.toHaveBeenCalled()
	})

	it.each(HOSTILE)('CnFormDialog writeDotted walks no %s segment', (key) => {
		const c = { formData: { a: {} }, updateField: jest.fn() }
		CnFormDialog.methods.writeDotted.call(c, `a.${key}.polluted`, 'yes')
		CnFormDialog.methods.writeDotted.call(c, `a.b.${key}`, { polluted: 'yes' })
		expect({}.polluted).toBeUndefined()
		expect(c.updateField).not.toHaveBeenCalled()
	})

	it('CnFormDialog writeDotted still writes a nested field', () => {
		const c = { formData: { a: { b: 1 } }, updateField: jest.fn() }
		CnFormDialog.methods.writeDotted.call(c, 'a.c.d', 2)
		expect(c.updateField).toHaveBeenCalledWith('a', { b: 1, c: { d: 2 } })
	})
})
