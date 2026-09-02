<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-action-buttons" data-testid="cn-action-buttons">
		<template v-for="entry in visibleActions">
			<!-- Toggle: a stateful two-way state button (GET on mount, write on
			     click, optimistic + revert). Rendered inline, never dispatched. -->
			<NcButton
				v-if="entry.type === 'toggle'"
				:key="entry.id"
				:type="toggleState[entry.id] ? 'primary' : 'secondary'"
				:disabled="Boolean(togglePending[entry.id])"
				:data-testid="`cn-action-toggle-${entry.id}`"
				:aria-pressed="String(Boolean(toggleState[entry.id]))"
				@click="onToggleClick(entry)">
				<template v-if="entry.icon" #icon>
					<CnIcon v-if="isMdiIconName(entry.icon)" :name="entry.icon" :size="20" />
					<span v-else :class="entry.icon" />
				</template>
				{{ tr(toggleState[entry.id] ? (entry.labelOn || entry.label) : (entry.labelOff || entry.label)) }}
			</NcButton>
			<!-- Everything else: a plain action button routed through the shared
			     dispatcher (api-call / open-form / navigate / open-modal / refresh),
			     confirm-gated first when the action asks for it. -->
			<NcButton
				v-else
				:key="entry.id"
				:type="entry.variant || 'secondary'"
				:disabled="Boolean(actionPending[entry.id])"
				:data-testid="`cn-action-${entry.id}`"
				@click="onActionClick(entry)">
				<template v-if="entry.icon" #icon>
					<CnIcon v-if="isMdiIconName(entry.icon)" :name="entry.icon" :size="20" />
					<span v-else :class="entry.icon" />
				</template>
				{{ tr(entry.label) }}
			</NcButton>
		</template>

		<!-- Confirm gate for a confirm:true action (reuses CnConfirmDialog). -->
		<CnConfirmDialog
			v-if="confirmEntry"
			ref="confirmDialog"
			:dialog-title="tr(confirmEntry.confirmTitle || confirmEntry.label)"
			:message="tr(confirmEntry.confirmMessage) || defaultConfirmMessage"
			:variant="confirmEntry.variant === 'error' ? 'error' : 'primary'"
			@confirm="onConfirmProceed"
			@close="confirmEntry = null" />

		<!-- Schema-driven create dialog for an open-form action. The plain
		     form is the default: the properties/JSON table is a power-user
		     surface, and a header button that says "New case" is aimed at
		     someone filing one, not at someone inspecting the schema. Set
		     `advanced: true` on the action to get the table back. -->
		<CnFormDialog
			v-if="formEntry && formSchema && !formEntry.advanced"
			ref="formDialog"
			:schema="formSchema"
			:item="null"
			:register="formRegister"
			:initial-data="formInitialValues || {}"
			:dialog-title="tr(formEntry.formTitle) || ''"
			@confirm="onFormConfirm"
			@close="closeForm" />
		<CnAdvancedFormDialog
			v-if="formEntry && formSchema && formEntry.advanced"
			ref="formDialog"
			:schema="formSchema"
			:item="null"
			:initial-values="formInitialValues"
			@confirm="onFormConfirm"
			@close="closeForm" />
	</div>
</template>

<script>
import { inject } from 'vue'
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { CnIcon } from '../CnIcon/index.js'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import { CnAdvancedFormDialog } from '../CnAdvancedFormDialog/index.js'
import { CnFormDialog } from '../CnFormDialog/index.js'
import { valueRecordsFor } from '../../utils/dynamicProperties.js'
import { dispatchAction, resolveObjectOpType, buildOnSuccessRoute, resolveCreateOverrideHandler } from '../../utils/actionsDispatcher.js'
import { resolveFilterTokens } from '../../utils/resolveFilterTokens.js'
import { evaluateVisibleWhen } from '../../utils/visibleWhen.js'
import { resolveObjectTokenContext } from '../../utils/detailObjectContext.js'
import { fetchEndpointSource } from '../../composables/useEndpointSource.js'
import { useObjectStore } from '../../store/useObjectStore.js'

