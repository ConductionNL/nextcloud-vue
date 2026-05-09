// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '@conduction/nextcloud-vue',
  tagline: 'Schema-driven Vue components for Nextcloud apps built on OpenRegister',
  url: 'https://nextcloud-vue.conduction.nl',
  baseUrl: '/',

  // GitHub pages deployment config
  organizationName: 'ConductionNL',
  projectName: 'nextcloud-vue',
  trailingSlash: false,

  favicon: 'img/favicon.ico',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    localeConfigs: {
      en: { label: 'English' },
      nl: { label: 'Nederlands' },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
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
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Read by `src/components/Playground.js`. In production deploys the
      // Vue Styleguidist build is at `/styleguide/` (same origin via the
      // `documentation.yml` workflow's copy step). For local `npm start`,
      // override via env or run the styleguide on its own dev server and
      // point this at e.g. `http://localhost:6060`.
      playground: {
        styleguideUrl: process.env.STYLEGUIDE_URL || '/styleguide',
      },
      navbar: {
        title: '@conduction/nextcloud-vue',
        logo: {
          alt: 'Conduction Logo',
          src: 'img/logo.svg',
        },
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
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started',
              },
              {
                label: 'Components',
                to: '/docs/components/',
              },
              {
                label: 'Architecture',
                to: '/docs/architecture/overview',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/ConductionNL/nextcloud-vue',
              },
              {
                label: 'Conduction',
                href: 'https://conduction.nl',
              },
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
        ],
        copyright: `Copyright \u00a9 ${new Date().getFullYear()} for <a href="https://openwebconcept.nl">Open Webconcept</a> by <a href="https://conduction.nl">Conduction B.V.</a>`,
      },
      prism: {
        theme: require('prism-react-renderer/themes/github'),
        darkTheme: require('prism-react-renderer/themes/dracula'),
      },
      mermaid: {
        theme: { light: 'default', dark: 'dark' },
      },
    }),
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
};

module.exports = config;
