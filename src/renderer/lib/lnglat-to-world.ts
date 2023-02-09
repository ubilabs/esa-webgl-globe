import {Vector3} from 'three';

type Position = [number, number];

export function lngLatToWorldSpace(position: Position, out: Vector3) {
  const lngR = (position[0] * Math.PI) / 90;
  const latR = (position[1] * Math.PI) / 180;
  const py = Math.sin(latR);
  const cf = Math.sqrt(1.0 - Math.pow(py, 2.0));
  const x = Math.sin(lngR / 2) * cf;
  const y = py;
  const z = Math.cos(lngR / 2) * cf;
  out.set(x, y, z);
}
