/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stored reference URL (a selectielijst class) read as words ("6.1,
 * Ingewilligd") through a lookup endpoint, asked once per URL, with the
 * URL's last segment when the lookup fails.
 */
import axios from '@nextcloud/axios'
import { __resetReferenceLabels, referenceLabel, referenceTail } from '../../src/utils/referenceLabel.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const URL = 'https://selectielijst.openzaak.nl/api/v1/resultaten/3fc7002b-31b6-4abe-82af-b6d46a9a1736'
const LOOKUP = { url: '/apps/openregister/api/archival/selectielijst/resolve', param: 'url', label: '{code}, {name}' }

describe('referenceLabel', () => {
	beforeEach(() => {
		axios.get.mockReset()
		__resetReferenceLabels()
	})

	it('reads the label through the lookup once per URL', async () => {
		axios.get.mockResolvedValue({ data: { code: '6.1', name: 'Ingewilligd' } })
		expect(await referenceLabel(URL, LOOKUP)).toBe('6.1, Ingewilligd')
		expect(await referenceLabel(URL, LOOKUP)).toBe('6.1, Ingewilligd')
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/archival/selectielijst/resolve', { params: { url: URL } })
	})

	it('falls back to the last segment of the URL when the lookup fails', async () => {
		axios.get.mockRejectedValue(new Error('404'))
		expect(await referenceLabel(URL, LOOKUP)).toBe('3fc7002b-31b6-4abe-82af-b6d46a9a1736')
	})

	it('leaves a value that is no URL as it is, and asks nothing without a lookup', async () => {
		expect(await referenceLabel('11.1.2, Woo-verzoeken', LOOKUP)).toBe('11.1.2, Woo-verzoeken')
		expect(await referenceLabel(URL, null)).toBe('3fc7002b-31b6-4abe-82af-b6d46a9a1736')
		expect(axios.get).not.toHaveBeenCalled()
		expect(referenceTail('https://x.org/a/b/')).toBe('b')
	})
})
