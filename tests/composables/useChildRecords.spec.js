/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-child-records-table/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { describeRowProblem, diffChildren, useChildRecords, validateChildRows } from '../../src/composables/useChildRecords.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const target = { register: 'shop', schema: 'order-line', parentField: 'order', parentId: 'o-1' }

describe('diffChildren', () => {
	it('sends new and changed rows, deletes removed ones, skips untouched ones', () => {
		const original = [{ id: 1, qty: 1 }, { id: 2, qty: 2 }, { id: 3, qty: 3 }]
		const rows = [{ id: 1, qty: 1 }, { id: 2, qty: 5 }, { qty: 9 }]
		expect(diffChildren(original, rows)).toEqual({ toSave: [{ id: 2, qty: 5 }, { qty: 9 }], toDelete: ['3'] })
	})
})

describe('validateChildRows', () => {
	const schema = { required: ['product', 'order'], properties: { product: { title: 'Product' } } }

	it('names the row and the field, and never asks for the parent reference', () => {
		const problems = validateChildRows([{ product: 'a' }, { qty: 2 }], schema, 'order')
		expect(problems).toEqual([{ row: 2, field: 'product', label: 'Product' }])
		expect(describeRowProblem(problems)).toBe('Row 2 needs a value for Product.')
	})
})

describe('useChildRecords', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
	})

	it('loads the children of a parent', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 1 }], total: 80 } })
		const { rows, total } = await useChildRecords().load(target)
		expect(axios.get.mock.calls[0][0]).toContain('/objects/shop/order-line?order=o-1&_limit=50')
		expect(rows).toHaveLength(1)
		expect(total).toBe(80)
	})

	it('saves in exactly two requests with the parent reference set, nothing nested', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const result = await useChildRecords().save({
			...target,
			original: [{ id: 1, qty: 1 }, { id: 2, qty: 2 }],
			rows: [{ id: 1, qty: 4 }, { qty: 7 }],
		})
		expect(axios.post).toHaveBeenCalledTimes(2)
		const [saveUrl, saveBody] = axios.post.mock.calls[0]
		expect(saveUrl).toContain('/bulk/shop/order-line/save')
		expect(saveBody.objects).toEqual([{ id: 1, qty: 4, order: 'o-1' }, { qty: 7, order: 'o-1' }])
		const [deleteUrl, deleteBody] = axios.post.mock.calls[1]
		expect(deleteUrl).toContain('/bulk/shop/order-line/delete')
		expect(deleteBody).toEqual({ uuids: ['2'] })
		expect(result).toMatchObject({ saved: 2, deleted: 1, failed: [] })
	})

	it('names a refused row with its reason', async () => {
		axios.post.mockRejectedValue({ response: { status: 403 } })
		const result = await useChildRecords().save({ ...target, original: [], rows: [{ qty: 1 }] })
		expect(result.failed).toHaveLength(1)
		expect(result.failed[0].reason).toBe('You may not write these rows.')
	})

	it('sends nothing when nothing changed', async () => {
		const rows = [{ id: 1, qty: 1 }]
		await useChildRecords().save({ ...target, original: rows, rows })
		expect(axios.post).not.toHaveBeenCalled()
	})
})