/**
 * CnActionButtons — declarative header-actions surface (#91 Wave 3).
 *
 * Renders a page's `headerActions[]` as buttons and owns the two action
 * behaviours that need STATE or a DIALOG the one-shot `dispatchAction`
 * can't provide on its own:
 *
 *  - **`open-form`** — mounts the shared `CnAdvancedFormDialog` for the
 *    action's `schema` (fetched through the object store), saves on
 *    confirm, toasts, refreshes the page, and optionally navigates to
 *    `onSuccessRoute`. Two optional keys cover the schemas a bare create
 *    cannot satisfy: `props` seeds fixed field values into the create form
 *    (so one schema can back several buttons, each fixing its own
 *    discriminator), and `createOverride` names a registry handler that owns
 *    the persist instead of `objectStore.saveObject` (for a schema requiring
 *    a server-minted field the form cannot supply).
 *  - **`toggle`** — a two-way state button: `GET`s `stateSource` on mount,
 *    renders `labelOn` / `labelOff`, and on click `writes` the flipped
 *    value OPTIMISTICALLY, reverting on failure.
 *
 * Every other type (`api-call`, `navigate`, `open-modal`, `open-page`,
 * `refresh`, `handler`) routes through the shared `dispatchAction` — with
 * a `CnConfirmDialog` gate first when the action sets `confirm: true`
 * (the object-op precedent: the dispatcher runs AFTER confirmation).
 *
 * Each action may carry a `visibleWhen` predicate (the shared banner
 * shape — `{ endpoint | source | field, op, value }`) evaluated against
 * the page / object context; a hidden action simply doesn't render.
 *
 * Placement: CnDashboardPage / CnDetailPage / CnPageRenderer mount this in
 * their header-actions area, passing the page's `headerActions[]`. The
 * object context (`{ objectId, object, register, schema }`) and the page
 * workspace / app-config bags are injected so tokens + local `visibleWhen`
 * resolve against the current record and page state.
 *
 * ```json
 * "headerActions": [
 *   { "id": "new-lead", "label": "New lead", "type": "open-form",
 *     "register": "crm", "schema": "lead", "onSuccessRoute": "Leads", "variant": "primary" },
 *   { "id": "approve", "label": "Approve", "type": "api-call",
 *     "url": "/apps/shillinq/api/payment-runs/@objectId/approve", "confirm": true,
 *     "visibleWhen": { "field": "state", "op": "eq", "value": "pending" } },
 *   { "id": "toggle-open", "type": "toggle", "labelOn": "Open", "labelOff": "Closed",
 *     "stateSource": { "url": "/apps/pipelinq/api/werkplek/@objectId/state", "responsePath": "open" },
 *     "field": "open", "writeUrl": "/apps/pipelinq/api/werkplek/@objectId/state", "method": "PUT" }
 * ]
 * ```
 */
