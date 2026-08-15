/**
 * Tests for CnWidgetVisibilityRulesModal (cn-widget-library, Wave 4 — chrome).
 *
 * Covers the OR-across-rules / AND-within-a-rule model: adding rules and
 * appending AND-conditions to a target rule, each of the four condition kinds
 * (group / time / date / attribute) round-tripping through the builder, the
 * passed `rules` prop being seeded (not mutated), empty rules dropped on Save,
 * and Cancel / Esc discarding the working copy. NcModal / NcButton / NcSelect /
 * NcTextField are stubbed via tests/__mocks__/nextcloud-vue.js.
 */

import { mount } from '@vue/test-utils'
import CnWidgetVisibilityRulesModal from '../../src/dialogs/CnWidgetVisibilityRulesModal.vue'

/**
 * Mount the modal over a rule set.
 *
 * @param {Array<object>} rules the rule set to edit.
 * @param {object} [extraProps] extra props.
 * @return {object} the wrapper.
 */
function mountModal(rules = [], extraProps = {}) {
	return mount(CnWidgetVisibilityRulesModal, {
		propsData: { show: true, rules, ...extraProps },
	})
}

/**
 * Select a condition kind on the builder draft by its id.
 *
 * @param {object} vm the component instance.
 * @param {string} id the kind id.
 * @return {void}
 */
function pickKind(vm, id) {
	vm.conditionDraft.kind = vm.kindOptions.find((o) => o.id === id)
}

