/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))
jest.mock('../../src/utils/appInstalled.js', () => ({ isAppInstalled: jest.fn() }))

const axios = require('@nextcloud/axios').default
const { isAppInstalled } = require('../../src/utils/appInstalled.js')
const { getAssistantMark, resetAssistantMark } = require('../../src/utils/assistantMark.js')

const MARK = {
	enabled: true,
	label: 'Approved by Gemeente Voorbeeld',
	organisation: 'Gemeente Voorbeeld',
	logo: { url: '/apps/thematiq/img/logos/voorbeeld.svg', alt: 'Gemeente Voorbeeld logo' },
}

describe('getAssistantMark', () => {
	beforeEach(() => {
		resetAssistantMark()
		axios.get.mockReset()
		isAppInstalled.mockReset().mockReturnValue(true)
	})

	it('returns the mark when thematiq reports it enabled', async () => {
		axios.get.mockResolvedValue({ data: MARK })
		await expect(getAssistantMark()).resolves.toEqual(MARK)
		expect(axios.get).toHaveBeenCalledWith('/apps/thematiq/api/assistant-mark')
	})

	it('keeps the label alone when logo is null', async () => {
		axios.get.mockResolvedValue({ data: { ...MARK, logo: null } })
		const mark = await getAssistantMark()
		expect(mark.logo).toBeNull()
		expect(mark.label).toBe(MARK.label)
	})

	it('makes no request when thematiq is not installed', async () => {
		isAppInstalled.mockReturnValue(false)
		await expect(getAssistantMark()).resolves.toBeNull()
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('makes one request however many callers ask', async () => {
		axios.get.mockResolvedValue({ data: MARK })
		await Promise.all([getAssistantMark(), getAssistantMark(), getAssistantMark()])
		expect(axios.get).toHaveBeenCalledTimes(1)
	})

	it.each([
		['disabled', { data: { enabled: false } }],
		['truthy but not true', { data: { ...MARK, enabled: 'yes' } }],
		['empty label', { data: { ...MARK, label: '  ' } }],
		['malformed body', { data: 'oops' }],
	])('resolves null for %s', async (_name, response) => {
		axios.get.mockResolvedValue(response)
		await expect(getAssistantMark()).resolves.toBeNull()
	})

	it('resolves null on a failed request, without retrying', async () => {
		axios.get.mockRejectedValue(new Error('500'))
		await expect(getAssistantMark()).resolves.toBeNull()
		await getAssistantMark()
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})
