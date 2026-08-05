<!--
  CnEditFlowsModal — author simple "flows" (declarative business logic) on the
  app's OpenRegister schemas, no code.

  Opened from the OpenBuild edit menu ("Edit flows…"). A flow lives on a schema
  under `configuration['x-openregister-flows']` (ADR-031 declarative behaviour):
  it declares a trigger (object created / updated / deleted) and a list of
  actions. This modal reads the register slug(s) the manifest's pages point at,
  loads the matching OpenRegister schemas, and lets the user pick a schema and
  build its flows with a form — pick a trigger, add Calendar-event and Email
  actions, fill in their fields (with `{{ field }}` placeholders).

  Persistence talks straight to the OpenRegister REST API: PATCH
  /api/schemas/{id} with the merged `configuration`. The runtime's
  FlowActionService reads the same `x-openregister-flows` at object-lifecycle
  time. Isolated NcModal per ADR-004.

  SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
  SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<NcDialog size="large" :name="t('nextcloud-vue', 'Edit flows')" @closing="$emit('close')">
		<p class="cn-edit-flows__intro">
			{{ t('nextcloud-vue', 'Flows run simple business logic when an object is created, updated or deleted — declared on a schema, no code. For example: when a pet is created, add a vet inspection to the calendar and email the vet.') }}
		</p>

		<div v-if="loading" class="cn-edit-flows__center">
			<NcLoadingIcon :size="32" />
		</div>
		<NcNoteCard v-else-if="error" type="error">
			{{ error }}
		</NcNoteCard>
		<NcNoteCard v-else-if="!schemas.length" type="warning">
			{{ t('nextcloud-vue', 'This app has no schemas yet. Add data first (Edit data…), then attach flows to a schema.') }}
		</NcNoteCard>

		<template v-else>
			<!-- Schema picker: flows are attached per schema. -->
			<div class="cn-edit-flows__schema">
				<NcSelect :model-value="selectedSchemaOption"
					:options="schemaOptions"
					:input-label="t('nextcloud-vue', 'Schema')"
					:clearable="false"
					@update:model-value="onSelectSchema" />
			</div>

			<template v-if="selectedSchema">
				<NcEmptyContent v-if="!flows.length"
					:name="t('nextcloud-vue', 'No flows yet')"
					:description="t('nextcloud-vue', 'Add a flow to run actions when this object changes.')">
					<template #icon>
						<Sitemap :size="20" />
					</template>
				</NcEmptyContent>

				<div v-for="(flow, fi) in flows" :key="fi" class="cn-edit-flows__flow">
					<div class="cn-edit-flows__flow-head">
						<NcTextField class="cn-edit-flows__grow"
							:model-value="flow.name"
							:label="t('nextcloud-vue', 'Flow name')"
							@update:model-value="(v) => flow['name'] = v" />
						<NcButton type="tertiary"
							:aria-label="t('nextcloud-vue', 'Remove flow')"
							:title="t('nextcloud-vue', 'Remove flow')"
							@click="removeFlow(fi)">
							<template #icon>
								<Delete :size="20" />
							</template>
						</NcButton>
					</div>

					<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'When') }}</label>
					<NcSelect :model-value="triggerOption(flow.trigger)"
						:options="triggerOptions"
						:clearable="false"
						:input-label="t('nextcloud-vue', 'Trigger')"
						@update:model-value="(o) => flow['trigger'] = o ? o.id : 'created'" />

					<div v-for="(action, ai) in flow.actions" :key="ai" class="cn-edit-flows__action">
						<div class="cn-edit-flows__action-head">
							<NcSelect class="cn-edit-flows__grow"
								:model-value="actionTypeOption(action.type)"
								:options="actionTypeOptions"
								:clearable="false"
								:input-label="t('nextcloud-vue', 'Action')"
								@update:model-value="(o) => setActionType(action, o)" />
							<NcButton type="tertiary"
								:aria-label="t('nextcloud-vue', 'Remove action')"
								:title="t('nextcloud-vue', 'Remove action')"
								@click="removeAction(flow, ai)">
								<template #icon>
									<Delete :size="20" />
								</template>
							</NcButton>
						</div>

						<!-- Calendar-event fields -->
						<template v-if="isCalendar(action.type)">
							<NcTextField :model-value="action.summary"
								:label="t('nextcloud-vue', 'Event title')"
								@update:model-value="(v) => action['summary'] = v" />
							<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'Description') }}</label>
							<textarea class="cn-edit-flows__textarea"
								:value="action.description"
								rows="2"
								@input="(e) => action['description'] = e.target.value" />
							<NcTextField :model-value="action.location"
								:label="t('nextcloud-vue', 'Location')"
								@update:model-value="(v) => action['location'] = v" />
							<div class="cn-edit-flows__row">
								<NcTextField type="number"
									:model-value="String(action.offsetDays != null ? action.offsetDays : 1)"
									:label="t('nextcloud-vue', 'Days from now')"
									@update:model-value="(v) => action['offsetDays'] = v" />
								<NcTextField type="number"
									:model-value="String(action.durationMinutes != null ? action.durationMinutes : 30)"
									:label="t('nextcloud-vue', 'Duration (minutes)')"
									@update:model-value="(v) => action['durationMinutes'] = v" />
							</div>
						</template>

						<!-- Email fields -->
						<template v-else-if="isEmail(action.type)">
							<NcTextField :model-value="action.to"
								:label="t('nextcloud-vue', 'Send to (email)')"
								@update:model-value="(v) => action['to'] = v" />
							<NcTextField :model-value="action.subject"
								:label="t('nextcloud-vue', 'Subject')"
								@update:model-value="(v) => action['subject'] = v" />
							<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'Message') }}</label>
							<textarea class="cn-edit-flows__textarea"
								:value="action.body"
								rows="3"
								@input="(e) => action['body'] = e.target.value" />
						</template>

						<!-- Agent fields -->
						<template v-else-if="isAgent(action.type)">
							<NcTextField :model-value="action.agent"
								:label="t('nextcloud-vue', 'Agent')"
								@update:model-value="(v) => action['agent'] = v" />
							<NcTextField :model-value="action.skill"
								:label="t('nextcloud-vue', 'Skill (optional)')"
								@update:model-value="(v) => action['skill'] = v" />
							<label class="cn-edit-flows__field-label">{{ t('nextcloud-vue', 'Prompt') }}</label>
							<textarea class="cn-edit-flows__textarea"
								:value="action.prompt"
								rows="3"
								@input="(e) => action['prompt'] = e.target.value" />
							<NcTextField :model-value="action.resultField"
								:label="t('nextcloud-vue', 'Write result to field')"
								@update:model-value="(v) => action['resultField'] = v" />
							<NcCheckboxRadioSwitch :model-value="Boolean(action.requiresApproval)"
								@update:model-value="(v) => action['requiresApproval'] = v">
								{{ t('nextcloud-vue', 'Require approval before the result is written') }}
							</NcCheckboxRadioSwitch>
						</template>

						<!-- Federated-share fields -->
						<template v-else-if="isFederateShare(action.type)">
							<NcTextField :model-value="action.sharedWith"
								:label="t('nextcloud-vue', 'Share with (federated user)')"
								@update:model-value="(v) => action['sharedWith'] = v" />
							<NcTextField :model-value="action.permissions"
								:label="t('nextcloud-vue', 'Permissions')"
								@update:model-value="(v) => action['permissions'] = v" />
						</template>

						<!-- A type this editor cannot author: shown, not silently rewritten. -->
						<NcNoteCard v-else type="warning">
							{{ t('nextcloud-vue', 'This action type ({type}) cannot be edited here. It is kept unchanged when you save.', { type: String(action.type) }) }}
						</NcNoteCard>
					</div>

					<NcButton type="secondary" @click="addAction(flow)">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Add action') }}
					</NcButton>
				</div>

				<div class="cn-edit-flows__actions-bar">
					<NcButton type="secondary" @click="addFlow">
						<template #icon>
							<Plus :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Add flow') }}
					</NcButton>
				</div>

				<p class="cn-edit-flows__hint">
					{{ t('nextcloud-vue', 'Tip: insert a value from the object with double braces, e.g.') }}
					<code>{{ placeholderExample }}</code>.
					<span v-if="schemaFieldHint">{{ schemaFieldHint }}</span>
				</p>
			</template>
		</template>

		<template #actions>
			<NcButton v-if="selectedSchema"
				type="primary"
				:disabled="busy"
				@click="save">
				<template #icon>
					<NcLoadingIcon v-if="busy" :size="20" />
					<ContentSave v-else :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Save flows') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcTextField, NcSelect, NcLoadingIcon, NcNoteCard, NcEmptyContent, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import { buildHeaders } from '../utils/headers.js'

