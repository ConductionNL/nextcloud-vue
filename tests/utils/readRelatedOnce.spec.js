// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * readRelatedOnce: the data cards of one page share one read per related record.
 * @spec openspec/changes/related-record-read-once/specs/data-widget/spec.md#requirement-a-related-record-is-read-once-per-page-open
 */

import { forgetRelatedReads, readRelatedOnce, RELATED_READ_TTL } from '../../src/utils/readRelatedOnce.js'

describe('readRelatedOnce', () => {
	beforeEach(() => forgetRelatedReads())

	it('sends one read for callers of the same url and gives each the same answer', async () => {
		const get = jest.fn(async (url) => ({ data: { url } }))
		const answers = await Promise.all([1, 2, 3, 4, 5].map(() => readRelatedOnce('/objects/r/caseType/t1', get, 1000)))
		expect(get).toHaveBeenCalledTimes(1)
		expect(answers.every((a) => a.data.url === '/objects/r/caseType/t1')).toBe(true)
	})

	it('reads another url on its own', async () => {
		const get = jest.fn(async () => ({ data: {} }))
		await readRelatedOnce('/a', get, 1000)
		await readRelatedOnce('/b', get, 1000)
		expect(get).toHaveBeenCalledTimes(2)
	})

	it('reads again once the answer is older than the TTL', async () => {
		const get = jest.fn(async () => ({ data: {} }))
		await readRelatedOnce('/a', get, 1000)
		await readRelatedOnce('/a', get, 1000 + RELATED_READ_TTL - 1)
		expect(get).toHaveBeenCalledTimes(1)
		await readRelatedOnce('/a', get, 1000 + RELATED_READ_TTL)
		expect(get).toHaveBeenCalledTimes(2)
	})

	it('does not keep a failed read: the next caller tries again', async () => {
		const get = jest.fn()
			.mockRejectedValueOnce(new Error('503'))
			.mockResolvedValueOnce({ data: { name: 'Woo' } })
		await expect(readRelatedOnce('/a', get, 1000)).rejects.toThrow('503')
		await expect(readRelatedOnce('/a', get, 1001)).resolves.toEqual({ data: { name: 'Woo' } })
		expect(get).toHaveBeenCalledTimes(2)
	})

	it('forgets every kept read on request', async () => {
		const get = jest.fn(async () => ({ data: {} }))
		await readRelatedOnce('/a', get, 1000)
		forgetRelatedReads()
		await readRelatedOnce('/a', get, 1001)
		expect(get).toHaveBeenCalledTimes(2)
	})
})
