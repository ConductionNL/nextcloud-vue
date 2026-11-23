/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Shared fixtures for the journey specs: an in-memory run API, stubs for the
 * Nextcloud components, and a way to fill the current form step and advance.
 */

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

export const stubs = {
	CnPageHeader: true,
	NcButton: {
		template: '<button class="nc-button-stub" :type="type" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
		props: ['type', 'variant', 'disabled'],
		emits: ['click'],
	},
	NcLoadingIcon: { template: '<span />' },
	NcNoteCard: { template: '<div class="nc-note-stub"><slot /></div>' },
	NcDialog: { template: '<div class="nc-dialog-stub"><slot /></div>', props: ['name', 'size'] },
	Send: { template: '<span />' },
	NcTextField: {
		template: '<input class="nc-textfield-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['label', 'modelValue', 'error', 'helperText'],
	},
}

/** An in-memory stand-in for OpenRegister's journey-run API. Returns `{ api, runs, calls }`. */
export function fakeRunApi() {
	const runs = {}
	const calls = []
	let n = 0
	const api = async (url, options = {}) => {
		const method = options.method || 'GET'
		calls.push({ url, method, body: options.body ? JSON.parse(options.body) : null })
		const id = (url.match(/journey-runs\/([^/]+)/) || [])[1]
		if (method === 'POST' && /journey-runs$/.test(url)) {
			const run = { id: `run-${++n}`, ...JSON.parse(options.body) }
			runs[run.id] = run
			return run
		}
		if (method === 'PUT') {
			runs[id] = { ...runs[id], ...JSON.parse(options.body) }
			return runs[id]
		}
		if (method === 'POST' && /submit$/.test(url)) {
			return { ok: true }
		}
		if (method === 'POST') {
			return {}
		}
		return runs[id]
	}
	return { api, runs, calls }
}

export const journey = {
	id: 'permit',
	title: 'Permit',
	steps: [
		{ id: 'who', type: 'form', title: 'Who', form: { fields: [{ key: 'name', type: 'string', label: 'Name', validation: { required: true } }] } },
		{
			id: 'kind',
			type: 'form',
			title: 'Kind',
			form: { fields: [{ key: 'kind', type: 'string', label: 'Kind' }] },
			branch: [{ when: { field: 'kind', op: 'eq', value: 'big' }, goto: 'extra' }],
		},
		{ id: 'small', type: 'form', title: 'Small', form: { fields: [{ key: 'note', type: 'string', label: 'Note' }] } },
		{
			id: 'extra',
			type: 'form',
			title: 'Extra',
			condition: { field: 'kind', op: 'eq', value: 'big' },
			form: { fields: [{ key: 'size', type: 'string', label: 'Size' }] },
		},
		{ id: 'check', type: 'review', title: 'Check' },
	],
}

/** Fill the form on screen and press Next. */
export async function fillAndNext(wrapper, values) {
	const form = wrapper.findComponent({ name: 'CnFormPage' })
	for (const [key, value] of Object.entries(values)) {
		form.vm.updateField(key, value)
	}
	await wrapper.find('form').trigger('submit')
	await flush()
	await flush()
}

export const currentTitle = (wrapper) => wrapper.find('.cn-journey__title').text()
