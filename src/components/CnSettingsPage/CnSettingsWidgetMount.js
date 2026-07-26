import { h } from 'vue'

/**
 * Internal helper component used by CnSettingsPage.
 *
 * Mounts a dynamic component as a child and re-emits every event the
 * child fires as a single `widget-event` on itself with payload
 * `{ widgetType, widgetIndex, sectionIndex, name, args }`.
 *
 * Vue 3 render function: `h` is imported from `vue` (NOT passed as a
 * render argument — the Vue 2 `render(h)` signature yields an undefined
 * `h` under Vue 3, i.e. `TypeError: h is not a function` at render). The
 * VNode data is the flat Vue 3 shape (`h(component, { ...props, ref })`),
 * not the Vue 2 `{ props, attrs }` nesting.
 *
 * Generic emit capture: the created child vnode is captured in render;
 * on mount we wrap the child's internal `emit` (`vnode.component.emit`).
 * Vue 3's public `$emit` getter resolves to `instance.emit` at call time,
 * so replacing it makes every `this.$emit(...)` the child fires bubble up
 * here as a single `widget-event`, regardless of the event name — without
 * enumerating names and without a props Proxy (a Proxy that answers every
 * `onXxx` lookup corrupts Vue's `onVnodeXxx` lifecycle probing).
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
	render() {
		const vnode = h(this.component, { ...(this.componentProps || {}), ref: 'inner' })
		// Keep a handle to the child vnode so `mounted()` can wrap the
		// child's `emit`. Non-reactive assignment (avoids a render loop).
		this._innerVnode = vnode
		return vnode
	},
	mounted() {
		const inst = this._innerVnode && this._innerVnode.component
		if (!inst || typeof inst.emit !== 'function') return
		const originalEmit = inst.emit
		const self = this
		// Vue 3's public `$emit` getter returns `instance.emit` at call
		// time, so replacing it here captures every event the child fires.
		inst.emit = function wrappedEmit(name, ...args) {
			self.$emit('widget-event', {
				widgetType: self.widgetType,
				widgetIndex: self.widgetIndex,
				sectionIndex: self.sectionIndex,
				name,
				args,
			})
			return originalEmit.call(this, name, ...args)
		}
	},
}
