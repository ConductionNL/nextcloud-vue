<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-nc-dashboard-quick-create" data-testid="cn-nc-dashboard-quick-create">
		<p v-if="headingText" class="cn-nc-dashboard-quick-create__heading">
			{{ headingText }}
		</p>
		<form v-if="!created"
			class="cn-nc-dashboard-quick-create__form"
			novalidate
			@submit.prevent="submit">
			<template v-for="field in shownFields" :key="field.key">
				<NcSelect v-if="field.type === 'select' || field.type === 'object'"
					:modelValue="selected[field.key] || null"
					:options="optionsOf(field)"
					:inputLabel="text(field.label)"
					:placeholder="text(field.placeholder)"
					:filterable="field.type !== 'object'"
					:loading="Boolean(searching[field.key])"
					label="label"
					:clearable="!field.required"
					:data-testid="`cn-quick-create-field-${field.key}`"
					@search="(query) => onSearch(field, query)"
					@update:modelValue="(option) => pick(field, option)" />
				<NcTextField v-else
					:modelValue="values[field.key] === undefined || values[field.key] === null ? '' : String(values[field.key])"
					:label="text(field.label)"
					:placeholder="text(field.placeholder)"
					:type="field.type === 'number' ? 'number' : 'text'"
					:error="missing.includes(field.key)"
					:helperText="missing.includes(field.key) ? t('nextcloud-vue', 'This field is required') : ''"
					:data-testid="`cn-quick-create-field-${field.key}`"
					@update:modelValue="(value) => setValue(field.key, value)"
					@keydown.enter.prevent="submit" />
			</template>
			<NcNoteCard v-if="failed" type="error" data-testid="cn-quick-create-error">
				{{ failed }}
			</NcNoteCard>
			<div class="cn-nc-dashboard-quick-create__buttons">
				<NcButton type="submit"
					variant="primary"
					:disabled="submitting"
					data-testid="cn-quick-create-submit">
					{{ submitting ? t('nextcloud-vue', 'Creating…') : (text(config.submitLabel) || t('nextcloud-vue', 'Create')) }}
				</NcButton>
				<NcButton v-if="cancelable" variant="secondary" @click="cancel">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
			</div>
		</form>
		<div v-else class="cn-nc-dashboard-quick-create__done" data-testid="cn-quick-create-done">
			<NcNoteCard type="success">
				{{ text(config.successText) || t('nextcloud-vue', 'Created') }}
				<a v-if="createdHref" :href="createdHref" data-testid="cn-quick-create-open">{{ text(config.successLinkText) || t('nextcloud-vue', 'Open') }}</a>
			</NcNoteCard>
			<NcButton variant="secondary" data-testid="cn-quick-create-again" @click="reset">
				{{ text(config.againLabel) || t('nextcloud-vue', 'Create another') }}
			</NcButton>
		</div>
		<section v-if="config.list" class="cn-nc-dashboard-quick-create__list">
			<h4 v-if="config.listHeading" class="cn-nc-dashboard-quick-create__list-heading">
				{{ text(config.listHeading) }}
			</h4>
			<CnNcDashboardList :key="listKey" :config="config.list" />
		</section>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcNoteCard, NcSelect, NcTextField } from '@nextcloud/vue'
import { defineAsyncComponent } from 'vue'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'

const SEARCH_DEBOUNCE_MS = 300

/**
 * A url for an anchor: absolute and app-root paths as given, else through `generateUrl`.
 *
 * @param {string} url The url.
 * @return {string}
 */
function appUrl(url) {
	return /^(https?:)?\/\//i.test(url) || url.startsWith('/index.php') ? url : generateUrl(url)
}

/**
 * CnNcDashboardQuickCreate — a short create form for a Nextcloud Dashboard
 * widget ("New lead", "Start a request"): a few fields, a submit that writes
 * one OpenRegister object, and a link to what was made. A failed create says
 * so and keeps what was typed. `registerNcDashboardWidgets` mounts it for a
 * widget declared `{ id, type: "quick-create", config }`, and
 * CnNcDashboardList opens it inline from a row action or its create button.
 *
 * `config`:
 * - `register`, `schema`: where the object is created.
 * - `fields`: `[{ key, label, type, required?, placeholder?, options?, optionsFrom?, default?, labelField? }]`.
 *   `type` is `text` (default), `number`, `select` (`options: [{ value, label }]`,
 *   labels through the app's translate, or `optionsFrom: { register, schema,
 *   filter?, valueField?, labelField? }`; `default: "first"` picks the first
 *   option) or `object` (a search over `register`/`schema` objects, stored by
 *   id, shown by `labelField`, default `name`).
 * - `defaults`: values written with every create; filter tokens (`@now`,
 *   `@me`) resolve and string templates fill from `context` (`"{id}"`).
 * - `derive`: `{ target: { from, path, sortBy?, field } }`: a value read from
 *   the option chosen for field `from` (the first stage of the chosen pipeline:
 *   `{ stage: { from: "pipeline", path: "stages", sortBy: "order", field: "name" } }`).
 * - `heading`: a line above the form, a template filled from `context`.
 * - `submitLabel`, `successText`, `successLinkText`, `againLabel`: texts.
 * - `successHref`: a template for the created object's page (`/apps/pipelinq/leads/{id}`).
 * - `openAfterCreate`: go to `successHref` at once instead of the success note.
 * - `list`, `listHeading`: a CnNcDashboardList config shown under the form
 *   with a heading ("Recent requests"), read again after a create.
 *
 * Texts go through the host translate.
 */
