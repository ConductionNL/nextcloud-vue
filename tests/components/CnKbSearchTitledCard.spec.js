/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqKlant / PqOrganisatie "Kennisbank": the knowledge-base search in a detail
 * page's side column is a titled card. pl6 on :8080 drew the bare field
 * under the side cards, with no card and no title.
 *
 * @spec openspec/changes/kb-search-titled-card/specs/detail-page/spec.md
 */
const { isContentOnlyWidgetDef } = require('../../src/utils/widgetDispatch.js')

describe('kb-search on a detail card surface', () => {
	it('is content only, so the host draws its titled card', () => {
		expect(isContentOnlyWidgetDef({ type: 'kb-search' })).toBe(true)
	})
})
