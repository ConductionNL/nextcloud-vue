<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-state-machine-editor" :style="rootStyle">
		<!-- Issues found by validate(), and refusals of an edit. Text says the
		     severity, so it does not rest on colour. -->
		<div
			v-if="issues.length > 0"
			class="cn-state-machine-editor__issues"
			:class="hasErrors ? 'cn-state-machine-editor__issues--error' : 'cn-state-machine-editor__issues--warning'"
			role="alert"
			data-testid="cn-state-machine-issues">
			<ul class="cn-state-machine-editor__issue-list">
				<li
					v-for="(issue, index) in issues"
					:key="index"
					class="cn-state-machine-editor__issue"
					:class="`cn-state-machine-editor__issue--${issue.type}`">
					<AlertCircle v-if="issue.type === 'error'" :size="18" />
					<Alert v-else :size="18" />
					<span class="cn-state-machine-editor__sr">{{ issue.type === 'error' ? t('nextcloud-vue', 'Error:') : t('nextcloud-vue', 'Warning:') }}</span>
					<span>{{ issue.message }}</span>
				</li>
			</ul>
			<NcButton variant="tertiary" @click="issues = []">
				{{ say('dismiss') }}
			</NcButton>
		</div>

		<div class="cn-state-machine-editor__layout">
			<!-- Palette: drag a state onto the canvas, or add one with the button. -->
			<section
				v-if="!readOnly"
				class="cn-state-machine-editor__palette"
				:aria-labelledby="`${uid}-palette`">
				<h3 :id="`${uid}-palette`" class="cn-state-machine-editor__palette-title">
					{{ say('paletteTitle') }}
				</h3>
				<div
					class="cn-state-machine-editor__palette-item"
					draggable="true"
					data-testid="cn-state-machine-palette-state"
					@dragstart="onPaletteDragStart">
					<SquareOutline :size="18" />
					<span>{{ say('paletteItem') }}</span>
				</div>
				<NcButton
					variant="secondary"
					wide
					data-testid="cn-state-machine-add-state"
					@click="addStateFromKeyboard">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ say('addState') }}
				</NcButton>
				<div class="cn-state-machine-editor__help">
					<p v-for="(line, index) in paletteHelp" :key="index">
						{{ line }}
					</p>
				</div>
				<h3 class="cn-state-machine-editor__palette-title">
					{{ say('controlsTitle') }}
				</h3>
				<dl class="cn-state-machine-editor__controls">
					<template v-for="(control, index) in controlsHelp" :key="index">
						<dt>{{ control.term }}</dt>
						<dd>{{ control.text }}</dd>
					</template>
				</dl>
			</section>

			<section
				class="cn-state-machine-editor__canvas"
				:aria-label="say('canvasLabel')"
				data-testid="cn-state-machine-canvas">
				<CnGraphCanvas
					:nodes="canvasNodes"
					:edges="canvasEdges"
					:readOnly="readOnly"
					:snapToGrid="false"
					:fitView="fitView"
					@nodesChange="onNodesChange"
					@edgesChange="onEdgesChange"
					@connect="onConnect"
					@nodeSelect="onNodeSelect"
					@nodeActivate="selectState"
					@nodeRemove="requestStateRemoval"
					@nodeMenu="menuOpenFor = $event.id"
					@edgeSelect="onEdgeSelect"
					@edgeLabelClick="selectTransition"
					@edgeLabelMove="onEdgeLabelMove"
					@canvasClick="clearSelection"
					@canvasDrop="onCanvasDrop">
					<template #node="{ node }">
						<CnStateMachineNode
							:label="stateLabel(node.id)"
							:final="isFinal(node.id)"
							:steps="stepsOf(node.id)"
							:showSteps="showSteps"
							:stepKeys="stepKeys"
							:selectedStepId="selection.kind === 'step' ? selection.id : null"
							:connectTargets="connectTargetsOf(node.id)"
							:outgoing="outgoingOf(node.id)"
							:menuOpen="menuOpenFor === node.id"
							:readOnly="readOnly"
							:say="say"
							@update:menuOpen="onMenuToggle(node.id, $event)"
							@connect="connect(node.id, $event)"
							@disconnect="removeTransition"
							@editTransition="selectTransition"
							@addStep="addStep(node.id)"
							@deleteState="requestStateRemoval(node.id)"
							@stepClick="selectStep"
							@stepMove="moveStep(node.id, $event)" />
					</template>
					<template #edge-label="{ edge }">
						<span class="cn-state-machine-editor__edge-label">{{ transitionText(edge.id) }}</span>
					</template>
				</CnGraphCanvas>
			</section>

			<aside
				class="cn-state-machine-editor__properties"
				:aria-label="say('propertiesLabel')"
				data-testid="cn-state-machine-properties">
				<CnStateMachinePanel
					v-if="selectedStep"
					:key="`step-${selectedStep.id}`"
					:record="selectedStep"
					:fields="stepFields"
					:title="say('stepPanelTitle')"
					:subtitle="stateLabel(selectedStep[keys.stepState])"
					:closeLabel="say('closeStepPanel')"
					:deleteLabel="say('deleteStep')"
					:canDelete="!locked"
					:locked="locked"
					:readOnly="readOnly"
					:optionSets="optionSets"
					:translate="tr"
					:uid="`${uid}-step`"
					@update="$emit('step-update', $event)"
					@delete="removeStep(selectedStep.id)"
					@close="clearSelection" />

				<CnStateMachinePanel
					v-else-if="selectedTransition"
					:key="`transition-${selectedTransition.id}`"
					:record="selectedTransition"
					:fields="transitionFields"
					:title="say('transitionPanelTitle')"
					:subtitle="transitionRoute(selectedTransition)"
					:closeLabel="say('closeTransitionPanel')"
					:deleteLabel="say('deleteTransition')"
					canDelete
					:locked="locked"
					:readOnly="readOnly"
					:optionSets="optionSets"
					:translate="tr"
					:uid="`${uid}-transition`"
					@update="$emit('transition-update', $event)"
					@delete="requestTransitionRemoval(selectedTransition.id)"
					@close="clearSelection" />

				<CnStateMachinePanel
					v-else-if="selectedState"
					:key="`state-${selectedState.id}`"
					:record="selectedState"
					:fields="stateFields"
					:title="stateLabel(selectedState.id)"
					:subtitle="say('statePanelTitle')"
					:closeLabel="say('closeStatePanel')"
					:deleteLabel="say('deleteState')"
					canDelete
					:locked="locked"
					:readOnly="readOnly"
					:optionSets="optionSets"
					:translate="tr"
					:uid="`${uid}-state`"
					@update="$emit('state-update', $event)"
					@delete="requestStateRemoval(selectedState.id)"
					@close="clearSelection">
					<NcButton v-if="showSteps && !readOnly" variant="secondary" @click="addStep(selectedState.id)">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ say('addStep') }}
					</NcButton>
				</CnStateMachinePanel>

				<p v-else class="cn-state-machine-editor__empty">
					{{ say('emptyPanel') }}
				</p>
			</aside>
		</div>

		<CnDeleteDialog
			v-if="pendingRemoval"
			ref="removeDialog"
			:item="pendingRemoval"
			nameField="name"
			:dialogTitle="pendingRemoval.title"
			:warningText="pendingRemoval.warning"
			:irreversible="false"
			@confirm="confirmRemoval"
			@close="cancelRemoval" />
	</div>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import Alert from 'vue-material-design-icons/Alert.vue'
