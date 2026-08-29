<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnFormWidgetBase
		block-class="cn-interaction-form-widget"
		:fields="formFields"
		:model="form"
		:errors="{ subject: subjectError }"
		:can-submit="canRegister"
		:submitting="saving"
		:submit-label="registerLabel"
		:submitting-label="savingLabel"
		:error-message="errorMessage"
		@update:field="onFieldUpdate"
		@submit="onRegister">
		<!-- The client picker is the one control the base does not know about:
		     a CnResourceSelect, so typing a name that does not exist yet offers
		     "Create '<name>'" inline rather than a dead "no results" path. The
		     base still supplies its field wrapper and spacing. -->
		<template #field-client>
			<CnResourceSelect
				:register="register"
				:schema="clientSchema"
				:label-field="clientLabelField"
				:model-value="form.client"
				:input-label="clientLabel"
				@update:modelValue="onClientChange"
				@create="onClientCreated" />
		</template>
	</CnFormWidgetBase>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnResourceSelect from '../CnResourceSelect/CnResourceSelect.vue'
import CnFormWidgetBase from '../CnFormWidgetBase/CnFormWidgetBase.vue'
import { useObjectStore } from '../../store/index.js'

/**
 * CnInteractionFormWidget — the "active interaction" quick-log form that drives
 * the rest of a workspace page.
 *
 * Persists a contactmoment (channel / client / subject / summary / outcome) to
 * OpenRegister via `useObjectStore().saveObject`, and — the reason it is a
 * workspace widget — WRITES two keys into the page-level workspace context:
 *  - `selectedClient` (the chosen/created client id), and
 *  - `activeSummary`  (the live summary text),
 * so sibling widgets react: a client-overview list filtered on
 * `@workspace.selectedClient` reveals that client's records, and a knowledge-base
 * widget bound to `activeSummary` searches the live conversation.
 *
 * The client picker is a `CnResourceSelect`, so typing a name that doesn't exist
 * yet offers "Create '<name>'" inline — no dead "no results" path.
 *
 * Resolved by its registry type key `interaction-form`. All schema/field/enum
 * choices come from `content`, so the widget carries no app-specific vocabulary.
 *
 * Example content blob:
 * ```js
 * content: {
 *   register: 'pipelinq',
 *   schema: 'ticket',
 *   defaults: { ticketType: 'contactmoment' }, // fixed fields stamped on every create
 *   clientSchema: 'client',
 *   clientField: 'client',
 *   summaryField: 'description',
 *   channels: [{ value: 'telefoon', label: 'Phone' }, …],
 *   outcomes: [{ value: 'opgelost', label: 'Resolved' }, …],
 * }
 * ```
 *
 * `defaults` covers the case where the target schema requires a value the form
 * has no input for — typically a discriminator on a supertype schema. It is
 * merged before the mapped fields, so those always take precedence.
 */
