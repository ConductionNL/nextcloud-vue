/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { isSvgPath } from '../../src/utils/iconUtils.js'

describe('isSvgPath', () => {
	it('accepts a leading move command followed by a coordinate', () => {
		expect(isSvgPath('M12 2 4 6')).toBe(true)
		expect(isSvgPath('m1.5,2.5')).toBe(true)
		expect(isSvgPath('M-3 0')).toBe(true)
	})
	it('rejects registry names, CSS classes and URLs', () => {
		expect(isSvgPath('mdiAccount')).toBe(false)
		expect(isSvgPath('icon-checkmark')).toBe(false)
		expect(isSvgPath('https://example.com/icon.svg')).toBe(false)
		expect(isSvgPath('Map')).toBe(false)
	})
	it('rejects non-string values', () => {
		expect(isSvgPath(null)).toBe(false)
		expect(isSvgPath(undefined)).toBe(false)
		expect(isSvgPath(42)).toBe(false)
		expect(isSvgPath({})).toBe(false)
	})
})