import AlertCircle from 'vue-material-design-icons/AlertCircle.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import SquareOutline from 'vue-material-design-icons/SquareOutline.vue'
import CnDeleteDialog from '../CnDeleteDialog/CnDeleteDialog.vue'
import CnGraphCanvas from '../CnGraphCanvas/CnGraphCanvas.vue'
import CnStateMachineNode from './CnStateMachineNode.vue'
import CnStateMachinePanel from './CnStateMachinePanel.vue'
import { validateStateMachine } from '../../utils/stateMachineValidation.js'

/** The drag type a palette state carries, so other drops are ignored. */
const PALETTE_TYPE = 'application/x-cn-state-machine-state'

/** Record keys by role. A host passes its own names through `config.keys`. */
export const DEFAULT_STATE_MACHINE_EDITOR_KEYS = Object.freeze({
	stateLabel: 'label',
	stateFinal: 'final',
	transitionFrom: 'from',
	transitionTo: 'to',
	transitionLabel: 'label',
	stepState: 'state',
	stepTitle: 'title',
	stepOrder: 'order',
	stepRequired: 'required',
	stepBadge: '',
})

let editorCount = 0

/**
 * Fill `{name}` placeholders.
 *
 * @param {string} text The text.
 * @param {object} [vars] Values by placeholder.
 * @return {string} The filled text.
 */
function fill(text, vars) {
	if (!vars) {
		return String(text ?? '')
	}
	return String(text ?? '').replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : match))
}

/**
 * An editor for a state machine: states drawn on a canvas, the transitions
 * between them, the steps inside each state, and a property panel for whichever
 * of those is selected. What a state, step or transition carries is described
 * by field descriptors in `config`, so the component has no domain words of its
 * own.
 *
 * The editor never changes the records it is given. Every edit is an event;
 * the host stores the change and passes the records back down, the same rule
 * CnGraphCanvas holds for positions.
 *
 * Every pointer gesture has a keyboard route: the palette's add button instead
 * of a drag, a state's actions menu (or `c` on two states) instead of drawing a
 * line, arrow keys instead of dragging a state, Alt with an arrow or the panel's
 * move buttons instead of dragging a step or list item.
 */
