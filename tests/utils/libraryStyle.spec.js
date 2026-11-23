/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * installLibraryStyle: one library stylesheet per page, the newest build wins.
 * A page that runs several apps' builds of the library (the dashboard and
 * launchpad load every app's widgets) held up to eight copies, and an older
 * copy overrode the newer one rule by rule.
 *
 * @spec openspec/changes/library-css-once-per-page/specs/library-stylesheet/spec.md#requirement-the-library-stylesheet-is-on-a-page-once-the-newest-build-winning
 */
import { installLibraryStyle } from '../../src/utils/libraryStyle.js'

const OLD = '2026-09-01T10:00:00.000Z'
const NEW = '2026-10-13T10:00:00.000Z'
const sheets = () => [...document.querySelectorAll('style[data-cn-library]')]

describe('installLibraryStyle', () => {
	afterEach(() => {
		sheets().forEach((node) => node.remove())
	})

	test('the first build adds one sheet at the end of the head', () => {
		const other = document.createElement('style')
		document.head.appendChild(other)
		expect(installLibraryStyle('.a{color:red}', OLD)).toBe('added')
		expect(sheets()).toHaveLength(1)
		expect(document.head.lastElementChild).toBe(sheets()[0])
		other.remove()
	})

	test('a newer build replaces the sheet in place, an older one is kept out', () => {
		installLibraryStyle('.a{color:red}', OLD)
		expect(installLibraryStyle('.a{color:green}', NEW)).toBe('replaced')
		expect(sheets()).toHaveLength(1)
		expect(sheets()[0].textContent).toBe('.a{color:green}')
		expect(sheets()[0].getAttribute('data-cn-library')).toBe(NEW)
		expect(installLibraryStyle('.a{color:red}', OLD)).toBe('kept')
		expect(sheets()[0].textContent).toBe('.a{color:green}')
	})

	test('the same build twice keeps one sheet', () => {
		installLibraryStyle('.a{color:red}', NEW)
		expect(installLibraryStyle('.a{color:red}', NEW)).toBe('kept')
		expect(sheets()).toHaveLength(1)
	})

	test('no document or no stylesheet: nothing happens', () => {
		expect(installLibraryStyle('', NEW)).toBe('none')
		expect(sheets()).toHaveLength(0)
	})

	test('it can be serialised: no imports or outer names, as the build writes it into library-style.js', () => {
		// eslint-disable-next-line no-new-func
		const rebuilt = new Function(`${installLibraryStyle.toString()}; return installLibraryStyle`)()
		expect(rebuilt('.b{color:blue}', NEW, document)).toBe('added')
		expect(sheets()[0].textContent).toBe('.b{color:blue}')
	})
})
