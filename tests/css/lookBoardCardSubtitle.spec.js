/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A body card's subtitle in the board look, as the Dq boards draw it (55 of
 * 61 subtitles): 14px muted at line height 1.2, 3px under the title, and the
 * card's content 12px under it. r25b measured live 2px / 13px / 9.75px, so
 * every subtitled card started 3-7px high (Gerelateerde zaken, Deelzaken,
 * Objecten, Incidenten, Taken op deze zaak). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-card-subtitle-gaps/specs/board-card/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

const BODY = '.cn-look-board .cn-detail-page .cn-widget-wrapper:not(.cn-detail-page__side *)'

describe('look-board-detail.css: a body card subtitle', () => {
	it('stands 3px under the title', () => {
		expect(rule(BODY + ' .cn-widget-wrapper__title-stack:has(> .cn-widget-wrapper__subtitle)')).toContain('gap: 3px')
	})

	it('is 14px at line height 1.2', () => {
		const body = rule(BODY + ' .cn-widget-wrapper__subtitle')
		expect(body).toContain('font-size: 14px')
		expect(body).toContain('line-height: 1.2')
	})

	it('has the content start 12px under it', () => {
		expect(rule(BODY + ':has(> .cn-widget-wrapper__header .cn-widget-wrapper__subtitle) > .cn-widget-wrapper__content')).toContain('padding-top: 12px')
	})
})
