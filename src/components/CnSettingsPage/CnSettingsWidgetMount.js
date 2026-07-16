/**
 * Internal helper component used by CnSettingsPage.
 *
 * Mounts a dynamic component as a child, intercepts every `$emit` it
 * makes, and re-emits the event as a `widget-event` on itself with
 * payload `{ widgetType, widgetIndex, sectionIndex, name, args }`.
 *
 * Why a helper component instead of `v-on="proxyObj"` on the dynamic
 * `<component>`: Vue 2's `v-on="object"` binding iterates `Object.keys`,
 * not via `Reflect.ownKeys` on a Proxy, so a `has`-trap proxy doesn't
 * intercept arbitrary event names. A render-function child with a
 * patched `$emit` is the most reliable way to capture every event the
 * widget emits regardless of name.
 *
 * NOT exported from the library barrel — this is a private
 * implementation detail of CnSettingsPage and lives next to it. The
 * file is .js (not .vue) so the docs-coverage scanner doesn't treat
 * its props as part of CnSettingsPage's public surface.
 *
 * @internal
 */
export default {
	name: 'CnSettingsWidgetMount',
	props: {
		/**
		 * The Vue component to mount. Either a built-in widget
		 * component (CnVersionInfoCard, CnRegisterMapping) or a
		 * customComponents registry entry.
		 */
		component: { type: [Object, Function], required: true },
		/** Props v-bind'd to the inner component. */
		componentProps: { type: Object, default: () => ({}) },
		/** The widgets[].type / section.component name. Used in the bubbled event payload. */
		widgetType: { type: String, required: true },
		/** Index of the section in `sections[]`. Used in the bubbled event payload. */
		sectionIndex: { type: Number, required: true },
		/** Index of the widget in the section's `widgets[]` (0 for `component`-style sections). */
		widgetIndex: { type: Number, required: true },
	},
	render(h) {
		return h(this.component, {
			ref: 'inner',
			props: this.componentProps,
			attrs: this.componentProps,
		})
	},
	mounted() {
		const inner = this.$refs.inner
		if (!inner || typeof inner.$emit !== 'function') return
		const originalEmit = inner.$emit.bind(inner)
		const self = this
		// Patch $emit so every event the child emits also bubbles up
		// here as a wrapped widget-event with the manifest path.
		inner.$emit = function patchedEmit(name, ...args) {
			self.$emit('widget-event', {
				widgetType: self.widgetType,
				widgetIndex: self.widgetIndex,
				sectionIndex: self.sectionIndex,
				name,
				args,
			})
			return originalEmit(name, ...args)
		}
	},
}
