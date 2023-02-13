import {ShaderMaterial, GreaterStencilFunc, KeepStencilOp, ReplaceStencilOp} from 'three';
import fragmentShader from '../shader/tile/tile-fragment.glsl';
import fragmentShaderPole from '../shader/tile/tile-fragment-pole.glsl';
import vertexShader from '../shader/tile/tile-vertex.glsl';

const baseOptions = {
  vertexShader,
  transparent: true,
  depthTest: false,
  stencilWrite: true,
  stencilFunc: GreaterStencilFunc,
  stencilFail: KeepStencilOp,
  stencilZFail: KeepStencilOp,
  stencilZPass: ReplaceStencilOp
};

export function getTileMaterial(uniforms = {}, zIndex: number) {
  return new ShaderMaterial({
    ...baseOptions,
    uniforms,
    fragmentShader,
    stencilRef: zIndex + 1
  });
}

export function getTileMaterialPole(uniforms = {}, zIndex: number) {
  return new ShaderMaterial({
    ...baseOptions,
    uniforms,
    fragmentShader: fragmentShaderPole,
    stencilRef: zIndex + 1
  });
}
