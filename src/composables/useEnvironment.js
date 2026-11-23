/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useEnvironment — the environment an app screen belongs to.
 *
 * Resolved from the app's own `environment` setting, else the active
 * organisation's `environment` (from the tenant context, or fetched from
 * OpenRegister when the context holds only the organisation's uuid), else none.
 * It follows a tenant switch. A failed read resolves to none and logs ONE
 * warning: it never shows a label it is not sure of, and never "production".
 *
 * @spec openspec/changes/environment-banner/tasks.md#task-2
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { computed, ref, watch } from 'vue'
import { MARKED_ENVIRONMENTS, resolveEnvironment } from '../utils/environment.js'
import { useTenantContext } from './useTenantContext.js'

let warned = false

/**
 * @param {object} options Options.
 * @param {() => unknown} options.environment Getter for the app's own `environment` setting.
 * @param {object} [options.tenant] The tenant context; defaults to the injected one.
 * @param {string} [options.apiBase] OpenRegister API base for reading an organisation by uuid.
 * @return {{environment: import('vue').ComputedRef<string>}} The environment to show; '' for none or production.
 */
export function useEnvironment({ environment, tenant, apiBase = '/apps/openregister/api' }) {
	const context = tenant || useTenantContext()
	/** Environments read from OpenRegister, by organisation uuid ('' = could not be read). */
	const fetched = ref({})

	watch(
		() => [context.activeOrganisationUuid.value, context.activeOrganisation.value],
		async ([uuid, organisation]) => {
			if (!uuid || (organisation && Object.hasOwn(organisation, 'environment')) || uuid in fetched.value) {
				return
			}
			fetched.value = { ...fetched.value, [uuid]: '' }
			try {
				const response = await axios.get(generateUrl(`${apiBase}/organisations/${encodeURIComponent(uuid)}`))
				const value = response && response.data && (response.data.environment ?? (response.data.results && response.data.results.environment))
				fetched.value = { ...fetched.value, [uuid]: typeof value === 'string' ? value : '' }
			} catch (error) {
				if (!warned) {
					warned = true
					// eslint-disable-next-line no-console
					console.warn('[useEnvironment] The organisation could not be read, so no environment is shown.', error)
				}
			}
		},
		{ immediate: true },
	)

	return {
		environment: computed(() => {
			const organisation = context.activeOrganisation.value
			const uuid = context.activeOrganisationUuid.value
			const fromOrganisation = organisation && Object.hasOwn(organisation, 'environment')
				? organisation.environment
				: (uuid ? fetched.value[uuid] : '')
			const resolved = resolveEnvironment(environment(), fromOrganisation)
			// Production is a declared value (it wins over the organisation) but is never shown.
			return MARKED_ENVIRONMENTS.includes(resolved) ? resolved : ''
		}),
	}
}

/** Forget that the failed-read warning was logged (tests). */
export function resetEnvironmentWarning() {
	warned = false
}
