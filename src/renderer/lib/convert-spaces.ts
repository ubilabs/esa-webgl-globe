import {Vector3} from 'three';
import type {LngLatDist} from '../types/lng-lat-dist';

const EARTH_RADIUS = 6_371_000; // in meter

export function lngLatDistToWorldSpace(lngLatDist: LngLatDist, out: Vector3) {
  const {lng, lat, distance} = lngLatDist;
  const lngR = (lng * Math.PI) / 90;
  const latR = (lat * Math.PI) / 180;
  const py = Math.sin(latR);
  const cf = Math.sqrt(1.0 - Math.pow(py, 2.0));
  const x = Math.sin(lngR / 2) * cf;
  const y = py;
  const z = Math.cos(lngR / 2) * cf;
  out.set(x, y, z).multiplyScalar(distance / EARTH_RADIUS + 1);
}

export function worldSpaceToLngLatDist(position: Vector3): LngLatDist {
  const pos = position.clone().normalize();
  const lat = Math.asin(pos.y) * (180 / Math.PI);
  const lng =
    (pos.projectOnPlane(new Vector3(0, 1, 0)).angleTo(new Vector3(0, 0, 1)) * 180) / Math.PI;
  const lngSign = Math.sign(pos.x);

  const distance = (position.length() - 1) * EARTH_RADIUS;

  return {
    lng: lngSign * lng,
    lat,
    distance
  };
}
