import {Vector3} from 'three';

import {RenderMode} from '../types/renderer';
import type {CameraView, LatLngAltitude} from '../types/camera-view';

const EARTH_RADIUS = 6_371_000; // in meter

export function latLngAltitudeToGlobePosition(pos: LatLngAltitude, target: Vector3) {
  const {lng, lat, altitude} = pos;
  const lngR = (lng * Math.PI) / 90;
  const latR = (lat * Math.PI) / 180;
  const py = Math.sin(latR);
  const cf = Math.sqrt(1.0 - Math.pow(py, 2.0));
  const x = Math.sin(lngR / 2) * cf;
  const y = py;
  const z = Math.cos(lngR / 2) * cf;

  target.set(x, y, z).multiplyScalar(altitude / EARTH_RADIUS + 1);
}

export function cameraViewToGlobePosition(view: CameraView, target: Vector3) {
  latLngAltitudeToGlobePosition(view, target);
}

export function globePositionToCameraView(position: Vector3): CameraView {
  const pos = position.clone().normalize();
  const lat = Math.asin(pos.y) * (180 / Math.PI);
  const lng =
    (pos.projectOnPlane(new Vector3(0, 1, 0)).angleTo(new Vector3(0, 0, 1)) * 180) / Math.PI;
  const lngSign = Math.sign(pos.x);

  const distance = (position.length() - 1) * EARTH_RADIUS;

  return {
    renderMode: RenderMode.GLOBE,
    lng: lngSign * lng,
    lat,
    altitude: distance,
    zoom: 0
  };
}
