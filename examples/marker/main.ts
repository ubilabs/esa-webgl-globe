import '../style.css';

import {WebGlGlobe} from '../../src';
import {getMarkerHtml} from './get-marker-html';
import type {LayerProps, MarkerProps} from '../../src';

const globe = new WebGlGlobe(document.body, {
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

const markers: MarkerProps[] = [];

for (let i = 0; i < 20; i++) {
  const lng = (Math.random() - 0.5) * 360;
  const lat = (Math.random() - 0.5) * 180;
  markers.push({
    id: i.toString(),
    html: getMarkerHtml(`${lng.toFixed(1)}, ${lng.toFixed(1)}`),
    lng,
    lat,
    offset: [-16, -16],
    onClick: id => alert(`${id} / ${lng.toFixed(1)}, ${lng.toFixed(1)}`)
  });
}

const sicilia: MarkerProps = {
  id: 'sicilia',
  html: getMarkerHtml(`Sicilia`),
  lng: 14.111089,
  lat: 37.585256,
  offset: [-16, -16],
  onClick: id => alert(id)
};

markers.push(sicilia);

globe.setProps({markers});
