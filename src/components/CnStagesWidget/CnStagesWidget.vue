<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnStagesWidget: the record's stages as a placeable, configurable widget,
  where clicking a stage moves the record there.

  Keep this comment OUT of the template: a comment node beside the root element
  makes the component multi-root in Vue 3.
-->
<template>
	<div
		class="cn-stages-widget"
		data-testid="cn-stages-widget"
		:aria-busy="busy ? 'true' : null">
		<p v-if="stagesError" class="cn-stages-widget__notice" data-testid="cn-stages-widget-load-error">
			{{ tr('Could not load the stages') }}
		</p>
		<div v-else-if="stagesPending && stages.length === 0" class="cn-stages-widget__loading">
			<NcLoadingIcon :size="24" :name="tr('Loading stages')" />
		</div>
		<p v-else-if="stages.length === 0" class="cn-stages-widget__notice" data-testid="cn-stages-widget-empty">
			{{ tr('No stages to show') }}
		</p>
		<template v-else>
			<CnTimelineStages
				:stages="timelineStages"
				:current-stage="currentStageId"
				:orientation="orientation"
				:size="size"
				:clickable="interactive"
				:aria-label="ariaLabel"
				@stage-click="onStageClick">
				<template #label="{ stage }">
					<span class="cn-timeline-stages__label" :data-testid="`cn-stages-widget-stage-${stage.id}`">
						{{ stage.label }}
					</span>
					<span v-if="stage.subtitle" class="cn-timeline-stages__subtitle">
						{{ stage.subtitle }}
					</span>
					<!-- What the move says about itself, or why the stage cannot be
					     chosen. A note from a reachable action is shown; "no action
					     reaches this stage" is screen-reader text, because an empty
					     stage with a sentence under it reads as an error. -->
					<span
						v-if="stage.reason"
						:class="stage.reasonVisible ? 'cn-stages-widget__reason' : 'cn-stages-widget__sr-only'"
						:data-testid="`cn-stages-widget-reason-${stage.id}`">
						{{ stage.reason }}
					</span>
				</template>
			</CnTimelineStages>

			<p
				v-if="moveError && !pendingAction"
				class="cn-stages-widget__error"
				data-testid="cn-stages-widget-error"
				role="alert">
				{{ moveError }}
			</p>
			<p class="cn-stages-widget__sr-only" aria-live="polite">
				{{ statusMessage }}
			</p>
		</template>

		<!-- The SHARED transition input dialog, the one CnLifecycleActions uses.
		     One dialog and one input vocabulary: a transition declares `inputs`
		     and the dialog collects exactly those. Cancelling POSTs nothing. -->
		<CnTransitionInputDialog
			v-if="pendingAction"
			:transition="pendingAction"
			:schema="schema"
			@confirm="onInputConfirm"
			@close="pendingAction = null" />
	</div>
</template>

<script>
import { inject, ref } from 'vue'
import { emit as emitBus } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import CnTimelineStages from '../CnTimelineStages/CnTimelineStages.vue'
import CnTransitionInputDialog from '../../dialogs/CnTransitionInputDialog.vue'
import { getByPath, useEndpointSource } from '../../composables/useEndpointSource.js'
import {
	actionNote,
	actionsByTarget,
	declaresInputs,
	fetchAvailableActions,
	performTransition,
	transitionError,
} from '../../composables/useLifecycleTransitions.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import {
	dropOptionalUnresolved,
	hasUnresolvedTokens,
	resolveFilterTokens,
} from '../../utils/resolveFilterTokens.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { normalizeStages, stageSavePayload } from './stagesModel.js'
// The stepper's look lives in the global timeline stylesheet. Imported here
// so the widget renders styled without the app's global css/index.css, the
// same reason CnStatWidget imports kpi-card.css.
import '../../css/timeline-stages.css'

/** The page-level refresh channel every endpoint widget and CnDetailPage answer. */
const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/**
 * Unwrap a value that may be a plain object or a `{ value }` holder.
 *
 * @param {*} v The injected value.
 * @return {*} The unwrapped value.
 */
function unwrap(v) {
	return (v && typeof v === 'object' && 'value' in v) ? v.value : v
}

