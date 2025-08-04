import '../style.css';
import {WebGlGlobe} from '../../src';
import {getMarkerHtml} from '../marker/get-marker-html';
import type {LayerProps} from '../../src';

const globe = new WebGlGlobe(document.body, {
  cameraView: {
    // altitude: 25840000,
  },
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
      onClick: id => alert(id)
    }
  ]
});

const button = document.getElementById('resize-container')!;

button.addEventListener('click', () => {
  // toggle the size of the container
  const container = document.getElementById('container')!;
  if (container.style.width === '100%') {
    container.style.width = '50%';
    container.style.height = '50%';
  } else {
    container.style.width = '100%';
    container.style.height = '100%';
  }
});

// @ts-ignore
const stats = globe.scheduler.stats;
// @ts-ignore
window.stats = stats;
// @ts-ignore
window.globe = globe;
