const barrel = require('../../src/components/index.js')
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDialog and CnDialogHeader are part of the package root and the components
 * barrel, so an app dialog gets the board dialog header without a deep path.
 */
const root = require('../../src/index.js')
const CnDialogSfc = require('../../src/components/CnDialog/CnDialog.vue').default
const CnDialogHeaderSfc = require('../../src/components/CnDialogHeader/CnDialogHeader.vue').default

describe('board dialog components are exported', () => {
	for (const [label, mod] of [['package root', root], ['components barrel', barrel]]) {
		it(`${label} exports CnDialog`, () => {
			expect(mod.CnDialog).toBe(CnDialogSfc)
			expect(mod.CnDialog.name).toBe('CnDialog')
		})
		it(`${label} exports CnDialogHeader`, () => {
			expect(mod.CnDialogHeader).toBe(CnDialogHeaderSfc)
			expect(mod.CnDialogHeader.name).toBe('CnDialogHeader')
		})
	}
})
