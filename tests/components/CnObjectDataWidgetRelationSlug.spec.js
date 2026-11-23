// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget — relation target slug (learniq round-1 defect 7).
 *
 * `relationProp()` turns a schema property's `$ref` into the
 * `{register}/{schema}` target the detail page fetches to display and pick
 * related objects. A `$ref` is authored as the referenced schema's
 * PascalCase TITLE ("ReportPeriod"), not its slug ("report-period"); the
 * objects API resolves schemas by slug and 404s on a multi-word title
 * (verified 2026-09-25: `ReportPeriod`/`LearnerProfile` 404,
 * `report-period`/`learner-profile` 200). That 404 is why `ReportCardDetail`
 * rendered with every relation panel blank — this locks the fix in place.
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

function mountWith(schema, objectData, register) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData },
		mocks: { t: (app, s) => s },
		provide: {
			cnObjectContext: { register, schema: 'reportCard' },
		},
	})
}

describe('CnObjectDataWidget relationProp — $ref title to objects-API slug', () => {
	it('kebab-cases a multi-word PascalCase $ref title into the relation target', () => {
		const schema = {
			properties: {
				reportPeriodId: { type: 'string', format: 'uuid', $ref: 'ReportPeriod' },
			},
		}
		const w = mountWith(schema, { reportPeriodId: 'abc-1' }, 'learniq')
		const rel = w.vm.relationProp(schema.properties.reportPeriodId)
		expect(rel).toEqual({ target: 'learniq/report-period' })
	})

	it('kebab-cases an array $ref (items.$ref) the same way', () => {
		const schema = {
			properties: {
				learners: { type: 'array', items: { $ref: 'LearnerProfile' } },
			},
		}
		const w = mountWith(schema, { learners: ['a', 'b'] }, 'learniq')
		const rel = w.vm.relationProp(schema.properties.learners)
		expect(rel).toEqual({ target: 'learniq/learner-profile' })
	})

	it('leaves a single-word $ref (already effectively a slug) working as before', () => {
		const schema = {
			properties: {
				cohortId: { type: 'string', format: 'uuid', $ref: 'Cohort' },
			},
		}
		const w = mountWith(schema, { cohortId: 'c-1' }, 'learniq')
		const rel = w.vm.relationProp(schema.properties.cohortId)
		expect(rel).toEqual({ target: 'learniq/cohort' })
	})

	it('leaves an already-kebab-case $ref untouched', () => {
		const schema = {
			properties: {
				reportPeriodId: { type: 'string', format: 'uuid', $ref: 'report-period' },
			},
		}
		const w = mountWith(schema, { reportPeriodId: 'abc-1' }, 'learniq')
		const rel = w.vm.relationProp(schema.properties.reportPeriodId)
		expect(rel).toEqual({ target: 'learniq/report-period' })
	})

	it('passes a numeric schema id through unchanged', () => {
		const schema = {
			properties: {
				caseTypeId: { type: 'string', format: 'uuid', $ref: 85 },
			},
		}
		const w = mountWith(schema, { caseTypeId: 'ct-1' }, 'learniq')
		const rel = w.vm.relationProp(schema.properties.caseTypeId)
		expect(rel).toEqual({ target: 'learniq/85' })
	})
})
