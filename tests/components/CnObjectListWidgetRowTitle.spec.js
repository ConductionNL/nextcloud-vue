/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectListWidget passes `content.rowTitle` to its table, so a log whose
 * first column is plain text draws it as an ordinary cell (DqZaakAssistent
 * "Wat de assistent op deze zaak deed": the moment column read 15px/600).
 */
import fs from 'fs'
import path from 'path'

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default
const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'), 'utf8')

describe('CnObjectListWidget rowTitle', () => {
	it('reads the configured title look, link otherwise', () => {
		const rowTitle = (content) => CnObjectListWidget.computed.rowTitle.call({ content })
		expect(rowTitle({ rowTitle: 'text' })).toBe('text')
		expect(rowTitle({ rowTitle: 'plain' })).toBe('plain')
		expect(rowTitle({})).toBe('link')
		expect(rowTitle({ rowTitle: 'bold' })).toBe('link')
	})

	it('hands it to both of its tables', () => {
		expect(source.match(/:rowTitle="rowTitle"/g)).toHaveLength(2)
	})
})
