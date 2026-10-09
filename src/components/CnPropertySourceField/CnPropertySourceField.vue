<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-property-source-field">
		<NcTextField
			v-if="plain"
			:label="inputLabel"
			:modelValue="modelValue != null ? String(modelValue) : ''"
			:disabled="disabled"
			:error="error"
			:helperText="reason"
			@update:modelValue="onPlainInput" />
		<template v-else>
			<NcSelect
				:inputId="inputId"
				:inputLabel="inputLabel"
				:modelValue="selectedOption"
				:options="options"
				:loading="loading"
				:clearable="clearable"
				:disabled="disabled"
				:placeholder="placeholder"
				:filterable="false"
				label="label"
				@search="onSearch"
				@update:modelValue="onPick" />
			<p v-if="reason" class="cn-property-source-field__reason" data-testid="cn-property-source-reason">
				{{ reason }}
			</p>
		</template>
		<p
			v-if="provenanceLine"
			class="cn-property-source-field__provenance"
			data-testid="cn-property-source-provenance">
			{{ provenanceLine }}
		</p>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcSelect, NcTextField } from '@nextcloud/vue'
import { isAppInstalled } from '../../utils/appInstalled.js'

const BASE = '/apps/integriq/api/property-sources'

/**
 * CnPropertySourceField — a type-ahead over a registry (integriq
 * `registry-field-source`) for a schema property that declares
 * `x-openregister-property-source`.
 *
 * From `minChars` typed characters it asks the provider for suggestions; on a
 * pick it resolves the identifier and only then sets the value (the
 * identifier). `resolved` carries the answer so a form can fill sibling
 * fields. Without integriq, an unknown provider, a missing permission or an
 * unreachable source the field turns into a plain text input with a one-line
 * reason, and the form still saves.
 *
 * Example:
 * ```vue
 * <CnPropertySourceField provider="kvk" input-label="KvK number"
 *   :model-value="kvk" @update:modelValue="kvk = $event" @resolved="onResolved" />
 * ```
 */