export default {
	name: 'CnActionButtons',

	components: { NcButton, CnIcon, CnConfirmDialog, CnFormDialog, CnAdvancedFormDialog },

	inject: {
		/** Detail-page object context (`{ objectId, object, register, schema }`). */
		cnObjectContext: { default: null },
		/** v2 slot-grid detail context holder (CnPageRenderer). */
		cnDetailObjectContext: { default: null },
		/** Page-level workspace context bag (reactive). */
		cnWorkspaceContext: { default: () => ({}) },
		/** Page-level app config bag (reactive). */
		cnAppConfig: { default: () => ({}) },
		/** Pre-bound dispatchAction from CnPageRenderer (router/registry/handlers/openModal wired). */
		cnDispatchAction: { default: null },
		/**
		 * Host translate function provided by CnAppRoot as
		 * `cnTranslate: this.translate` (bound to the host app's id). The
		 * manifest-authored action labels, confirm copy and api-call toasts
		 * are run through it. Defaults to an identity function so an
		 * untranslated key renders as itself.
		 */
		cnTranslate: { default: () => (key) => key },
		/** v2 component registry, for resolving an `open-form` createOverride. */
		cnRegistry: { default: () => ({}) },
		/** Legacy customComponents map, same resolution fallback. */
		cnCustomComponents: { default: () => ({}) },
	},

	props: {
		/**
		 * The page's declarative header actions. Each entry is a typed action
		 * (`open-form` | `toggle` | `api-call` | `navigate` | `open-modal` |
		 * `refresh` | `handler`) plus `id` / `label` and an optional
		 * `visibleWhen` predicate, `icon`, `variant`, and `confirm`.
		 * @type {Array<object>}
		 */
		actions: {
			type: Array,
			default: () => [],
		},
		/**
		 * Explicit Vue Router instance for `navigate` / `open-page` /
		 * `onSuccessRoute`. Falls back to `this.$router`. Only needed for
		 * standalone mounts outside a router tree.
		 * @type {object|null}
		 */
		router: {
			type: Object,
			default: null,
		},
	},

	emits: ['created'],

	setup() {
		// Read the two detail-surface injects once so the object token context
		// resolves identically to the endpoint-bound widgets (Wave 3).
		const objectCtxRaw = inject('cnObjectContext', null)
		const detailCtxRaw = inject('cnDetailObjectContext', null)
		const workspaceRaw = inject('cnWorkspaceContext', null)
		const appConfigRaw = inject('cnAppConfig', null)
		return { objectCtxRaw, detailCtxRaw, workspaceRaw, appConfigRaw }
	},

	data() {
		return {
			/** Evaluated visibleWhen outcome per action id (true when no predicate). */
			visibility: {},
			/** Current boolean state per toggle action id. */
			toggleState: {},
			/** In-flight flag per toggle action id (disables the button). */
			togglePending: {},
			/** In-flight flag per non-toggle action id. */
			actionPending: {},
			/** The action awaiting confirmation (null = no dialog). */
			confirmEntry: null,
			/** The open-form action currently showing its dialog (null = closed). */
			formEntry: null,
			/** The fetched schema object for the open-form dialog (null until loaded). */
			formSchema: null,
			/** Default confirm-dialog message. */
			defaultConfirmMessage: t('nextcloud-vue', 'Are you sure you want to continue?'),
		}
	},

	computed: {
		/**
		 * Effective translate function: the injected `cnTranslate` (the host
		 * app's bound `t()`), identity by default.
		 *
		 * @return {(key: string) => string}
		 */
		effectiveTranslate() {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate : (key) => key
		},
		/**
		 * Create-form seed values for the open `open-form` action. An action
		 * declares them as `props`, which is how a single schema backs several
		 * buttons — "New request" and "New complaint" both open the `ticket`
		 * form, each fixing its own `ticketType`.
		 *
		 * @return {object|null}
		 */
		formInitialValues() {
			const props = this.formEntry && this.formEntry.props
			if (!props || typeof props !== 'object' || Array.isArray(props)) return null
			// Seed values go through the SAME token grammar as filters, so an
			// action on a detail page can stamp the record it belongs to:
			// `{ "domainObjectRef": "@objectId" }`. Without this the literal
			// string "@objectId" is saved, and a foreign key pointing at nothing
			// is a defect that only shows up in whatever reads it later.
			return resolveFilterTokens(props, this.tokenCtx)
		},
		/**
		 * The register the open dialog reads and writes against. The plain
		 * form needs it to resolve `$ref` pickers into real dropdowns; without
		 * one a reference field renders as an empty select and the action is
		 * unusable for exactly the schemas that need it most.
		 *
		 * @return {string} The register slug, '' when none is resolvable.
		 */
		formRegister() {
			return (this.formEntry && this.formEntry.register) || this.objectCtx.register || ''
		},
		/** The actions whose visibleWhen evaluated true (or carry no predicate). */
		visibleActions() {
			return (this.actions || []).filter((a) => a && a.id && this.visibility[a.id] !== false)
		},
		/** Unwrapped page workspace bag. */
		workspaceCtx() {
			const c = this.workspaceRaw
			const v = (c && typeof c === 'object' && 'value' in c) ? c.value : c
			return (v && typeof v === 'object') ? v : {}
		},
		/** Unwrapped app-config bag. */
		configCtx() {
			const c = this.appConfigRaw
			const v = (c && typeof c === 'object' && 'value' in c) ? c.value : c
			return (v && typeof v === 'object') ? v : {}
		},
		/** The merged object token context (both detail-surface injects). */
		objectCtx() {
			return resolveObjectTokenContext(this.objectCtxRaw, this.detailCtxRaw) || {}
		},
		/** The full token context for url/param interpolation + local visibleWhen. */
		tokenCtx() {
			return {
				...this.objectCtx,
				workspace: this.workspaceCtx,
				config: this.configCtx,
			}
		},
		/** The effective router (explicit prop wins, else this.$router). */
		effectiveRouter() {
			return this.router || this.$router || null
		},
	},

	watch: {
		actions: {
			immediate: true,
			handler() {
				this.evaluateVisibility()
				this.initToggles()
			},
		},
		// Re-evaluate local (object-context) visibleWhen when the record loads.
		objectCtx: {
			deep: true,
			handler() { this.evaluateVisibility() },
		},
	},

	methods: {
		/**
		 * Heuristic MDI-name check (an `icon-`-prefixed string is a CSS class).
		 *
		 * @param {string} name The icon string.
		 * @return {boolean} True when it should render via CnIcon.
		 */
		isMdiIconName(name) {
			return typeof name === 'string' && name !== '' && !name.startsWith('icon-')
		},

		/**
		 * Evaluate every action's `visibleWhen` against the current context.
		 * Fail-safe (a broken predicate hides its action); actions without a
		 * predicate are always visible.
		 *
		 * @return {Promise<void>}
		 */
		async evaluateVisibility() {
			for (const action of this.actions || []) {
				if (!action || !action.id) continue
				if (!action.visibleWhen) {
					this.visibility[action.id] = true
					continue
				}
				const ok = await evaluateVisibleWhen(action.visibleWhen, this.tokenCtx)
				this.visibility[action.id] = ok
			}
		},

		/**
		 * Seed each toggle action's state from its `stateSource` endpoint
		 * (fetched through the shared endpoint engine so `@objectId` etc.
		 * resolve). No-op for non-toggle actions.
		 *
		 * @return {Promise<void>}
		 */
		async initToggles() {
			for (const action of this.actions || []) {
				if (!action || action.type !== 'toggle' || !action.id) continue
				this.toggleState[action.id] = false
				if (!action.stateSource || !action.stateSource.url) continue
				try {
					const payload = await fetchEndpointSource(action.stateSource, this.tokenCtx)
					const value = action.field ? this.readField(payload, action.field) : payload
					this.toggleState[action.id] = Boolean(value)
				} catch (e) {
					// Leave the default (off); a failed state read never breaks the bar.
				}
			}
		},

		/**
		 * Read a dot-path off a payload (the toggle state field).
		 *
		 * @param {*} data The payload.
		 * @param {string} field The dot-path.
		 * @return {*} The value at the path.
		 */
		readField(data, field) {
			if (!field) return data
			return String(field).split('.').reduce((o, k) => (o == null ? o : o[k]), data)
		},

		/**
		 * Toggle click: flip the state OPTIMISTICALLY, write it, and revert on
		 * failure. Success/error toast via the api-call dispatch path (which
		 * also refreshes the page unless `refresh: false`).
		 *
		 * @param {object} entry The toggle action.
		 * @return {Promise<void>}
		 */
		async onToggleClick(entry) {
			if (this.togglePending[entry.id]) return
			const previous = Boolean(this.toggleState[entry.id])
			const next = !previous
			this.toggleState[entry.id] = next
			this.togglePending[entry.id] = true
			const writeParams = { ...(entry.params || {}) }
			if (entry.field) writeParams[entry.field] = next
			const result = await this.dispatch({
				type: 'api-call',
				url: entry.writeUrl,
				method: entry.method || 'PUT',
				params: writeParams,
				successMessage: entry.successMessage,
				errorMessage: entry.errorMessage,
				refresh: entry.refresh,
			})
			if (!result || result.ok === false) {
				// Revert the optimistic flip.
				this.toggleState[entry.id] = previous
			}
			this.togglePending[entry.id] = false
		},

		/**
		 * Non-toggle action click: gate on `confirm` first, else run.
		 *
		 * @param {object} entry The action.
		 * @return {void}
		 */
		onActionClick(entry) {
			if (entry.confirm === true) {
				this.confirmEntry = entry
				return
			}
			this.runAction(entry)
		},

		/**
		 * The confirm dialog's proceed handler: run the pending action, then
		 * report the outcome back to the dialog's result phase.
		 *
		 * @return {Promise<void>}
		 */
		async onConfirmProceed() {
			const entry = this.confirmEntry
			if (!entry) return
			const result = await this.runAction(entry)
			const dialog = this.$refs.confirmDialog
			if (dialog && typeof dialog.setResult === 'function') {
				const ok = result === undefined || (result && result.ok !== false)
				dialog.setResult(ok ? { success: true } : { error: t('nextcloud-vue', 'Action failed.') })
			} else {
				this.confirmEntry = null
			}
		},

		/**
		 * Run an action (post-confirmation). `open-form` opens the schema
		 * dialog; everything else dispatches. Returns the dispatch result so
		 * the confirm dialog can report success/failure.
		 *
		 * @param {object} entry The action.
		 * @return {Promise<*>} The dispatch result (undefined for open-form).
		 */
		async runAction(entry) {
			if (entry.type === 'open-form') {
				await this.openForm(entry)
				return undefined
			}
			this.actionPending[entry.id] = true
			const result = await this.dispatch(entry)
			this.actionPending[entry.id] = false
			return result
		},

		/**
		 * Resolve a manifest-authored UI string through the host translate
		 * function. A pure pass-through: an empty value, or a catalogue that
		 * lacks the key, returns the input unchanged.
		 *
		 * @param {string} [value] The English source string.
		 * @return {string|undefined} The translated (or source) string.
		 */
		tr(value) {
			return value ? this.effectiveTranslate(value) : value
		},

		/**
		 * Route an action through the shared dispatcher — the pre-bound
		 * `cnDispatchAction` (router/registry/handlers/openModal already
		 * wired) when available, else a direct call with a minimal context.
		 * The token context and the host translate function are always
		 * merged in (the latter localises `api-call` success/error toasts).
		 *
		 * @param {object} action The action to dispatch.
		 * @return {Promise<*>} The dispatch result.
		 */
		dispatch(action) {
			const extra = { tokenCtx: this.tokenCtx, translate: this.effectiveTranslate }
			if (typeof this.cnDispatchAction === 'function') {
				return this.cnDispatchAction(action, extra)
			}
			return dispatchAction(action, {
				router: this.effectiveRouter,
				openForm: (a) => this.openForm(a),
				...extra,
			})
		},

		/**
		 * Open the schema-driven create dialog for an `open-form` action:
		 * fetch the schema object through the shared object store, then mount
		 * CnAdvancedFormDialog. A failed schema load toasts and no-ops.
		 *
		 * @param {object} entry The open-form action (`register`, `schema`).
		 * @return {Promise<void>}
		 */
		async openForm(entry) {
			this.formEntry = entry
			this.formSchema = null
			const register = entry.register || this.objectCtx.register || ''
			const schema = entry.schema || ''
			if (!schema) {
				this.formEntry = null
				return
			}
			try {
				const store = useObjectStore()
				const type = resolveObjectOpType(store, { register, schema })
				this.formSchema = await store.fetchSchema(type)
			} catch (e) {
				this.formSchema = null
			}
			if (!this.formSchema) {
				const { showError } = await import('@nextcloud/dialogs')
				if (typeof showError === 'function') showError(t('nextcloud-vue', 'Could not open the form.'))
				this.formEntry = null
			}
		},

		/**
		 * The create dialog's confirm: save the new object through the shared
		 * object store, report the result phase, toast, refresh the page, and
		 * navigate to `onSuccessRoute` when set — merging the saved object's id
		 * into the route params (via `buildOnSuccessRoute`) so the navigation
		 * can deep-link to the created object's detail page.
		 *
		 * @param {object} formData The dialog's form payload.
		 * @param {object|null} [dynamic] The answers to the schema's data-driven questions (`{ answers, declarations }`), when it has any.
		 * @return {Promise<void>}
		 */
		async onFormConfirm(formData, dynamic = null) {
			const entry = this.formEntry
			const dialog = this.$refs.formDialog
			const register = this.formRegister
			const schema = (entry && entry.schema) || ''
			try {
				const store = useObjectStore()
				const type = resolveObjectOpType(store, { register, schema })
				// A schema can require a field the form cannot supply — a
				// server-minted foreign key, say — in which case a straight
				// saveObject 400s. `createOverride` names a registry handler
				// that owns the persist instead (the CnIndexPage precedent).
				const override = resolveCreateOverrideHandler(
					entry && entry.createOverride,
					this.cnRegistry,
					this.cnCustomComponents,
				)
				const payload = { ...formData }
				const saved = override
					? await override(payload, { register, schema, type })
					: await store.saveObject(type, payload)
				if (!saved) throw new Error('save rejected')
				await this.saveDynamicAnswers(store, register, dynamic, saved)
				if (dialog && typeof dialog.setResult === 'function') dialog.setResult({ success: true })
				const { showSuccess } = await import('@nextcloud/dialogs')
				if (typeof showSuccess === 'function') {
					showSuccess((entry && entry.successMessage) || t('nextcloud-vue', 'Saved.'))
				}
				const { emit } = await import('@nextcloud/event-bus')
				emit('cn:page:refresh', {})
				/**
				 * @event created Emitted after an open-form action saves. Payload: the created object.
				 */
				this.$emit('created', saved)
				if (entry && entry.onSuccessRoute && this.effectiveRouter) {
					const location = buildOnSuccessRoute(entry.onSuccessRoute, saved)
					if (location) this.effectiveRouter.push(location).catch(() => {})
				}
			} catch (e) {
				if (dialog && typeof dialog.setResult === 'function') {
					dialog.setResult({ error: (e && e.message) || t('nextcloud-vue', 'Save failed.') })
				}
			}
		},

		/**
		 * Write the answers to a schema's data-driven questions, once the
		 * object they belong to exists.
		 *
		 * This runs AFTER the parent save and deliberately does not roll it
		 * back on failure: a case that exists without one of its custom values
		 * is recoverable by editing it, whereas discarding a case the user
		 * believes they filed is not. A failure here surfaces as the dialog's
		 * error so it is never silent.
		 *
		 * @param {object} store The object store.
		 * @param {string} register The register the object was saved in.
		 * @param {object|null} dynamic The `{ answers, declarations }` payload.
		 * @param {object} saved The saved parent object.
		 * @return {Promise<void>}
		 */
		async saveDynamicAnswers(store, register, dynamic, saved) {
			if (!dynamic || !Array.isArray(dynamic.answers) || dynamic.answers.length === 0) return
			const objectId = saved && (saved.id || saved.uuid)
			if (!objectId) return
			const declarations = dynamic.declarations || []
			for (const { key, config } of declarations) {
				const values = config && config.values
				if (!values || !values.schema) continue
				// An answer belongs to exactly one declaration. With a single
				// declaration every answer carries its key anyway; the filter
				// only matters once a schema has two, where writing an answer
				// to both value schemas would invent a row nobody entered.
				const mine = declarations.length === 1
					? dynamic.answers
					: dynamic.answers.filter((a) => a.declarationKey === key)
				const rows = valueRecordsFor(mine, config, objectId)
				if (rows.length === 0) continue
				const valueRegister = values.register || register
				const type = resolveObjectOpType(store, { register: valueRegister, schema: values.schema })
				for (const row of rows) {
					await store.saveObject(type, row)
				}
			}
		},

		/**
		 * Close the create dialog.
		 *
		 * @return {void}
		 */
		closeForm() {
			this.formEntry = null
			this.formSchema = null
		},
	},
}
</script>

<style scoped>
.cn-action-buttons {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}
</style>
