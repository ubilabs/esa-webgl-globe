import {ShaderMaterial} from 'three';
import fragmentShader from './fragment.glsl';
import fragmentShaderPole from './fragment-pole.glsl';
import vertexShader from './vertex.glsl';

export function getTileMaterial(uniforms = {}) {
  return new ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false // required so that the render order is used correctly
  });
}

export function getTileMaterialPole(uniforms = {}) {
  return new ShaderMaterial({
    uniforms: uniforms,
    vertexShader,
    fragmentShader: fragmentShaderPole,
    transparent: true,
    depthTest: false // required so that the render order is used correctly
  });
}
