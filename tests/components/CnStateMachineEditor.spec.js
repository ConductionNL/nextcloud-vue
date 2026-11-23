/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStateMachineEditor: every edit leaves as an event and nothing is changed in
 * place; each pointer gesture has a keyboard route; the property panels build
 * the record from field descriptors without losing keys they do not describe.
 *
 * CnGraphCanvas is stubbed with a component that renders the node and
 * edge-label slots, because jsdom has no layout for Vue Flow to measure. The
 * canvas's own keyboard contract is covered by CnGraphCanvas.spec.js.
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnStateMachineEditor from '../../src/components/CnStateMachineEditor/CnStateMachineEditor.vue'
import { buildRecord, readRecord } from '../../src/components/CnStateMachineEditor/stateMachineFields.js'

const CanvasStub = {
	name: 'CnGraphCanvas',
	props: ['nodes', 'edges', 'readOnly', 'snapToGrid', 'fitView'],
	emits: ['nodes-change', 'edges-change', 'connect', 'node-select', 'node-activate', 'node-remove', 'node-menu', 'edge-select', 'edge-label-click', 'edge-label-move', 'canvas-click', 'canvas-drop'],
	setup(props, { slots }) {
		return () => h('div', { class: 'canvas-stub' }, [
			...props.nodes.map((node) => h('div', { class: 'node-stub', 'data-id': node.id }, slots.node ? slots.node({ node }) : [])),
			...props.edges.map((edge) => h('div', { class: 'edge-stub', 'data-id': edge.id }, slots['edge-label'] ? slots['edge-label']({ edge }) : [])),
		])
	},
}

const setResult = jest.fn()
const DeleteDialogStub = {
	name: 'CnDeleteDialog',
	props: ['item', 'nameField', 'dialogTitle', 'warningText', 'irreversible'],
	emits: ['confirm', 'close'],
	methods: { setResult },
	render() {
		return h('div', { class: 'delete-dialog-stub' }, `${this.dialogTitle}|${this.warningText}`)
	},
}

const STATES = [
	{ id: 's1', name: 'Received', isFinal: false },
	{ id: 's2', name: 'Handled', isFinal: true },
]

const TRANSITIONS = [{ id: 't1', fromStatus: 's1', toStatus: 's2', label: 'Finish', guards: [] }]

const STEPS = [
	{ id: 'p2', status: 's1', title: 'Second', order: 2 },
	{ id: 'p1', status: 's1', title: 'First', order: 1, isRequired: true, checklist: '[{"id":"c1","label":"Check"}]', custom: 'kept' },
]

const STEP_FIELDS = [
	{ key: 'title', type: 'text', label: 'Title' },
	{ key: 'isRequired', type: 'checkbox', label: 'Required step' },
	{ key: 'checklist', type: 'list', itemType: 'object', itemKey: 'label', idKey: 'id', idPrefix: 'check-', newItem: { label: '', description: '' }, label: 'Checklist', reorderable: true },
	{
		type: 'group',
		label: 'Advanced',
		collapsible: true,
		lockable: true,
		lockedNotice: 'Published versions are not editable.',
		fields: [{
			key: 'config',
			type: 'group',
			prune: true,
			omitWhenEmpty: true,
			fields: [
				{ key: 'sla', type: 'group', requireAll: true, defaults: { value: null, unit: '' }, fields: [{ type: 'row', fields: [{ key: 'value', type: 'number', label: 'SLA' }, { key: 'unit', type: 'select', label: 'SLA unit', options: [{ value: '', label: 'No SLA' }, { value: 'hours', label: 'hours' }] }] }] },
				{ key: 'requiredFields', type: 'list', label: 'Required fields' },
				{ key: 'escalationRule', type: 'group', optional: true, toggleLabel: 'Enable escalation', defaults: { trigger: 'preBreach', offset: 0 }, fields: [{ key: 'offset', type: 'number', label: 'Offset' }] },
			],
		}],
	},
]

