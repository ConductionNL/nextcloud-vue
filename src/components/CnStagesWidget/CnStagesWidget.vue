<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  CnStagesWidget: the record's stages as a placeable, configurable widget,
  where clicking a stage moves the record there.

  Keep this comment OUT of <template>: a comment node beside the root element
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
					<!-- A guard's reason is shown: it tells the person what the
					     record still needs. A stage with no route from here only
					     tells a screen reader why it cannot be chosen. -->
					<span
						v-if="stage.reason"
						:class="stage.reasonVisible ? 'cn-stages-widget__reason' : 'cn-stages-widget__sr-only'"
						:data-testid="`cn-stages-widget-reason-${stage.id}`">
						{{ stage.reason }}
					</span>
				</template>
			</CnTimelineStages>

			<p v-if="availabilityFailed" class="cn-stages-widget__notice" data-testid="cn-stages-widget-availability-error">
				{{ tr('Could not check which stages can be reached') }}
			</p>
			<p
				v-if="moveError && !pendingMove"
				class="cn-stages-widget__error"
				data-testid="cn-stages-widget-error"
				role="alert">
				{{ moveError }}
			</p>
			<p class="cn-stages-widget__sr-only" aria-live="polite">
				{{ statusMessage }}
			</p>
		</template>

		<CnStageMoveDialog
			v-if="pendingMove"
			:stage-label="pendingMove.stage.label"
			:comment-mode="pendingMove.commentMode"
			:result-options="pendingMove.resultOptions"
			:result-required="pendingMove.resultRequired"
			:busy="busy"
			:error="moveError"
			@confirm="onDialogConfirm"
			@close="onDialogClose" />
	</div>
</template>

