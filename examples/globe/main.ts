import '../style.css';

import {WebGlGlobe} from '../../src/';
import {LayerDebugMode} from '../../src';
import type {LayerProps} from '../../src';

const globe = new WebGlGlobe(document.body, {
  layers: [
    {
      id: 'basemap',
      // debug: true,
      debugMode: LayerDebugMode.OVERLAY,
      zIndex: 0,
      maxZoom: 4,
      urlParameters: {},
      getUrl: ({x, y, zoom}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/dark/${zoom}/${x}/${y}.png`
    } as LayerProps,
    {
      id: 'biomass.agb',
      // debug: true,
      debugMode: LayerDebugMode.OVERLAY,
      urlParameters: {timestep: 0},
      zIndex: 1,
      maxZoom: 7,
      getUrl: ({x, y, zoom, timestep}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/biomass.agb/tiles/${timestep}/${zoom}/${x}/${y}.png`
    } as LayerProps<{timestep: number}>
  ]
});
// @ts-ignore
const stats = globe.scheduler.stats;
// @ts-ignore
window.stats = stats;
// @ts-ignore
window.globe = globe;
