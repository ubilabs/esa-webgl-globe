import {
  AdditiveBlending,
  Camera,
  Group,
  MultiplyBlending,
  Sprite,
  SpriteMaterial,
  TextureLoader
} from 'three';

import {WebGlGlobe} from '../webgl-globe';
import type {RenderOptions} from './types/renderer';

// The textures are 2048x2048px, but the full earth is only part of that total
// size (1997px for atmosphere.png and 2000px for shading.png) is earth. These scaling
// factors are used to upscale the images such that the radius of earth comes out as
// exactly 1 when scaling the sprites with it.
const ATMOSPHERE_BASE_SCALE = (2 * 2048) / 1997;
const SHADING_BASE_SCALE = (2 * 2048) / 2000;

const loader = new TextureLoader();

/**
 * Computes the scaling required to match the size of a great circle perpendicular to the camera
 * with the size of the apparent horizon.
 */
function getHorizonScalingFactor(camera: Camera) {
  const cameraDistance = camera.position.length();

  // from sin(a) = radius / cameraDistance
  const apparentSize = Math.asin(1 / cameraDistance);

  // from tan(a) = scaling/cameraDistance
  return cameraDistance * Math.tan(apparentSize);
}

export class Atmosphere extends Group {
  private shadingSprite: Sprite;
  private atmosphereSprite: Sprite;
  constructor() {
    super();

    const atmosphereSprite = this.initAtmosphereSprite();
    const shadingSprite = this.initShadingSprite();

    shadingSprite.renderOrder = 100;
    atmosphereSprite.renderOrder = 200;

    this.add(atmosphereSprite, shadingSprite);

    this.atmosphereSprite = atmosphereSprite;
    this.shadingSprite = shadingSprite;
  }

  private initAtmosphereSprite() {
    const {atmosphere: atmosphereTextureUrl} = WebGlGlobe.getTextureUrls();

    const sprite = new Sprite(
      new SpriteMaterial({
        map: loader.load(atmosphereTextureUrl),
        depthWrite: false,
        depthTest: false,
        dithering: true,
        blending: AdditiveBlending,
        visible: false
      })
    );

    sprite.onBeforeRender = (_r, _s, camera) => {
      sprite.scale
        .set(1, 1, 1)
        .multiplyScalar(ATMOSPHERE_BASE_SCALE * getHorizonScalingFactor(camera));
      sprite.updateMatrixWorld(true);
    };

    return sprite;
  }

  private initShadingSprite() {
    const {shading: shadingTextureUrl} = WebGlGlobe.getTextureUrls();

    const sprite = new Sprite(
      new SpriteMaterial({
        map: loader.load(shadingTextureUrl, texture => {
          texture.premultiplyAlpha = true;
        }),
        blending: MultiplyBlending,
        depthWrite: false,
        depthTest: false,
        dithering: true,
        visible: false
      })
    );

    sprite.onBeforeRender = (_r, _s, camera) => {
      sprite.scale
        .set(1, 1, 1)
        .multiplyScalar(SHADING_BASE_SCALE * getHorizonScalingFactor(camera));
      sprite.updateMatrixWorld(true);
    };

    return sprite;
  }

  setRenderOptions(renderOptions: RenderOptions) {
    const atmMat = this.atmosphereSprite.material;
    atmMat.visible =
      Boolean(renderOptions.atmosphereEnabled) || renderOptions.atmosphereStrength === 0;
    atmMat.opacity = renderOptions.atmosphereStrength || 1;

    if (renderOptions.atmosphereColor) {
      atmMat.color.fromArray(renderOptions.atmosphereColor);
    } else {
      atmMat.color.setScalar(1);
    }

    this.shadingSprite.material.visible = Boolean(renderOptions.shadingEnabled);
  }
}
