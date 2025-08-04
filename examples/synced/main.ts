import '../style.css';

import {RenderMode, WebGlGlobe} from '../../src';
import type {LayerProps} from '../../src';

const globes: WebGlGlobe[] = [];

(async function () {
  const layers = (await fetchLayersList()).filter(
    ({id}: {id: string}) => !['ozone.ozone_profile', 'greenland_ice.sec'].includes(id)
  );

  for (const layer of layers.slice(0, 16)) {
    const details = await fetchLayerDetails(layer.id);
    const container: HTMLDivElement = document.createElement('div');
    container.classList.add('globe');
    container.setAttribute('title', layer.name);
    document.getElementById('grid')?.appendChild(container);

    const globeLayers: LayerProps[] = [
      {
        id: `basemap-${layer.id}`,
        zIndex: 0,
        minZoom: 0,
        maxZoom: 4,
        type: 'tile',
        urlParameters: {},
        getUrl: ({x, y, zoom}) =>
          `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/${
            details.basemap || 'land'
          }/${zoom}/${x}/${y}.png`
      },
      {
        id: layer.id,
        zIndex: 1,
        minZoom: 1,
        maxZoom: details.zoomLevels,
        type: details.type === 'image' ? 'image' : 'tile',
        urlParameters: {},
        getUrl: ({x, y, zoom}) =>
          details.type === 'image'
            ? `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/${layer.id}/tiles/0/full.png`
            : `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/${layer.id}/tiles/0/${zoom}/${x}/${y}.png`
      }
    ];

    globes.push(
      new WebGlGlobe(container, {
        layers: globeLayers,
        cameraView: {lng: 0, lat: 0, altitude: 20_000_000, renderMode: RenderMode.GLOBE}
      })
    );
  }

  for (const globe of globes) {
    const otherGlobes = globes;

    globe.setControlsInteractionEnabled(true);
    globe.addEventListener('cameraViewChanged', (event: CustomEventInit) => {
      (console.log('sync camera view', event.detail),
        otherGlobes.forEach(other =>
          other.setProps({cameraView: {...event.detail, isAnimated: false}})
        ));
    });
  }
})();

function fetchLayersList() {
  const url = 'https://storage.googleapis.com/esa-cfs-storage/1.9.0/layers/layers-en.json';
  return fetch(url).then(res => res.json());
}

function fetchLayerDetails(id: string) {
  const url = `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/${id}/metadata.json`;
  return fetch(url).then(res => res.json());
}