export default {
	name: 'CnNcDashboardQuickCreate',

	components: {
		// Async: the list opens this form inline, so a static import both ways would be circular.
		CnNcDashboardList: defineAsyncComponent(() => import('../CnNcDashboardList/CnNcDashboardList.vue')),
		NcButton,
		NcNoteCard,
		NcSelect,
		NcTextField,
	},

	inject: {
		/** The host app's translate (provided by `registerNcDashboardWidgets`). */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The form's configuration (see the component docs).
		 *
		 * @type {object}
		 */
		config: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The record the form starts from (a row it was opened on), for
		 * `defaults` and `heading` templates.
		 *
		 * @type {object}
		 */
		context: {
			type: Object,
			default: () => ({}),
		},

		/** Show a Cancel button that emits `cancel`. */
		cancelable: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['created', 'cancel'],

	data() {
		return {
			values: {},
			selected: {},
			loaded: {},
			searched: {},
			searching: {},
			missing: [],
			submitting: false,
			failed: '',
			created: null,
			listKey: 0,
			timers: {},
		}
	},

	computed: {
		/** @return {Array<object>} The declared fields with a key. */
		shownFields() {
			return (Array.isArray(this.config.fields) ? this.config.fields : []).filter((field) => field && field.key)
		},

		/** @return {string} The heading, filled from the context. */
		headingText() {
			return this.config.heading ? fillTemplate(this.text(this.config.heading), this.context || {}).trim() : ''
		},

		/** @return {string} The created object's page, or ''. */
		createdHref() {
			if (!this.created || !this.config.successHref) {
				return ''
			}
			return appUrl(fillTemplate(this.config.successHref, this.created))
		},
	},

	mounted() {
		this.loadOptions()
	},

	beforeUnmount() {
		Object.values(this.timers).forEach((timer) => clearTimeout(timer))
	},

	methods: {
		/**
		 * Give up the form without creating anything.
		 */
		cancel() {
			/**
			 * @event cancel The form was closed without creating anything.
			 */
			this.$emit('cancel')
		},

		t,

		/**
		 * A config text through the host translate.
		 *
		 * @param {unknown} value The text.
		 * @return {string}
		 */
		text(value) {
			return typeof value === 'string' && value !== '' ? this.cnTranslate(value) : ''
		},

		/**
		 * The options a select or object field offers.
		 *
		 * @param {object} field The field.
		 * @return {Array<{value: unknown, label: string, row?: object}>}
		 */
		optionsOf(field) {
			if (field.type === 'object') {
				return this.searched[field.key] || []
			}
			if (Array.isArray(field.options)) {
				return field.options.map((option) => ({ value: option.value, label: this.text(option.label) || String(option.value) }))
			}
			return this.loaded[field.key] || []
		},

		/**
		 * Read every `optionsFrom` select, then apply `default: "first"`.
		 *
		 * @spec openspec/changes/pl4-nc-dashboard/specs/pl4-nc-dashboard/spec.md#requirement-a-dashboard-widget-can-create-an-object
		 * @return {Promise<void>}
		 */
		async loadOptions() {
			for (const field of this.shownFields) {
				if (field.type === 'select' && field.optionsFrom && field.optionsFrom.register && field.optionsFrom.schema) {
					this.loaded = { ...this.loaded, [field.key]: await this.fetchOptions(field.optionsFrom, {}) }
				}
				if (field.default === 'first' && !this.selected[field.key]) {
					const first = this.optionsOf(field)[0]
					if (first) {
						this.pick(field, first)
					}
				} else if (field.default !== undefined && field.default !== 'first' && this.values[field.key] === undefined) {
					this.setValue(field.key, field.default)
				}
			}
		},

		/**
		 * OpenRegister objects as options.
		 *
		 * @param {object} from `{ register, schema, filter?, valueField?, labelField? }`.
		 * @param {object} params Extra query parameters.
		 * @return {Promise<Array<object>>}
		 */
		async fetchOptions(from, params) {
			try {
				const { data } = await axios.get(generateUrl(`/apps/openregister/api/objects/${from.register}/${from.schema}`), {
					params: { _limit: 50, ...resolveDeepTokens(from.filter || {}, {}), ...params },
				})
				const rows = Array.isArray(data && data.results) ? data.results : (Array.isArray(data) ? data : [])
				return rows.filter((row) => row && typeof row === 'object').map((row) => ({
					value: readPath(row, from.valueField || 'id'),
					label: String(readPath(row, from.labelField || 'title') ?? readPath(row, 'name') ?? readPath(row, 'id') ?? ''),
					row,
				}))
			} catch {
				return []
			}
		},

		/**
		 * Search an object field's records as the user types.
		 *
		 * @param {object} field The field.
		 * @param {string} query What was typed.
		 */
		onSearch(field, query) {
			if (field.type !== 'object') {
				return
			}
			clearTimeout(this.timers[field.key])
			this.timers[field.key] = setTimeout(async () => {
				this.searching = { ...this.searching, [field.key]: true }
				const options = await this.fetchOptions({ ...field, labelField: field.labelField || 'name' }, { _search: String(query || '').trim(), _limit: 10 })
				this.searched = { ...this.searched, [field.key]: options }
				this.searching = { ...this.searching, [field.key]: false }
			}, SEARCH_DEBOUNCE_MS)
		},

		/**
		 * Choose a select or object option.
		 *
		 * @param {object} field The field.
		 * @param {object|null} option The option.
		 */
		pick(field, option) {
			this.selected = { ...this.selected, [field.key]: option || null }
			this.setValue(field.key, option ? option.value : null)
		},

		/**
		 * Set a field's value.
		 *
		 * @param {string} key The field key.
		 * @param {unknown} value The value.
		 */
		setValue(key, value) {
			this.values = { ...this.values, [key]: value }
			this.missing = this.missing.filter((k) => k !== key)
		},

		/**
		 * The object to create: the defaults, the derived values and the fields.
		 *
		 * @spec openspec/changes/pl4-nc-dashboard/specs/pl4-nc-dashboard/spec.md#requirement-a-dashboard-widget-can-create-an-object
		 * @return {object}
		 */
		buildBody() {
			const body = {}
			for (const [key, value] of Object.entries(this.config.defaults || {})) {
				const resolved = resolveDeepTokens(value, {})
				body[key] = typeof resolved === 'string' && resolved.includes('{') ? fillTemplate(resolved, this.context || {}) : resolved
			}
			for (const [target, rule] of Object.entries(this.config.derive || {})) {
				const option = rule && this.selected[rule.from]
				let list = option && option.row ? readPath(option.row, rule.path) : null
				if (Array.isArray(list) && list.length > 0) {
					if (rule.sortBy) {
						list = [...list].sort((a, b) => (Number(readPath(a, rule.sortBy)) || 0) - (Number(readPath(b, rule.sortBy)) || 0))
					}
					const value = readPath(list[0], rule.field)
					if (value !== undefined && value !== null) {
						body[target] = value
					}
				}
			}
			for (const field of this.shownFields) {
				const value = this.values[field.key]
				if (value === undefined || value === null || value === '') {
					continue
				}
				body[field.key] = field.type === 'number' ? Number(value) : value
			}
			return body
		},

		/**
		 * Create the object; a missing required field or a failed write says so.
		 *
		 * @spec openspec/changes/pl4-nc-dashboard/specs/pl4-nc-dashboard/spec.md#requirement-a-dashboard-widget-can-create-an-object
		 * @return {Promise<void>}
		 */
		async submit() {
			if (this.submitting) {
				return
			}
			this.missing = this.shownFields
				.filter((field) => field.required && (this.values[field.key] === undefined || this.values[field.key] === null || String(this.values[field.key]).trim() === ''))
				.map((field) => field.key)
			if (this.missing.length > 0) {
				return
			}
			this.submitting = true
			this.failed = ''
			try {
				const { data } = await axios.post(generateUrl(`/apps/openregister/api/objects/${this.config.register}/${this.config.schema}`), this.buildBody())
				const id = (data && (data.id || data.uuid || (data['@self'] && data['@self'].id))) || ''
				const created = { ...(data || {}), id }
				/**
				 * @event created The object was created. Payload: the created object, with its `id`.
				 */
				this.$emit('created', created)
				if (this.config.openAfterCreate && this.config.successHref) {
					window.location.assign(appUrl(fillTemplate(this.config.successHref, created)))
					return
				}
				this.created = created
				this.listKey++
			} catch (failure) {
				const body = failure && failure.response && failure.response.data
				const reason = body && (body.message || body.error)
				this.failed = reason ? String(reason) : t('nextcloud-vue', 'This could not be created. Try again.')
			} finally {
				this.submitting = false
			}
		},

		/**
		 * Start a new form, keeping the first-option defaults.
		 */
		reset() {
			this.values = {}
			this.selected = {}
			this.missing = []
			this.failed = ''
			this.created = null
			this.loadOptions()
		},
	},
}
</script>

<style scoped>
.cn-nc-dashboard-quick-create {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px 0;
}

.cn-nc-dashboard-quick-create__form,
.cn-nc-dashboard-quick-create__done {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-nc-dashboard-quick-create__heading {
	margin: 0;
	font-weight: 600;
}

.cn-nc-dashboard-quick-create__list-heading {
	margin: 8px 0 0;
	font-size: 1em;
	font-weight: 600;
}

.cn-nc-dashboard-quick-create__buttons {
	display: flex;
	gap: 8px;
}
</style>