describe('CnWidgetVisibilityRulesModal', () => {
	it('seeds a deep working copy from the rules prop without mutating it', () => {
		const rules = [{ id: 'r1', conditions: [{ kind: 'group', groups: ['admin'] }] }]
		const wrapper = mountModal(rules)
		expect(wrapper.vm.draft).toHaveLength(1)
		expect(wrapper.vm.draft[0].conditions[0].groups).toEqual(['admin'])
		// Deep copy — editing the draft must not touch the prop.
		wrapper.vm.draft[0].conditions[0].groups.push('user')
		expect(rules[0].conditions[0].groups).toEqual(['admin'])
	})

	it('assigns a local id to rules that lack one', () => {
		const wrapper = mountModal([{ conditions: [] }])
		expect(wrapper.vm.draft[0].id).toBeTruthy()
	})

	it('addRule appends an empty OR-rule and targets it', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		expect(wrapper.vm.draft).toHaveLength(1)
		expect(wrapper.vm.targetRule).toBe(0)
		wrapper.vm.addRule()
		expect(wrapper.vm.draft).toHaveLength(2)
		expect(wrapper.vm.targetRule).toBe(1)
	})

	it('AND: appends multiple conditions to the same target rule', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'group')
		wrapper.vm.conditionDraft.groups = ['admin']
		wrapper.vm.addCondition()
		pickKind(wrapper.vm, 'attribute')
		wrapper.vm.conditionDraft.attribute = 'language'
		wrapper.vm.conditionDraft.value = 'nl'
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft[0].conditions).toHaveLength(2)
		expect(wrapper.vm.draft[0].conditions.map((c) => c.kind)).toEqual(['group', 'attribute'])
	})

	it('OR: builds a two-rule structure across rules', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'group')
		wrapper.vm.conditionDraft.groups = ['admin']
		wrapper.vm.addCondition()
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'group')
		wrapper.vm.conditionDraft.groups = ['user']
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft).toHaveLength(2)
		expect(wrapper.vm.draft[0].conditions[0].groups).toEqual(['admin'])
		expect(wrapper.vm.draft[1].conditions[0].groups).toEqual(['user'])
	})

	it('addCondition with no rules yet auto-creates the first rule', () => {
		const wrapper = mountModal([])
		pickKind(wrapper.vm, 'group')
		wrapper.vm.conditionDraft.groups = ['admin']
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft).toHaveLength(1)
		expect(wrapper.vm.draft[0].conditions[0].kind).toBe('group')
	})

	it('round-trips a group condition', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'group')
		wrapper.vm.conditionDraft.groups = ['a', 'b']
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft[0].conditions[0]).toEqual({ kind: 'group', groups: ['a', 'b'] })
	})

	it('round-trips a time-of-day condition', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'time')
		wrapper.vm.conditionDraft.startTime = '09:00'
		wrapper.vm.conditionDraft.endTime = '17:00'
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft[0].conditions[0]).toEqual({ kind: 'time', startTime: '09:00', endTime: '17:00' })
	})

	it('round-trips a date-range condition', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'date')
		wrapper.vm.conditionDraft.startDate = '2026-12-01'
		wrapper.vm.conditionDraft.endDate = '2026-12-31'
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft[0].conditions[0]).toEqual({ kind: 'date', startDate: '2026-12-01', endDate: '2026-12-31' })
	})

	it('round-trips a user-attribute condition', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule()
		pickKind(wrapper.vm, 'attribute')
		wrapper.vm.conditionDraft.attribute = 'language'
		wrapper.vm.conditionDraft.value = 'nl'
		wrapper.vm.addCondition()
		expect(wrapper.vm.draft[0].conditions[0]).toEqual({ kind: 'attribute', attribute: 'language', operator: 'equals', value: 'nl' })
	})

	it('canAddCondition gates each kind correctly', () => {
		const wrapper = mountModal([])
		pickKind(wrapper.vm, 'group')
		expect(wrapper.vm.canAddCondition).toBe(false)
		wrapper.vm.conditionDraft.groups = ['x']
		expect(wrapper.vm.canAddCondition).toBe(true)

		pickKind(wrapper.vm, 'time')
		wrapper.vm.conditionDraft.startTime = '09:00'
		expect(wrapper.vm.canAddCondition).toBe(false)
		wrapper.vm.conditionDraft.endTime = '10:00'
		expect(wrapper.vm.canAddCondition).toBe(true)
	})

	it('removeCondition and removeRule edit the working copy', () => {
		const wrapper = mountModal([
			{ id: 'r1', conditions: [{ kind: 'group', groups: ['a'] }, { kind: 'group', groups: ['b'] }] },
			{ id: 'r2', conditions: [{ kind: 'group', groups: ['c'] }] },
		])
		wrapper.vm.removeCondition(0, 0)
		expect(wrapper.vm.draft[0].conditions).toHaveLength(1)
		expect(wrapper.vm.draft[0].conditions[0].groups).toEqual(['b'])
		wrapper.vm.removeRule(1)
		expect(wrapper.vm.draft).toHaveLength(1)
	})

	it('Save emits the rebuilt array and drops empty rules', () => {
		const wrapper = mountModal([])
		wrapper.vm.addRule() // rule 0 — will get a condition
		pickKind(wrapper.vm, 'group')
		wrapper.vm.conditionDraft.groups = ['admin']
		wrapper.vm.addCondition()
		wrapper.vm.addRule() // rule 1 — left empty, should be dropped
		wrapper.vm.onSave()
		const emitted = wrapper.emitted('save')
		expect(emitted).toBeTruthy()
		expect(emitted[0][0]).toHaveLength(1)
		expect(emitted[0][0][0].conditions[0].groups).toEqual(['admin'])
	})

	it('Save does not mutate the original rules prop', () => {
		const rules = [{ id: 'r1', conditions: [{ kind: 'group', groups: ['admin'] }] }]
		const wrapper = mountModal(rules)
		wrapper.vm.draft[0].conditions[0].groups = ['changed']
		wrapper.vm.onSave()
		expect(rules[0].conditions[0].groups).toEqual(['admin'])
	})

	it('re-seeds the working copy when the modal re-opens', async () => {
		const rules = [{ id: 'r1', conditions: [{ kind: 'group', groups: ['admin'] }] }]
		const wrapper = mount(CnWidgetVisibilityRulesModal, { propsData: { show: false, rules } })
		// Dirty the closed working copy.
		wrapper.vm.draft = []
		await wrapper.setProps({ show: true })
		expect(wrapper.vm.draft).toHaveLength(1)
		expect(wrapper.vm.draft[0].conditions[0].groups).toEqual(['admin'])
	})

	it('Cancel emits close and never save', () => {
		const wrapper = mountModal([])
		wrapper.vm.onCancel()
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('save')).toBeFalsy()
	})

	it('Esc emits close and never save', () => {
		const wrapper = mountModal([])
		wrapper.vm.onKeydown({ key: 'Escape' })
		expect(wrapper.emitted('close')).toBeTruthy()
		expect(wrapper.emitted('save')).toBeFalsy()
	})
})