const TRANSITION_FIELDS = [
	{ key: 'label', type: 'text', label: 'Label' },
	{ key: 'allowedRoles', type: 'checkboxes', label: 'Allowed roles', optionSet: 'roles' },
	{
		key: 'guards',
		type: 'typed-list',
		label: 'Guards',
		addLabel: 'Add guard',
		newItem: { type: 'checklist' },
		types: [
			{ value: 'checklist', label: 'Checklist complete' },
			{ value: 'requiredField', label: 'Required field', fields: [{ key: 'fieldName', type: 'text', label: 'Field name' }] },
			{ value: 'webhook', label: 'Webhook', hidden: true, fields: [{ key: 'url', type: 'text', label: 'URL' }] },
		],
	},
]

const CONFIG = {
	keys: {
		stateLabel: 'name',
		stateFinal: 'isFinal',
		transitionFrom: 'fromStatus',
		transitionTo: 'toStatus',
		stepState: 'status',
		stepRequired: 'isRequired',
		stepBadge: 'checklist',
	},
	stepFields: STEP_FIELDS,
	transitionFields: TRANSITION_FIELDS,
	labels: { addState: 'Add status node' },
}

/**
 * @param {object} props Props over the defaults.
 * @param {object} provide Provided values.
 * @return {object} The wrapper.
 */
function mountEditor(props = {}, provide = {}) {
	return mount(CnStateMachineEditor, {
		props: {
			states: STATES,
			transitions: TRANSITIONS,
			steps: STEPS,
			config: CONFIG,
			optionSets: { roles: [{ value: 'r1', label: 'Handler' }, { value: 'r2', label: 'Manager' }] },
			...props,
		},
		global: {
			stubs: { CnGraphCanvas: CanvasStub, CnDeleteDialog: DeleteDialogStub },
			provide,
		},
	})
}

beforeEach(() => {
	setResult.mockClear()
})

