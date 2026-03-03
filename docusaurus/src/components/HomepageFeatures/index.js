import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Schema-Driven Components',
    description: (
      <>
        Define your data schema once — get list pages, detail views, filters, and forms automatically.
        CnIndexPage, CnDataTable, and CnFilterBar read column definitions straight from OpenRegister schemas.
      </>
    ),
  },
  {
    title: 'Built on Nextcloud Vue',
    description: (
      <>
        Every Cn* component composes Nextcloud's own primitives (NcAppContent, NcAppSidebar, NcDialog).
        You get the full Nextcloud look and feel with higher-level abstractions for common patterns.
      </>
    ),
  },
  {
    title: 'OpenRegister + NL Design',
    description: (
      <>
        Seamless integration with OpenRegister for CRUD, faceted search, and relation management.
        Fully compatible with the NL Design System for Dutch government theming.
      </>
    ),
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