/**
 * Unwrap an OpenRegister API payload (`{result}` / `{results}` / `{schemas}` / raw).
 * @param {object|Array} data The raw response body.
 * @return {*} The unwrapped payload.
 */
function unwrap(data) {
	if (!data) return data
	if (data.result !== undefined) return data.result
	if (data.results !== undefined) return data.results
	if (data.registers !== undefined) return data.registers
	if (data.schemas !== undefined) return data.schemas
	return data
}

/**
 * CnEditFlowsModal — form-based editor for a schema's `x-openregister-flows`
 * (see file header). Internal to the OpenBuild edit menu; not part of the public
 * barrel (mirrors CnEditDataModal).
 */
export default {
	name: 'CnEditFlowsModal',

	components: { NcDialog, NcButton, NcTextField, NcSelect, NcLoadingIcon, NcNoteCard, NcEmptyContent, NcCheckboxRadioSwitch, Plus, Delete, ContentSave, Sitemap },

	props: {
		/**
		 * The app manifest (working or live). Its `pages[].config.register`
		 * slugs identify which OpenRegister register(s) — and therefore which
		 * schemas — this app's flows can be attached to.
		 *
		 * @type {object}
		 */
		manifest: {
			type: Object,
			default: null,
		},
	},

	data() {
		return {
			loading: true,
			busy: false,
			error: '',
			// Resolved schema objects across the app's register(s).
			schemas: [],
			selectedSchemaId: null,
			// Working copy of the selected schema's flows (deep-cloned on select).
			flows: [],
			// Shown literally in the placeholder hint.
			placeholderExample: '{{ name }}',
		}
	},

	computed: {
		/** Distinct, non-empty register slugs referenced by the manifest's pages. */
		manifestRegisterSlugs() {
			const pages = (this.manifest && Array.isArray(this.manifest.pages)) ? this.manifest.pages : []
			const slugs = pages
				.map((p) => p && p.config && p.config.register)
				.filter((s) => typeof s === 'string' && s.length > 0)
			return [...new Set(slugs)]
		},
		/** NcSelect options for the schema picker. */
		schemaOptions() {
			return this.schemas.map((s) => ({ id: s.id, label: s.title || s.slug || String(s.id) }))
		},
		/** The selected schema object. */
		selectedSchema() {
			return this.schemas.find((s) => s.id === this.selectedSchemaId) || null
		},
		/** The selected schema as an NcSelect option. */
		selectedSchemaOption() {
			const s = this.selectedSchema
			return s ? { id: s.id, label: s.title || s.slug || String(s.id) } : null
		},
		/** Trigger options. */
		triggerOptions() {
			return [
				{ id: 'created', label: t('nextcloud-vue', 'An object is created') },
				{ id: 'updated', label: t('nextcloud-vue', 'An object is updated') },
				{ id: 'deleted', label: t('nextcloud-vue', 'An object is deleted') },
			]
		},
		/**
		 * Action-type options — these mirror every type FlowActionService::runAction()
		 * dispatches. Keep this list and the backend switch in sync: a type the
		 * backend runs but this list omits renders as the wrong action in the picker
		 * and is destroyed by cleanFlows() on save.
		 */
		actionTypeOptions() {
			return [
				{ id: 'calendar-event', label: t('nextcloud-vue', 'Add a calendar event') },
				{ id: 'email', label: t('nextcloud-vue', 'Send an email') },
				{ id: 'agent', label: t('nextcloud-vue', 'Run an AI agent') },
				{ id: 'federate-share', label: t('nextcloud-vue', 'Share with a federated user') },
			]
		},
		/** A hint listing the selected schema's field names usable as placeholders. */
		schemaFieldHint() {
			const props = (this.selectedSchema && this.selectedSchema.properties && typeof this.selectedSchema.properties === 'object')
				? Object.keys(this.selectedSchema.properties)
				: []
			if (!props.length) return ''
			return t('nextcloud-vue', 'Available fields: {fields}', { fields: props.slice(0, 12).join(', ') })
		},
	},

	mounted() {
		this.load()
	},

	methods: {
		t,
		/** Default request headers for OpenRegister API calls. */
		headers() {
			return buildHeaders()
		},
		/**
		 * Load the app's register(s) and resolve their schemas.
		 * @return {Promise<void>}
		 */
		async load() {
			this.loading = true
			this.error = ''
			try {
				const { data } = await axios.get(generateUrl('/apps/openregister/api/registers') + '?_limit=1000', { headers: this.headers() })
				const all = unwrap(data) || []
				const list = Array.isArray(all) ? all : []
				const wanted = this.manifestRegisterSlugs
				const registers = wanted.length ? list.filter((r) => wanted.includes(r.slug)) : list
				const ids = []
				registers.forEach((r) => {
					(Array.isArray(r.schemas) ? r.schemas : []).forEach((id) => {
						if ((typeof id === 'number' || typeof id === 'string') && !ids.includes(id)) ids.push(id)
					})
				})
				const resolved = await Promise.all(ids.map(async (id) => {
					try {
						const res = await axios.get(generateUrl(`/apps/openregister/api/schemas/${id}`), { headers: this.headers() })
						return unwrap(res.data)
					} catch {
						return null
					}
				}))
				this.schemas = resolved.filter(Boolean)
				if (this.schemas.length) {
					this.selectSchema(this.schemas[0].id)
				}
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to load schemas.')
			} finally {
				this.loading = false
			}
		},
		/**
		 * Select a schema and load a deep copy of its flows for editing.
		 * @param {number} id The schema id.
		 * @return {void}
		 */
		selectSchema(id) {
			this.selectedSchemaId = id
			const cfg = (this.selectedSchema && this.selectedSchema.configuration) || {}
			let raw = cfg['x-openregister-flows']
			if (!Array.isArray(raw)) raw = raw && typeof raw === 'object' ? [raw] : []
			this.flows = JSON.parse(JSON.stringify(raw)).map((f) => ({
				name: f.name || 'flow',
				trigger: f.trigger || 'created',
				actions: Array.isArray(f.actions) ? f.actions : [],
			}))
		},
		/**
		 * Handle the schema picker.
		 * @param {{id: number}} option The chosen option.
		 * @return {void}
		 */
		onSelectSchema(option) {
			if (option && option.id != null) this.selectSchema(option.id)
		},
		/**
		 * Map a trigger id to its option.
		 * @param {string} id The trigger id.
		 * @return {object} The matching option.
		 */
		triggerOption(id) {
			return this.triggerOptions.find((o) => o.id === (id || 'created')) || this.triggerOptions[0]
		},
		/**
		 * Map an action-type id to its option. An unknown type yields a synthetic
		 * option carrying its own id — falling back to the first option would show
		 * an agent action as "Add a calendar event" and invite the user to save
		 * over it.
		 * @param {string} type The action type.
		 * @return {object} The matching option, or a synthetic one for unknown types.
		 */
		actionTypeOption(type) {
			const normalised = this.normaliseType(type)
			return this.actionTypeOptions.find((o) => o.id === normalised)
				|| { id: normalised, label: normalised }
		},
		/**
		 * Normalise action-type aliases (agenda-task→calendar-event, mail→email).
		 * @param {string} type The raw type.
		 * @return {string} The canonical type.
		 */
		normaliseType(type) {
			if (type === 'agenda-task') return 'calendar-event'
			if (type === 'mail') return 'email'
			return type || 'calendar-event'
		},
		/**
		 * Whether an action is a calendar event.
		 * @param {string} type The action type.
		 * @return {boolean} True for calendar-event/agenda-task.
		 */
		isCalendar(type) {
			return this.normaliseType(type) === 'calendar-event'
		},
		/**
		 * Whether an action is an email.
		 * @param {string} type The action type.
		 * @return {boolean} True for email/mail.
		 */
		isEmail(type) {
			return this.normaliseType(type) === 'email'
		},
		/**
		 * Whether an action runs an AI agent.
		 * @param {string} type The action type.
		 * @return {boolean} True for agent.
		 */
		isAgent(type) {
			return this.normaliseType(type) === 'agent'
		},
		/**
		 * Whether an action creates a federated share.
		 * @param {string} type The action type.
		 * @return {boolean} True for federate-share.
		 */
		isFederateShare(type) {
			return this.normaliseType(type) === 'federate-share'
		},
		/**
		 * Whether this editor can author the given type. Types the backend runs
		 * but this modal cannot render are preserved verbatim rather than edited.
		 * @param {string} type The action type.
		 * @return {boolean} True when a field block exists for the type.
		 */
		isAuthorable(type) {
			return this.actionTypeOptions.some((o) => o.id === this.normaliseType(type))
		},
		/**
		 * Change an action's type, seeding sensible default fields.
		 * @param {object} action The action to mutate.
		 * @param {{id: string}} option The chosen type option.
		 * @return {void}
		 */
		setActionType(action, option) {
			const type = option ? option.id : 'calendar-event'
			action['type'] = type
			// Seed the required fields for the new type so a freshly-switched
			// action is valid for FlowActionService without further edits.
			if (type === 'agent') {
				if (action.agent === undefined) action['agent'] = ''
				if (action.resultField === undefined) action['resultField'] = ''
				if (action.prompt === undefined) action['prompt'] = ''
				if (action.mode === undefined) action['mode'] = 'async'
				if (action.requiresApproval === undefined) action['requiresApproval'] = false
			} else if (type === 'federate-share') {
				if (action.sharedWith === undefined) action['sharedWith'] = ''
				if (action.permissions === undefined) action['permissions'] = 'read'
			}
		},
		/** Append a new flow. */
		addFlow() {
			this.flows.push({
				name: t('nextcloud-vue', 'New flow'),
				trigger: 'created',
				actions: [this.newAction()],
			})
		},
		/**
		 * Remove a flow.
		 * @param {number} index The flow index.
		 * @return {void}
		 */
		removeFlow(index) {
			this.flows.splice(index, 1)
		},
		/**
		 * Build a default calendar-event action.
		 * @return {object} A new action.
		 */
		newAction() {
			return { type: 'calendar-event', summary: '', description: '', location: '', offsetDays: 1, durationMinutes: 30 }
		},
		/**
		 * Append an action to a flow.
		 * @param {object} flow The flow.
		 * @return {void}
		 */
		addAction(flow) {
			if (!Array.isArray(flow.actions)) flow['actions'] = []
			flow.actions.push(this.newAction())
		},
		/**
		 * Remove an action from a flow.
		 * @param {object} flow The flow.
		 * @param {number} index The action index.
		 * @return {void}
		 */
		removeAction(flow, index) {
			flow.actions.splice(index, 1)
		},
		/**
		 * Serialise the working flows into clean `x-openregister-flows` config
		 * (coercing numeric fields, dropping empty actions).
		 * @return {Array<object>} The cleaned flows.
		 */
		cleanFlows() {
			return this.flows.map((f) => {
				const actions = (Array.isArray(f.actions) ? f.actions : []).map((a) => {
					const type = this.normaliseType(a.type)
					switch (type) {
					case 'calendar-event':
						return {
							type: 'calendar-event',
							summary: a.summary || '',
							description: a.description || '',
							location: a.location || '',
							offsetDays: Number(a.offsetDays) || 0,
							durationMinutes: Number(a.durationMinutes) || 30,
						}
					case 'email':
						return { type: 'email', to: a.to || '', subject: a.subject || '', body: a.body || '' }
					case 'agent': {
						const agentAction = {
							type: 'agent',
							agent: a.agent || '',
							prompt: a.prompt || '',
							resultField: a.resultField || '',
							// Only 'async' is supported by FlowActionService v1, but carry
							// through whatever was authored rather than silently rewriting it.
							mode: a.mode || 'async',
							requiresApproval: Boolean(a.requiresApproval),
						}
						// skill is optional server-side; omit rather than send an empty string.
						if (a.skill) agentAction.skill = a.skill
						return agentAction
					}
					case 'federate-share':
						return {
							type: 'federate-share',
							sharedWith: a.sharedWith || '',
							permissions: a.permissions || 'read',
						}
					default:
						// A type this editor does not know (a newer backend action, or a
						// hand-authored one). Round-trip it untouched: rewriting it to a
						// default type here silently destroys the user's flow.
						return { ...a }
					}
				})
				return { name: f.name || 'flow', trigger: f.trigger || 'created', actions }
			})
		},
		/**
		 * Persist the flows onto the selected schema's configuration via PATCH.
		 * @return {Promise<void>}
		 */
		async save() {
			const schema = this.selectedSchema
			if (!schema) return
			this.busy = true
			this.error = ''
			try {
				const configuration = { ...(schema.configuration || {}) }
				configuration['x-openregister-flows'] = this.cleanFlows()
				await axios.patch(
					generateUrl(`/apps/openregister/api/schemas/${schema.id}`),
					{ configuration },
					{ headers: this.headers() },
				)
				// Reflect the saved config locally so re-selecting shows the new state.
				schema['configuration'] = configuration
				/**
				 * @event saved Emitted after flows are persisted to a schema.
				 * @type {{ schemaId: number, flows: Array<object> }}
				 */
				this.$emit('saved', { schemaId: schema.id, flows: configuration['x-openregister-flows'] })
				this.$emit('close')
			} catch (e) {
				this.error = (e && e.message) || t('nextcloud-vue', 'Failed to save flows.')
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-edit-flows__intro {
	color: var(--color-text-maxcontrast);
	margin-bottom: 16px;
}

.cn-edit-flows__center {
	display: flex;
	justify-content: center;
	padding: 40px 0;
}

.cn-edit-flows__schema {
	margin-bottom: 16px;
}

.cn-edit-flows__flow {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 16px;
	margin-bottom: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-flows__flow-head,
.cn-edit-flows__action-head {
	display: flex;
	align-items: flex-end;
	gap: 8px;
}

.cn-edit-flows__grow {
	flex: 1 1 auto;
}

.cn-edit-flows__action {
	border-inline-start: 3px solid var(--color-primary-element);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
	padding: 12px;
	margin-top: 4px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-flows__row {
	display: flex;
	gap: 8px;
}

.cn-edit-flows__row > * {
	flex: 1 1 0;
}

.cn-edit-flows__field-label {
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-edit-flows__textarea {
	width: 100%;
	border-radius: var(--border-radius);
	border: 2px solid var(--color-border-maxcontrast);
	background: var(--color-main-background);
	color: var(--color-main-text);
	padding: 8px;
	font-family: inherit;
	resize: vertical;
}

.cn-edit-flows__actions-bar {
	margin-bottom: 12px;
}

.cn-edit-flows__hint {
	color: var(--color-text-maxcontrast);
	font-size: 0.9em;
	margin: 8px 0 16px;
}
</style>
