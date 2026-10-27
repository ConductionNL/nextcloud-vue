/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * "Markeer voor aandacht" is as wide as its label, as DqZaakAssistent draws it;
 * it was stretched across the side card (r31, 254px).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnAttentionFlagWidget/CnAttentionFlagWidget.vue'), 'utf8')

describe('CnAttentionFlagWidget compose button', () => {
	it('is not a wide button and keeps to its label', () => {
		const button = sfc.slice(sfc.indexOf('<NcButton'), sfc.indexOf('data-testid="cn-attention-flag-compose"'))
		expect(button).not.toMatch(/\bwide\b/)
		expect(button).toContain('class="cn-attention-flag__compose"')
		const at = sfc.indexOf('\n.cn-attention-flag__compose {')
		expect(sfc.slice(at, sfc.indexOf('}', at))).toContain('align-self: flex-start')
		expect(sfc).toContain('<FlagOutline :size="16" />')
	})
})
