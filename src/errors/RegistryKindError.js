/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * RegistryKindError — thrown by CnAppRoot when a registry entry declares
 * an unrecognised `kind` value.
 *
 * Spec: REQ-MVR-002 (manifest-v2-renderer)
 */

/**
 * Error thrown when a component registry entry declares an unrecognised `kind`.
 *
 * @extends Error
 */
export class RegistryKindError extends Error {

	/**
	 * @param {string} registryKey The key in the registry that has the unknown kind.
	 * @param {string} unknownKind The unrecognised kind value.
	 */
	constructor(registryKey, unknownKind) {
		super(
			`[CnAppRoot] Registry entry "${registryKey}" has an unrecognised kind "${unknownKind}". `
			+ 'Recognised kinds are: widget, modal, page, form-field, cell-renderer, header, actions, tab, section, create-override.',
		)
		this.name = 'RegistryKindError'
		this.registryKey = registryKey
		this.unknownKind = unknownKind
	}

}