describe('CnStateMachineEditor', () => {
	describe('the canvas', () => {
		it('draws a node per state and an edge per transition, with the host\'s record keys', () => {
			const wrapper = mountEditor()
			const canvas = wrapper.findComponent(CanvasStub)
			expect(canvas.props('nodes').map((node) => node.id)).toEqual(['s1', 's2'])
			expect(canvas.props('edges')).toHaveLength(1)
			expect(canvas.props('edges')[0]).toMatchObject({ source: 's1', target: 's2' })
			expect(wrapper.findAll('.node-stub')[1].text()).toContain('Final')
			expect(wrapper.find('.edge-stub').text()).toBe('Finish')
		})

		it('places a state without a position on the grid, and a stored one where it was', () => {
			const nodes = mountEditor({ positions: { s2: { x: 7, y: 9 } } }).findComponent(CanvasStub).props('nodes')
			expect(nodes[0].position).toEqual({ x: 100, y: 100 })
			expect(nodes[1].position).toEqual({ x: 7, y: 9 })
		})

		it('lists a state\'s steps in order, required marked in text as well as by sign', () => {
			const steps = mountEditor().findAll('.node-stub')[0].findAll('.cn-sm-node__step')
			expect(steps.map((step) => step.find('.cn-sm-node__step-name').text())).toEqual(['First', 'Second'])
			expect(steps[0].text()).toContain('required')
			expect(steps[0].find('.cn-sm-node__checks').text()).toBe('1')
		})

		it('does not draw a transition whose state is gone', () => {
			const edges = mountEditor({ transitions: [...TRANSITIONS, { id: 't2', fromStatus: 's1', toStatus: 'gone' }] })
				.findComponent(CanvasStub).props('edges')
			expect(edges.map((edge) => edge.id)).toEqual(['t1'])
		})

		it('reports a move and never applies it itself', async () => {
			const wrapper = mountEditor()
			await wrapper.findComponent(CanvasStub).vm.$emit('nodes-change', [{ type: 'position', id: 's1', position: { x: 10.4, y: 20.6 } }])
			expect(wrapper.emitted('state-move')[0][0]).toEqual({ id: 's1', x: 10, y: 21 })
		})
	})

	describe('adding states', () => {
		it('adds a state from the keyboard at the next grid slot and selects it', async () => {
			const wrapper = mountEditor()
			await wrapper.find('[data-testid="cn-state-machine-add-state"]').trigger('click')
			const [payload] = wrapper.emitted('state-add')[0]
			expect(payload.position).toEqual({ x: 600, y: 100 })
			expect(wrapper.find('[data-testid="cn-state-machine-add-state"]').text()).toContain('Add status node')
			payload.done('s1')
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.selection).toEqual({ kind: 'state', id: 's1' })
		})

		it('adds a state where the palette item is dropped, and ignores any other drop', async () => {
			const wrapper = mountEditor()
			const canvas = wrapper.findComponent(CanvasStub)
			await canvas.vm.$emit('canvas-drop', { position: { x: 5, y: 6 }, event: { dataTransfer: { types: ['Files'] } } })
			expect(wrapper.emitted('state-add')).toBeUndefined()
			await canvas.vm.$emit('canvas-drop', { position: { x: 5, y: 6 }, event: { dataTransfer: { types: ['application/x-cn-state-machine-state'] } } })
			expect(wrapper.emitted('state-add')[0][0].position).toEqual({ x: 5, y: 6 })
		})
	})

	describe('connecting', () => {
		it('offers every state not yet connected in the menu, and emits the transition', async () => {
			const wrapper = mountEditor()
			const menu = wrapper.findAll('.node-stub')[1].findAll('.NcActionButton')
			expect(menu.map((item) => item.text())).toEqual(['Connect to Received', 'Add step', 'Delete state'])
			await menu[0].trigger('click')
			expect(wrapper.emitted('transition-add')[0][0]).toEqual({ from: 's2', to: 's1' })
		})

		it('offers to edit and to disconnect an outgoing transition', async () => {
			const wrapper = mountEditor()
			const menu = wrapper.findAll('.node-stub')[0].findAll('.NcActionButton')
			const texts = menu.map((item) => item.text())
			expect(texts).toContain('Edit transition to Handled')
			expect(texts).toContain('Disconnect from Handled')
			await menu[texts.indexOf('Disconnect from Handled')].trigger('click')
			expect(wrapper.emitted('transition-remove')[0][0]).toBe('t1')
		})

		it('refuses a transition from a state to itself', async () => {
			const wrapper = mountEditor()
			await wrapper.findComponent(CanvasStub).vm.$emit('connect', { source: 's1', target: 's1' })
			expect(wrapper.emitted('transition-add')).toBeUndefined()
		})
	})

	describe('removing states', () => {
		it('refuses to remove the last final state and says why', async () => {
			const wrapper = mountEditor({ config: { ...CONFIG, labels: { needsFinal: 'Keep one final status' } } })
			await wrapper.findComponent(CanvasStub).vm.$emit('node-remove', 's2')
			expect(wrapper.find('.delete-dialog-stub').exists()).toBe(false)
			expect(wrapper.find('[data-testid="cn-state-machine-issues"]').text()).toContain('Keep one final status')
		})

		it('asks first, then hands the removal to the host, and closes when the host is done', async () => {
			const wrapper = mountEditor()
			await wrapper.findComponent(CanvasStub).vm.$emit('node-remove', 's1')
			const dialog = wrapper.findComponent(DeleteDialogStub)
			expect(dialog.props('item')).toMatchObject({ id: 's1', name: 'Received' })
			await dialog.vm.$emit('confirm', 's1')
			const [payload] = wrapper.emitted('state-remove')[0]
			expect(payload.id).toBe('s1')
			payload.done(true)
			await wrapper.vm.$nextTick()
			expect(wrapper.find('.delete-dialog-stub').exists()).toBe(false)
		})

		it('shows the host\'s failure in the dialog', async () => {
			const wrapper = mountEditor()
			await wrapper.findComponent(CanvasStub).vm.$emit('node-remove', 's1')
			await wrapper.findComponent(DeleteDialogStub).vm.$emit('confirm', 's1')
			wrapper.emitted('state-remove')[0][0].done(false)
			expect(setResult).toHaveBeenCalledWith({ error: 'The state could not be deleted' })
		})

		it('re-sends the graph when a removal Vue Flow already made is cancelled', async () => {
			const wrapper = mountEditor()
			const before = wrapper.findComponent(CanvasStub).props('nodes')
			await wrapper.findComponent(CanvasStub).vm.$emit('nodes-change', [{ type: 'remove', id: 's1' }])
			await wrapper.findComponent(DeleteDialogStub).vm.$emit('close')
			expect(wrapper.findComponent(CanvasStub).props('nodes')).not.toBe(before)
			expect(wrapper.emitted('state-remove')).toBeUndefined()
		})
	})

	describe('steps', () => {
		it('opens a step\'s panel and emits the whole record on an edit, keeping keys no field describes', async () => {
			const wrapper = mountEditor()
			await wrapper.findAll('.cn-sm-node__step')[0].trigger('click')
			const title = wrapper.find('[data-testid="cn-state-machine-properties"] input[type="text"]')
			await title.setValue('Renamed')
			const record = wrapper.emitted('step-update').at(-1)[0]
			expect(record).toMatchObject({ id: 'p1', title: 'Renamed', custom: 'kept', checklist: [{ id: 'c1', label: 'Check' }] })
			expect(record.config).toBeUndefined()
		})

		it('moves a step with Alt and an arrow, and keeps the key from reaching the canvas', async () => {
			const wrapper = mountEditor()
			const step = wrapper.findAll('.cn-sm-node__step')[0]
			const outer = jest.fn()
			wrapper.find('.node-stub').element.addEventListener('keydown', outer)
			await step.trigger('keydown', { key: 'ArrowDown', altKey: true })
			expect(wrapper.emitted('step-reorder')[0][0]).toEqual({ state: 's1', ids: ['p2', 'p1'] })
			await step.trigger('keydown', { key: 'Delete' })
			expect(outer).not.toHaveBeenCalled()
		})

		it('adds a step from the node and opens it once the host has it', async () => {
			const wrapper = mountEditor()
			await wrapper.findAll('.cn-sm-node__add')[0].trigger('click')
			const [payload] = wrapper.emitted('step-add')[0]
			expect(payload.state).toBe('s1')
			payload.done('p2')
			await wrapper.vm.$nextTick()
			expect(wrapper.vm.selection).toEqual({ kind: 'step', id: 'p2' })
		})

		it('locks the lockable fields and step deletion on a locked machine, and says why', async () => {
			const wrapper = mountEditor({ locked: true })
			await wrapper.findAll('.cn-sm-node__step')[0].trigger('click')
			const panel = wrapper.find('[data-testid="cn-state-machine-properties"]')
			expect(panel.text()).toContain('Published versions are not editable.')
			expect(panel.text()).not.toContain('Delete step')
			await panel.find('.cn-sm-group__toggle').trigger('click')
			expect(panel.find('.cn-sm-group__toggle').attributes('aria-expanded')).toBe('true')
			expect(panel.find('input[type="number"]').attributes('disabled')).toBeDefined()
			expect(panel.find('input[type="text"]').attributes('disabled')).toBeUndefined()
		})
	})

	describe('transitions', () => {
		it('opens a transition from its label and edits roles and guards', async () => {
			const wrapper = mountEditor()
			await wrapper.findComponent(CanvasStub).vm.$emit('edge-label-click', 't1')
			const panel = wrapper.find('[data-testid="cn-state-machine-properties"]')
			expect(panel.text()).toContain('Received → Handled')
			await panel.findAll('input[type="checkbox"]')[1].setValue(true)
			expect(wrapper.emitted('transition-update').at(-1)[0].allowedRoles).toEqual(['r2'])
			const add = panel.findAll('.NcButton').find((button) => button.text() === 'Add guard')
			await add.trigger('click')
			expect(wrapper.emitted('transition-update').at(-1)[0].guards).toEqual([{ type: 'checklist' }])
		})

		it('shows a stored item of a type no longer offered, and offers it to nobody else', async () => {
			const wrapper = mountEditor({
				transitions: [{ id: 't1', fromStatus: 's1', toStatus: 's2', guards: [{ type: 'webhook', url: 'https://x' }, { type: 'checklist' }] }],
			})
			await wrapper.findComponent(CanvasStub).vm.$emit('edge-select', { edge: { id: 't1' } })
			const selects = wrapper.findAll('.cn-sm-list__typed select')
			expect(selects[0].findAll('option').map((option) => option.text())).toContain('Webhook')
			expect(selects[1].findAll('option').map((option) => option.text())).not.toContain('Webhook')
			expect(wrapper.find('.cn-sm-list__typed input[type="text"]').element.value).toBe('https://x')
		})

		it('asks before deleting a transition from its panel', async () => {
			const wrapper = mountEditor()
			await wrapper.findComponent(CanvasStub).vm.$emit('edge-label-click', 't1')
			const remove = wrapper.findAll('.NcButton').find((button) => button.text() === 'Delete transition')
			await remove.trigger('click')
			expect(wrapper.emitted('transition-remove')).toBeUndefined()
			await wrapper.findComponent(DeleteDialogStub).vm.$emit('confirm', 't1')
			expect(wrapper.emitted('transition-remove')[0][0]).toBe('t1')
		})
	})

	describe('validate()', () => {
		it('fails on an error and shows the host\'s message through the app\'s translate', async () => {
			const translate = (text) => (text === 'Workflow has no final status defined' ? 'Werkstroom heeft geen eindstatus' : text)
			const wrapper = mountEditor(
				{ states: [{ id: 's1', name: 'A', isFinal: false }], transitions: [], config: { ...CONFIG, messages: { NO_FINAL_STATE: 'Workflow has no final status defined' } } },
				{ cnTranslate: translate },
			)
			expect(wrapper.vm.validate()).toBe(false)
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-testid="cn-state-machine-issues"]').text()).toContain('Werkstroom heeft geen eindstatus')
			expect(wrapper.emitted('validated')[0][0][0].code).toBe('NO_FINAL_STATE')
		})

		it('lets warnings pass unless the host blocks on them', () => {
			const transitions = [...TRANSITIONS, { id: 't2', fromStatus: 's1', toStatus: 's2' }]
			expect(mountEditor({ transitions }).vm.validate()).toBe(true)
			expect(mountEditor({ transitions, config: { ...CONFIG, blockOnWarnings: true } }).vm.validate()).toBe(false)
		})
	})

	it('shows no editing control when read-only', () => {
		const wrapper = mountEditor({ readOnly: true })
		expect(wrapper.find('[data-testid="cn-state-machine-add-state"]').exists()).toBe(false)
		expect(wrapper.find('.cn-sm-node__add').exists()).toBe(false)
		expect(wrapper.find('.NcActions').exists()).toBe(false)
	})
})

