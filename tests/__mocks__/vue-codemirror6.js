/**
 * Mock for vue-codemirror6 — provides a simple textarea-based component for tests.
 */
export default {
	name: 'CodeMirror',
	props: ['value', 'modelValue'],
	model: {
		prop: 'value',
		event: 'input',
	},
	render(h) {
		return h('textarea', {
			attrs: { placeholder: this.placeholder || '' },
			domProps: { value: this.value ?? this.modelValue ?? '' },
			on: {
				input: (e) => this.$emit('input', e.target.value),
			},
		})
	},
}
