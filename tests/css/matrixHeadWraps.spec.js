/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A matrix column head breaks a long name inside its own column
 * (DqProcesanalyse "Dagen per fase": "Beoordeling ontvankelijkheid" ran into
 * "Zoeken documenten"). The columns are minmax(0, 1fr), so the head has to
 * wrap anywhere. Read from the component text.
 *
 * @spec openspec/changes/chart-matrix-head-wraps/specs/chart-matrix-head-wraps/spec.md#requirement-a-matrix-column-head-stays-in-its-column
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnChartWidget/CnChartWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnChartWidget matrix: a column head stays in its column', () => {
	it('wraps a long head anywhere', () => {
		const rule = source.match(/\n\.cn-chart-widget__matrix-head\s*\{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toMatch(/overflow-wrap:\s*anywhere/)
	})
})