export default {
	name: 'CnStateMachineEditor',

	components: {
		NcButton,
		Alert,
		AlertCircle,
		Plus,
		SquareOutline,
		CnDeleteDialog,
		CnGraphCanvas,
		CnStateMachineNode,
		CnStateMachinePanel,
	},

	inject: {
		cnTranslate: { default: null },
	},

	props: {
		/** The states. Each has an `id`; its name and final flag sit under `config.keys`. */
		states: {
			type: Array,
			required: true,
		},

		/** The transitions, each `{ id }` plus a from and to state id under `config.keys`. */
		transitions: {
			type: Array,
			default: () => [],
		},

		/** The steps inside states, each `{ id }` plus its state id under `config.keys.stepState`. */
		steps: {
			type: Array,
			default: () => [],
		},

		/** Canvas positions by state id: `{ [id]: { x, y } }`. A state without one is placed on a grid. */
		positions: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * What the machine's records carry and what the editor says.
		 *
		 * - `keys`: record keys by role, see DEFAULT_STATE_MACHINE_EDITOR_KEYS.
		 * - `stateFields`, `stepFields`, `transitionFields`: field descriptors for
		 *   each property panel (see the docs page for the descriptor types).
		 * - `steps`: false to leave steps out of the machine. On by default when
		 *   `stepFields` is given.
		 * - `labels`: the editor's own texts by name, overriding the defaults.
		 * - `paletteHelp`, `controlsHelp`: the help under the palette.
		 * - `messages`: validation messages by rule code.
		 * - `requireFinal`: refuse to delete the last final state (default true).
		 * - `blockOnWarnings`: let warnings fail validate() too (default false).
		 * - `canvasHeight`: the canvas height in px (default 540).
		 *
		 * Texts are translated through `translate`, or the app's `cnTranslate`.
		 */
		config: {
			type: Object,
			default: () => ({}),
		},

		/** Named option lists a select or checkboxes field points at with `optionSet`. */
		optionSets: {
			type: Object,
			default: () => ({}),
		},

		/** Disable the panel fields marked `lockable`, and step deletion. */
		locked: {
			type: Boolean,
			default: false,
		},

		/** Show the machine without any editing control. */
		readOnly: {
			type: Boolean,
			default: false,
		},

		/** Frame the whole machine when the canvas first renders. */
		fitView: {
			type: Boolean,
			default: true,
		},

		/** Translates configured texts. Falls back to the injected `cnTranslate`. */
		translate: {
			type: Function,
			default: null,
		},
	},

	emits: [
		'state-add',
		'state-move',
		'state-update',
		'state-remove',
		'transition-add',
		'transition-update',
		'transition-remove',
		'step-add',
		'step-update',
		'step-remove',
		'step-reorder',
		'validated',
	],

	data() {
		editorCount += 1
		return {
			uid: `cn-state-machine-${editorCount}`,
			selection: { kind: null, id: null },
			issues: [],
			menuOpenFor: null,
			pendingRemoval: null,
			labelPositions: {},
			syncTick: 0,
		}
	},

	computed: {
		/**
		 * @return {object} Record keys by role.
		 */
		keys() {
			return { ...DEFAULT_STATE_MACHINE_EDITOR_KEYS, ...(this.config.keys || {}) }
		},

		/**
		 * @return {object} The step keys the node reads.
		 */
		stepKeys() {
			return { title: this.keys.stepTitle, required: this.keys.stepRequired, badge: this.keys.stepBadge }
		},

		/**
		 * @return {Array<object>} The step panel's fields.
		 */
		stepFields() {
			return Array.isArray(this.config.stepFields) ? this.config.stepFields : []
		},

		/**
		 * @return {Array<object>} The transition panel's fields.
		 */
		transitionFields() {
			return Array.isArray(this.config.transitionFields) ? this.config.transitionFields : []
		},

		/**
		 * @return {Array<object>} The state panel's fields.
		 */
		stateFields() {
			return Array.isArray(this.config.stateFields) ? this.config.stateFields : []
		},

		/**
		 * @return {boolean} Whether states hold steps.
		 */
		showSteps() {
			if (this.config.steps === false) {
				return false
			}
			return this.config.steps === true || this.stepFields.length > 0
		},

		/**
		 * @return {object} The root's style.
		 */
		rootStyle() {
			const height = Number(this.config.canvasHeight)
			return { '--cn-state-machine-canvas-height': `${Number.isFinite(height) && height > 0 ? height : 540}px` }
		},

		/**
		 * @return {boolean} Whether any issue is an error.
		 */
		hasErrors() {
			return this.issues.some((issue) => issue.type === 'error')
		},

		/**
		 * @return {Array<string>} The palette's help lines.
		 */
		paletteHelp() {
			if (Array.isArray(this.config.paletteHelp)) {
				return this.config.paletteHelp.map((line) => this.tr(line))
			}
			return [
				t('nextcloud-vue', 'Drag a state onto the canvas to add it, or use the add button.'),
				t('nextcloud-vue', 'Connect states by dragging from one port to another, by pressing c on one state and then on another, or through a state\'s actions menu.'),
				t('nextcloud-vue', 'Click a state, a step or a transition to see its properties.'),
			]
		},

		/**
		 * @return {Array<{term: string, text: string}>} The canvas controls help.
		 */
		controlsHelp() {
			if (Array.isArray(this.config.controlsHelp)) {
				return this.config.controlsHelp.map((control) => ({ term: this.tr(control.term), text: this.tr(control.text) }))
			}
			return [
				{ term: t('nextcloud-vue', 'Pan'), text: t('nextcloud-vue', 'Drag the empty canvas') },
				{ term: t('nextcloud-vue', 'Zoom'), text: t('nextcloud-vue', 'Scroll wheel or the zoom buttons') },
				{ term: t('nextcloud-vue', 'Move'), text: t('nextcloud-vue', 'Arrow keys on a focused state') },
			]
		},

		/**
		 * @return {Map<string, object>} States by id.
		 */
		stateById() {
			return new Map(this.states.map((state) => [state.id, state]))
		},

		/**
		 * @return {Array<object>} The canvas nodes.
		 */
		canvasNodes() {
			// `sync` changes when a refused removal must re-send the graph Vue Flow
			// already dropped, so the nodes are rebuilt.
			const sync = this.syncTick
			return this.states.map((state, index) => ({
				id: state.id,
				type: 'default',
				position: this.positionOf(state.id, index),
				selected: this.selection.kind === 'state' && this.selection.id === state.id,
				style: { width: '200px' },
				data: { label: this.say('stateAria', { name: this.stateLabel(state.id) }), sync },
			}))
		},

		/**
		 * @return {Array<object>} The canvas edges.
		 */
		canvasEdges() {
			const sync = this.syncTick
			return this.transitions
				.filter((transition) => this.stateById.has(this.fromOf(transition)) && this.stateById.has(this.toOf(transition)))
				.map((transition) => ({
					id: transition.id,
					source: this.fromOf(transition),
					target: this.toOf(transition),
					selected: this.selection.kind === 'transition' && this.selection.id === transition.id,
					markerEnd: { type: 'arrowclosed', width: 22, height: 22 },
					data: {
						animated: false,
						sync,
						labelT: this.labelPositions[transition.id],
						labelAriaLabel: `${this.say('transitionAria', { from: this.stateLabel(this.fromOf(transition)), to: this.stateLabel(this.toOf(transition)) })}: ${this.transitionText(transition.id)}`,
					},
				}))
		},

		/**
		 * @return {object|null} The selected step.
		 */
		selectedStep() {
			return this.selection.kind === 'step' ? (this.steps.find((step) => step.id === this.selection.id) || null) : null
		},

		/**
		 * @return {object|null} The selected transition.
		 */
		selectedTransition() {
			return this.selection.kind === 'transition' ? (this.transitions.find((transition) => transition.id === this.selection.id) || null) : null
		},

		/**
		 * @return {object|null} The selected state.
		 */
		selectedState() {
			return this.selection.kind === 'state' ? (this.stateById.get(this.selection.id) || null) : null
		},
	},

	methods: {
		t,

		/**
		 * Translate a configured text.
		 *
		 * @param {string} text The text.
		 * @return {string} The translation, or the text.
		 */
		tr(text) {
			if (typeof text !== 'string' || text === '') {
				return text || ''
			}
			const translate = this.translate || this.cnTranslate
			const answer = typeof translate === 'function' ? translate(text) : text
			return typeof answer === 'string' && answer !== '' ? answer : text
		},

		/**
		 * One of the editor's own texts: the config's, translated, or the default.
		 *
		 * @param {string} name The text's name.
		 * @param {object} [vars] Placeholder values.
		 * @return {string} The text.
		 */
		say(name, vars) {
			const own = this.config.labels && this.config.labels[name]
			if (typeof own === 'string' && own !== '') {
				return fill(this.tr(own), vars)
			}
			if (name === 'stepCount') {
				return n('nextcloud-vue', '%n step', '%n steps', vars?.count ?? 0)
			}
			return fill(this.defaultText(name), vars)
		},

		/**
		 * @param {string} name A text's name.
		 * @return {string} Its default, in the library's domain.
		 */
		defaultText(name) {
			const texts = {
				paletteTitle: t('nextcloud-vue', 'Elements'),
				paletteItem: t('nextcloud-vue', 'State'),
				addState: t('nextcloud-vue', 'Add state'),
				controlsTitle: t('nextcloud-vue', 'Controls'),
				canvasLabel: t('nextcloud-vue', 'States and transitions'),
				propertiesLabel: t('nextcloud-vue', 'Properties'),
				emptyPanel: t('nextcloud-vue', 'Select a state, a step or a transition to see its properties.'),
				final: t('nextcloud-vue', 'Final'),
				stateAria: t('nextcloud-vue', 'State: {name}'),
				required: t('nextcloud-vue', 'required'),
				stateActions: t('nextcloud-vue', 'Actions for state {name}'),
				connectTo: t('nextcloud-vue', 'Connect to {name}'),
				disconnectFrom: t('nextcloud-vue', 'Disconnect from {name}'),
				editTransitionTo: t('nextcloud-vue', 'Edit transition to {name}'),
				addStep: t('nextcloud-vue', 'Add step'),
				deleteState: t('nextcloud-vue', 'Delete state'),
				statePanelTitle: t('nextcloud-vue', 'State'),
				closeStatePanel: t('nextcloud-vue', 'Close state properties'),
				stepPanelTitle: t('nextcloud-vue', 'Step'),
				closeStepPanel: t('nextcloud-vue', 'Close step properties'),
				deleteStep: t('nextcloud-vue', 'Delete step'),
				transitionPanelTitle: t('nextcloud-vue', 'Transition'),
				closeTransitionPanel: t('nextcloud-vue', 'Close transition properties'),
				deleteTransition: t('nextcloud-vue', 'Delete transition'),
				deleteTransitionConfirm: t('nextcloud-vue', 'Delete the transition {name}?'),
				deleteStateConfirm: t('nextcloud-vue', 'Delete state "{name}"? Its steps and transitions go with it.'),
				needsFinal: t('nextcloud-vue', 'At least one state must stay final'),
				deleteStateFailed: t('nextcloud-vue', 'The state could not be deleted'),
				unnamedTransition: t('nextcloud-vue', 'Transition'),
				transitionAria: t('nextcloud-vue', 'Transition from {from} to {to}'),
				dismiss: t('nextcloud-vue', 'Dismiss'),
			}
			return texts[name] ?? name
		},

		/**
		 * @param {object} transition A transition.
		 * @return {string} Its source state id.
		 */
		fromOf(transition) {
			return transition[this.keys.transitionFrom]
		},

		/**
		 * @param {object} transition A transition.
		 * @return {string} Its target state id.
		 */
		toOf(transition) {
			return transition[this.keys.transitionTo]
		},

		/**
		 * @param {string} id A state id.
		 * @return {string} Its name, or the id.
		 */
		stateLabel(id) {
			const state = this.stateById.get(id)
			return (state && state[this.keys.stateLabel]) || id || ''
		},

		/**
		 * @param {string} id A state id.
		 * @return {boolean} Whether it is final.
		 */
		isFinal(id) {
			const state = this.stateById.get(id)
			return !!state && state[this.keys.stateFinal] === true
		},

		/**
		 * @param {string} id A transition id.
		 * @return {string} The text its label shows.
		 */
		transitionText(id) {
			const transition = this.transitions.find((candidate) => candidate.id === id)
			const label = transition ? transition[this.keys.transitionLabel] : ''
			return label || this.say('unnamedTransition')
		},

		/**
		 * @param {object} transition A transition.
		 * @return {string} `From → To`.
		 */
		transitionRoute(transition) {
			return `${this.stateLabel(this.fromOf(transition))} → ${this.stateLabel(this.toOf(transition))}`
		},

		/**
		 * @param {string} id A state id.
		 * @param {number} index Its position in `states`.
		 * @return {{x: number, y: number}} Its stored position, or its grid slot.
		 */
		positionOf(id, index) {
			const stored = this.positions && this.positions[id]
			if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
				return { x: stored.x, y: stored.y }
			}
			return this.gridSlot(index)
		},

		/**
		 * @param {number} index A slot number.
		 * @return {{x: number, y: number}} Four states to a row, 250 by 200 apart.
		 */
		gridSlot(index) {
			return { x: 100 + (index % 4) * 250, y: 100 + Math.floor(index / 4) * 200 }
		},

		/**
		 * @param {string} id A state id.
		 * @return {Array<object>} Its steps in order.
		 */
		stepsOf(id) {
			const order = this.keys.stepOrder
			return this.steps
				.filter((step) => step[this.keys.stepState] === id)
				.sort((a, b) => (Number(a[order]) || 0) - (Number(b[order]) || 0))
		},

		/**
		 * @param {string} id A state id.
		 * @return {Array<{id: string, label: string}>} States it has no transition to yet.
		 */
		connectTargetsOf(id) {
			const connected = new Set(this.transitions.filter((transition) => this.fromOf(transition) === id).map(this.toOf))
			return this.states
				.filter((state) => state.id !== id && !connected.has(state.id))
				.map((state) => ({ id: state.id, label: this.stateLabel(state.id) }))
		},

		/**
		 * @param {string} id A state id.
		 * @return {Array<{id: string, targetLabel: string}>} Its outgoing transitions.
		 */
		outgoingOf(id) {
			return this.transitions
				.filter((transition) => this.fromOf(transition) === id)
				.map((transition) => ({ id: transition.id, targetLabel: this.stateLabel(this.toOf(transition)) }))
		},

		/**
		 * @param {string} id A state id.
		 * @return {void}
		 */
		selectState(id) {
			this.selection = { kind: 'state', id }
		},

		/**
		 * @param {string} id A transition id.
		 * @return {void}
		 */
		selectTransition(id) {
			this.selection = { kind: 'transition', id }
		},

		/**
		 * @param {string} id A step id.
		 * @return {void}
		 */
		selectStep(id) {
			this.selection = { kind: 'step', id }
		},

		/**
		 * @return {void}
		 */
		clearSelection() {
			this.selection = { kind: null, id: null }
		},

		/**
		 * @param {object} event CnGraphCanvas's node event.
		 * @return {void}
		 */
		onNodeSelect(event) {
			if (event && event.node) {
				this.selectState(event.node.id)
			}
		},

		/**
		 * @param {object} event CnGraphCanvas's edge event.
		 * @return {void}
		 */
		onEdgeSelect(event) {
			if (event && event.edge) {
				this.selectTransition(event.edge.id)
			}
		},

		/**
		 * @param {string} id A state id.
		 * @param {boolean} open Whether its menu opened.
		 * @return {void}
		 */
		onMenuToggle(id, open) {
			if (open) {
				this.menuOpenFor = id
			} else if (this.menuOpenFor === id) {
				this.menuOpenFor = null
			}
		},

		/**
		 * Report moves; Vue Flow reports a drag once per frame and a keyboard
		 * move once per key.
		 *
		 * @param {Array<object>} changes Vue Flow's node changes.
		 * @return {void}
		 */
		onNodesChange(changes) {
			for (const change of changes || []) {
				if (change.type === 'position' && change.position) {
					/**
					 * @event state-move A state was moved: `{ id, x, y }`.
					 */
					this.$emit('state-move', { id: change.id, x: Math.round(change.position.x), y: Math.round(change.position.y) })
				} else if (change.type === 'remove') {
					this.requestStateRemoval(change.id)
				}
			}
		},

		/**
		 * @param {Array<object>} changes Vue Flow's edge changes.
		 * @return {void}
		 */
		onEdgesChange(changes) {
			for (const change of changes || []) {
				if (change.type === 'remove') {
					this.requestTransitionRemoval(change.id)
				}
			}
		},

		/**
		 * @param {{source: string, target: string}} connection A new connection.
		 * @return {void}
		 */
		onConnect(connection) {
			if (connection && connection.source && connection.target) {
				this.connect(connection.source, connection.target)
			}
		},

		/**
		 * @param {string} from The source state.
		 * @param {string} to The target state.
		 * @return {void}
		 */
		connect(from, to) {
			if (this.readOnly || from === to) {
				return
			}
			/**
			 * @event transition-add A transition should be added: `{ from, to }`.
			 */
			this.$emit('transition-add', { from, to })
		},

		/**
		 * @param {{id: string, labelT: number}} payload The label and its place on the line.
		 * @return {void}
		 */
		onEdgeLabelMove(payload) {
			this.labelPositions = { ...this.labelPositions, [payload.id]: payload.labelT }
		},

		/**
		 * @param {DragEvent} event The palette drag.
		 * @return {void}
		 */
		onPaletteDragStart(event) {
			if (event.dataTransfer) {
				event.dataTransfer.setData(PALETTE_TYPE, 'state')
				event.dataTransfer.setData('text/plain', 'state')
				event.dataTransfer.effectAllowed = 'copy'
			}
		},

		/**
		 * @param {{position: object, event: DragEvent}} payload The drop.
		 * @return {void}
		 */
		onCanvasDrop({ position, event }) {
			const types = event && event.dataTransfer ? Array.from(event.dataTransfer.types || []) : []
			if (!types.includes(PALETTE_TYPE)) {
				return
			}
			this.addState({ x: Math.round(position.x), y: Math.round(position.y) }, false)
		},

		/**
		 * The keyboard route to a new state: the next free grid slot, and the
		 * new state selected so its panel opens.
		 *
		 * @return {void}
		 */
		addStateFromKeyboard() {
			this.addState(this.gridSlot(this.states.length), true)
		},

		/**
		 * @param {{x: number, y: number}} position Where the state goes.
		 * @param {boolean} select Whether to select it once added.
		 * @return {void}
		 */
		addState(position, select) {
			if (this.readOnly) {
				return
			}
			/**
			 * @event state-add A state should be added at `position`. The host
			 *   creates it and calls `done(id)`; the editor then selects it when
			 *   it was added from the keyboard.
			 */
			this.$emit('state-add', {
				position,
				done: (id) => {
					if (select && id) {
						this.selectState(id)
					}
				},
			})
		},

		/**
		 * @param {string} stateId The state.
		 * @return {void}
		 */
		addStep(stateId) {
			if (this.readOnly) {
				return
			}
			/**
			 * @event step-add A step should be added to a state:
			 *   `{ state, done }`. The host calls `done(id)` and the editor opens
			 *   the new step.
			 */
			this.$emit('step-add', {
				state: stateId,
				done: (id) => {
					if (id) {
						this.selectStep(id)
					}
				},
			})
		},

		/**
		 * @param {string} id A step.
		 * @return {void}
		 */
		removeStep(id) {
			if (this.selection.kind === 'step' && this.selection.id === id) {
				this.clearSelection()
			}
			/**
			 * @event step-remove A step should be removed, by id.
			 */
			this.$emit('step-remove', id)
		},

		/**
		 * @param {string} stateId The state the step is in.
		 * @param {{from: number, to: number}} move The step's old and new place.
		 * @return {void}
		 */
		moveStep(stateId, { from, to }) {
			const ids = this.stepsOf(stateId).map((step) => step.id)
			if (from < 0 || to < 0 || from >= ids.length || to >= ids.length) {
				return
			}
			const [moved] = ids.splice(from, 1)
			ids.splice(to, 0, moved)
			/**
			 * @event step-reorder The steps of a state in their new order:
			 *   `{ state, ids }`.
			 */
			this.$emit('step-reorder', { state: stateId, ids })
		},

		/**
		 * @param {string} id A transition.
		 * @return {void}
		 */
		removeTransition(id) {
			if (this.selection.kind === 'transition' && this.selection.id === id) {
				this.clearSelection()
			}
			/**
			 * @event transition-remove A transition should be removed, by id.
			 */
			this.$emit('transition-remove', id)
		},

		/**
		 * Ask before removing a transition.
		 *
		 * @param {string} id A transition.
		 * @return {void}
		 */
		requestTransitionRemoval(id) {
			const transition = this.transitions.find((candidate) => candidate.id === id)
			if (!transition || this.readOnly || this.pendingRemoval) {
				this.syncTick += 1
				return
			}
			this.pendingRemoval = {
				kind: 'transition',
				id,
				name: this.transitionRoute(transition),
				title: this.say('deleteTransition'),
				warning: this.say('deleteTransitionConfirm', { name: this.transitionRoute(transition) }),
			}
		},

		/**
		 * Ask before removing a state, unless it is the last final one.
		 *
		 * @param {string} id A state.
		 * @return {void}
		 */
		requestStateRemoval(id) {
			const state = this.stateById.get(id)
			if (!state || this.readOnly || (this.pendingRemoval && this.pendingRemoval.id === id)) {
				this.syncTick += 1
				return
			}
			this.menuOpenFor = null
			if (this.config.requireFinal !== false && this.isFinal(id)
				&& !this.states.some((other) => other.id !== id && this.isFinal(other.id))) {
				this.issues = [{ type: 'error', code: 'LAST_FINAL_STATE', message: this.say('needsFinal') }]
				this.syncTick += 1
				return
			}
			this.pendingRemoval = {
				kind: 'state',
				id,
				name: this.stateLabel(id),
				title: this.say('deleteState'),
				warning: this.say('deleteStateConfirm'),
			}
		},

		/**
		 * The removal was confirmed: hand it to the host.
		 *
		 * @return {void}
		 */
		confirmRemoval() {
			const pending = this.pendingRemoval
			if (!pending) {
				return
			}
			if (pending.kind === 'transition') {
				this.removeTransition(pending.id)
				this.pendingRemoval = null
				return
			}
			/**
			 * @event state-remove A state should be removed: `{ id, done }`. The
			 *   host removes the state with its steps and transitions and calls
			 *   `done(true)`, or `done(false)` when it could not.
			 */
			this.$emit('state-remove', {
				id: pending.id,
				done: (ok) => {
					if (ok) {
						if (this.selection.id === pending.id) {
							this.clearSelection()
						}
						this.pendingRemoval = null
						return
					}
					if (this.$refs.removeDialog) {
						this.$refs.removeDialog.setResult({ error: this.say('deleteStateFailed') })
					}
				},
			})
		},

		/**
		 * The removal dialog closed without a removal.
		 *
		 * @return {void}
		 */
		cancelRemoval() {
			this.pendingRemoval = null
			this.syncTick += 1
		},

		/**
		 * Check the machine and show what is wrong with it.
		 *
		 * @return {boolean} True when nothing blocks: no errors, and no warnings
		 *   either when `config.blockOnWarnings` is set.
		 * @public
		 */
		validate() {
			this.issues = validateStateMachine(
				{ states: this.states, transitions: this.transitions },
				{
					keys: {
						label: this.keys.stateLabel,
						final: this.keys.stateFinal,
						from: this.keys.transitionFrom,
						to: this.keys.transitionTo,
						transitionLabel: this.keys.transitionLabel,
					},
					messages: this.config.messages,
					translate: (text) => this.tr(text),
				},
			)
			/**
			 * @event validated The issues validate() found.
			 */
			this.$emit('validated', this.issues)
			const blocking = this.config.blockOnWarnings === true
				? this.issues
				: this.issues.filter((issue) => issue.type === 'error')
			return blocking.length === 0
		},
	},
}
</script>

