import type {ITileSelectorImpl} from './tile-selector-impl';
import type {TileSelectorOptions} from './tile-selector';
import {RenderMode} from '../renderer/types/renderer';

export class TileSelectorWorkerProxy implements ITileSelectorImpl {
  private worker!: Worker;
  private workerUrl: string;

  constructor(workerUrl: string) {
    this.workerUrl = workerUrl;
  }

  async computeVisibleTiles(
    size: number[],
    projectionMatrix: number[],
    worldMatrix: number[],
    renderMode: RenderMode
  ): Promise<string[]> {
    const result = await this.callWorker('computeVisibleTiles', [
      size,
      projectionMatrix,
      worldMatrix,
      renderMode
    ]);

    return result as string[];
  }

  async setOptions(options: Partial<TileSelectorOptions>): Promise<void> {
    await this.callWorker('setOptions', [options]);
  }

  private async callWorker(type: string, args: any[], transfer?: Transferable[]): Promise<unknown> {
    const worker = await this.getWorker();
    const messageId = Math.random().toString(36).slice(2);

    worker.postMessage({type, messageId, args}, {transfer});

    return await new Promise(resolve => {
      const handleMessage = (ev: MessageEvent) => {
        if (ev.data.messageId !== messageId) {
          return;
        }

        resolve(ev.data.result);
        worker.removeEventListener('message', handleMessage);
      };

      worker.addEventListener('message', handleMessage);
    });
  }

  private async getWorker(): Promise<Worker> {
    if (!this.worker) {
      // fixme: maybe we can just remove this and simply don't pass in the URL for vite-builds?
      if (__IS_VITE_BUILD__) {
        this.worker = new Worker(new URL('./tile-selector-worker', import.meta.url), {
          type: 'module'
        });
      } else {
        this.worker = new Worker(this.workerUrl);
      }
    }

    return this.worker;
  }
}
