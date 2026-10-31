/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqFlow: the canvas toolbar floats over the top of the canvas, so a
 * fit that ignores it puts the first steps under the toolbar and its validity
 * pill takes their clicks. The fit keeps clear of whatever floats over it.
 */
import { fitPaddingFor, overlayInset } from '../../src/utils/overlayInset.js'

const FRAME = { top: 100, left: 300, right: 1300, bottom: 740, width: 1000, height: 640 }

describe('overlayInset', () => {
	it('🔴 reserves the height of a wide strip along the top', () => {
		const toolbar = { top: 100, left: 300, right: 900, bottom: 148, width: 600, height: 48 }
		expect(overlayInset(FRAME, [toolbar])).toEqual({ top: 48, right: 0, bottom: 0, left: 0 })
	})

	it('reserves a strip along the foot from the bottom', () => {
		const legend = { top: 690, left: 348, right: 1300, bottom: 740, width: 952, height: 50 }
		expect(overlayInset(FRAME, [legend])).toEqual({ top: 0, right: 0, bottom: 50, left: 0 })
	})

	it('reserves the width of a tall panel on its own side', () => {
		const panel = { top: 100, left: 954, right: 1300, bottom: 600, width: 346, height: 500 }
		expect(overlayInset(FRAME, [panel])).toEqual({ top: 0, right: 346, bottom: 0, left: 0 })
	})

	it('takes the largest reach per side and skips what is not drawn', () => {
		const card = { top: 100, left: 300, right: 1046, bottom: 240, width: 746, height: 140 }
		const toolbar = { top: 100, left: 300, right: 900, bottom: 148, width: 600, height: 48 }
		const hidden = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
		expect(overlayInset(FRAME, [toolbar, card, hidden, null])).toEqual({ top: 140, right: 0, bottom: 0, left: 0 })
	})

	it('reserves nothing without a frame', () => {
		expect(overlayInset(null, [FRAME])).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
	})
})

describe('fitPaddingFor', () => {
	it('keeps Vue Flow\'s own padding when nothing floats over the canvas', () => {
		expect(fitPaddingFor(null)).toBe(0.1)
		expect(fitPaddingFor({ top: 0, right: 0, bottom: 0, left: 0 })).toBe(0.1)
	})

	it('🔴 pads each side by its inset plus a gap, in pixels', () => {
		expect(fitPaddingFor({ top: 48, right: 346 })).toEqual({ top: '72px', right: '370px', bottom: '24px', left: '24px' })
		expect(fitPaddingFor({ top: 48 }, 16)).toEqual({ top: '64px', right: '16px', bottom: '16px', left: '16px' })
	})
})
