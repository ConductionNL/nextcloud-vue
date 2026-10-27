/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The banner's note card draws no margin, with a rule strong enough to beat
 * NcNoteCard's own `.notecard` margin (r33 DqDashboard info line 15px low).
 * Read from the component's style block.
 */
import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnBannerWidget', 'CnBannerWidget.vue'), 'utf8')

describe('CnBannerWidget: the note card margin', () => {
	it('is zeroed with a doubled class', () => {
		const rule = source.match(/\.cn-banner-widget__card\.cn-banner-widget__card \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('margin: 0')
	})
})
