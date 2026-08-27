<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog size="normal"
		:name="typeLabel"
		@closing="cancel">
		<div class="cn-flow-node-edit">
			<!-- What this step IS, in the engine's own words. -->
			<p v-if="entry && entry.description" class="cn-flow-node-edit__description">
				{{ entry.description }}
			</p>
			<p class="cn-flow-node-edit__id">
				{{ node.type }}
			</p>

			<NcTextField :model-value="draft.name"
				:label="t('nextcloud-vue', 'Step name')"
				:placeholder="typeLabel"
				:helper-text="t('nextcloud-vue', 'Shown on the card. Leave empty to show the step type.')"
				@update:model-value="draft.name = $event" />

			<!-- One field per option the ENGINE declares for this step
			     (`configKeys`), plus any key already set on the node. The
			     widget follows the value: switches for booleans, a number
			     field for numbers, a JSON area for structured values. -->
			<div v-for="key in formKeys" :key="key" class="cn-flow-node-edit__field">
				<NcCheckboxRadioSwitch v-if="widgetFor(key) === 'switch'"
					:model-value="draft.config[key] === true"
					type="switch"
					@update:model-value="setKey(key, $event)">
					{{ labelFor(key) }}
				</NcCheckboxRadioSwitch>

				<NcSelect v-else-if="widgetFor(key) === 'method'"
					:model-value="draft.config[key] || null"
					:options="HTTP_METHODS"
					:input-label="labelFor(key)"
					:placeholder="t('nextcloud-vue', 'GET')"
					@update:model-value="setKey(key, $event)" />

				<!-- A `select` field with `optionsFrom` renders as a picker fed
				     by the URL the OWNING APP declared — never a bare uuid
				     text box. -->
				<NcSelect v-else-if="widgetFor(key) === 'select'"
					:model-value="selectedOption(key)"
					:options="selectOptions[key] || []"
					:input-label="labelFor(key)"
					:loading="selectLoading[key] === true"
					:placeholder="t('nextcloud-vue', 'Pick one…')"
					@update:model-value="setKey(key, $event ? $event.id : '')" />

				<NcTextArea v-else-if="widgetFor(key) === 'textarea'"
					:model-value="String(draft.config[key] ?? '')"
					:label="labelFor(key)"
					:helper-text="hintFor(key)"
					rows="4"
					@update:model-value="setKey(key, $event)" />

				<NcTextField v-else-if="widgetFor(key) === 'number'"
					:model-value="String(draft.config[key] ?? '')"
					type="number"
					:label="labelFor(key)"
					@update:model-value="setNumberKey(key, $event)" />

				<NcTextArea v-else-if="widgetFor(key) === 'json'"
					:model-value="jsonDraftFor(key)"
					:label="labelFor(key)"
					:error="jsonErrors[key] !== undefined"
					:helper-text="jsonErrors[key] || t('nextcloud-vue', 'A structured value, as JSON.')"
					rows="4"
					@update:model-value="setJsonKey(key, $event)" />

				<CnCronField v-else-if="widgetFor(key) === 'cron'"
					:model-value="String(draft.config[key] ?? '')"
					:label="labelFor(key)"
					@update:model-value="setKey(key, $event)" />

				<!-- `runAs` is a Nextcloud user id, and the SERVER decides
				     whether this saver may act as that user — see
				     FlowTriggerValidator::validateDelegation(). The picker
				     defaults to the current user, which asserts no delegation
				     at all; naming anyone else is a request the save may
				     refuse, and refusing it here would only hide the reason. -->
				<NcSelect v-else-if="widgetFor(key) === 'user'"
					:model-value="userOption(key)"
					:options="userOptions"
					:input-label="labelFor(key)"
					:loading="usersLoading"
					:placeholder="t('nextcloud-vue', 'Pick a user…')"
					@update:model-value="setKey(key, $event ? $event.id : '')" />

				<NcTextField v-else
					:model-value="String(draft.config[key] ?? '')"
					:label="labelFor(key)"
					:helper-text="hintFor(key)"
					@update:model-value="setKey(key, $event)" />
			</div>

			<p v-if="!formKeys.length" class="cn-flow-node-edit__hint">
				{{ t('nextcloud-vue', 'This step has no options.') }}
			</p>

			<!-- The whole document, for anything the fields above cannot say.
			     Collapsed: the fields ARE the interface; this is the escape
			     hatch that keeps every present and future key reachable.

			     HIDDEN when it can reach nothing. A step the engine declares no
			     options for, carrying no config, was showing "This step has no
			     options" and then — as the only thing on the dialog you could
			     actually touch — a JSON editor containing `{}`. That reads as
			     "configuring this needs JSON", which is both wrong and the
			     opposite of what the form is for. An escape hatch with nothing
			     to escape to is not an advanced feature; it is noise on the
			     simplest step in the editor. -->
			<details v-if="canEditAsJson" class="cn-flow-node-edit__advanced">
				<summary>{{ t('nextcloud-vue', 'Advanced: edit as JSON') }}</summary>
				<NcTextArea :model-value="advancedJson"
					:label="t('nextcloud-vue', 'Configuration (JSON)')"
					:error="advancedError !== null"
					:helper-text="advancedError || t('nextcloud-vue', 'The full configuration document. The fields above update along.')"
					rows="8"
					@update:model-value="onAdvancedInput" />
			</details>
		</div>

		<template #actions>
			<NcButton variant="error" @click="removeStep">
				{{ t('nextcloud-vue', 'Remove step') }}
			</NcButton>
			<NcButton @click="cancel">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton variant="primary" :disabled="hasErrors" @click="done">
				{{ t('nextcloud-vue', 'Done') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import {
	NcButton,
	NcCheckboxRadioSwitch,
	NcDialog,
	NcSelect,
	NcTextArea,
	NcTextField,
} from '@nextcloud/vue'
import CnCronField from '../components/CnCronField/CnCronField.vue'
import { useFlowStore } from '../composables/useFlowStore.js'

/** The verbs an HTTP-shaped `method` option can take. */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

/**
 * CnFlowNodeEditModal — edit one flow step through a real form.
 *
 * One field per option the ENGINE declares for the step (the catalogue's
 * `configKeys`), plus any key already present on the node, each rendered with
 * a widget that follows the value: switches for booleans, a number field for
 * numbers, a JSON area for structured values, a method picker for `method`.
 * The catalogue publishes no per-key schema, so the widgets are derived — and
 * an Advanced section keeps the whole document editable, which is what keeps
 * every present and future key reachable without this dialog knowing it.
 *
 * Edits land on a DRAFT: Done commits it to `useFlowStore`, Cancel discards
 * it. Opened by setting `useFlowStore().editingNodeId`; hosted by
 * CnFlowDetail so it exists wherever the canvas does.
 */
export default {
	name: 'CnFlowNodeEditModal',

	components: {
		CnCronField,
		NcButton,
		NcCheckboxRadioSwitch,
		NcDialog,
		NcSelect,
		NcTextArea,
		NcTextField,
	},

	setup() {
		return { store: useFlowStore() }
	},

	data() {
		const node = useFlowStore().editingNode || { config: {} }

		return {
			HTTP_METHODS,

			// Users for a `runAs`-shaped field, and whether that request is in
			// flight. Empty is a legitimate resting state: the picker still
			// offers the current user, so a schedule is authorable even when
			// the user list cannot be read.
			users: [],
			usersLoading: false,

			// The draft the form edits. Committed on Done, discarded on Cancel.
			draft: {
				name: node.name || '',
				config: JSON.parse(JSON.stringify(node.config || {})),
			},

			// Per-key raw text while a JSON-valued field is mid-edit, so typing
			// is not reformatted under the cursor.
			jsonDrafts: {},
			jsonErrors: {},

			// Options per select field, loaded from the `optionsFrom` URL the
			// OWNING APP declares for it in the node's configForm.
			selectOptions: {},
			selectLoading: {},

			advancedDraft: null,
			advancedError: null,
		}
	},

	computed: {
		/**
		 * @return {object} The node being edited. Falls back to an empty shape
		 *   so a dialog outliving its node cannot throw mid-render.
		 */
		node() {
			return this.store.editingNode || { type: '', config: {} }
		},

		/**
		 * @return {object|null} The catalogue entry for this node's type.
		 */
		entry() {
			return this.store.catalogEntry(this.node.type)
		},

		/**
		 * @return {string} The dialog title: the step's human name.
		 */
		typeLabel() {
			return this.entry ? (this.entry.displayName || this.entry.id) : (this.node.type || '—')
		},

		/**
		 * The node's per-field declarations from the catalogue's `configForm`
		 * ({key, label, type, help, required, optionsFrom}), keyed by config
		 * key. `configKeys` is the degraded form. Either way the node's OWNER
		 * declares the vocabulary — this dialog never invents fields.
		 *
		 * @return {object} key → field declaration.
		 */
		fieldSpecs() {
			const specs = {}
			for (const field of (this.entry?.configForm || [])) {
				if (field && field.key) {
					specs[field.key] = field
				}
			}

			return specs
		},

		/**
		 * The keys the form renders: the declared vocabulary first, in its
		 * order — `configForm` beats `configKeys` where both exist, keys only
		 * one names are still rendered — then any key already set that neither
		 * declares. `$`-prefixed keys are authoring annotations and stay in
		 * Advanced.
		 *
		 * @return {Array<string>} The keys.
		 */
		/**
		 * Whether the raw-JSON escape hatch has anything to reach.
		 *
		 * True when the step declares options, or when the node already carries
		 * config the form does not render. False for a step with neither, where
		 * the hatch would only ever show an empty document.
		 *
		 * @return {boolean} Whether to offer the JSON editor.
		 */
		canEditAsJson() {
			if (this.formKeys.length > 0) {
				return true
			}

			return Object.keys(this.draft.config || {}).length > 0
		},

		/**
		 * The signed-in user's id, or '' when there is no session.
		 *
		 * @return {string} The uid.
		 */
		currentUid() {
			return String(getCurrentUser()?.uid || '')
		},

		/**
		 * The users offered for a `runAs` field.
		 *
		 * The current user is always present, and first. Naming yourself asserts
		 * no delegation at all, so it is the one choice the server can never
		 * refuse — which makes it both the right default and the right fallback
		 * when the user list could not be read.
		 *
		 * @return {Array<object>} The options.
		 */
		userOptions() {
			const me = this.currentUid
			const mine = me === '' ? [] : [{ id: me, label: t('nextcloud-vue', '{uid} (you)', { uid: me }) }]

			return [...mine, ...this.users.filter((user) => user.id !== me)]
		},

		formKeys() {
			const fromForm = (this.entry?.configForm || []).map((f) => f.key).filter(Boolean)
			const declared = [
				...fromForm,
				...(this.entry?.configKeys || []).filter((k) => !fromForm.includes(k)),
			]
			const present = Object.keys(this.draft.config).filter(
				(k) => !k.startsWith('$') && !declared.includes(k),
			)

			return [...declared, ...present]
		},

		/**
		 * @return {string} The draft config as pretty JSON, for Advanced.
		 */
		advancedJson() {
			if (this.advancedDraft !== null) {
				return this.advancedDraft
			}

			return JSON.stringify(this.draft.config, null, 2)
		},

		/**
		 * @return {boolean} Whether any field holds unparseable JSON.
		 */
		hasErrors() {
			return this.advancedError !== null || Object.keys(this.jsonErrors).length > 0
		},
	},

	created() {
		// Select fields need their options; everything else is local.
		for (const [key, spec] of Object.entries(this.fieldSpecs)) {
			if (spec?.type === 'select' && spec?.optionsFrom) {
				this.loadSelectOptions(key, spec)
			}
		}

		if (this.formKeys.some((key) => this.widgetFor(key) === 'user')) {
			this.loadUsers()
		}
	},

	methods: {
		/**
		 * Load the users a `runAs` field can name.
		 *
		 * Failure is not surfaced. The picker always offers the current user —
		 * see `userOptions` — so a failed lookup costs the author the ability to
		 * DELEGATE, not the ability to author a schedule at all. Blocking the
		 * dialog on it would be a worse trade.
		 *
		 * @return {Promise<void>}
		 */
		async loadUsers() {
			this.usersLoading = true
			try {
				// Nextcloud's OWN autocomplete endpoint — the one the mention
				// picker uses. OpenRegister publishes no user list, and the OCS
				// user-listing API is admin-only, so this is the only source a
				// non-admin author can read. `shareTypes[]=0` restricts it to
				// users, keeping groups and circles out of a field that takes a
				// single uid.
				const response = await axios.get(
					generateUrl('/ocs/v2.php/core/autocomplete/get'),
					{
						params: { search: '', itemType: '', itemId: '', 'shareTypes[]': 0, limit: 50 },
						headers: { 'OCS-APIRequest': 'true', Accept: 'application/json' },
					},
				)

				const rows = response?.data?.ocs?.data || []
				this.users = (Array.isArray(rows) ? rows : [])
					.filter((row) => row.source === 'users')
					.map((row) => ({ id: String(row.id ?? ''), label: String(row.label ?? row.id ?? '') }))
					.filter((row) => row.id !== '')
			} catch (error) {
				this.users = []
			} finally {
				this.usersLoading = false
			}
		},

		/**
		 * The selected user for a key, synthesised when it is not in the list.
		 *
		 * A stored uid the current user cannot see must still SHOW. Dropping it
		 * would make the field look empty and a save would then clear a
		 * delegation the author never touched.
		 *
		 * @param {string} key The config key.
		 * @return {object|null} The option.
		 */
		userOption(key) {
			const value = String(this.draft.config[key] ?? '')
			if (value === '') {
				return null
			}

			return this.userOptions.find((option) => option.id === value) || { id: value, label: value }
		},

		/**
		 * Which widget a key gets: the owner's declaration first, the VALUE
		 * second, the key's name last.
		 *
		 * @param {string} key The config key.
		 * @return {string} 'select' | 'switch' | 'number' | 'textarea' | 'json' | 'method' | 'text'
		 */
		widgetFor(key) {
			const spec = this.fieldSpecs[key]
			if (spec?.type === 'select' && spec?.optionsFrom) {
				return 'select'
			}
			if (spec?.type === 'boolean') {
				return 'switch'
			}
			if (spec?.type === 'number') {
				return 'number'
			}
			if (spec?.type === 'textarea') {
				return 'textarea'
			}

			// Keyed on the engine's own declaration where it makes one, and on
			// the key name otherwise. `cron` and `runAs` are the schedule
			// trigger's required vocabulary — a bare text box for either is a
			// schedule that fails at 03:00, with nobody watching.
			if (spec?.type === 'cron' || spec?.format === 'cron' || key === 'cron') {
				return 'cron'
			}
			if (spec?.type === 'user' || key === 'runAs') {
				return 'user'
			}

			const value = this.draft.config[key]
			if (typeof value === 'boolean') {
				return 'switch'
			}
			if (typeof value === 'number') {
				return 'number'
			}
			if (value !== null && value !== undefined && typeof value === 'object') {
				return 'json'
			}
			if (key === 'method') {
				return 'method'
			}

			return 'text'
		},

		/**
		 * The picker option matching a select field's stored value —
		 * synthesised from the raw value when it is not in the loaded options,
		 * so an existing configuration is never blanked.
		 *
		 * @param {string} key The config key.
		 * @return {object|null} The selected option.
		 */
		selectedOption(key) {
			const value = this.draft.config[key]
			if (value === undefined || value === null || value === '') {
				return null
			}

			const options = this.selectOptions[key] || []
			return options.find((o) => o.id === value) || { id: value, label: String(value) }
		},

		/**
		 * Load the pickable choices for one select field, from the URL its
		 * owning app declared (`optionsFrom`).
		 *
		 * Accepts `{results: [...]}` or a bare array; items as `{id, label}`,
		 * `{value, label}`, or OpenRegister objects (uuid from `@self`, label
		 * from name/title) — the app owns the endpoint, this dialog only has
		 * to read it.
		 *
		 * @param {string} key  The config key.
		 * @param {object} spec The field declaration carrying `optionsFrom`.
		 * @return {Promise<void>}
		 */
		async loadSelectOptions(key, spec) {
			this.selectLoading = { ...this.selectLoading, [key]: true }
			try {
				const url = String(spec.optionsFrom)
				const response = await axios.get(url.startsWith('/') && !url.startsWith('/apps') && !url.startsWith('/index.php')
					? generateUrl(url)
					: url)
				const rows = Array.isArray(response.data) ? response.data : (response.data?.results || [])
				const options = rows.map((row) => {
					const id = row.id ?? row.value ?? row['@self']?.uuid ?? row.uuid
					return {
						id,
						label: row.label || row.name || row.title || String(id),
					}
				}).filter((o) => o.id !== undefined && o.id !== null && o.id !== '')
				this.selectOptions = { ...this.selectOptions, [key]: options }
			} catch (error) {
				// A picker that could not load degrades to showing the stored
				// value; the Advanced editor still reaches everything.
				console.error(`cn-flow: could not load options for "${key}"`, error)
			} finally {
				this.selectLoading = { ...this.selectLoading, [key]: false }
			}
		},

		/**
		 * A key as a field label: the owner's translated `label` when the
		 * configForm declares one, else `sourceId` → `Source id`.
		 *
		 * @param {string} key The config key.
		 * @return {string} The label.
		 */
		labelFor(key) {
			const declared = this.fieldSpecs[key]?.label
			if (declared) {
				return declared
			}

			const spaced = key
				.replace(/[_-]+/g, ' ')
				.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
				.toLowerCase()

			return spaced.charAt(0).toUpperCase() + spaced.slice(1)
		},

		/**
		 * The helper line under a field: the owner's `help` (prefixed when the
		 * field is required), else the built-in hints for keys that earn one.
		 *
		 * @param {string} key The config key.
		 * @return {string|undefined} The helper line.
		 */
		hintFor(key) {
			const spec = this.fieldSpecs[key]
			if (spec?.help) {
				return spec.required === true
					? `${this.t('nextcloud-vue', 'Required.')} ${spec.help}`
					: spec.help
			}
			if (spec?.required === true) {
				return this.t('nextcloud-vue', 'Required.')
			}
			if (key === 'cron') {
				return this.t('nextcloud-vue', 'For example 0 9 * * 1 — 09:00 every Monday.')
			}

			return undefined
		},

		/**
		 * @param {string} key   The config key.
		 * @param {*}      value The new value.
		 * @return {void}
		 */
		setKey(key, value) {
			this.draft.config = { ...this.draft.config, [key]: value }
			this.advancedDraft = null
			this.advancedError = null
		},

		/**
		 * @param {string} key  The config key.
		 * @param {string} text The number field's text.
		 * @return {void}
		 */
		setNumberKey(key, text) {
			const parsed = Number(text)
			this.setKey(key, Number.isFinite(parsed) ? parsed : text)
		},

		/**
		 * @param {string} key The config key.
		 * @return {string} The key's value as JSON text, or its mid-edit draft.
		 */
		jsonDraftFor(key) {
			if (this.jsonDrafts[key] !== undefined) {
				return this.jsonDrafts[key]
			}

			return JSON.stringify(this.draft.config[key], null, 2)
		},

		/**
		 * Parse one JSON-valued field, keeping the last valid value on error.
		 *
		 * @param {string} key  The config key.
		 * @param {string} text The raw JSON text.
		 * @return {void}
		 */
		setJsonKey(key, text) {
			this.jsonDrafts = { ...this.jsonDrafts, [key]: text }
			try {
				const parsed = JSON.parse(text)
				const rest = { ...this.jsonErrors }
				delete rest[key]
				this.jsonErrors = rest
				this.setKey(key, parsed)
			} catch (e) {
				this.jsonErrors = {
					...this.jsonErrors,
					[key]: this.t('nextcloud-vue', 'Not valid JSON, so this option keeps its previous value.'),
				}
			}
		},

		/**
		 * Parse the whole document, keeping the last valid draft on error.
		 *
		 * @param {string} text The raw JSON text.
		 * @return {void}
		 */
		onAdvancedInput(text) {
			this.advancedDraft = text
			try {
				const parsed = JSON.parse(text || '{}')
				if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
					this.advancedError = this.t('nextcloud-vue', 'A step configuration must be a JSON object.')
					return
				}

				this.advancedError = null
				this.draft.config = parsed
				this.jsonDrafts = {}
				this.jsonErrors = {}
			} catch (e) {
				this.advancedError = this.t('nextcloud-vue', 'Not valid JSON, so the configuration keeps its previous value.')
			}
		},

		/**
		 * Commit the draft and close.
		 *
		 * @return {void}
		 */
		done() {
			const id = this.store.editingNodeId
			if (id !== null) {
				this.store.setNodeConfigById(id, this.draft.config)
				this.store.setNodeName(id, this.draft.name)
			}
			this.store.editingNodeId = null
		},

		/**
		 * Discard the draft and close.
		 *
		 * @return {void}
		 */
		cancel() {
			this.store.editingNodeId = null
		},

		/**
		 * Remove the step entirely and close.
		 *
		 * @return {void}
		 */
		removeStep() {
			const id = this.store.editingNodeId
			this.store.editingNodeId = null
			if (id !== null) {
				this.store.removeNode(id)
			}
		},
	},
}
</script>

<style scoped>
.cn-flow-node-edit {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding-block-end: 8px;
}

.cn-flow-node-edit__description {
	color: var(--color-text-maxcontrast);
}

.cn-flow-node-edit__id,
.cn-flow-node-edit__hint {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-flow-node-edit__advanced summary {
	cursor: pointer;
	color: var(--color-text-maxcontrast);
	margin-block-end: 8px;
}
</style>
