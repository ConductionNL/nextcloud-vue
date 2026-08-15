/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The shared OpenRegister schema API contract.
 *
 * This module exists because the contract used to be reimplemented per app: the
 * schema EDITOR was shared (CnSchemaFormDialog), but each consumer wrote its own
 * save/delete — so OpenBuild learned to acknowledge a breaking change while
 * OpenRegister's own editor still could not save one at all. These tests pin the
 * contract itself, so both consumers inherit the same behaviour.
 */
import {
	saveSchema,
	deleteSchema,
	describeSchemaChange,
	SchemaBreakingChangeError,
	SchemaHasObjectsError,
} from '../../src/utils/schemaApi.js'

const axios = require('@nextcloud/axios').default

const breaking409 = () => ({
	response: {
		status: 409,
		data: {
			error: 'Schema change classified breaking; acknowledgeBreaking required.',
			classification: 'breaking',
			changes: [{ property: 'barn', kind: 'type_changed', old: 'string', new: 'object' }],
		},
	},
})

const hasObjects409 = (objectCount = 2) => ({
	response: { status: 409, data: { error: 'schema-has-objects', objectCount } },
})

describe('saveSchema', () => {
	beforeEach(() => { jest.resetAllMocks() })

	it('PUTs when an id is given, POSTs when it is not', async () => {
		axios.put = jest.fn().mockResolvedValue({ data: { id: 7 } })
		axios.post = jest.fn().mockResolvedValue({ data: { id: 9 } })

		await saveSchema({ title: 'Cow' }, { id: 7 })
		expect(axios.put).toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalled()

		jest.resetAllMocks()
		axios.put = jest.fn()
		axios.post = jest.fn().mockResolvedValue({ data: { id: 9 } })

		const created = await saveSchema({ title: 'Barn' })
		expect(axios.post).toHaveBeenCalled()
		expect(axios.put).not.toHaveBeenCalled()
		expect(created).toEqual({ id: 9 })
	})

	it('never acknowledges a breaking change by default', async () => {
		axios.put = jest.fn().mockResolvedValue({ data: {} })
		await saveSchema({ title: 'Cow' }, { id: 7 })
		expect(axios.put.mock.calls[0][0]).not.toContain('acknowledgeBreaking')
	})

	it('translates the breaking 409 into a typed error carrying the changes', async () => {
		axios.put = jest.fn().mockRejectedValue(breaking409())

		await expect(saveSchema({ title: 'Cow' }, { id: 7 })).rejects.toThrow(SchemaBreakingChangeError)

		try {
			await saveSchema({ title: 'Cow' }, { id: 7 })
		} catch (e) {
			expect(e.breaking).toBe(true)
			expect(e.changes).toEqual([{ property: 'barn', kind: 'type_changed', old: 'string', new: 'object' }])
		}
	})

	it('sends the acknowledgement when asked, and it lands', async () => {
		axios.put = jest.fn().mockResolvedValue({ data: { id: 7 } })
		await saveSchema({ title: 'Cow' }, { id: 7, acknowledgeBreaking: true })
		expect(axios.put.mock.calls[0][0]).toContain('acknowledgeBreaking=true')
	})

	// The endless-confirm bug, prevented at the contract level: once acknowledged, a
	// still-breaking refusal is NOT re-typed, so a caller cannot loop on it.
	it('does NOT re-raise the typed error when the attempt was already acknowledged', async () => {
		axios.put = jest.fn().mockRejectedValue(breaking409())

		await expect(saveSchema({ title: 'Cow' }, { id: 7, acknowledgeBreaking: true }))
			.rejects.not.toThrow(SchemaBreakingChangeError)
	})

	it('passes other failures through untouched', async () => {
		axios.put = jest.fn().mockRejectedValue({ response: { status: 403, data: { error: 'forbidden' } } })
		await expect(saveSchema({ title: 'Cow' }, { id: 7 })).rejects.not.toThrow(SchemaBreakingChangeError)
	})
})

describe('deleteSchema', () => {
	beforeEach(() => { jest.resetAllMocks() })

	it('does not cascade by default', async () => {
		axios.delete = jest.fn().mockResolvedValue({ data: {} })
		await deleteSchema(7)
		expect(axios.delete.mock.calls[0][0]).not.toContain('deleteObjects')
		// `force` ORPHANS the objects — it must never be sent.
		expect(axios.delete.mock.calls[0][0]).not.toContain('force')
	})

	it('translates "schema still has objects" into a typed error carrying the count', async () => {
		axios.delete = jest.fn().mockRejectedValue(hasObjects409(3))

		try {
			await deleteSchema(7)
			throw new Error('should have thrown')
		} catch (e) {
			expect(e).toBeInstanceOf(SchemaHasObjectsError)
			expect(e.objectCount).toBe(3)
		}
	})

	it('cascades when asked', async () => {
		axios.delete = jest.fn().mockResolvedValue({ data: { deletedCount: 3 } })
		await deleteSchema(7, { deleteObjects: true })
		expect(axios.delete.mock.calls[0][0]).toContain('deleteObjects=true')
	})

	it('does NOT re-raise the typed error when the cascade itself still reports objects', async () => {
		axios.delete = jest.fn().mockRejectedValue(hasObjects409(1))
		await expect(deleteSchema(7, { deleteObjects: true })).rejects.not.toThrow(SchemaHasObjectsError)
	})
})

describe('describeSchemaChange', () => {
	const t = (app, text, vars) => (vars
		? text.replace(/\{(\w+)\}/g, (_, k) => vars[k])
		: text)

	it('reads as a sentence, with no raw placeholders or snake_case', () => {
		const text = describeSchemaChange(
			{ property: 'barn', kind: 'type_changed', old: 'string', new: 'object' }, t,
		)
		expect(text).toBe('barn: type changed (from string to object)')
		expect(text).not.toContain('{property}')
		expect(text).not.toContain('type_changed')
	})

	it('handles a null "old" and an object "new"', () => {
		const text = describeSchemaChange(
			{ property: 'size', kind: 'constraint_tightened', old: null, new: { enum: ['small'] } }, t,
		)
		expect(text).toContain('none')
		expect(text).toContain('{"enum":["small"]}')
	})

	it('survives a change with no old/new and a missing translator', () => {
		expect(describeSchemaChange({ property: 'x', kind: 'removed' })).toBe('x: removed')
		expect(describeSchemaChange(null)).toBe('')
	})
})
