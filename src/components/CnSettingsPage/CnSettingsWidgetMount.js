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
 * Generic emit capture: on mount we wrap the mounted child's internal
 * `emit` (`instance.emit`). Vue 3's public `$emit` getter resolves to
 * `instance.emit` at call time, so replacing it makes every
 * `this.$emit(...)` the child fires bubble up here as a single
 * `widget-event`, regardless of the event name — without enumerating names
 * and without a props Proxy (a Proxy that answers every `onXxx` lookup
 * corrupts Vue's `onVnodeXxx` lifecycle probing).
 *
 * The child is reached through the template `ref`, NOT through the vnode
 * `render()` returned. Vue 3's `renderComponentRoot` CLONES a
 * single-root render result whenever the component has fallthrough attrs
 * (`cloneVNode(root, fallthroughAttrs)`), and it is the clone that gets
 * patched — so the vnode captured in `render()` keeps `component === null`
 * and the emit wrapper silently never installs. Vue 2 had no such clone
 * (listeners lived outside `$attrs`), which is why the vnode handle worked
 * there. `emits` is declared below so the parent's `@widget-event` is not
 * ALSO left in `$attrs` and forwarded onto the child.
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
	emits: ['widget-event'],
	render() {
		return h(this.component, { ...(this.componentProps || {}), ref: 'inner' })
	},
	mounted() {
		// `$refs.inner` is the child's public instance proxy; `.$` is its
		// internal instance, which owns `emit`. See the docblock for why the
		// vnode returned by `render()` cannot be used here under Vue 3.
		const proxy = this.$refs.inner
		const inst = proxy && proxy.$
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
