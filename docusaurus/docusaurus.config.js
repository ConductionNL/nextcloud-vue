// @ts-check

/**
 * @conduction/nextcloud-vue documentation site.
 *
 * Built on @conduction/docusaurus-preset for brand defaults (Cobalt
 * tokens, navbar / footer swizzles, brand.css auto-load, four-locale
 * i18n scaffolding, KvK / BTW copyright). Library-specific overrides —
 * en + nl locales only, the unification's `path: '../docs'` source
 * layout, function-form editUrl pointing at edit/beta/docs/<docPath>,
 * the Playground iframe config, mermaid + custom prism themes — are
 * passed through createConfig().
 */

const { createConfig, baseFooterLinks } = require('@conduction/docusaurus-preset');

/* createConfig replaces themes wholesale when `themes:` is passed, so
   we re-include the brand theme plugin alongside @docusaurus/theme-mermaid.
   Without the brand theme entry the Navbar/Footer swizzles and
   brand.css auto-load would silently drop. */
const BRAND_THEME = require.resolve('@conduction/docusaurus-preset/theme');

const config = createConfig({
  title: '@conduction/nextcloud-vue',
  tagline: 'Schema-driven Vue components for Nextcloud apps built on OpenRegister',
  url: 'https://nextcloud-vue.conduction.nl',
  baseUrl: '/',
  // trailingSlash inherits from the preset (true). Relative folder links
  // in markdown (`./layouts/`, `./components/`) need to be absolute or
  // .md-suffixed under this setting; see fix in docs/getting-started.md.

  organizationName: 'ConductionNL',
  projectName: 'nextcloud-vue',

  /* Library docs ship en + nl markdown only; the brand preset's default
     i18n block (nl/en/de/fr) is replaced wholesale here so we don't pull
     in stub locales the docs don't translate yet. */
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    localeConfigs: {
      en: { label: 'English' },
      nl: { label: 'Nederlands' },
    },
  },

  /* The library's docs source lives at `../docs` (one level up from this
     docusaurus dir), so we override the preset's default presets[] to
     point `docs.path` there and disable the blog plugin. customCss
     carries library-specific CSS only — brand tokens and the theme
     swizzles are auto-loaded by the brand theme entry in `themes:` below.

     editUrl uses the function form because the string form combined with
     `path: '../docs'` produces `tree/<branch>/docusaurus/../docs/<file>`
     URLs that 404 on click. The function form sidesteps the relpath
     doubling. */
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: ({ docPath }) =>
            `https://github.com/ConductionNL/nextcloud-vue/edit/beta/docs/${docPath}`,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themes: [BRAND_THEME, '@docusaurus/theme-mermaid'],

  /* Brand navbar provides locale dropdown + GitHub by default; we
     replace items[] with the library's own (Documentation sidebar
     link, GitHub link, locale dropdown). createConfig's Object.assign
     is shallow, so items: replaces wholesale. */
  navbar: {
    items: [
      {
        type: 'docSidebar',
        sidebarId: 'tutorialSidebar',
        position: 'left',
        label: 'Documentation',
      },
      {
        href: 'https://github.com/ConductionNL/nextcloud-vue',
        label: 'GitHub',
        position: 'right',
      },
      { type: 'localeDropdown', position: 'right' },
    ],
  },

  /* Per-property footer override: pass `links` only, so the brand
     `style: 'dark'` and the brand KvK/BTW/IBAN/address copyright
     string both inherit unchanged. Three columns: library-specific
     "Docs" + "Related", plus the brand "Conduction" anchor preserved
     via baseFooterLinks. */
  footer: {
    links: [
      {
        title: 'Docs',
        items: [
          { label: 'Getting Started', to: '/docs/getting-started' },
          { label: 'Components', to: '/docs/components/' },
          { label: 'Architecture', to: '/docs/architecture/overview' },
          { label: 'Design Tokens', to: '/docs/design-tokens' },
        ],
      },
      {
        title: 'Related',
        items: [
          {
            label: 'Nextcloud Vue Components',
            href: 'https://nextcloud-vue-components.netlify.app/',
          },
          {
            label: 'Nextcloud Layout Components',
            href: 'https://docs.nextcloud.com/server/stable/developer_manual/design/layoutcomponents.html',
          },
          {
            label: 'Nextcloud App Development',
            href: 'https://docs.nextcloud.com/server/stable/developer_manual/app_development/index.html',
          },
        ],
      },
      // Spread the brand "Conduction" column to keep the corporate anchor
      // (GitHub org, design-system links).
      ...baseFooterLinks().filter((column) => column.title === 'Conduction'),
    ],
    // copyright: omitted -> brand KvK/BTW/IBAN inherits from the preset
  },

  /* Drop the canal-footer's boat-sinking + kade-cyclist mini-games on
     this docs page. The static skyline + canal decoration are kept;
     the interactive layer goes away. Same pattern as procest. */
  minigames: false,

  /* themeConfig is shallow-merged into the preset's defaults. Site-
     specific entries: prism themes for code blocks, mermaid theme
     pair, and the Playground iframe URL read by
     src/components/Playground.js (override via STYLEGUIDE_URL env for
     local dev). */
  themeConfig: {
    playground: {
      styleguideUrl: process.env.STYLEGUIDE_URL || '/styleguide',
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
    },
    mermaid: {
      theme: { light: 'default', dark: 'dark' },
    },
  },
});

/* createConfig doesn't pass-through arbitrary top-level fields; assign
   markdown directly so it makes it into the final Docusaurus config. */
config.markdown = {
  mermaid: true,
};

module.exports = config;
