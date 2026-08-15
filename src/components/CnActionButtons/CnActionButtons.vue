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
				{{ toggleState[entry.id] ? (entry.labelOn || entry.label) : (entry.labelOff || entry.label) }}
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
				{{ entry.label }}
			</NcButton>
		</template>

		<!-- Confirm gate for a confirm:true action (reuses CnConfirmDialog). -->
		<CnConfirmDialog
			v-if="confirmEntry"
			ref="confirmDialog"
			:dialog-title="confirmEntry.confirmTitle || confirmEntry.label"
			:message="confirmEntry.confirmMessage || defaultConfirmMessage"
			:variant="confirmEntry.variant === 'error' ? 'error' : 'primary'"
			@confirm="onConfirmProceed"
			@close="confirmEntry = null" />

		<!-- Schema-driven create dialog for an open-form action. -->
		<CnAdvancedFormDialog
			v-if="formEntry && formSchema"
			ref="formDialog"
			:schema="formSchema"
			:item="null"
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
import { dispatchAction, resolveObjectOpType, buildOnSuccessRoute } from '../../utils/actionsDispatcher.js'
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
 *    `onSuccessRoute`.
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

	components: { NcButton, CnIcon, CnConfirmDialog, CnAdvancedFormDialog },

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
		 * Route an action through the shared dispatcher — the pre-bound
		 * `cnDispatchAction` (router/registry/handlers/openModal already
		 * wired) when available, else a direct call with a minimal context.
		 * The token context is always merged in for `api-call`.
		 *
		 * @param {object} action The action to dispatch.
		 * @return {Promise<*>} The dispatch result.
		 */
		dispatch(action) {
			const extra = { tokenCtx: this.tokenCtx }
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
		 * @return {Promise<void>}
		 */
		async onFormConfirm(formData) {
			const entry = this.formEntry
			const dialog = this.$refs.formDialog
			const register = (entry && entry.register) || this.objectCtx.register || ''
			const schema = (entry && entry.schema) || ''
			try {
				const store = useObjectStore()
				const type = resolveObjectOpType(store, { register, schema })
				const saved = await store.saveObject(type, { ...formData })
				if (!saved) throw new Error('save rejected')
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
