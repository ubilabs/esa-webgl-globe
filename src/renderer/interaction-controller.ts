//@ts-ignore
import {OrbitControls} from './vendor/orbit-controls.js';
import {CameraView} from './types/camera-view.js';
import {RenderMode} from './types/renderer';
import {Renderer} from './renderer';
import { lerp } from './lib/easing.js';

export class InteractionController {
  private globeControls: OrbitControls;
  private container: HTMLElement;
  private renderer: Renderer;
  private controlsInteractionEnabled = false;
  private spinAbortController: AbortController | null = null;

  private targetCameraView?: CameraView;
  private isAnimatingCamera: boolean = false;
  private currentInterpolationFactor: number = 0.1; // Default interpolation factor

  constructor(globeControls: OrbitControls, container: HTMLElement, renderer: Renderer) {
    this.globeControls = globeControls;
    this.container = container;
    this.renderer = renderer;

    // Disable the default controls interaction
    this.updateControlsEnabled(false);
  }

  public setAutoSpin(isEnabled: boolean, speed: number = 1): void {
    this.abortCurrentSpin();

    this.globeControls.autoRotate = isEnabled;
    this.globeControls.autoRotateSpeed = speed;

    if (isEnabled && this.controlsInteractionEnabled) {
      this.spinAbortController = new AbortController();
      const stopAutoSpin = () => this.setAutoSpin(false);

      const options = {once: true, signal: this.spinAbortController.signal};
      this.container.addEventListener('mousedown', stopAutoSpin, options);
      this.container.addEventListener('wheel', stopAutoSpin, options);
      this.container.addEventListener('touchstart', stopAutoSpin, options);
    }
  }

  public setControlsInteractionEnabled(enabled: boolean): void {
    this.controlsInteractionEnabled = enabled;
    this.updateControlsEnabled(enabled);
  }

  public setCameraView(
    newCameraView: Partial<CameraView>,
    isAnimated = true,
    interpolationFactor?: number
  ) {
    const currentView = this.renderer.getCameraView();

    if (!currentView) {
      console.warn('Cannot set camera view, current camera view is undefined.');
      return;
    }

    const targetCameraView: CameraView = {
      ...currentView,
      ...newCameraView
    };

    if (targetCameraView === currentView) {
      return;
    }

    if (targetCameraView.renderMode !== this.renderer.getRenderMode()) {
      this.renderer.setRenderMode(targetCameraView.renderMode);
    }

    if (!isAnimated || targetCameraView.renderMode !== RenderMode.GLOBE) {
      // Immediately set the camera view if not animated or not in globe mode
      this.renderer.updateGlobeCamera(targetCameraView);
      // Stop any ongoing animation and re-enable controls
      this.isAnimatingCamera = false;
      this.globeControls.enabled = true;
      this.renderer.mapControls.enabled = true;
      return;
    }

    // Start or update animation
    this.targetCameraView = targetCameraView;
    this.isAnimatingCamera = true;
    this.globeControls.enabled = false; // Disable controls during animation
    this.renderer.mapControls.enabled = false;

    if (interpolationFactor !== undefined) {
      this.currentInterpolationFactor = interpolationFactor;
    }
  }

  public updateCameraAnimation() {
    if (
      this.isAnimatingCamera &&
      this.renderer.getRenderMode() === RenderMode.GLOBE &&
      this.targetCameraView
    ) {
      const currentView = this.renderer.getCameraView();
      if (!currentView) {
        this.isAnimatingCamera = false;
        this.globeControls.enabled = true;
        this.renderer.mapControls.enabled = true;
        return;
      }

      const interpolationFactor = this.currentInterpolationFactor;
      const epsilon = 1e-6; // Threshold for "close enough"

      const deltaLng = this.calculateShortestLongitudeDelta(
        currentView.lng,
        this.targetCameraView.lng
      );
      let newLat = lerp(currentView.lat, this.targetCameraView.lat, interpolationFactor);
      let newLng = lerp(currentView.lng, currentView.lng + deltaLng, interpolationFactor);
      let newZoom = lerp(currentView.zoom, this.targetCameraView.zoom, interpolationFactor);
      let newAltitude = lerp(
        currentView.altitude,
        this.targetCameraView.altitude,
        interpolationFactor
      );

      const interpolatedView: CameraView = {
        renderMode: this.targetCameraView.renderMode,
        lat: newLat,
        lng: newLng,
        zoom: newZoom,
        altitude: newAltitude
      };

      // Check if close enough to target
      const latDiff = Math.abs(interpolatedView.lat - this.targetCameraView.lat);
      const lngDiff = Math.abs(interpolatedView.lng - this.targetCameraView.lng);
      const zoomDiff = Math.abs(interpolatedView.zoom - this.targetCameraView.zoom);
      const altitudeDiff = Math.abs(interpolatedView.altitude - this.targetCameraView.altitude);

      if (latDiff < epsilon && lngDiff < epsilon && zoomDiff < epsilon && altitudeDiff < epsilon) {
        // Snap to target and stop animation
        this.renderer.updateGlobeCamera(this.targetCameraView);
        this.isAnimatingCamera = false;
        this.globeControls.enabled = true;
        this.renderer.mapControls.enabled = true;
      } else {
        // Directly update camera position and internal cameraView
        this.renderer.updateGlobeCamera(interpolatedView);
      }
    }
  }

  private abortCurrentSpin(): void {
    if (this.spinAbortController) {
      this.spinAbortController.abort();
      this.spinAbortController = null;
    }
  }

  private updateControlsEnabled(isEnabled: boolean): void {
    // Enable or disable the controls by setting the pointer events CSS property
    // If we disable the controls, the Three.js autoRoate does not work
    this.container.style.pointerEvents = isEnabled ? 'auto' : 'none';
  }

  private calculateShortestLongitudeDelta(from: number, to: number) {
    let delta = to - from;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    return delta;
  }
}
