import {TileSelectorImpl} from './tile-selector-impl';
import type {ITileSelectorImpl} from './tile-selector-impl';

console.log('worker started.');

const impl = new TileSelectorImpl();

self.addEventListener('message', async ev => {
  const {type, messageId, args} = ev.data;
  const method = impl[type as keyof ITileSelectorImpl] as Function;
  const result = await method.apply(impl, args);

  self.postMessage({messageId, result});
});
