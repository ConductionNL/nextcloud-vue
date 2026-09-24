<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="(barTransitions.length > 0) || error || inputTransition" class="cn-lifecycle-actions" data-testid="cn-lifecycle-actions">
		<NcButton
			v-for="tr in barTransitions"
			:key="tr.action"
			class="cn-lifecycle-actions__button"
			:variant="tr.variant || 'secondary'"
			:disabled="working"
			:data-testid="`cn-lifecycle-action-${tr.action}`"
			@click="onTransition(tr)">
			<template v-if="working && pendingAction === tr.action" #icon>
				<NcLoadingIcon :size="18" />
			</template>
			{{ tr.label }}
		</NcButton>
		<p v-if="error" class="cn-lifecycle-actions__error" data-testid="cn-lifecycle-actions-error">
			{{ error }}
		</p>
		<!-- Input collection for a transition that declares `inputs` — the POST
		     only happens after the dialog confirms (or never, on cancel). -->
		<CnTransitionInputDialog
			v-if="inputTransition"
			:transition="inputTransition"
			:schema="schema"
			:error="inputError"
			:fieldErrors="inputFieldErrors"
			:busy="working"
			@confirm="onInputConfirm"
			@close="closeInputDialog" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import CnTransitionInputDialog from '../../dialogs/CnTransitionInputDialog.vue'
import {
	performTransition,
	readAvailableActions,
	transitionError,
	transitionFieldErrors,
} from '../../composables/useLifecycleTransitions.js'

/**
 * CnLifecycleActions — declarative status-gated transition buttons for a
 * `type:"detail"` page.
 *
 * Reads the OpenRegister lifecycle for the page's object and renders one button
 * per transition allowed from the object's current `status`. Clicking a button
 * POSTs to OpenRegister's transition endpoint
 * (`/apps/openregister/api/objects/{id}/transition` with `{ action }`), then
 * asks the host to reload the object. OpenRegister's listener re-validates the
 * transition server-side; a rejection (403/422) is surfaced inline.
 *
 * Two ways to obtain the allowed transitions:
 *  - **Server-derived (default):** fetch
 *    `/apps/openregister/api/objects/{id}/available-actions`, which returns
 *    `{ actions: [{ action, to, requires, description }] }` already filtered to
 *    the object's current state. This is the source of truth and stays correct
 *    as a schema's lifecycle graph evolves.
 *  - **Config-declared:** when an explicit `transitions: [{ from, to, action,
 *    label, confirm?, variant?, inputs? }]` array is given, the component
 *    filters it by the object's current `status` value itself (no extra
 *    request). Useful for static labelling / confirm prompts, or when the page
 *    already holds the object.
 *
 * A transition may declare `inputs: [{ field, required }]` (mirroring the
 * schema's `x-openregister-lifecycle.transitions.<action>.inputs`) on EITHER
 * path — the server's `/available-actions` entries or the config-declared
 * array. Such a transition first opens `CnTransitionInputDialog` to collect
 * the declared fields, then POSTs `{ action, data }`; cancelling the dialog
 * POSTs nothing. A transition without `inputs` POSTs `{ action }` immediately,
 * exactly as before.
 *
 * Mounted by `CnDetailPage` when the manifest page config declares
 * `lifecycleActions`. Standalone use is also supported.
 *
 * Example config (consumed by CnDetailPage):
 * ```js
 * lifecycleActions: { field: 'status' }
 * // or, explicit:
 * lifecycleActions: {
 *   field: 'status',
 *   transitions: [
 *     { from: 'open', to: 'closed', action: 'close', label: 'Close shift', confirm: 'Close this shift?' },
 *   ],
 * }
 * ```
 */
