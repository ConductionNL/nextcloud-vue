/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { requestLanguage } from '../../src/utils/requestLanguage.js'

describe('requestLanguage', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('lang')
	})

	it('is the page language Nextcloud set on <html lang>', () => {
		document.documentElement.lang = 'nl'
		expect(requestLanguage()).toBe('nl')
	})

	it('keeps a regional page language as it is', () => {
		document.documentElement.lang = 'pt-BR'
		expect(requestLanguage()).toBe('pt-BR')
	})

	it('is en when the page has no lang attribute, not the browser language', () => {
		document.documentElement.removeAttribute('lang')
		expect(navigator.language).not.toBe('')
		expect(requestLanguage()).toBe('en')
	})

	it('is en when the lang attribute is blank', () => {
		document.documentElement.lang = '  '
		expect(requestLanguage()).toBe('en')
	})
})