<script>
import { inject, ref } from 'vue'
import { emit as emitBus } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon } from '@nextcloud/vue'
import CnTimelineStages from '../CnTimelineStages/CnTimelineStages.vue'
import CnStageMoveDialog from '../../dialogs/CnStageMoveDialog.vue'
import { getByPath, resolveEndpointRequest, useEndpointSource } from '../../composables/useEndpointSource.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import {
	dropOptionalUnresolved,
	dropOptionalUnresolvedDeep,
	hasUnresolvedDeepTokens,
	hasUnresolvedTokens,
	resolveDeepTokens,
	resolveFilterTokens,
} from '../../utils/resolveFilterTokens.js'
import { useObjectStore } from '../../store/useObjectStore.js'
import { resolveObjectOpType } from '../../utils/actionsDispatcher.js'
import { buildAvailability, normalizeOptions, normalizeStages, refusalReason, stageSavePayload } from './stagesModel.js'
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
 * `CnTimelineStages`, and performs the configured transition when a
 * reachable stage is clicked. Nothing about the record type is hard-coded.
 *
 * ## The stage list
 *
 * One of two sources:
 *
 * - `stagesEndpoint`: `{ url, path, params?, idField?, labelField?,
 *   descriptionField?, orderField?, finalField?, resultsPath?,
 *   resultIdField?, resultLabelField? }`. The url and params take the shared
 *   token grammar (`@objectId`, `@object.<field>`), so
 *   `/apps/myapp/api/types/@object.type/stages` names the record's own type.
 *   `path` points at the array in the response.
 * - `stagesSource`: `{ register, schema, filter?, orderBy?, labelField?,
 *   descriptionField?, finalField?, limit? }`, an OpenRegister query whose
 *   filter takes the same tokens.
 *
 * `finalField` marks the stages that close the record. A move into one asks
 * for a result when results are on offer (`resultsPath` in the stages
 * response, or the move's own options).
 *
 * ## Moving
 *
 * `transition` is one of:
 *
 * - `{ kind: 'field' }`: save the bound record with `currentField` set to the
 *   clicked stage id, through the object store the other detail widgets use.
 * - `{ kind: 'endpoint', url, method?, bodyKey?, commentKey?, resultKey?,
 *   body?, errorField? }`: send the move to an app endpoint. The body carries
 *   the move id under `bodyKey` (default `stage`), plus the comment and
 *   result when given.
 *
 * ## Guards
 *
 * An optional `availability` endpoint says which stages can be reached from
 * here, why the others cannot, and what a move needs: `{ url, path,
 * stageField?, moveField?, allowedField?, reasonField?, commentField?,
 * resultField?, resultOptionsField?, unlistedReason? }`. A blocked stage
 * renders disabled with its reason. A stage the answer does not list renders
 * disabled with `unlistedReason` as screen-reader text. A move that declares
 * a comment or a result opens `CnStageMoveDialog` first.
 *
 * After a successful move the widget shows the new stage at once, and fires
 * `cn:page:refresh` so the page re-reads the record and every endpoint
 * widget, the availability answer included, refetches.
 *
 * ```js
 * content: {
 *   currentField: 'status',
 *   stagesEndpoint: {
 *     url: '/apps/myapp/api/case-types/@object.caseType/blueprint',
 *     path: 'statusTypes',
 *     orderField: 'order',
 *     finalField: 'isFinal',
 *     resultsPath: 'resultTypes',
 *   },
 *   availability: {
 *     url: '/apps/myapp/api/case/@objectId/available-transitions',
 *     path: 'transitions',
 *     stageField: 'toStatus',
 *     moveField: 'id',
 *     allowedField: 'guardsPassed',
 *     reasonField: 'failedGuards.0.failureMessage',
 *   },
 *   transition: {
 *     kind: 'endpoint',
 *     url: '/apps/myapp/api/case/@objectId/transition',
 *     bodyKey: 'transitionId',
 *     resultKey: 'resultTypeId',
 *   },
 * }
 * ```
 */
export default {
	name: 'CnStagesWidget',

	components: {
		CnStageMoveDialog,
		CnTimelineStages,
		NcLoadingIcon,
	},

	// The detail host spreads `content` onto the widget as attributes. They are
	// config, not DOM attributes, so they must not land on the root element.
	inheritAttrs: false,

	props: {
		/**
		 * The widget's config. See the component description for every key:
		 * `currentField`, `stagesEndpoint` or `stagesSource`, `availability`,
		 * `transition`, `confirm` (`'declared'` by default, or `'always'`),
		 * `orientation`, `size` and `ariaLabel`.
		 *
		 * @type {{currentField?: string, stagesEndpoint?: object, stagesSource?: object, availability?: object, transition?: object, confirm?: ('declared'|'always'), orientation?: ('horizontal'|'vertical'), size?: ('medium'|'small'), ariaLabel?: string}}
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
		const availabilityRead = useEndpointSource(() => {
			const cfg = props.content?.availability
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
			availabilityBody: availabilityRead.data,
			availabilityLoading: availabilityRead.loading,
			availabilityError: availabilityRead.error,
			refetchAvailability: availabilityRead.refetch,
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
			/** @type {object|null} The move waiting in the confirm dialog. */
			pendingMove: null,
			/** @type {boolean} Whether a move is running. */
			busy: false,
			/**
			 * @type {boolean} A move landed and the guard answer in hand is
			 * still the one for the stage the record has just left. Until the
			 * fresh answer arrives the strip stays blocked: the old map is
			 * authoritative-looking and wrong, and clicking it POSTs a move the
			 * server has already closed.
			 */
			awaitingGuards: false,
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
		 * The results a closing move may choose from, read from the stages
		 * response at `stagesEndpoint.resultsPath`.
		 *
		 * @return {Array<{id: string, label: string}>} The choices.
		 */
		resultChoices() {
			const cfg = this.stageConfig
			if (!this.endpointStages || !cfg.resultsPath) return []
			return normalizeOptions(getByPath(this.stagesBody, cfg.resultsPath), {
				idField: cfg.resultIdField,
				labelField: cfg.resultLabelField,
			})
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
		 * @return {object|null} The transition.
		 */
		transition() {
			const tr = this.content.transition
			if (!tr || typeof tr !== 'object') return null
			if (tr.kind === 'field') return tr
			if (tr.kind === 'endpoint' && tr.url) return tr
			return null
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
			return this.interactive && !this.busy && !this.awaitingGuards
		},

		/**
		 * Whether an availability block is declared at all.
		 *
		 * Presence, not usability. A block that is present but unusable (a
		 * typo like `uri` for `url`) must BLOCK, and it can only do that if it
		 * counts as configured. Reading usability here would have made the
		 * typo mean "no guard", which is every stage clickable with nothing
		 * logged and nothing on screen.
		 *
		 * @return {boolean} True when one is declared.
		 */
		availabilityConfigured() {
			const cfg = this.content.availability
			return Boolean(cfg && typeof cfg === 'object' && !Array.isArray(cfg) && Object.keys(cfg).length > 0)
		},

		/**
		 * Whether the declared availability block can actually be read.
		 *
		 * @return {boolean} True when it names a url.
		 */
		availabilityUsable() {
			return this.availabilityConfigured && Boolean(this.content.availability.url)
		},

		/**
		 * The availability read failed, or could never be made. Every move
		 * then stays disabled: a guard that cannot be read is not a guard
		 * that passed.
		 *
		 * @return {boolean} True on a failed or impossible read.
		 */
		availabilityFailed() {
			if (!this.availabilityConfigured) return false
			return !this.availabilityUsable || Boolean(this.availabilityError)
		},

		/**
		 * The moves the availability endpoint offers, by stage id, or null
		 * while they are unknown.
		 *
		 * @return {Map<string, object>|null} The moves.
		 */
		moves() {
			if (!this.availabilityUsable || this.availabilityFailed) return null
			if (this.availabilityBody === null) return null
			return buildAvailability(getByPath(this.availabilityBody, this.content.availability.path), this.content.availability)
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
			// The record moved without us, so the old answer about what is
			// reachable describes a stage the record has left. After OUR move
			// the refresh signal already triggered that refetch, and
			// `awaitingGuards` is holding the strip until it lands.
			if (this.availabilityUsable && previous !== null && !this.awaitingGuards) this.refetchAvailability(true)
		},
		availabilityLoading(next, previous) {
			// The fresh guard answer has landed (or failed). Either way the map
			// in hand now describes the stage the record is on.
			if (previous && !next) this.awaitingGuards = false
		},
		availabilityBody() {
			this.awaitingGuards = false
		},
		availabilityError() {
			this.awaitingGuards = false
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
			// A move is running, or the guard answer in hand is the one for the
			// stage the record has just LEFT. Everything is disabled until the
			// fresh answer lands, and the focus stops stay.
			if (!this.canMove) return { disabled: true, reason: '', reasonVisible: false }
			if (!this.availabilityConfigured) return open
			if (this.availabilityFailed) {
				return { disabled: true, reason: this.tr('Could not check whether this stage can be reached'), reasonVisible: false }
			}
			if (this.moves === null) return { disabled: true, reason: '', reasonVisible: false }
			const move = this.moves.get(stage.id)
			if (!move) {
				const reason = this.content.availability.unlistedReason
					? this.effectiveTranslate(this.content.availability.unlistedReason)
					: this.tr('Not reachable from the current stage')
				return { disabled: true, reason, reasonVisible: false }
			}
			if (!move.allowed) {
				return { disabled: true, reason: move.reason || this.tr('This move is blocked'), reasonVisible: true }
			}
			// A move that MUST carry a result, with nothing to choose from, is a
			// dead end: the dialog would open with no picker and a confirm
			// button that can never be enabled. Say so at the stage instead.
			if (this.resultMode(stage, move) === 'required' && this.resultOptionsFor(move).length === 0) {
				return { disabled: true, reason: this.tr('This move needs a result, and none is on offer'), reasonVisible: true }
			}
			return open
		},

		/**
		 * The results a move may choose from: the move's own, else the ones the
		 * stages response offered.
		 *
		 * @param {object|null} move The availability move.
		 * @return {Array<{id: string, label: string}>} The choices.
		 */
		resultOptionsFor(move) {
			return (move && move.resultOptions.length) ? move.resultOptions : this.resultChoices
		},

		/**
		 * Whether a move asks for a result, and how hard.
		 *
		 * The move's own declaration wins. Without one, a stage that closes the
		 * record requires a result, which is the rule the widget shipped with.
		 *
		 * @param {{final?: boolean}} stage The target stage.
		 * @param {object|null} move The availability move.
		 * @return {''|'optional'|'required'} The mode.
		 */
		resultMode(stage, move) {
			if (move && move.result) return move.result
			return (stage && stage.final) ? 'required' : ''
		},

		/**
		 * A stage was clicked: move there, through the confirm step when the
		 * move needs input.
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
			const request = this.buildRequest(target)
			this.moveError = ''
			if (request.needsConfirm) {
				this.pendingMove = request
				return
			}
			this.performMove(request, {})
		},

		/**
		 * Work out what a move to a stage needs.
		 *
		 * @param {{id: string, label: string}} stage The target stage.
		 * @return {object} The move request.
		 */
		buildRequest(stage) {
			const move = this.moves ? this.moves.get(stage.id) : null
			const row = this.stages.find((s) => s.id === stage.id)
			const options = this.resultOptionsFor(move)
			// `'optional'` offers a result, `'required'` holds the confirm until
			// one is picked. Collapsing the two made every declaration force a
			// result, which is not what an endpoint saying `'optional'` asked
			// for.
			const mode = this.resultMode(row, move)
			const asksResult = mode !== '' && options.length > 0
			const always = this.content.confirm === 'always'
			const commentMode = (move && move.comment) || (always ? 'optional' : 'none')
			return {
				stage: { id: stage.id, label: stage.label },
				moveId: move ? move.moveId : stage.id,
				commentMode,
				resultOptions: asksResult ? options : [],
				resultRequired: asksResult && mode === 'required',
				needsConfirm: always || commentMode !== 'none' || asksResult,
			}
		},

		/**
		 * The confirm dialog was confirmed.
		 *
		 * @param {{comment?: string, result?: string}} input What the person entered.
		 * @return {void}
		 */
		onDialogConfirm(input) {
			if (!this.pendingMove) return
			this.performMove(this.pendingMove, input || {})
		},

		/**
		 * The confirm dialog was cancelled. No move is made.
		 *
		 * @return {void}
		 */
		onDialogClose() {
			if (this.busy) return
			this.pendingMove = null
			this.moveError = ''
		},

		/**
		 * Perform a move through the configured transition.
		 *
		 * @param {object} request The move request built by `buildRequest()`.
		 * @param {{comment?: string, result?: string}} input The confirm input.
		 * @return {Promise<void>}
		 */
		async performMove(request, input) {
			this.busy = true
			this.moveError = ''
			try {
				// RE-CHECK WHAT THE MOVE DECLARED IT NEEDS. The dialog holds its
				// confirm button until a required comment is typed and a
				// required result picked, but that guard lived only in the view,
				// and a guard that lives only where the button is drawn is not
				// enforced on the path that makes the request. Cheap here, and
				// it means the rule is stated once where the send happens.
				if (request.commentMode === 'required' && !String(input.comment || '').trim()) {
					throw userError(this.tr('This move needs a comment'))
				}
				if (request.resultRequired && !input.result) {
					throw userError(this.tr('This move needs a result'))
				}
				if (this.transition.kind === 'endpoint') {
					await this.moveViaEndpoint(request, input)
				} else {
					await this.moveViaField(request, input)
				}
				this.movedTo = request.stage.id
				this.pendingMove = null
				this.statusMessage = this.tr('Moved to {stage}', { stage: request.stage.label })
				// Block the strip until the guard answer for the NEW stage
				// arrives. `busy` is cleared in the finally below, while the
				// endpoint engine holds the previous answer until its refetch
				// lands, and in that window the old map rendered as if it were
				// current. Fails closed: if the refetch never reports, the strip
				// stays disabled rather than clickable against a stale map.
				if (this.availabilityUsable) this.awaitingGuards = true
				/**
				 * @event moved The record moved to another stage.
				 * @type {{stage: string, move: string}}
				 */
				this.$emit('moved', { stage: request.stage.id, move: request.moveId })
				// The page re-reads the record and every endpoint widget refetches,
				// the availability answer for the new stage included.
				emitBus(PAGE_REFRESH_CHANNEL, {})
				if (this.transition.kind === 'endpoint') this.refreshContextRecord()
			} catch (error) {
				this.moveError = (error && error.userMessage) || this.tr('The move could not be made')
			} finally {
				this.busy = false
			}
		},

		/**
		 * Send the move to the transition endpoint.
		 *
		 * @param {object} request The move request.
		 * @param {{comment?: string, result?: string}} input The confirm input.
		 * @return {Promise<void>}
		 */
		async moveViaEndpoint(request, input) {
			const tr = this.transition
			const ctx = this.tokenCtx()
			const target = resolveEndpointRequest({ url: tr.url }, ctx)
			if (!target.url || target.blocked) throw userError(this.tr('The record is not loaded yet'))
			const extra = (tr.body && typeof tr.body === 'object')
				? dropOptionalUnresolvedDeep(resolveDeepTokens(tr.body, ctx))
				: {}
			if (hasUnresolvedDeepTokens(extra)) throw userError(this.tr('The record is not loaded yet'))
			const body = { ...extra, [tr.bodyKey || 'stage']: request.moveId }
			if (input.comment) body[tr.commentKey || 'comment'] = input.comment
			if (input.result) body[tr.resultKey || 'result'] = input.result
			const verb = String(tr.method || 'POST').toLowerCase()
			const method = ['put', 'patch'].includes(verb) ? verb : 'post'
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			const url = /^https?:\/\//i.test(target.url) ? target.url : generateUrl(target.url)
			try {
				await axios[method](url, body)
			} catch (error) {
				const reason = refusalReason(error && error.response && error.response.data, tr.errorField)
				throw userError(reason || this.tr('The move could not be made'))
			}
		},

		/**
		 * Save the bound record with the stage field set to the target stage.
		 *
		 * @param {object} request The move request.
		 * @param {{comment?: string, result?: string}} input The confirm input.
		 * @return {Promise<void>}
		 */
		async moveViaField(request, input) {
			const tr = this.transition
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
			const extra = {}
			if (input.comment) extra[tr.commentKey || 'comment'] = input.comment
			if (input.result) extra[tr.resultKey || 'result'] = input.result
			const payload = stageSavePayload(record, id, this.content.currentField, request.stage.id, extra)
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
