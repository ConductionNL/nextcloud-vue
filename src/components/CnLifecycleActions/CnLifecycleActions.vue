<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div v-if="visibleTransitions.length > 0 || error" class="cn-lifecycle-actions" data-testid="cn-lifecycle-actions">
		<NcButton
			v-for="tr in visibleTransitions"
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
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'

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
 *    label, confirm?, variant? }]` array is given, the component filters it by
 *    the object's current `status` value itself (no extra request). Useful for
 *    static labelling / confirm prompts, or when the page already holds the
 *    object.
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

	components: { NcButton, NcLoadingIcon },

	props: {
		/** Object id/uuid/slug the transitions apply to. */
		objectId: {
			type: [String, Number],
			default: '',
		},
		/**
		 * The currently-loaded object (for client-side `from`-state filtering of
		 * a config-declared `transitions` list, and to read the lifecycle field).
		 * @type {object|null}
		 */
		object: {
			type: Object,
			default: null,
		},
		/**
		 * The lifecycle config block.
		 * @type {{field?: string, transitions?: Array<{from?: (string|Array<string>), to?: string, action?: string, label?: string, confirm?: string, variant?: string}>, autoFetch?: boolean}}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['transitioned', 'reload'],

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
		}
	},

	computed: {
		/** The lifecycle field name (`status` by default). */
		field() {
			return this.config.field || this.config.property || 'status'
		},
		/** The object's current lifecycle value. */
		currentState() {
			if (!this.object) return ''
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
			if (this.config.autoFetch === true) return true
			return !Array.isArray(this.config.transitions) || this.config.transitions.length === 0
		},
		/**
		 * The transitions to render as buttons — either the server-derived set or
		 * the config-declared set filtered to the object's current state.
		 *
		 * @return {Array<{action: string, to: string, label: string, confirm?: string, variant?: string}>}
		 */
		visibleTransitions() {
			if (this.useServer) {
				return this.serverActions.map((a) => ({
					action: a.action,
					to: a.to,
					label: this.labelFor(a.action, a.to, a.description),
					variant: 'secondary',
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
				}))
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler() {
				if (this.useServer) this.fetchActions()
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
			if (tr.from === undefined || tr.from === null) return true
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
			if (description) return description
			const src = action || to || ''
			if (!src) return t('nextcloud-vue', 'Apply')
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
			if (!this.objectId) return
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{id}/available-actions',
					{ id: String(this.objectId) },
				)
				const res = await axios.get(url)
				this.serverActions = (res && res.data && Array.isArray(res.data.actions)) ? res.data.actions : []
			} catch (e) {
				// A missing lifecycle / 404 simply means "no transitions" — render nothing.
				this.serverActions = []
			}
		},

		/**
		 * Apply a transition: optional confirm, POST to the transition endpoint,
		 * then ask the host to reload the object so its new state renders. Surfaces
		 * a 403/422 rejection inline.
		 *
		 * @param {object} tr The chosen transition descriptor.
		 * @return {Promise<void>}
		 */
		async onTransition(tr) {
			if (tr.confirm && typeof window !== 'undefined' && typeof window.confirm === 'function') {
				if (!window.confirm(tr.confirm)) return
			}
			this.working = true
			this.pendingAction = tr.action
			this.error = ''
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = generateUrl(
					'/apps/openregister/api/objects/{id}/transition',
					{ id: String(this.objectId) },
				)
				const res = await axios.post(url, { action: tr.action })
				/**
				 * @event transitioned A lifecycle transition succeeded. Payload is
				 * `{ action, to, object }`.
				 * @type {{ action: string, to: string, object: object }}
				 */
				this.$emit('transitioned', { action: tr.action, to: tr.to, object: (res && res.data) || null })
				/**
				 * @event reload Ask the host (CnDetailPage) to re-fetch the object
				 * so the new state + freshly-allowed transitions render.
				 */
				this.$emit('reload')
				if (this.useServer) await this.fetchActions()
			} catch (e) {
				this.error = this.extractError(e)
			} finally {
				this.working = false
				this.pendingAction = null
			}
		},

		/**
		 * Pull a human message out of an axios error — OpenRegister returns
		 * `{ error: '<reason>' }` on a 403/422 rejection.
		 *
		 * @param {object} e The axios error.
		 * @return {string}
		 */
		extractError(e) {
			const data = e && e.response && e.response.data
			if (data && typeof data.error === 'string') return data.error
			return (e && e.message) || t('nextcloud-vue', 'Transition failed')
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
