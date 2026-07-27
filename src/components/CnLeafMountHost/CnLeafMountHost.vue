<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-leaf-mount-host" data-testid="cn-leaf-mount-host">
		<!-- Bare, host-owned container. The leaf's own framework instance
		     is rooted here by `provider.mount(el, props)`. Kept in the DOM
		     via v-show (not v-if) so its `ref` survives a re-mount and an
		     error toggle. -->
		<div v-show="!error" ref="host" class="cn-leaf-mount-host__container" />
		<!-- Error isolation: a throwing leaf mount/unmount is caught and
		     confined here — it never blanks the surface or a sibling leaf. -->
		<div v-if="error" class="cn-leaf-mount-host__error" data-testid="cn-leaf-mount-host-error">
			<!-- @slot error Inline error surface shown when the leaf's mount throws. -->
			<!-- @binding {Error} error The error the leaf's mount/unmount raised. -->
			<!-- @binding {object} provider The mount-mode provider descriptor that failed. -->
			<slot name="error" :error="error" :provider="provider">
				{{ errorLabel }}
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'

/**
 * CnLeafMountHost — micro-frontend mount hand-off for a `renderMode: 'mount'`
 * integration leaf (openregister#2127, ADR-066).
 *
 * The host surfaces (`CnObjectSidebar`, `CnDetailPage`, `CnDashboardPage`)
 * render this wrapper instead of `<component :is="provider.tab/widget">`
 * when a resolved provider declares `renderMode: 'mount'`. It owns a bare
 * host-owned `<div>` and the mount lifecycle: it calls the leaf's
 * `mount(el, props)` when the surface becomes visible, `unmount(el)` before
 * the element is removed (surface hidden, component destroyed), and it
 * re-mounts — a full `unmount` then `mount` — whenever the bound object
 * changes, because the host cannot push new props into the leaf's own
 * reactive tree.
 *
 * The DOM element is the neutral hand-off boundary: the leaf instantiates
 * its OWN framework instance (e.g. a Vue 3 `createApp(...).mount(el)`) rooted
 * at the element, so a leaf built against a different Vue major than the host
 * still renders. A leaf mount failure is caught, logged, and confined to this
 * container as an inline error/empty state — it never blanks the sidebar,
 * detail page, dashboard, or a sibling leaf.
 *
 * See the `cn-leaf-mount-host` doc page for the leaf-side mount/unmount recipe.
 */
export default {
	name: 'CnLeafMountHost',

	props: {
		/**
		 * The mount-mode integration provider descriptor from the registry.
		 * MUST carry `mount(el, props)` and `unmount(el)` functions (its
		 * `renderMode` is `'mount'`). The host resolves this from
		 * `useIntegrationRegistry().getById(id)`.
		 *
		 * @type {{ id: string, mount: Function, unmount: Function }}
		 */
		provider: {
			type: Object,
			required: true,
		},

		/**
		 * Context object forwarded verbatim to `provider.mount(el, props)` —
		 * the same shape an SFC widget/tab receives for the surface
		 * (`{ register, schema, objectId, surface, integrationContext, … }`).
		 * A change to the object-identifying fields (`register` / `schema` /
		 * `objectId`) triggers a deterministic unmount-then-mount.
		 *
		 * @type {object}
		 */
		mountProps: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * Whether the surface hosting this leaf is currently visible. Drives
		 * lazy mounting: a sidebar tab passes `activeTab === provider.id` so
		 * the leaf's framework instance is not created until the user opens
		 * the tab, and is unmounted when the tab is hidden. Always-visible
		 * surfaces (detail/dashboard widgets) leave this at the default.
		 *
		 * @type {boolean}
		 */
		active: {
			type: Boolean,
			default: true,
		},

		/**
		 * Pre-translated label for the default inline error state. Override
		 * for app-specific copy, or replace the whole surface via the
		 * `#error` slot.
		 *
		 * @type {string}
		 */
		errorLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'This section could not be loaded.'),
		},
	},

	data() {
		return {
			// Whether the leaf is currently mounted into our container.
			isMounted: false,
			// The last mount/unmount error, or null. Non-null flips the
			// container to the inline error state.
			error: null,
		}
	},

	computed: {
		/**
		 * Identity key for the currently bound object. A change re-mounts the
		 * leaf (unmount + mount with the new props) because props cannot be
		 * pushed into the leaf's own reactive tree. Derived from the
		 * object-identifying fields on `mountProps` (with an
		 * `integrationContext` fallback) plus the provider id.
		 *
		 * @return {string} Stable per-object key.
		 */
		mountKey() {
			const p = this.mountProps || {}
			const ic = p.integrationContext || {}
			const register = p.register != null ? p.register : ic.register
			const schema = p.schema != null ? p.schema : ic.schema
			const objectId = p.objectId != null ? p.objectId : ic.objectId
			const id = this.provider ? this.provider.id : ''
			return [id, register, schema, objectId].join('::')
		},
	},

	watch: {
		active(next) {
			if (next === true) {
				this.mountLeaf()
			} else {
				this.unmountLeaf()
			}
		},
		mountKey() {
			// Bound object (or provider) changed: full teardown + rebuild.
			this.unmountLeaf()
			if (this.active === true) {
				this.$nextTick(() => this.mountLeaf())
			}
		},
	},

	mounted() {
		if (this.active === true) {
			this.mountLeaf()
		}
	},

	beforeUnmount() {
		this.unmountLeaf()
	},

	methods: {
		/**
		 * Call the leaf's `mount(el, props)` against our container. No-op
		 * when already mounted or the container is not in the DOM yet. A
		 * throw is caught and confined to this container's inline error
		 * state — it never propagates to blank the host surface.
		 *
		 * @return {void}
		 */
		mountLeaf() {
			if (this.isMounted === true) {
				return
			}
			const el = this.$refs.host
			const provider = this.provider
			if (!el || !provider || typeof provider.mount !== 'function') {
				return
			}
			try {
				provider.mount(el, { ...this.mountProps })
				this.isMounted = true
				this.error = null
			} catch (e) {
				this.error = e instanceof Error ? e : new Error(String(e))
				// eslint-disable-next-line no-console
				console.error(`[CnLeafMountHost] leaf "${provider.id}" threw during mount`, e)
			}
		},

		/**
		 * Call the leaf's `unmount(el)` before the container is removed or
		 * re-used. No-op when nothing is mounted. A throw is caught and
		 * logged — teardown failure must not break the host either.
		 *
		 * @return {void}
		 */
		unmountLeaf() {
			if (this.isMounted === false) {
				return
			}
			const el = this.$refs.host
			const provider = this.provider
			this.isMounted = false
			if (!el || !provider || typeof provider.unmount !== 'function') {
				return
			}
			try {
				provider.unmount(el)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(`[CnLeafMountHost] leaf "${provider.id}" threw during unmount`, e)
			}
		},
	},
}
</script>

<style scoped>
.cn-leaf-mount-host {
	display: flex;
	flex-direction: column;
	min-height: 0;
	height: 100%;
}

.cn-leaf-mount-host__container {
	flex: 1 1 auto;
	min-height: 0;
}

.cn-leaf-mount-host__error {
	padding: 20px;
	color: var(--color-text-maxcontrast);
	text-align: center;
}
</style>
