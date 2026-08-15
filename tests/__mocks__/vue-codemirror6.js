/**
 * Mock for vue-codemirror6 — provides a simple textarea-based component for tests.
 *
 * Vue 3 line: the Vue-2 `model: { prop, event }` option no longer exists, so
 * the stub accepts both `value` and `modelValue` and emits both `input` and
 * `update:modelValue`, keeping specs that drive either convention working.
 */
import { h } from 'vue'

export default {
	name: 'CodeMirror',
	props: {
		value: { type: String, default: undefined },
		modelValue: { type: String, default: undefined },
		placeholder: { type: String, default: '' },
	},
	emits: ['input', 'update:modelValue'],
	render() {
		return h('textarea', {
			placeholder: this.placeholder || '',
			value: this.value ?? this.modelValue ?? '',
			onInput: (e) => {
				this.$emit('input', e.target.value)
				this.$emit('update:modelValue', e.target.value)
			},
		})
	},
}
