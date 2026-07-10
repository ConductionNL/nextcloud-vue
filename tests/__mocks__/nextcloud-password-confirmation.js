/**
 * Jest stub for `@nextcloud/password-confirmation`.
 *
 * The upstream package is ESM and transitively requires `@nextcloud/dialogs`
 * → `@nextcloud/paths`, which Jest's CommonJS resolver cannot load, so any
 * component pulling in `useAppInstaller` would fail to even parse. This stub
 * resolves that. Tests that need to assert on the confirmation flow override
 * it with `jest.mock('@nextcloud/password-confirmation', factory)`;
 * moduleNameMapper redirects the import here so resolution always succeeds.
 *
 * Default: `confirmPassword()` resolves immediately (as if the admin
 * confirmed).
 */
module.exports = {
	__esModule: true,
	confirmPassword: () => Promise.resolve(),
}
