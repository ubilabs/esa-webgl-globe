import {ShaderMaterial} from 'three';
import fragmentShader from './fragment.glsl';
import fragmentShaderPole from './fragment-pole.glsl';
import vertexShader from './vertex.glsl';

export function getTileMaterial(uniforms = {}) {
  return new ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader,
    transparent: true
  });
}

export function getTileMaterialPole(uniforms = {}) {
  return new ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader: fragmentShaderPole,
    transparent: true
  });
}