/**
 * Flatten a register or schema reference to its slug or id.
 *
 * @param {*} value The reference (string, or an object with slug/id).
 * @return {string} The slug or id, or ''.
 */
function refKey(value) {
	if (value && typeof value === 'object') return String(value.slug || value.id || '')
	return (value === undefined || value === null) ? '' : String(value)
}

/**
 * An Error whose message is safe to show a person.
 *
 * @param {string} message The message.
 * @return {Error} The error, marked for display.
 */
function userError(message) {
	const error = new Error(message)
	error.userMessage = message
	return error
}

/**
 * CnStagesWidget: the stages a record moves through, as a placeable widget.
 * Clicking a stage moves the record to that stage.
 *
 * Registered as the `stages` widget type for the detail page. It reads the
 * current stage off the bound record, draws the stage list with
 * `CnTimelineStages`, and moves the record through OpenRegister's lifecycle
 * when a reachable stage is clicked. Nothing about the record type is
 * hard-coded.
 *
 * It is the same contract `CnLifecycleActions` speaks, rendered differently:
 * that component draws the allowed moves as buttons, this one draws them as a
 * timeline. Both go through `useLifecycleTransitions`, so there is one place
 * that knows what a transition is.
 *
 * ## The stage list
 *
 * The lifecycle says what is reachable NOW. It does not say what the whole
 * process looks like, and a timeline that only showed the next step would not
 * be a timeline. So the list of stages is configured, and it is display only:
 * it grants nothing.
 *
 * One of two sources:
 *
 * - `stagesEndpoint`: `{ url, method?, path, params?, idField?, labelField?,
 *   descriptionField?, orderField?, finalField? }`. The url and params take
 *   the shared token grammar (`@objectId`, `@object.<field>`), so
 *   `/apps/myapp/api/types/@object.type/stages` names the record's own type.
 *   `path` points at the array in the response.
 * - `stagesSource`: `{ register, schema, filter?, orderBy?, idField?,
 *   labelField?, descriptionField?, finalField?, limit? }`, an OpenRegister
 *   query whose filter takes the same tokens.
 *
 * `finalField` marks the stages that close the record, which the timeline
 * draws differently. It grants nothing either.
 *
 * ## Which stages can be reached
 *
 * `GET /apps/openregister/api/objects/{id}/available-actions`, the same
 * endpoint `CnLifecycleActions` reads. It answers
 * `{ actions: [{ action, to, requires, description, inputs? }] }` already
 * filtered to the record's current state, so a stage is reachable exactly
 * when an action leads to it.
 *
 * That is why there is no `allowed` flag to read, no field mapping to get
 * backwards and no config that can remove the guard: a stage no action
 * reaches is disabled because nothing said it was reachable. It fails closed
 * by construction rather than by a check somebody has to remember to write.
 * `description` and `requires` become the note beside the stage.
 *
 * ## Moving
 *
 * `POST /apps/openregister/api/objects/{id}/transition` with `{ action }`, or
 * `{ action, data }` when the action declares `inputs: [{ field, required }]`,
 * mirroring `x-openregister-lifecycle.transitions.<action>.inputs`. An action
 * with inputs opens the shared `CnTransitionInputDialog` first, and cancelling
 * it sends nothing. OpenRegister re-validates the move, and a 403 or 422 is
 * shown where the click happened.
 *
 * `transition` selects the mode:
 *
 * - absent: read only. The stages render and nothing is clickable.
 * - `{ kind: 'lifecycle' }` (the registry default): the contract above.
 * - `{ kind: 'field' }`: an EXPLICIT opt-in for a record whose schema has no
 *   lifecycle. It writes `currentField` on the record through the object
 *   store, sending the stage change and the record's own properties, and it
 *   REFUSES when it cannot prove it is updating rather than creating. There is
 *   no server-side validation on this path, which is why it is not the
 *   default: whatever the timeline offers is what happens.
 *
 * After a successful move the widget shows the new stage at once, fires
 * `cn:page:refresh` so the page re-reads the record, and re-reads the allowed
 * actions for the stage the record is now on.
 *
 * ```js
 * content: {
 *   currentField: 'status',
 *   stagesEndpoint: {
 *     url: '/apps/myapp/api/case-types/@object.caseType/blueprint',
 *     path: 'statusTypes',
 *     orderField: 'order',
 *     finalField: 'isFinal',
 *   },
 *   transition: { kind: 'lifecycle' },
 *   unreachableReason: 'Not possible from the current stage',
 * }
 * ```
 */
