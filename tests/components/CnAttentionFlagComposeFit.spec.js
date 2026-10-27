/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * "Markeer voor aandacht" spans the side card, label at the start, as every
 * case board draws it (254px on DqZaak, DqZaakEmail, DqZaakAssistent and the
 * other case tabs, r32; live was 202px wide).
 */
import fs from 'fs'
import path from 'path'

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnAttentionFlagWidget/CnAttentionFlagWidget.vue'), 'utf8')

describe('CnAttentionFlagWidget compose button', () => {
	it('is a wide button', () => {
		const button = sfc.slice(sfc.indexOf('<NcButton'), sfc.indexOf('data-testid="cn-attention-flag-compose"'))
		expect(button).toMatch(/\bwide\b/)
		expect(button).toContain('class="cn-attention-flag__compose"')
	})

	it('keeps its flag and label at the start, the flag at 16px, as the boards draw it', () => {
		const button = sfc.slice(sfc.indexOf('<NcButton'), sfc.indexOf('</NcButton>'))
		expect(button).toContain('alignment="start"')
		expect(button).toContain('<FlagOutline :size="16" />')
	})

	it('is not held to its label width', () => {
		const at = sfc.indexOf('\n.cn-attention-flag__compose {')
		const body = at < 0 ? '' : sfc.slice(at, sfc.indexOf('}', at))
		expect(body).not.toContain('align-self: flex-start')
	})
})
