/**
 * The app's @nextcloud/axios client skips axios 1.21's async XSRF-TOKEN cookie
 * read, which delays every request until window.cookieStore answers.
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { defaults: {} } }))

import axios from '@nextcloud/axios'
import { registerTranslations } from '../../src/l10n/index.js'
import { applyAxiosDefaults } from '../../src/utils/axiosDefaults.js'

describe('applyAxiosDefaults', () => {
	beforeEach(() => {
		axios.defaults = {}
	})

	it('turns the XSRF cookie read off on the shared client', () => {
		expect(applyAxiosDefaults()).toBe(true)
		expect(axios.defaults.withXSRFToken).toBe(false)
	})

	it('is idempotent', () => {
		applyAxiosDefaults()
		expect(applyAxiosDefaults()).toBe(true)
		expect(axios.defaults.withXSRFToken).toBe(false)
	})

	it('leaves an explicit app setting alone', () => {
		axios.defaults.withXSRFToken = true
		expect(applyAxiosDefaults()).toBe(false)
		expect(axios.defaults.withXSRFToken).toBe(true)
	})

	it('does nothing on a client without defaults', () => {
		axios.defaults = undefined
		expect(applyAxiosDefaults()).toBe(false)
	})

	it('runs as part of registerTranslations()', () => {
		registerTranslations()
		expect(axios.defaults.withXSRFToken).toBe(false)
	})
})
