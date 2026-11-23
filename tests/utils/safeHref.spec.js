/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */
import { safeHref, safeImageSrc } from '../../src/utils/safeHref.js'

describe('safeHref', () => {
	it.each([
		'https://example.com',
		'http://example.com/a',
		'mailto:info@example.com',
		'/apps/files',
	])('keeps %s', (url) => {
		expect(safeHref(url)).toBe(url)
	})

	it.each([
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		' javascript:alert(1)',
		'java\tscript:alert(1)',
		'data:text/html,<h1>x</h1>',
		'//evil.com',
		'/\\evil.com',
		'\\\\evil.com',
		'\t//evil.com',
		' //evil.com',
		'/\t/evil.com',
		'',
		null,
	])('rejects %p', (url) => {
		expect(safeHref(url)).toBe('#')
	})
})

describe('safeImageSrc', () => {
	it.each(['/\\evil.com/x.png', '\t//evil.com/x.png'])('rejects protocol-relative %p', (url) => {
		expect(safeImageSrc(url)).toBe('')
	})
})
