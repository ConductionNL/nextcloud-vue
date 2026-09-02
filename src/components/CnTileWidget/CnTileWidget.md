Emoji icon tile:

```vue
<div style="display: grid; grid-template-columns: repeat(3, 140px); gap: 12px;">
  <div style="position: relative; height: 120px; border-radius: 8px; overflow: hidden;">
    <CnTileWidget :tile="{
      title: 'Files',
      icon: '📁',
      iconType: 'emoji',
      backgroundColor: '#0082c9',
      textColor: '#ffffff',
      linkType: 'url',
      linkValue: '#',
    }" />
  </div>
  <div style="position: relative; height: 120px; border-radius: 8px; overflow: hidden;">
    <CnTileWidget :tile="{
      title: 'Contacts',
      icon: '👥',
      iconType: 'emoji',
      backgroundColor: '#46ba61',
      textColor: '#ffffff',
      linkType: 'url',
      linkValue: '#',
    }" />
  </div>
  <div style="position: relative; height: 120px; border-radius: 8px; overflow: hidden;">
    <CnTileWidget :tile="{
      title: 'Settings',
      icon: '⚙️',
      iconType: 'emoji',
      backgroundColor: '#e8a318',
      textColor: '#ffffff',
      linkType: 'url',
      linkValue: '#',
    }" />
  </div>
</div>
```

Router tile — `linkType: 'route'` pushes `linkValue` through the host app's
vue-router instead of a full page load (falls back to a plain link when the
host page has no router, as here in the styleguide):

```vue
<div style="position: relative; height: 130px; width: 140px; border-radius: 8px; overflow: hidden;">
  <CnTileWidget :tile="{
    title: 'New secret',
    icon: '🔑',
    iconType: 'emoji',
    backgroundColor: '#21468B',
    textColor: '#ffffff',
    linkType: 'route',
    linkValue: '/secrets?action=create',
  }" />
</div>
```

SVG icon tile — uses an MDI path directly:

```vue
<div style="position: relative; height: 130px; width: 140px; border-radius: 8px; overflow: hidden;">
  <CnTileWidget :tile="{
    title: 'Dashboard',
    icon: 'M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z',
    iconType: 'svg',
    backgroundColor: '#e22d44',
    textColor: '#ffffff',
    linkType: 'url',
    linkValue: '#',
  }" />
</div>
```