export default {
	name: 'CnInteractionFormWidget',

	components: { CnFormWidgetBase, CnResourceSelect },

	inject: {
		/**
		 * Page-level workspace context (reactive `ref({})`) from CnDashboardPage.
		 * The widget writes `selectedClient` + `activeSummary` into it. Null on
		 * pages that don't provide one (the form still saves; it just doesn't
		 * drive sibling widgets).
		 */
		cnWorkspaceContext: { default: null },
	},

	props: {
		/**
		 * Persisted configuration blob (see component description for the shape).
		 * @type {{register?: string, schema?: string, defaults?: object, clientSchema?: string, clientField?: string, clientLabelField?: string, subjectField?: string, summaryField?: string, channelField?: string, outcomeField?: string, channels?: Array, outcomes?: Array}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['saved'],

	data() {
		return {
			form: {
				channel: this.firstChannel(),
				client: '',
				subject: '',
				summary: '',
				outcome: '',
			},
			saving: false,
			errorMessage: '',
			subjectError: '',
		}
	},

	computed: {
		register() {
			return this.content.register || 'pipelinq'
		},
		schema() {
			return this.content.schema || 'contactmoment'
		},
		clientSchema() {
			return this.content.clientSchema || 'client'
		},
		clientLabelField() {
			return this.content.clientLabelField || 'name'
		},
		typeSlug() {
			return `${this.register}-${this.schema}`
		},
		/** Channel options `{ value, label }`. */
		channelOptions() {
			return Array.isArray(this.content.channels) && this.content.channels.length > 0
				? this.content.channels
				: [
					{ value: 'telefoon', label: t('nextcloud-vue', 'Phone') },
					{ value: 'email', label: t('nextcloud-vue', 'Email') },
					{ value: 'chat', label: t('nextcloud-vue', 'Chat') },
				]
		},
		/** Outcome options `{ value, label }`. */
		outcomeOptions() {
			return Array.isArray(this.content.outcomes) ? this.content.outcomes : []
		},
		/**
		 * The field descriptors handed to CnFormWidgetBase — the whole of this
		 * widget's form, declared rather than drawn. Order matters: it is the
		 * render order.
		 *
		 * `client` is declared here so it keeps its place in the stack and its
		 * field wrapper, but its control comes from the `#field-client` slot
		 * (a CnResourceSelect, which the base has no type for).
		 *
		 * @return {Array<object>}
		 */
		formFields() {
			return [
				{ key: 'channel', type: 'select', label: this.channelLabel, options: this.channelOptions },
				{ key: 'client', type: 'custom', label: this.clientLabel },
				{ key: 'subject', type: 'text', label: this.subjectLabel },
				{ key: 'summary', type: 'textarea', label: this.summaryLabel, rows: 4 },
				{ key: 'outcome', type: 'select', label: this.outcomeLabel, options: this.outcomeOptions, clearable: true },
			]
		},
		objectStore() {
			try {
				return useObjectStore()
			} catch (e) {
				return null
			}
		},
		workspaceCtx() {
			const c = this.cnWorkspaceContext
			if (!c) return null
			return (typeof c === 'object' && 'value' in c) ? c.value : c
		},
		canRegister() {
			return Boolean(this.form.subject && this.form.subject.trim() && this.form.channel)
		},
		channelLabel() { return t('nextcloud-vue', 'Channel') },
		clientLabel() { return t('nextcloud-vue', 'Client') },
		subjectLabel() { return t('nextcloud-vue', 'Subject') },
		summaryLabel() { return t('nextcloud-vue', 'Summary') },
		outcomeLabel() { return t('nextcloud-vue', 'Outcome') },
		registerLabel() { return t('nextcloud-vue', 'Register') },
		savingLabel() { return t('nextcloud-vue', 'Saving…') },
	},

	methods: {
		/** The default channel value (first configured channel, else `telefoon`). */
		firstChannel() {
			const ch = (this.content && this.content.channels) || []
			return (Array.isArray(ch) && ch.length > 0 && ch[0].value) || 'telefoon'
		},

		/**
		 * A field edit from CnFormWidgetBase. Stores the value, then runs
		 * whatever that particular field also does — `summary` streams into
		 * the workspace context so a bound knowledge-base widget can search
		 * the live conversation. `client` never arrives here: its control is
		 * the `#field-client` slot, which calls onClientChange directly.
		 *
		 * @param {{key: string, value: *}} payload The changed field.
		 * @return {void}
		 */
		onFieldUpdate({ key, value }) {
			this.form[key] = value
			if (key === 'summary') this.writeWorkspace('activeSummary', value)
		},

		/**
		 * Selecting a client writes `selectedClient` into the workspace context so
		 * client-bound sibling widgets reveal.
		 *
		 * @param {string} id The selected client id.
		 */
		onClientChange(id) {
			this.form.client = id || ''
			this.writeWorkspace('selectedClient', this.form.client)
		},

		/**
		 * A client created inline via "Create '<name>'" — select it (the
		 * CnResourceSelect already emitted update:modelValue, but we also write
		 * the workspace key here to be safe).
		 *
		 * @param {object} client The created client object.
		 */
		onClientCreated(client) {
			const id = String((client && (client.id || (client['@self'] && client['@self'].id))) || '')
			if (id) {
				this.form.client = id
				this.writeWorkspace('selectedClient', id)
			}
		},

		/**
		 * Write a key into the reactive workspace context bag.
		 *
		 * The page provides a `ref({})`. Vue 2.7's Options-API `inject` AUTO-UNWRAPS
		 * a provided ref, so `cnWorkspaceContext` is the plain reactive object here —
		 * not a `{ value }` holder. We therefore replace the bag in place on the
		 * unwrapped object (so injectors that read individual keys still react),
		 * while also supporting the raw-ref shape (`.value`) for non-unwrapping
		 * Composition-API consumers.
		 *
		 * @param {string} key The context key.
		 * @param {*} value The value.
		 */
		writeWorkspace(key, value) {
			const holder = this.cnWorkspaceContext
			if (!holder || typeof holder !== 'object') return
			if ('value' in holder) {
				holder.value = { ...(holder.value || {}), [key]: value }
				return
			}
			holder[key] = value
		},

		/**
		 * Persist the contactmoment. The agent identity is left to the server
		 * (never sent from the client). Surfaces errors inline.
		 *
		 * @return {Promise<void>}
		 */
		async onRegister() {
			this.subjectError = ''
			this.errorMessage = ''
			if (!this.form.subject || !this.form.subject.trim()) {
				this.subjectError = t('nextcloud-vue', 'Subject is required')
				return
			}
			if (!this.objectStore) {
				this.errorMessage = t('nextcloud-vue', 'Cannot save right now')
				return
			}
			const c = this.content || {}
			// `defaults` is spread FIRST so the mapped fields below always win.
			// It exists for schemas that need a fixed value on every create the
			// form itself has no input for — e.g. a discriminator on a supertype
			// schema (`{ ticketType: 'contactmoment' }`), which would otherwise be
			// omitted and fail validation.
			const payload = {
				...(c.defaults || {}),
				[c.subjectField || 'subject']: this.form.subject.trim(),
				[c.channelField || 'channel']: this.form.channel,
				[c.contactedAtField || 'contactedAt']: new Date().toISOString(),
			}
			if (this.form.client) payload[c.clientField || 'client'] = this.form.client
			if (this.form.summary) payload[c.summaryField || 'summary'] = this.form.summary
			if (this.form.outcome) payload[c.outcomeField || 'outcome'] = this.form.outcome

			this.saving = true
			try {
				if (typeof this.objectStore.registerObjectType === 'function') {
					try { this.objectStore.registerObjectType(this.typeSlug, this.schema, this.register) } catch (e) { /* idempotent */ }
				}
				const result = await this.objectStore.saveObject(this.typeSlug, payload)
				if (!result) {
					this.errorMessage = t('nextcloud-vue', 'Failed to save interaction')
					return
				}
				/**
				 * @event saved A contactmoment was persisted.
				 * @type {object} The saved object.
				 */
				this.$emit('saved', result)
				// Reset the per-interaction fields; keep the client for follow-ups.
				this.form.subject = ''
				this.form.summary = ''
				this.form.outcome = ''
				this.writeWorkspace('activeSummary', '')
			} catch (e) {
				this.errorMessage = (e && e.message) || t('nextcloud-vue', 'Failed to save interaction')
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<!--
  The scoped style block is gone on purpose. The markup now lives in
  CnFormWidgetBase, so a scoped rule here would carry THIS component's
  data-v attribute and match none of it. The rules moved verbatim to
  src/css/form-widget.css, keyed on `cn-form-widget*`; the base also emits
  the `cn-interaction-form-widget*` names on the same elements, so app CSS
  targeting those keeps matching.
-->
