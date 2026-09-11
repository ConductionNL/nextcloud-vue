/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStagesWidgetForm and the `stages` registry entry: the type is placeable
 * on a detail page, offered in its widget picker, and editable in the in-app
 * editor without losing config.
 */
import { shallowMount } from '@vue/test-utils'
import CnStagesWidgetForm from '../../src/components/CnStagesWidgetForm/CnStagesWidgetForm.vue'
import CnStagesWidget from '../../src/components/CnStagesWidget/CnStagesWidget.vue'
import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import {
	getDefaultContent,
	getWidgetTypeEntry,
	listWidgetTypes,
} from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

const DOSSIQ_TIMELINE = {
	currentField: 'status',
	orientation: 'horizontal',
	size: 'medium',
	ariaLabel: 'Case progress',
	stagesEndpoint: {
		url: '/apps/dossiq/api/case-types/@object.caseType/blueprint',
		path: 'statusTypes',
		labelField: 'name',
		descriptionField: 'description',
		orderField: 'order',
		finalField: 'isFinal',
		resultsPath: 'resultTypes',
	},
	availability: {
		url: '/apps/dossiq/api/case/@objectId/available-transitions',
		path: 'transitions',
		stageField: 'toStatus',
		moveField: 'id',
		allowedField: 'guardsPassed',
		reasonField: 'failedGuards.0.failureMessage',
	},
	transition: {
		kind: 'endpoint',
		url: '/apps/dossiq/api/case/@objectId/transition',
		method: 'POST',
		bodyKey: 'transitionId',
		commentKey: 'comment',
		resultKey: 'resultTypeId',
		errorField: 'failedGuards.0.failureMessage',
	},
	confirm: 'always',
}

/**
 * Mount the form on a stored content blob.
 *
 * @param {object|null} content The stored content, or null for create mode.
 * @return {object} The wrapper.
 */
function mountForm(content) {
	return shallowMount(CnStagesWidgetForm, { props: content ? { editingWidget: { content } } : {} })
}

describe('the stages registry entry', () => {
	it('registers the renderer and the form under `stages`', () => {
		const entry = getWidgetTypeEntry('stages')
		expect(entry.renderer).toBe(CnStagesWidget)
		expect(entry.form).toBe(CnStagesWidgetForm)
	})

	it('is offered in the detail page picker and not on a dashboard', () => {
		expect(listWidgetTypes('detail-page')).toContain('stages')
		expect(listWidgetTypes('app-dashboard')).not.toContain('stages')
	})

	it('seeds a new placement with a usable default', () => {
		expect(getDefaultContent('stages')).toMatchObject({ currentField: 'status', transition: { kind: 'field' } })
	})
})

describe('CnStagesWidgetForm', () => {
	it('round-trips the dossiq timeline config unchanged', () => {
		const w = mountForm(DOSSIQ_TIMELINE)
		w.vm.setPath('ariaLabel', 'Case progress')

		expect(w.emitted('update:content').at(-1)[0]).toEqual(DOSSIQ_TIMELINE)
	})

	it('keeps keys it does not show', () => {
		const w = mountForm({ ...DOSSIQ_TIMELINE, availability: { ...DOSSIQ_TIMELINE.availability, unlistedReason: 'Not from here' } })
		w.vm.setPath('size', 'small')

		expect(w.emitted('update:content').at(-1)[0].availability.unlistedReason).toBe('Not from here')
	})

	it('writes only the chosen stage source', () => {
		const w = mountForm(DOSSIQ_TIMELINE)
		w.vm.setStagesKind('source')
		w.vm.setPath('stagesSource.register', 'dossiq')
		w.vm.setPath('stagesSource.schema', 'statusType')

		const emitted = w.emitted('update:content').at(-1)[0]
		expect(emitted.stagesEndpoint).toBeUndefined()
		expect(emitted.stagesSource).toEqual({ register: 'dossiq', schema: 'statusType' })
	})

	it('writes the source filter from the filter rows', () => {
		const w = mountForm(null)
		w.vm.setStagesKind('source')
		w.vm.onFilterRows([{ key: 'caseType', op: 'eq', value: '@object.caseType' }])

		expect(w.emitted('update:content').at(-1)[0].stagesSource.filter).toEqual({ caseType: '@object.caseType' })
	})

	it('drops the transition, guards and confirm for a read-only strip', () => {
		const w = mountForm(DOSSIQ_TIMELINE)
		w.vm.setTransitionKind('none')

		const emitted = w.emitted('update:content').at(-1)[0]
		expect(emitted.transition).toBeUndefined()
		expect(emitted.availability).toBeUndefined()
		expect(emitted.confirm).toBeUndefined()
	})

	it('validates the required keys', () => {
		const w = mountForm({ currentField: '', stagesEndpoint: { url: '' }, transition: { kind: 'endpoint' } })
		expect(w.vm.validate()).toEqual([
			'The property holding the current stage is required',
			'An address for the stages is required',
			'An address for the transition is required',
		])
		expect(mountForm(DOSSIQ_TIMELINE).vm.validate()).toEqual([])
	})
})
