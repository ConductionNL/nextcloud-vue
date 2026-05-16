/**
 * Jest stub for `@nextcloud/axios`.
 *
 * The upstream package is `type: module` and (since 2.6.0) only declares an
 * `import` export condition, so Jest's CommonJS resolver cannot load it.
 * Tests that need axios mock it with `jest.mock('@nextcloud/axios', factory)`,
 * but `jest.mock` (without `virtual: true`) still requires the module path to
 * resolve. moduleNameMapper redirects the import here so resolution succeeds;
 * `jest.mock` then replaces this stub with the test's factory.
 */
module.exports = {
	__esModule: true,
	default: { get: () => Promise.resolve({ status: 200, data: {} }) },
}