export default {
	name: 'CnStagesWidget',

	components: {
		CnTimelineStages,
		CnTransitionInputDialog,
		NcLoadingIcon,
	},

	// The detail host spreads `content` onto the widget as attributes. They are
	// config, not DOM attributes, so they must not land on the root element.
	inheritAttrs: false,

	props: {
		/**
		 * The widget's config. See the component description for every key:
		 * `currentField`, `stagesEndpoint` or `stagesSource`, `transition`
		 * (`{ kind: 'lifecycle' }` by default, or `{ kind: 'field' }`, or
		 * absent for a read-only strip), `unreachableReason`, `orientation`,
		 * `size` and `ariaLabel`.
		 *
		 * @type {{currentField?: string, stagesEndpoint?: object, stagesSource?: object, transition?: object, unreachableReason?: string, orientation?: ('horizontal'|'vertical'), size?: ('medium'|'small'), ariaLabel?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * The bound record, when the surface passes it. Falls back to the
		 * detail page's injected object context.
		 *
		 * @type {object|null}
		 */
		objectData: {
			type: Object,
			default: null,
		},
		/**
		 * The bound record's id, when the surface passes it. Falls back to the
		 * injected object context.
		 */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/**
		 * The object-store type slug of the bound record, used by the `field`
		 * transition. Falls back to the context, then to the register and
		 * schema of the page.
		 */
		objectType: {
			type: String,
			default: '',
		},
		/**
		 * The object store to save through. Falls back to the context's store,
		 * then to the shared `useObjectStore()`.
		 *
		 * @type {object|null}
		 */
		store: {
			type: Object,
			default: null,
		},
		/**
		 * The record's JSON Schema, forwarded to `CnTransitionInputDialog` so a
		 * transition's declared inputs render with the property's title and
		 * type instead of a bare text box. Optional, exactly as on
		 * `CnLifecycleActions`.
		 *
		 * @type {object|null}
		 */
		schema: {
			type: Object,
			default: null,
		},
		/**
		 * Translate function for the manifest-authored strings. Falls back to
		 * the injected `cnTranslate`, an identity function by default.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
	},

	emits: ['moved'],

	setup(props) {
		const objectCtxRaw = inject('cnObjectContext', null)
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', ref({}))
		const appConfigRaw = inject('cnAppConfig', ref({}))
		const cnTranslate = inject('cnTranslate', (key) => key)

		/**
		 * The token context: the bound record, its id, and the page context.
		 * Explicit props win over the injected detail context.
		 *
		 * @return {object} The context.
		 */
		const tokenCtx = () => {
			const base = resolveObjectTokenContext(objectCtxRaw, detailCtxRaw) || {}
			return {
				...base,
				object: props.objectData || base.object || null,
				objectId: (props.objectId !== '' && props.objectId !== null && props.objectId !== undefined) ? props.objectId : (base.objectId ?? null),
				workspace: unwrap(workspaceRaw) || {},
				config: unwrap(appConfigRaw) || {},
			}
		}

		// Both reads go through the shared endpoint engine: tokens, request
		// dedup, a short cache, and the cn:page:refresh subscription.
		const stagesRead = useEndpointSource(() => {
			const cfg = props.content?.stagesEndpoint
			return (cfg && cfg.url) ? { url: cfg.url, method: cfg.method, params: cfg.params } : null
		}, { ctx: tokenCtx })

		return {
			detailCtxRaw,
			objectCtxRaw,
			cnTranslate,
			tokenCtx,
			stagesBody: stagesRead.data,
			stagesBodyLoading: stagesRead.loading,
			stagesBodyError: stagesRead.error,
		}
	},

	data() {
		return {
			/** @type {Array<object>} Stage rows read from `stagesSource`. */
			sourceRows: [],
			/** @type {boolean} Whether the `stagesSource` read is in flight. */
			sourceLoading: false,
			/** @type {string} Why the `stagesSource` read failed, or ''. */
			sourceError: '',
			/**
			 * @type {string|null} The stage a successful move went to, shown until
			 * the re-read record catches up.
			 */
			movedTo: null,
			/**
			 * @type {Array<object>} The moves OpenRegister allows from the
			 * record's current state, as `/available-actions` answered them.
			 */
			actions: [],
			/**
			 * @type {boolean} Whether the allowed moves have been read at all
			 * yet. Nothing is clickable before they have: an empty list and an
			 * unread list look identical, and only one of them means "no move
			 * is allowed".
			 */
			actionsLoaded: false,
			/**
			 * @type {object|null} The action whose declared inputs are being
			 * collected. Non-null mounts CnTransitionInputDialog, and the POST
			 * waits for its confirm.
			 */
			pendingAction: null,
			/** @type {boolean} Whether a move is running. */
			busy: false,
			/** @type {string} Why the last move failed, or ''. */
			moveError: '',
			/** @type {string} The last outcome, for the polite live region. */
			statusMessage: '',
		}
	},

	computed: {
		/**
		 * The bound record, or null while it is still loading.
		 *
		 * @return {object|null} The record.
		 */
		record() {
			return this.tokenCtx().object || null
		},

		/**
		 * The bound record's id, from every shape it can arrive in.
		 *
		 * The token context first, then the record's own `id`, then the
		 * OpenRegister `@self.id` envelope. The context alone was not enough:
		 * `resolveObjectTokenContext` has no `@self` fallback, so a record
		 * shaped `{'@self': {id}}` reaching a surface that passes no explicit
		 * `objectId` resolved to nothing.
		 *
		 * @return {string} The id, or '' when the record has none.
		 */
		recordId() {
			const fromCtx = this.tokenCtx().objectId
			if (fromCtx !== null && fromCtx !== undefined && fromCtx !== '') return String(fromCtx)
			const record = this.record
			if (!record) return ''
			const own = record.id ?? record['@self']?.id ?? record.uuid
			return (own === undefined || own === null) ? '' : String(own)
		},

		/**
		 * The stage id the record holds in `currentField`, or null.
		 *
		 * @return {string|null} The stage id.
		 */
		recordStageId() {
			const field = this.content.currentField
			if (!field || !this.record) return null
			const raw = getByPath(this.record, field)
			return (raw === undefined || raw === null || raw === '') ? null : String(raw)
		},

		/**
		 * The stage to mark as current: a just-made move until the record
		 * catches up, else the record's own.
		 *
		 * @return {string|null} The stage id.
		 */
		currentStageId() {
			return this.movedTo ?? this.recordStageId
		},

		/**
		 * Whether the stages come from an endpoint (it wins over a source).
		 *
		 * @return {boolean} True for `stagesEndpoint`.
		 */
		endpointStages() {
			return Boolean(this.content.stagesEndpoint && this.content.stagesEndpoint.url)
		},

		/**
		 * The field mapping of the active stage source.
		 *
		 * @return {object} The config.
		 */
		stageConfig() {
			return (this.endpointStages ? this.content.stagesEndpoint : this.content.stagesSource) || {}
		},

		/**
		 * The ordered, normalised stages.
		 *
		 * @return {Array<{id: string, label: string, subtitle: string, final: boolean}>} The stages.
		 */
		stages() {
			const cfg = this.stageConfig
			const rows = this.endpointStages ? getByPath(this.stagesBody, cfg.path) : this.sourceRows
			const orderField = cfg.orderField || (this.endpointStages ? '' : cfg.orderBy)
			return normalizeStages(rows, { ...cfg, orderField })
		},

		/**
		 * Whether the stage list is still on its way.
		 *
		 * @return {boolean} True while loading.
		 */
		stagesPending() {
			if (this.endpointStages) return this.stagesBodyLoading || (this.stagesBody === null && !this.stagesBodyError)
			return this.sourceLoading
		},

		/**
		 * Whether the stage list could not be read.
		 *
		 * @return {boolean} True on a failed read.
		 */
		stagesError() {
			return Boolean(this.endpointStages ? this.stagesBodyError : this.sourceError)
		},

		/**
		 * The configured transition, or null when the widget is read-only.
		 *
		 * An unrecognised `kind` reads as read-only rather than as lifecycle: a
		 * typo must not silently pick a mode nobody asked for, and a strip that
		 * does nothing is the safe end of that mistake.
		 *
		 * @return {object|null} The transition.
		 */
		transition() {
			const tr = this.content.transition
			if (!tr || typeof tr !== 'object') return null
			if (tr.kind === 'field' || tr.kind === 'lifecycle') return tr
			return null
		},

		/**
		 * Whether moves go through OpenRegister's lifecycle.
		 *
		 * @return {boolean} True on the lifecycle path.
		 */
		lifecycleMode() {
			return Boolean(this.transition) && this.transition.kind !== 'field'
		},

		/**
		 * Whether the strip is interactive at all: a transition is configured
		 * and there is a property to write the stage to.
		 *
		 * This deliberately does NOT fall to false while a move runs.
		 * `clickable` drives the roving tabindex in CnTimelineStages, so
		 * flipping it mid-move took every stage's focus stop away and dropped
		 * a keyboard user's focus to `body` with nothing to restore it to. A
		 * busy strip keeps its stops and disables its stages instead.
		 *
		 * @return {boolean} True when the widget is interactive.
		 */
		interactive() {
			return Boolean(this.transition) && Boolean(this.content.currentField)
		},

		/**
		 * Whether the widget may move the record right now.
		 *
		 * @return {boolean} True when it is interactive and idle.
		 */
		canMove() {
			return this.interactive && !this.busy
		},

		/**
		 * The allowed moves by the stage they lead to, or null while they are
		 * unknown.
		 *
		 * Null is not the same as an empty map. Before `/available-actions` has
		 * answered, nothing is known about any stage; after it has, an absent
		 * stage is a stage no move reaches. Collapsing the two would make a
		 * strip clickable for the length of one request.
		 *
		 * @return {Map<string, object>|null} The moves.
		 */
		moves() {
			if (!this.lifecycleMode) return null
			if (!this.actionsLoaded) return null
			return actionsByTarget(this.actions)
		},

		/**
		 * The stages as CnTimelineStages renders them, each carrying whether it
		 * can be chosen and, when not, why.
		 *
		 * @return {Array<object>} The timeline stages.
		 */
		timelineStages() {
			return this.stages.map((stage) => ({
				id: stage.id,
				label: stage.label,
				subtitle: stage.subtitle,
				...this.stageAccess(stage),
			}))
		},

		/**
		 * The accessible name of the stage list.
		 *
		 * @return {string} The name.
		 */
		ariaLabel() {
			const label = this.content.ariaLabel || this.content.label
			return label ? this.effectiveTranslate(label) : this.tr('Stages')
		},

		/** @return {'horizontal'|'vertical'} The layout direction. */
		orientation() {
			return this.content.orientation === 'vertical' ? 'vertical' : 'horizontal'
		},

		/** @return {'medium'|'small'} The indicator size. */
		size() {
			return this.content.size === 'small' ? 'small' : 'medium'
		},

		/**
		 * Effective translate function for manifest-authored strings.
		 *
		 * @return {(key: string) => string} The function.
		 */
		effectiveTranslate() {
			return this.translate || this.cnTranslate || ((key) => key)
		},

		/**
		 * A stable signature of the `stagesSource` query, so it refetches only
		 * on a real change.
		 *
		 * @return {string} The signature.
		 */
		sourceKey() {
			const cfg = this.content.stagesSource
			if (this.endpointStages || !cfg || !cfg.register || !cfg.schema) return ''
			return JSON.stringify({ cfg, filter: resolveFilterTokens(cfg.filter || {}, this.tokenCtx()) })
		},

		/**
		 * What the allowed-moves read depends on: the record it is about, and
		 * whether the lifecycle is in use at all.
		 *
		 * @return {string} The signature.
		 */
		actionsKey() {
			return this.lifecycleMode ? String(this.recordId) : ''
		},
	},

	watch: {
		sourceKey: {
			immediate: true,
			handler() {
				this.fetchSourceStages()
			},
		},
		record(next, previous) {
			if (next === previous) return
			// A RE-READ RECORD IS AUTHORITATIVE, whatever it says.
			//
			// `movedTo` is the optimistic stage, shown so a move looks
			// immediate. It used to be cleared only when `recordStageId`
			// CHANGED, so a 200 that did not actually move the record (a guard
			// the server enforced silently, a no-op transition) left the strip
			// claiming a stage the record never reached, permanently, while the
			// availability answer described the real one. The arrival of a
			// fresh record ends the optimism either way.
			this.movedTo = null
		},
		recordStageId(next, previous) {
			if (next === previous) return
			// The record moved without us, so the list in hand describes a stage
			// it has left. Our OWN move refetches inside `performMove`, while
			// `busy` still holds, so this does not double-request it.
			if (previous !== null && !this.busy) this.loadActions()
		},
		actionsKey: {
			immediate: true,
			handler() {
				this.loadActions()
			},
		},
	},

	methods: {
		/**
		 * Translate a library string.
		 *
		 * @param {string} text The source string.
		 * @param {object} [vars] Placeholder values.
		 * @return {string} The translated string.
		 */
		tr(text, vars) {
			return t('nextcloud-vue', text, vars)
		},

		/**
		 * Whether a stage can be chosen and, when not, why.
		 *
		 * On the lifecycle path there is nothing to decide: OpenRegister has
		 * already filtered the actions to the record's current state, so a
		 * stage is reachable exactly when an action leads to it. There is no
		 * flag to read and no way to configure the guard away.
		 *
		 * @param {{id: string}} stage The stage.
		 * @return {{disabled: boolean, reason: string, reasonVisible: boolean}} The access.
		 */
		stageAccess(stage) {
			const open = { disabled: false, reason: '', reasonVisible: false }
			if (!this.transition) return open
			// You cannot move to where you already are. That is NOT the same as
			// blocked, so it is not announced as blocked: the stage carries
			// `aria-current="step"` and nothing else. Marking it
			// `aria-disabled` on top said "you may not go here" about the place
			// the record already is. `onStageClick` refuses it explicitly.
			if (stage.id === this.currentStageId) return open
			// A move is running, or the action list in hand is the one for the
			// stage the record has just LEFT. Everything is disabled until the
			// fresh list lands, and the focus stops stay.
			if (!this.canMove) return { disabled: true, reason: '', reasonVisible: false }
			// The field path has no server to ask, which is exactly why it is an
			// explicit opt-in: every stage is offered and the write decides.
			if (!this.lifecycleMode) return open
			// Not read yet. Not "no moves allowed", which is why this is not the
			// same branch as an empty list.
			if (this.moves === null) return { disabled: true, reason: '', reasonVisible: false }
			const move = this.moves.get(stage.id)
			if (!move) {
				const reason = this.content.unreachableReason
					? this.effectiveTranslate(this.content.unreachableReason)
					: this.tr('Not reachable from the current stage')
				return { disabled: true, reason, reasonVisible: false }
			}
			// What the move says about itself. It is not a refusal, so it is
			// shown rather than hidden: it tells the person what happens next.
			return { ...open, reason: actionNote(move), reasonVisible: Boolean(actionNote(move)) }
		},

		/**
		 * A stage was clicked: move there, collecting the action's declared
		 * inputs first when it has any.
		 *
		 * @param {{stage: {id: string}}} payload The CnTimelineStages event.
		 * @return {void}
		 */
		onStageClick({ stage }) {
			if (!this.canMove || !stage) return
			// The current stage is no longer marked disabled, so refuse it here.
			// You cannot move to where you already are, and re-firing the move
			// that just landed is exactly what a stray click would do.
			if (stage.id === this.currentStageId) return
			const target = this.timelineStages.find((s) => s.id === stage.id)
			if (!target || target.disabled) return
			this.moveError = ''
			const move = this.moves ? this.moves.get(stage.id) : null
			if (this.lifecycleMode && !move) return
			const request = {
				stage: { id: stage.id, label: target.label },
				action: move ? move.action : stage.id,
				inputs: (move && Array.isArray(move.inputs)) ? move.inputs : [],
			}
			// A transition that declares inputs collects them first, and
			// cancelling the dialog sends nothing. `CnTransitionInputDialog`
			// reads `transition.inputs` and `transition.label`, so the request
			// carries the shape that dialog already understands.
			if (this.lifecycleMode && declaresInputs(move)) {
				this.pendingAction = {
					action: move.action,
					to: move.to,
					label: this.tr('Move to {stage}', { stage: target.label }),
					inputs: move.inputs,
					__request: request,
				}
				return
			}
			this.performMove(request)
		},

		/**
		 * The input dialog confirmed: send the move with what it collected.
		 *
		 * @param {object} data The collected input values.
		 * @return {void}
		 */
		onInputConfirm(data) {
			const pending = this.pendingAction
			this.pendingAction = null
			if (!pending || !pending.__request) return
			this.performMove(pending.__request, data)
		},

		/**
		 * Perform a move.
		 *
		 * @param {{stage: {id: string, label: string}, action: string}} request The move.
		 * @param {object} [data] The collected transition inputs, when any.
		 * @return {Promise<void>}
		 */
		async performMove(request, data) {
			this.busy = true
			this.moveError = ''
			try {
				if (this.lifecycleMode) {
					await performTransition(this.recordId, request.action, data)
				} else {
					await this.moveViaField(request)
				}
				this.movedTo = request.stage.id
				this.statusMessage = this.tr('Moved to {stage}', { stage: request.stage.label })
				/**
				 * @event moved The record moved to another stage.
				 * @type {{stage: string, action: string}}
				 */
				this.$emit('moved', { stage: request.stage.id, action: request.action })
				// The page re-reads the record and every endpoint widget
				// refetches.
				emitBus(PAGE_REFRESH_CHANNEL, {})
				this.refreshContextRecord()
				// A MOVE INVALIDATES THE LIST THAT MADE IT. Awaiting the fresh
				// list here, inside the try, is what keeps `busy` true across
				// the whole window: until it lands, the list in hand describes
				// the stage the record has just LEFT, and a click against it
				// would POST a move the server has already closed. Fails
				// closed, because `busy` only clears in the finally below.
				if (this.lifecycleMode) await this.loadActions()
			} catch (error) {
				this.moveError = transitionError(error, this.tr('The move could not be made'))
			} finally {
				this.busy = false
			}
		},

		/**
		 * Read the moves OpenRegister allows from the record's current state.
		 *
		 * @return {Promise<void>}
		 */
		async loadActions() {
			if (!this.lifecycleMode || !this.recordId) {
				this.actions = []
				this.actionsLoaded = false
				return
			}
			const id = this.recordId
			const actions = await fetchAvailableActions(id)
			// The record may have moved on while the read was in flight; the
			// newer read owns the state.
			if (String(this.recordId) !== String(id)) return
			this.actions = actions
			this.actionsLoaded = true
		},

		/**
		 * Save the bound record with the stage field set to the target stage.
		 *
		 * The `{ kind: 'field' }` opt-in, for a record whose schema declares no
		 * lifecycle. Nothing validates this move but the schema itself, which
		 * is why it is not the default.
		 *
		 * @param {{stage: {id: string}}} request The move request.
		 * @return {Promise<void>}
		 */
		async moveViaField(request) {
			const record = this.record
			if (!record) throw userError(this.tr('The record is not loaded yet'))
			const store = this.resolveStore()
			if (!store) throw userError(this.tr('The move could not be made'))
			const type = this.resolveType(store)
			if (!type) throw userError(this.tr('The move could not be made'))
			// REFUSE rather than save without an id. `saveObject` picks PUT over
			// POST purely on the presence of `id`, and an OpenRegister record
			// carries its id in `@self`, not at the top level, so a record whose
			// context id happened to be empty was POSTed as A BRAND NEW OBJECT
			// and the widget then announced a successful move. The record the
			// person was looking at never changed, and an orphan row was left
			// behind. `CnDetailPage.onEditFormConfirm` refuses the same case for
			// the same reason.
			const id = this.recordId
			if (id === '') {
				throw userError(this.tr('Cannot move: this record has no id, so the move would create a duplicate instead of updating it.'))
			}
			const payload = stageSavePayload(record, id, this.content.currentField, request.stage.id)
			const saved = await store.saveObject(type, payload)
			if (!saved) {
				const error = typeof store.getError === 'function' ? store.getError(type) : null
				throw userError((error && error.message) || this.tr('The move could not be made'))
			}
		},

		/**
		 * The object store to save through: the prop, the context's, or the
		 * shared one.
		 *
		 * @return {object|null} The store.
		 */
		resolveStore() {
			if (this.store) return this.store
			const holder = unwrap(this.detailCtxRaw)
			if (holder && holder.store) return holder.store
			try {
				return useObjectStore()
			} catch (e) {
				// No active Pinia: there is no store to save through.
				return null
			}
		},

		/**
		 * The object-store type of the bound record.
		 *
		 * @param {object} store The store.
		 * @return {string} The type slug, or ''.
		 */
		resolveType(store) {
			if (this.objectType) return this.objectType
			const holder = unwrap(this.detailCtxRaw)
			if (holder && holder.objectType) return holder.objectType
			const ctx = this.tokenCtx()
			const register = refKey(ctx.register)
			const schema = refKey(ctx.schema)
			if (!register || !schema) return ''
			return resolveObjectOpType(store, { register, schema })
		},

		/**
		 * Re-read the record on a surface where no page listens for the
		 * refresh signal: the v2 slot grid, whose record lives in the store
		 * cache. On a CnDetailPage the page re-reads it itself.
		 *
		 * @return {void}
		 */
		refreshContextRecord() {
			if (unwrap(this.objectCtxRaw)) return
			const holder = unwrap(this.detailCtxRaw)
			if (!holder || !holder.store || typeof holder.store.fetchObject !== 'function') return
			if (!holder.objectType || holder.objectId === undefined || holder.objectId === null) return
			holder.store.fetchObject(holder.objectType, holder.objectId).catch(() => {})
		},

		/**
		 * Read the stage rows from the `stagesSource` OpenRegister query.
		 *
		 * @return {Promise<void>}
		 */
		async fetchSourceStages() {
			const cfg = this.content.stagesSource
			if (!this.sourceKey) {
				this.sourceRows = []
				this.sourceLoading = false
				this.sourceError = ''
				return
			}
			const filter = dropOptionalUnresolved(resolveFilterTokens(cfg.filter || {}, this.tokenCtx()))
			if (hasUnresolvedTokens(filter)) {
				// The record the filter names has not arrived yet: wait.
				this.sourceRows = []
				this.sourceLoading = true
				this.sourceError = ''
				return
			}
			const store = this.resolveStore()
			if (!store) {
				this.sourceError = 'no store'
				return
			}
			const key = this.sourceKey
			this.sourceLoading = true
			this.sourceError = ''
			try {
				const type = resolveObjectOpType(store, { register: String(cfg.register), schema: String(cfg.schema) })
				const params = { ...filter, _limit: cfg.limit || 100 }
				if (cfg.orderBy) params[`_order[${cfg.orderBy}]`] = 'asc'
				const rows = await store.fetchCollection(type, params)
				if (key !== this.sourceKey) return
				const error = typeof store.getError === 'function' ? store.getError(type) : null
				if (error) {
					this.sourceError = (error && error.message) || 'error'
					this.sourceRows = []
				} else {
					this.sourceRows = Array.isArray(rows) ? rows : []
				}
			} catch (e) {
				if (key !== this.sourceKey) return
				this.sourceError = (e && e.message) || 'error'
				this.sourceRows = []
			} finally {
				if (key === this.sourceKey) this.sourceLoading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-stages-widget {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	width: 100%;
}

.cn-stages-widget__loading {
	display: flex;
	justify-content: center;
	padding: 8px 0;
}

.cn-stages-widget__notice {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-stages-widget__error {
	margin: 0;
	color: var(--color-error-text, var(--color-error));
}

/* A guard's reason, under the stage it blocks: what the record still needs. */
.cn-stages-widget__reason {
	display: block;
	margin-top: 2px;
	font-size: 0.8em;
	line-height: 1.3;
	color: var(--color-text-maxcontrast);
}

/* Text for screen readers only. */
.cn-stages-widget__sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}
</style>