<style scoped>
.cn-state-machine-editor {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

.cn-state-machine-editor__issues {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 8px;
	padding: 8px 12px;
	border: 1px solid var(--color-warning, #c28900);
	border-inline-start-width: 4px;
	border-radius: var(--border-radius-large, 10px);
	background: var(--color-main-background, #fff);
}

.cn-state-machine-editor__issues--error {
	border-color: var(--color-error, #d91812);
}

.cn-state-machine-editor__issue-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-state-machine-editor__issue {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 14px;
}

.cn-state-machine-editor__issue--error {
	color: var(--color-error-text, #c9302c);
}

.cn-state-machine-editor__issue--warning {
	color: var(--color-warning-text, #7a5600);
}

.cn-state-machine-editor__layout {
	display: grid;
	grid-template-columns: 220px minmax(0, 1fr) 280px;
	gap: 16px;
	align-items: start;
}

.cn-state-machine-editor__palette {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px;
	border: 1px solid var(--color-border, #e4e6ea);
	border-radius: 12px;
	background: var(--color-background-hover, #f5f6f8);
}

.cn-state-machine-editor__palette-title {
	margin: 0;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color-text-maxcontrast, #5e6168);
}

.cn-state-machine-editor__palette-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	border: 1px solid var(--color-border, #e4e6ea);
	border-radius: 8px;
	background: var(--color-main-background, #fff);
	font-size: 14px;
	cursor: grab;
}

.cn-state-machine-editor__palette-item:hover {
	border-color: var(--color-primary-element, #0082c9);
}

.cn-state-machine-editor__help {
	font-size: 13px;
	line-height: 1.5;
	color: var(--color-text-maxcontrast, #5e6168);
}

.cn-state-machine-editor__help p {
	margin: 0 0 6px;
}

.cn-state-machine-editor__controls {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 4px 8px;
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast, #5e6168);
}

.cn-state-machine-editor__controls dt {
	font-weight: 600;
}

.cn-state-machine-editor__controls dd {
	margin: 0;
}

.cn-state-machine-editor__canvas {
	position: relative;
	height: var(--cn-state-machine-canvas-height, 540px);
	overflow: hidden;
	border: 1px solid var(--color-border, #e4e6ea);
	border-radius: 12px;
	background: var(--color-main-background, #fff);
}

.cn-state-machine-editor__properties {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--color-border, #e4e6ea);
	border-radius: 12px;
	background: var(--color-main-background, #fff);
}

.cn-state-machine-editor__empty {
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast, #5e6168);
}

.cn-state-machine-editor__edge-label {
	font-size: 12px;
	font-weight: 500;
}

.cn-state-machine-editor__sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

/* The board's state card: a 1px outline, a 10px radius and a soft shadow; a
   selected state gets the 2px primary outline. */
.cn-state-machine-editor__canvas :deep(.cn-flow-node) {
	padding: 10px 12px;
	border: 1px solid var(--color-border-maxcontrast, #828a95);
	border-radius: 10px;
	box-shadow: 0 1px 2px rgba(27, 28, 29, 0.08);
}

.cn-state-machine-editor__canvas :deep(.cn-flow-node--selected) {
	padding: 9px 11px;
	border: 2px solid var(--color-primary-element, #0082c9);
}

@media (max-width: 1100px) {
	.cn-state-machine-editor__layout {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
