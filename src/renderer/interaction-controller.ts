// @ts-ignore
import {OrbitControls} from './vendor/orbit-controls.js';

export class InteractionController {
  private globeControls: OrbitControls;
  private container: HTMLElement;
  private controlsInteractionEnabled = false;
  private spinAbortController: AbortController | null = null;

  constructor(globeControls: OrbitControls, container: HTMLElement) {
    this.globeControls = globeControls;
    this.container = container;

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

    if (enabled) {
      this.setAutoSpin(false);
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
}
