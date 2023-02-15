import '../style.css';
import {WebGlGlobe} from '../../src/webgl-globe';
import {getMarkerHtml} from '../marker/get-marker-html';
import type {LayerProps} from '../../src/loader/types/layer';

const globe = new WebGlGlobe(document.getElementById('container')!, {
  layers: [
    {
      id: 'basemap',
      zIndex: 0,
      maxZoom: 5,
      urlParameters: {},
      getUrl: ({x, y, zoom}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/colored/${zoom}/${x}/${y}.png`
    } as LayerProps
  ]
});

globe.setProps({
  markers: [
    {
      id: 'sicilia',
      html: getMarkerHtml(`Sicilia`),
      lng: 14.111089,
      lat: 37.585256,
      offset: [-16, -16],
      onClick: id => alert(id)
    }
  ]
});

// @ts-ignore
const stats = globe.scheduler.stats;
// @ts-ignore
window.stats = stats;
// @ts-ignore
window.globe = globe;
