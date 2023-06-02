import '../style.css';

import type {LayerProps, MarkerProps} from '../../src';
import {RenderMode, WebGlGlobe} from '../../src';
import {getMarkerHtml} from './get-marker-html';

const globe = new WebGlGlobe(document.querySelector('#globe')!, {
  renderMode: RenderMode.GLOBE,
  layers: [
    {
      id: 'basemap',
      type: 'tile',
      urlParameters: {timestep: 0},
      zIndex: 0,
      maxZoom: 4,
      getUrl: ({x, y, zoom}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/colored/${zoom}/${x}/${y}.png`
    } as LayerProps
  ]
});

const markers: MarkerProps[] = [
  {id: 'ny', html: getMarkerHtml('New York'), lng: -73.97, lat: 40.78},
  {id: 'london', html: getMarkerHtml('London'), lng: -0.12, lat: 51.5},
  {id: 'tokyo', html: getMarkerHtml('Tokyo'), lng: 139.69, lat: 35.69},
  {id: 'dubai', html: getMarkerHtml('Dubai'), lng: 55.27, lat: 25.2},
  {id: 'paris', html: getMarkerHtml('Paris'), lng: 2.35, lat: 48.86},
  {id: 'moscow', html: getMarkerHtml('Moscow'), lng: 37.62, lat: 55.75},
  {id: 'rio', html: getMarkerHtml('Rio de Janeiro'), lng: -43.21, lat: -22.91},
  {id: 'sydney', html: getMarkerHtml('Sydney'), lng: 151.21, lat: -33.87},
  {id: 'cairo', html: getMarkerHtml('Cairo'), lng: 31.24, lat: 30.05},
  {id: 'beijing', html: getMarkerHtml('Beijing'), lng: 116.4, lat: 39.91},
  {id: 'mumbai', html: getMarkerHtml('Mumbai'), lng: 72.87, lat: 19.07},
  {id: 'la', html: getMarkerHtml('Los Angeles'), lng: -118.24, lat: 34.05},
  {id: 'istanbul', html: getMarkerHtml('Istanbul'), lng: 28.99, lat: 41.01},
  {id: 'rome', html: getMarkerHtml('Rome'), lng: 12.49, lat: 41.9},
  {id: 'singapore', html: getMarkerHtml('Singapore'), lng: 103.85, lat: 1.29}
];

markers.forEach(marker => {
  marker.onClick = id => console.log('clicked:', id);
});

globe.setProps({markers});
