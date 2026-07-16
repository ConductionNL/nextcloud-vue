<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-register-schema-select">
		<NcSelect
			:value="registerOption"
			:options="registerOptions"
			:input-label="t('nextcloud-vue', 'Register')"
			:placeholder="t('nextcloud-vue', 'Select a register')"
			:loading="loading"
			:disabled="disabled"
			:clearable="false"
			label="label"
			@input="onRegister" />
		<NcSelect
			:value="schemaOption"
			:options="schemaOptions"
			:input-label="t('nextcloud-vue', 'Schema')"
			:placeholder="register ? t('nextcloud-vue', 'Select a schema') : t('nextcloud-vue', 'Pick a register first')"
			:loading="loading"
			:disabled="disabled || !register"
			:clearable="false"
			label="label"
			@input="onSchema" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcSelect } from '@nextcloud/vue'

/**
 * CnRegisterSchemaSelect — paired Register + Schema dropdowns for the
 * OpenRegister-data-driven dashboard widget forms (stat / delta / gauge /
 * object-list / chart / stats-block).
 *
 * Self-fetches the available registers (with their schemas, via
 * `/apps/openregister/api/registers?_extend[]=schemas`) so authors pick from a
 * list instead of typing slugs. The schema dropdown is scoped to the selected
 * register's schemas and disabled until a register is chosen. Values are the
 * register/schema **slugs** (what the widget renderers + `fetchSchemaProperties`
 * expect). Vue 2 `.sync`-style: emits `update:register` / `update:schema`.
 *
 * ```vue
 * <CnRegisterSchemaSelect
 *   :register="source.register"
 *   :schema="source.schema"
 *   @update:register="updateSource('register', $event)"
 *   @update:schema="updateSource('schema', $event)" />
 * ```
 */
export default {
	name: 'CnRegisterSchemaSelect',

	components: { NcSelect },

	props: {
		/** Currently selected register slug (v-model:register). */
		register: {
			type: String,
			default: '',
		},
		/** Currently selected schema slug (v-model:schema). */
		schema: {
			type: String,
			default: '',
		},
		/** Disable both dropdowns. */
		disabled: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['update:register', 'update:schema'],

	data() {
		return {
			/** @type {Array<{slug: string, title: string, schemas: Array<{slug: string, title: string}>}>} */
			registers: [],
			loading: false,
		}
	},

	computed: {
		/** Register dropdown options ({ id: slug, label: title }). */
		registerOptions() {
			return this.registers.map((r) => ({ id: r.slug, label: r.title || r.slug }))
		},
		/** The option object matching the current register slug (or null). */
		registerOption() {
			return this.registerOptions.find((o) => o.id === this.register)
				|| (this.register ? { id: this.register, label: this.register } : null)
		},
		/** The fetched register entry for the current slug. */
		currentRegister() {
			return this.registers.find((r) => r.slug === this.register) || null
		},
		/** Schema dropdown options, scoped to the selected register. */
		schemaOptions() {
			return (this.currentRegister?.schemas || []).map((s) => ({ id: s.slug, label: s.title || s.slug }))
		},
		/** The option object matching the current schema slug (or null). */
		schemaOption() {
			return this.schemaOptions.find((o) => o.id === this.schema)
				|| (this.schema ? { id: this.schema, label: this.schema } : null)
		},
	},

	mounted() {
		this.fetchRegisters()
	},

	methods: {
		t,

		/**
		 * Fetch registers + their schemas from OpenRegister. Silent on failure
		 * (the dropdowns just stay empty — OpenRegister may not be installed).
		 *
		 * @return {Promise<void>}
		 */
		async fetchRegisters() {
			this.loading = true
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const res = await axios.get(generateUrl('/apps/openregister/api/registers'), {
					params: { '_extend[]': 'schemas' },
				})
				const results = res.data?.results || res.data || []
				this.registers = (Array.isArray(results) ? results : []).map((r) => ({
					slug: r.slug || String(r.id),
					title: r.title || r.slug || String(r.id),
					schemas: (Array.isArray(r.schemas) ? r.schemas : [])
						.filter((s) => s && typeof s === 'object')
						.map((s) => ({ slug: s.slug || String(s.id), title: s.title || s.slug || String(s.id) })),
				}))
			} catch (e) {
				console.error('CnRegisterSchemaSelect: failed to fetch registers', e)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Emit the chosen register slug; resets the schema (it's register-scoped).
		 *
		 * @param {{id: string}|null} opt the selected option.
		 * @return {void}
		 */
		onRegister(opt) {
			/**
			 * @event update:register Emitted with the chosen register slug.
			 * @type {string}
			 */
			this.$emit('update:register', (opt && opt.id) || '')
			if (this.schema) {
				/**
				 * @event update:schema Emitted with the chosen schema slug (cleared on register change).
				 * @type {string}
				 */
				this.$emit('update:schema', '')
			}
		},

		/**
		 * Emit the chosen schema slug.
		 *
		 * @param {{id: string}|null} opt the selected option.
		 * @return {void}
		 */
		onSchema(opt) {
			this.$emit('update:schema', (opt && opt.id) || '')
		},
	},
}
</script>

<style scoped>
.cn-register-schema-select {
	display: flex;
	gap: 12px;
}

.cn-register-schema-select > * {
	flex: 1;
	min-width: 0;
}
</style>
