import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerProps} from '../../src/loader/layer';

const globes: WebGlGlobe[] = [];

for (const container of document.querySelectorAll('.globe')) {
  globes.push(
    new WebGlGlobe(container as HTMLElement, {
      layers: [
        {
          id: 'basemap',
          zIndex: 0,
          maxZoom: 4,
          urlParameters: {},
          getUrl: ({x, y, zoom}) =>
            `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/${container.dataset.basemap}/${zoom}/${x}/${y}.png`
        } as LayerProps<{}>
      ],
      cameraView: {lng: 0, lat: 0, distance: 20_000_000}
    })
  );
}

for (const globe of globes) {
  const otherGlobes = globes.filter(g => g !== globe);

  globe.addEventListener('cameraViewChanged', (event: CustomEventInit) => {
    otherGlobes.forEach(other => other.setProps({cameraView: event.detail}));
  });
}
