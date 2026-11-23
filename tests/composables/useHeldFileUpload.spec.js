/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { heldFromFailures, splitHeldFiles, uploadHeldFiles } from '../../src/composables/useHeldFileUpload.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => `/index.php${p}` }))

const big = (name) => new File([new Uint8Array(10)], name, { type: 'application/pdf' })

beforeEach(() => {
	jest.clearAllMocks()
})

describe('splitHeldFiles', () => {
	it('takes held files out of the payload, keeping a list\'s inline and existing entries', () => {
		const f = big('drawing.pdf')
		const { payload, held, kept } = splitHeldFiles({ title: 'x', drawing: f, photos: ['data:image/png;base64,AA', f, { id: 7 }] }, ['drawing', 'photos'])
		expect(payload).toEqual({ title: 'x', drawing: null, photos: ['data:image/png;base64,AA', { id: 7 }] })
		expect(held.drawing).toEqual([f])
		expect(held.photos).toEqual([f])
		expect(kept.photos).toHaveLength(2)
		expect(kept.drawing).toBeUndefined()
	})

	it('leaves a payload without held files as it is', () => {
		const data = { a: 'data:text/plain;base64,AA', b: [] }
		const { payload, held } = splitHeldFiles(data, ['a', 'b'])
		expect(payload).toEqual(data)
		expect(held).toEqual({})
	})
})

describe('uploadHeldFiles', () => {
	it('posts each file to filesMultipart with progress, then writes the reference on the property', async () => {
		axios.post.mockImplementation(async (url, body, options) => {
			options.onUploadProgress({ loaded: 5, total: 10 })
			return { data: { files: [{ id: 'file-1', title: 'drawing.pdf' }] } }
		})
		axios.patch.mockResolvedValue({})
		const onProgress = jest.fn()
		const f = big('drawing.pdf')
		const out = await uploadHeldFiles({ register: 'permits', schema: 'permit', objectId: 'P1', held: { drawing: [f] }, onProgress })
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][0]).toBe('/index.php/apps/openregister/api/objects/permits/permit/P1/filesMultipart')
		expect(axios.post.mock.calls[0][1].get('files[]')).toBe(f)
		expect(onProgress).toHaveBeenCalledWith({ key: 'drawing', file: 'drawing.pdf', loaded: 5, total: 10 })
		expect(axios.patch).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/permits/permit/P1', { drawing: { id: 'file-1', title: 'drawing.pdf' } })
		expect(out).toMatchObject({ uploaded: 1, failed: [] })
	})

	it('a list property keeps its other entries and appends the references', async () => {
		axios.post.mockResolvedValue({ data: [{ id: 'f9' }] })
		axios.patch.mockResolvedValue({})
		await uploadHeldFiles({ register: 'r', schema: 's', objectId: '1', held: { photos: [big('a.pdf')] }, kept: { photos: [{ id: 'f1' }] } })
		expect(axios.patch.mock.calls[0][1]).toEqual({ photos: [{ id: 'f1' }, { id: 'f9' }] })
	})

	it('a failed upload names the file, patches nothing, and can be retried', async () => {
		axios.post.mockRejectedValueOnce(new Error('413')).mockResolvedValueOnce({ data: { id: 'f2' } })
		axios.patch.mockResolvedValue({})
		const f = big('drawing.pdf')
		const first = await uploadHeldFiles({ register: 'r', schema: 's', objectId: '1', held: { drawing: [f] } })
		expect(first.failed).toEqual([{ key: 'drawing', file: f, reason: '413' }])
		expect(axios.patch).not.toHaveBeenCalled()

		const retry = await uploadHeldFiles({ register: 'r', schema: 's', objectId: '1', held: heldFromFailures(first.failed) })
		expect(retry.failed).toEqual([])
		expect(axios.patch).toHaveBeenCalledTimes(1)
	})

	it('a property that could not be patched reports its files as not attached', async () => {
		axios.post.mockResolvedValue({ data: { id: 'f2' } })
		axios.patch.mockRejectedValue(new Error('500'))
		const out = await uploadHeldFiles({ register: 'r', schema: 's', objectId: '1', held: { d: [big('x.pdf')] } })
		expect(out.failed).toHaveLength(1)
	})
})
