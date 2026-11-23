/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqSociaalDomein: a side notice's slotted material icon takes the board's
 * 18px box. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-notice-slotted-icon/specs/board-notice-slotted-icon/spec.md#requirement-a-side-notices-slotted-icon-is-18px
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const icon = '.cn-look-board .cn-detail-page__side-item--notice .cn-banner-widget__card > .material-design-icon:not(.cn-look-nextcloud *)'

describe('look-board-detail.css: slotted notice icon', () => {
	it('sizes the bare material icon 18px', () => {
		const at = css.indexOf('\n' + icon + ' {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('width: 18px;')
		expect(body).toContain('height: 18px;')
	})
})
