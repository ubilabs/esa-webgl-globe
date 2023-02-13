import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerProps} from '../../src/loader/layer';

const globe = new WebGlGlobe(document.body, {
  layers: [
    {
      id: 'basemap',
      zIndex: 0,
      maxZoom: 7,
      urlParameters: {},
      getUrl: ({x, y, zoom}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/colored/${zoom}/${x}/${y}.png`
    } as LayerProps<{}>,
    {
      id: 'biomass.agb',
      urlParameters: {timestep: 0},
      zIndex: 0,
      maxZoom: 7,
      getUrl: ({x, y, zoom, timestep}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/biomass.agb/tiles/${timestep}/${zoom}/${x}/${y}.png`
    } as LayerProps<{timestep: number}>
  ]
});

// @ts-ignore
window.globe = globe;
