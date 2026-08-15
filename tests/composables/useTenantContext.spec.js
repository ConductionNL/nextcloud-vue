/**
 * Tests for the useTenantContext composable.
 *
 * Spec: openspec/changes/multi-tenancy-context — REQ-MT-1..5.
 */

import { defineComponent, h, provide } from 'vue'
import { mount } from '@vue/test-utils'

import {
	createTenantContext,
	provideTenantContext,
	useTenantContext,
	TENANT_CONTEXT_KEY,
} from '../../src/composables/useTenantContext.js'

describe('useTenantContext', () => {
	describe('createTenantContext (stand-alone)', () => {
		it('initialises with null refs and an event bus', () => {
			const ctx = createTenantContext()
			expect(ctx.activeOrganisationUuid.value).toBeNull()
			expect(ctx.activeOrganisation.value).toBeNull()
			expect(typeof ctx.setActiveTenant).toBe('function')
			expect(typeof ctx.onTenantSwitch).toBe('function')
		})

		it('accepts an initial UUID + entity', () => {
			const org = { uuid: 'org-1', name: 'Vergunningen Tilburg' }
			const ctx = createTenantContext('org-1', org)
			expect(ctx.activeOrganisationUuid.value).toBe('org-1')
			expect(ctx.activeOrganisation.value).toEqual(org)
		})

		it('setActiveTenant(uuid) updates the ref and emits', () => {
			const ctx = createTenantContext('a', { uuid: 'a', name: 'A' })
			const spy = jest.fn()
			ctx.onTenantSwitch(spy)

			ctx.setActiveTenant('b', { uuid: 'b', name: 'B' })

			expect(ctx.activeOrganisationUuid.value).toBe('b')
			expect(ctx.activeOrganisation.value).toEqual({ uuid: 'b', name: 'B' })
			expect(spy).toHaveBeenCalledTimes(1)
			expect(spy).toHaveBeenCalledWith(expect.objectContaining({
				previousUuid: 'a',
				uuid: 'b',
				organisation: { uuid: 'b', name: 'B' },
			}))
		})

		it('setActiveTenant is idempotent (no emit on no-op)', () => {
			const ctx = createTenantContext('a')
			const spy = jest.fn()
			ctx.onTenantSwitch(spy)
			ctx.setActiveTenant('a')
			expect(spy).not.toHaveBeenCalled()
		})

		it('setActiveTenant accepts ({ uuid, organisation }) object form', () => {
			const ctx = createTenantContext()
			ctx.setActiveTenant({ uuid: 'org-x', organisation: { uuid: 'org-x', name: 'X' } })
			expect(ctx.activeOrganisationUuid.value).toBe('org-x')
			expect(ctx.activeOrganisation.value).toEqual({ uuid: 'org-x', name: 'X' })
		})

		it('unsubscribe handle stops further notifications', () => {
			const ctx = createTenantContext()
			const spy = jest.fn()
			const off = ctx.onTenantSwitch(spy)
			ctx.setActiveTenant('a')
			off()
			ctx.setActiveTenant('b')
			expect(spy).toHaveBeenCalledTimes(1)
		})
	})

	describe('provide/inject pairing', () => {
		it('separate consumers see the same active value', async () => {
			let providerCtx
			let consumerCtxA
			let consumerCtxB

			const Provider = defineComponent({
				setup() {
					providerCtx = provideTenantContext('seed', { uuid: 'seed', name: 'Seed' })
					return () => h('div', [h(ConsumerA), h(ConsumerB)])
				},
			})
			const ConsumerA = defineComponent({
				setup() {
					consumerCtxA = useTenantContext()
					return () => h('span')
				},
			})
			const ConsumerB = defineComponent({
				setup() {
					consumerCtxB = useTenantContext()
					return () => h('span')
				},
			})

			mount(Provider)

			expect(consumerCtxA).toBe(providerCtx)
			expect(consumerCtxB).toBe(providerCtx)
			expect(consumerCtxA.activeOrganisationUuid.value).toBe('seed')

			providerCtx.setActiveTenant('next', { uuid: 'next', name: 'Next' })

			expect(consumerCtxA.activeOrganisationUuid.value).toBe('next')
			expect(consumerCtxB.activeOrganisationUuid.value).toBe('next')
		})

		it('no provider → returns warning-fallback (warns on setActiveTenant)', () => {
			let ctx
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
			const Standalone = defineComponent({
				setup() {
					ctx = useTenantContext()
					return () => h('span')
				},
			})
			mount(Standalone)
			expect(ctx.activeOrganisationUuid.value).toBeNull()
			ctx.setActiveTenant('whatever')
			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0][0]).toContain('No provider found')
			warnSpy.mockRestore()
		})

		it('manual provide() with the same key also wires through', () => {
			let injected
			const externalCtx = createTenantContext('manual', { uuid: 'manual' })
			const Provider = defineComponent({
				setup() {
					provide(TENANT_CONTEXT_KEY, externalCtx)
					return () => h(Consumer)
				},
			})
			const Consumer = defineComponent({
				setup() {
					injected = useTenantContext()
					return () => h('span')
				},
			})
			mount(Provider)
			expect(injected).toBe(externalCtx)
			expect(injected.activeOrganisationUuid.value).toBe('manual')
		})
	})

	describe('tenantSwitch raw bus', () => {
		it('exposes on/off/emit primitives', () => {
			const ctx = createTenantContext()
			const spy = jest.fn()
			ctx.tenantSwitch.on(spy)
			ctx.tenantSwitch.emit({ previousUuid: null, uuid: 'z', organisation: null })
			expect(spy).toHaveBeenCalledWith({ previousUuid: null, uuid: 'z', organisation: null })
		})
	})
})
