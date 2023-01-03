import type {ITileSelectorImpl} from './tile-selector-impl';
import type {Tile, TileSelectorOptions} from './tile-selector';

export class TileSelectorWorkerProxy implements ITileSelectorImpl {
  private worker!: Worker;

  async computeVisibleTiles(
    size: number[],
    projectionMatrix: number[],
    worldMatrix: number[]
  ): Promise<Tile[]> {
    const result = await this.callWorker('computeVisibleTiles', [
      size,
      projectionMatrix,
      worldMatrix
    ]);

    return result as Tile[];
  }

  async setOptions(options: Partial<TileSelectorOptions>): Promise<void> {
    await this.callWorker('setOptions', [options]);
  }

  private async callWorker(type: string, args: any[], transfer?: Transferable[]): Promise<unknown> {
    const worker = await this.getWorker();
    const messageId = Math.random().toString(36).slice(2);

    // @ts-ignore
    worker.postMessage({type, messageId, args}, transfer);

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
      const CustomWorker = (await import('./tile-selector-worker?worker')).default;
      this.worker = new CustomWorker();
    }

    return this.worker;
  }
}