export default {
	name: 'CnPropertySourceField',

	components: { NcSelect, NcTextField },

	props: {
		/** Registry provider id, e.g. `kvk`, `bag` or `brp`. */
		provider: {
			type: String,
			required: true,
		},

		/** Stored identifier (v-model). */
		modelValue: {
			type: [String, Number],
			default: '',
		},

		/** Declaration mode: `live` reads the source where it is shown, `default` is a one-off copy. */
		mode: {
			type: String,
			default: 'live',
		},

		/** Accessible label of the field. */
		inputLabel: {
			type: String,
			default: '',
		},

		/** DOM id of the input. */
		inputId: {
			type: String,
			default: '',
		},

		/** Placeholder text. */
		placeholder: {
			type: String,
			default: '',
		},

		/** Whether the value can be cleared. */
		clearable: {
			type: Boolean,
			default: true,
		},

		/** Disable the field. */
		disabled: {
			type: Boolean,
			default: false,
		},

		/** Show the field in its error state. */
		error: {
			type: Boolean,
			default: false,
		},

		/** Characters needed before the first suggest request. */
		minChars: {
			type: Number,
			default: 3,
		},

		/** Milliseconds to wait after typing before suggesting. */
		debounce: {
			type: Number,
			default: 300,
		},

		/** Human name of the provider for the provenance line; defaults to the provider id. */
		providerLabel: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue', 'resolved'],

	data() {
		return {
			options: [],
			loading: false,
			selected: null,
			plain: !isAppInstalled('integriq'),
			reason: isAppInstalled('integriq') ? '' : t('nextcloud-vue', 'Registry lookup is not available on this server.'),
			provenance: null,
			timer: null,
			seq: 0,
		}
	},

	computed: {
		selectedOption() {
			if (this.selected && String(this.selected.identifier) === String(this.modelValue)) {
				return this.selected
			}
			if (this.modelValue === '' || this.modelValue === null || this.modelValue === undefined) {
				return null
			}
			return { identifier: String(this.modelValue), label: String(this.modelValue) }
		},

		provenanceLine() {
			const p = this.provenance
			if (!p) {
				return ''
			}
			const name = this.providerLabel || p.provider || this.provider
			let line = p.readAt
				? t('nextcloud-vue', 'From {provider}, read {time}', { provider: name, time: this.formatTime(p.readAt) })
				: t('nextcloud-vue', 'From {provider}', { provider: name })
			if (p.unreachable) {
				line += '. ' + t('nextcloud-vue', 'Source unreachable.')
			} else if (p.origin === 'cache') {
				line += '. ' + t('nextcloud-vue', 'From cache.')
			}
			return line
		},
	},

	mounted() {
		// Live mode on an existing record: resolve the stored identifier once to show label and provenance.
		if (!this.plain && this.mode === 'live' && this.modelValue !== '' && this.modelValue !== null && this.modelValue !== undefined) {
			this.resolve(String(this.modelValue)).then((res) => {
				if (res) {
					this.provenance = res.provenance || null
				}
			})
		}
	},

	beforeUnmount() {
		clearTimeout(this.timer)
	},

	methods: {
		formatTime(iso) {
			const d = new Date(iso)
			return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString()
		},

		url(path) {
			return generateUrl(`${BASE}/${encodeURIComponent(this.provider)}/${path}`)
		},

		degrade(reason) {
			this.plain = true
			this.reason = reason
			this.options = []
		},

		onPlainInput(value) {
			/** @event update:modelValue Emitted with the identifier (or typed text in plain mode). */
			this.$emit('update:modelValue', value)
		},

		onSearch(query) {
			clearTimeout(this.timer)
			if (typeof query !== 'string' || query.trim().length < this.minChars) {
				this.options = []
				return
			}
			this.timer = setTimeout(() => this.suggest(query.trim()), this.debounce)
		},

		async suggest(q) {
			const seq = ++this.seq
			this.loading = true
			try {
				const res = await axios.get(this.url('suggest'), { params: { q } })
				if (seq !== this.seq) {
					return
				}
				const results = (res && res.data && Array.isArray(res.data.results)) ? res.data.results : []
				this.options = results.map((r) => ({ ...r, label: String(r.label ?? r.identifier) }))
			} catch (err) {
				const status = err && err.response && err.response.status
				if (status === 404) {
					this.degrade(t('nextcloud-vue', 'The registry "{provider}" is not available.', { provider: this.providerLabel || this.provider }))
				} else if (status === 401 || status === 403) {
					this.degrade(t('nextcloud-vue', 'You cannot look this up.'))
				} else {
					this.degrade(t('nextcloud-vue', 'The source did not answer; type the value.'))
				}
			} finally {
				if (seq === this.seq) {
					this.loading = false
				}
			}
		},

		async resolve(identifier) {
			try {
				const res = await axios.get(this.url('resolve'), { params: { identifier } })
				return (res && res.data) || null
			} catch (err) {
				const status = err && err.response && err.response.status
				this.reason = (status === 401 || status === 403)
					? t('nextcloud-vue', 'You cannot look this up.')
					: (status === 404
							? t('nextcloud-vue', 'The registry "{provider}" is not available.', { provider: this.providerLabel || this.provider })
							: t('nextcloud-vue', 'The source did not answer; type the value.'))
				return null
			}
		},

		async onPick(option) {
			this.reason = ''
			if (!option) {
				this.selected = null
				this.provenance = null
				this.$emit('update:modelValue', '')
				return
			}
			const identifier = String(option.identifier)
			this.selected = option
			const answer = await this.resolve(identifier)
			// The identifier is kept even when the resolve fails: the user picked it.
			this.$emit('update:modelValue', identifier)
			if (!answer) {
				return
			}
			this.provenance = answer.provenance || null
			if (answer.provenance && answer.provenance.unreachable && (answer.value === undefined || answer.value === null)) {
				this.reason = t('nextcloud-vue', 'The source did not answer; type the value.')
				return
			}
			/**
			 * @event resolved Emitted after a successful resolve of a pick.
			 * @type {{identifier: string, value: *, provenance: object|null}}
			 */
			this.$emit('resolved', { identifier, value: answer.value, provenance: answer.provenance || null })
		},
	},
}
</script>

<style scoped>
.cn-property-source-field__reason,
.cn-property-source-field__provenance {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--default-font-size);
}
</style>