export default {
	name: 'CnLifecycleActions',

	components: { NcButton, NcLoadingIcon, CnTransitionInputDialog },

	props: {
		/** Object id/uuid/slug the transitions apply to. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/**
		 * The currently-loaded object (for client-side `from`-state filtering of
		 * a config-declared `transitions` list, and to read the lifecycle field).
		 *
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},

		/**
		 * The lifecycle config block. A declared transition may carry
		 * `inputs: [{ field, required }]` to collect data before it is applied.
		 *
		 * @type {{field?: string, transitions?: Array<{from?: (string|Array<string>), to?: string, action?: string, label?: string, confirm?: string, variant?: string, inputs?: Array<{field: string, required?: boolean}>}>, autoFetch?: boolean}}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The object's JSON Schema (with `properties`), forwarded to
		 * `CnTransitionInputDialog` so a transition's declared inputs render
		 * with the property's title/type instead of a bare text box. Optional —
		 * without it every input falls back to a plain labelled text field.
		 *
		 * @type {object|null}
		 */
		schema: {
			type: Object,
			default: null,
		},

		/**
		 * Where the transitions are drawn. `buttons` (the default) renders one
		 * NcButton each. `menu` renders none and emits `entries`, so the host
		 * can put them in its Actions menu while this component keeps the
		 * input dialog and the error.
		 *
		 * @type {'buttons'|'menu'}
		 */
		display: {
			type: String,
			default: 'buttons',
			validator: (v) => ['buttons', 'menu'].includes(v),
		},
	},

	emits: ['transitioned', 'reload', 'entries'],

	data() {
		return {
			/** Server-derived allowed actions (from /available-actions). */
			serverActions: [],
			/** Whether a transition request is in flight. */
			working: false,
			/** The action currently being applied (drives the per-button spinner). */
			pendingAction: null,
			/** Inline error message (transition rejected / fetch failure). */
			error: '',
			/**
			 * The transition whose declared `inputs` are being collected —
			 * non-null mounts CnTransitionInputDialog; the POST waits for confirm.
			 */
			inputTransition: null,
			/** @type {string} The refusal the open input dialog is showing, '' while there is none. */
			inputError: '',
			/** @type {string[]} The input keys that refusal named. */
			inputFieldErrors: [],
			/** @type {string[]} The field keys the most recent refusal named. */
			lastFieldErrors: [],
		}
	},

	computed: {
		/** The lifecycle field name (`status` by default). */
		field() {
			return this.config.field || this.config.property || 'status'
		},

		/** The object's current lifecycle value. */
		currentState() {
			if (!this.object) {
				return ''
			}
			return String(this.object[this.field] ?? '')
		},

		/**
		 * Whether to use the server `/available-actions` endpoint. Defaults to
		 * true unless an explicit `transitions` array is declared AND
		 * `autoFetch` is not forced on.
		 *
		 * @return {boolean}
		 */
		useServer() {
			if (this.config.autoFetch === true) {
				return true
			}
			return !Array.isArray(this.config.transitions) || this.config.transitions.length === 0
		},

		/**
		 * The transitions to render as buttons — either the server-derived set or
		 * the config-declared set filtered to the object's current state. A
		 * declared `inputs` list is carried through on both paths so clicking
		 * the button collects the fields before POSTing.
		 *
		 * @return {Array<{action: string, to: string, label: string, confirm?: string, variant?: string, inputs?: Array<{field: string, required?: boolean}>}>}
		 */
		visibleTransitions() {
			if (this.useServer) {
				return this.serverActions.map((a) => ({
					action: a.action,
					to: a.to,
					label: this.labelFor(a.action, a.to, a.description),
					variant: 'secondary',
					...(Array.isArray(a.inputs) && a.inputs.length > 0 ? { inputs: a.inputs } : {}),
				}))
			}
			const declared = Array.isArray(this.config.transitions) ? this.config.transitions : []
			return declared
				.filter((tr) => this.fromMatches(tr))
				.map((tr) => ({
					action: tr.action || tr.to,
					to: tr.to,
					label: tr.label || this.labelFor(tr.action || tr.to, tr.to),
					confirm: tr.confirm,
					variant: tr.variant || 'secondary',
					...(Array.isArray(tr.inputs) && tr.inputs.length > 0 ? { inputs: tr.inputs } : {}),
				}))
		},

		/**
		 * The transitions this component draws as buttons itself. Empty in
		 * `display: "menu"`, where the host draws them.
		 *
		 * @return {Array<object>}
		 */
		barTransitions() {
			return this.display === 'menu' ? [] : this.visibleTransitions
		},

		/**
		 * Menu-ready descriptors for a `display: "menu"` host, in the shape
		 * CnActionButtons emits.
		 *
		 * @return {Array<object>}
		 */
		menuEntries() {
			return this.visibleTransitions.map((tr) => ({
				id: `cn-lifecycle-${tr.action}`,
				label: tr.label,
				// Generic, so a transition never renders as the lone iconless item.
				iconName: 'PlayCircleOutline',
				iconClass: null,
				disabled: this.working,
				pressed: null,
				testid: `cn-lifecycle-action-${tr.action}`,
				run: () => this.onTransition(tr),
			}))
		},
	},

	watch: {
		menuEntries: {
			immediate: true,
			handler(entries) {
				if (this.display === 'menu') {
					/**
					 * @event entries Emitted in `display: "menu"` only, whenever the transitions or the pending state change. Payload: one menu-ready descriptor per transition, carrying `id`, `label`, `disabled`, `pressed`, `testid` and a pre-bound `run()`.
					 */
					this.$emit('entries', entries)
				}
			},
		},

		objectId: {
			immediate: true,
			handler() {
				if (this.useServer) {
					this.fetchActions()
				}
			},
		},
	},

	methods: {
		/**
		 * Whether a config-declared transition's `from` includes the object's
		 * current state. Missing `from` means "any state".
		 *
		 * @param {object} tr The declared transition.
		 * @return {boolean}
		 */
		fromMatches(tr) {
			if (tr.from === undefined || tr.from === null) {
				return true
			}
			const from = Array.isArray(tr.from) ? tr.from : [tr.from]
			return from.map(String).includes(this.currentState)
		},

		/**
		 * Human label for a transition button. Prefers the action name (title-cased)
		 * with a fallback to the description / target state.
		 *
		 * @param {string} action The transition action key.
		 * @param {string} to The target state.
		 * @param {string} [description] Optional schema-provided description.
		 * @return {string}
		 */
		labelFor(action, to, description) {
			if (description) {
				return description
			}
			const src = action || to || ''
			if (!src) {
				return t('nextcloud-vue', 'Apply')
			}
			return src.charAt(0).toUpperCase() + src.slice(1).replace(/[_-]+/g, ' ')
		},

		/**
		 * Fetch the object's current allowed actions from OpenRegister.
		 *
		 * @return {Promise<void>}
		 */
		async fetchActions() {
			this.serverActions = []
			this.error = ''
			if (!this.objectId) {
				return
			}
			// A missing lifecycle answers 404, which means "no transitions" and
			// renders nothing. `fetchAvailableActions` owns that, and owns the
			// shape of the answer, so this component and CnStagesWidget cannot
			// disagree about what an action list is.
			const read = await readAvailableActions(this.objectId)
			this.serverActions = read.actions
		},

		/**
		 * Button click: optional confirm prompt, then either open the input
		 * dialog (when the transition declares `inputs`) or POST immediately.
		 *
		 * @param {object} tr The chosen transition descriptor.
		 * @return {Promise<void>}
		 */
		async onTransition(tr) {
			if (tr.confirm && typeof window !== 'undefined' && typeof window.confirm === 'function') {
				if (!window.confirm(tr.confirm)) {
					return
				}
			}
			if (Array.isArray(tr.inputs) && tr.inputs.length > 0) {
				this.inputError = ''
				this.inputFieldErrors = []
				this.inputTransition = tr
				return
			}
			await this.postTransition(tr)
		},

		/**
		 * Input dialog confirmed: POST the transition with the collected `data`,
		 * and close the dialog only once the move actually happened.
		 *
		 * 🔑 THE DIALOG STAYS OPEN ON A REFUSAL. It used to close first and
		 * report the refusal behind itself, which threw away everything the
		 * person had typed and asked them to reconstruct it from memory — and
		 * the refusal is usually about ONE of those fields. The 400 names the
		 * offending keys, so they are handed back to the dialog to mark.
		 *
		 * @param {{[key: string]: unknown}} data The collected input values (exactly the declared keys).
		 * @return {Promise<void>}
		 */
		async onInputConfirm(data) {
			const tr = this.inputTransition
			if (!tr) {
				return
			}
			this.inputError = ''
			this.inputFieldErrors = []

			const applied = await this.postTransition(tr, data)
			if (applied === true) {
				this.closeInputDialog()
				return
			}

			// Refused. Move the message from the page into the dialog the
			// person is looking at, and name the fields it is about.
			this.inputError = this.error
			this.inputFieldErrors = this.lastFieldErrors
			this.error = ''
		},

		/**
		 * Close the input dialog and forget the refusal it was showing.
		 *
		 * @return {void}
		 */
		closeInputDialog() {
			this.inputTransition = null
			this.inputError = ''
			this.inputFieldErrors = []
		},

		/**
		 * POST a transition to the endpoint, then ask the host to reload the
		 * object so its new state renders. Surfaces a 403/422 rejection inline.
		 * Without `data` the payload is `{ action }` only — identical to the
		 * pre-inputs behaviour.
		 *
		 * @param {object} tr The chosen transition descriptor.
		 * @param {{[key: string]: unknown}} [data] Collected transition inputs, sent as `data`.
		 * @return {Promise<boolean>} True when the move was applied, false when it was refused.
		 */
		async postTransition(tr, data) {
			this.working = true
			this.pendingAction = tr.action
			this.error = ''
			this.lastFieldErrors = []
			try {
				const saved = await performTransition(this.objectId, tr.action, data)
				/**
				 * @event transitioned A lifecycle transition succeeded. Payload is
				 * `{ action, to, object }`.
				 * @type {{ action: string, to: string, object: object }}
				 */
				this.$emit('transitioned', { action: tr.action, to: tr.to, object: saved })
				/**
				 * @event reload Ask the host (CnDetailPage) to re-fetch the object
				 * so the new state + freshly-allowed transitions render.
				 */
				this.$emit('reload')
				if (this.useServer) {
					await this.fetchActions()
				}

				return true
			} catch (e) {
				this.error = this.extractError(e)
				this.lastFieldErrors = transitionFieldErrors(e)
				return false
			} finally {
				this.working = false
				this.pendingAction = null
			}
		},

		/**
		 * Pull a human message out of an axios error.
		 *
		 * `transitionError` owns the shape OpenRegister answers a refusal with,
		 * so both this component and CnStagesWidget read a 403 or 422 the same
		 * way. It also rejects a BLANK `error`, which the local version used to
		 * return as-is: an empty string renders no message at all, so a refusal
		 * with an empty body looked like a move that had simply not happened.
		 *
		 * @param {object} e The axios error.
		 * @return {string}
		 */
		extractError(e) {
			return transitionError(e, t('nextcloud-vue', 'Transition failed'))
		},
	},
}
</script>

<style scoped>
.cn-lifecycle-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin: 0 0 8px;
}

.cn-lifecycle-actions__error {
	color: var(--color-error);
	font-size: 0.85em;
	margin: 0;
	flex-basis: 100%;
}
</style>
