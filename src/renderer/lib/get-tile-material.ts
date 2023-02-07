import {ShaderMaterial} from 'three';
import fragmentShader from '../shader/tile/tile-fragment.glsl';
import fragmentShaderPole from '../shader/tile/tile-fragment-pole.glsl';
import vertexShader from '../shader/tile/tile-vertex.glsl';

export function getTileMaterial(uniforms = {}) {
  return new ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false
  });
}

export function getTileMaterialPole(uniforms = {}) {
  return new ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader: fragmentShaderPole,
    transparent: true,
    depthTest: false
  });
}