describe('stateMachineFields', () => {
	const fields = STEP_FIELDS

	it('leaves a pruned group out when nothing in it is filled in', () => {
		const { model, enabled } = readRecord({ id: 'p', config: '{"sla":{"value":3,"unit":""},"requiredFields":[" "]}' }, fields)
		expect(buildRecord(model, fields, enabled).config).toBeUndefined()
	})

	it('keeps a complete group, drops blank list entries, and keeps keys it does not describe', () => {
		const { model, enabled } = readRecord({ id: 'p', config: { sla: { value: 3, unit: 'hours' }, requiredFields: ['a', ''], autoActions: [{ x: 1 }] } }, fields)
		expect(buildRecord(model, fields, enabled).config).toEqual({ sla: { value: 3, unit: 'hours' }, requiredFields: ['a'], autoActions: [{ x: 1 }] })
	})

	it('writes an optional group, defaults filled in, only while it is switched on', () => {
		const { model, enabled } = readRecord({ id: 'p' }, fields)
		expect(enabled['config.escalationRule']).toBe(false)
		enabled['config.escalationRule'] = true
		expect(buildRecord(model, fields, enabled).config).toEqual({ escalationRule: { trigger: 'preBreach', offset: 0 } })
	})

	it('does not add keys a panel only looked at', () => {
		const { model, enabled } = readRecord({ id: 'p', title: 'T' }, fields)
		expect(buildRecord(model, fields, enabled)).toEqual({ id: 'p', title: 'T', checklist: [] })
	})
})
