import '../style.css';

import {Pane} from 'tweakpane';
import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerLoadingState} from '../../src/loader/types/layer';

import type {LayerProps} from '../../src/loader/types/layer';

const panelSettings = {
  playback: {
    speed: 1.5,
    waitForFrames: true,
    allowDownsampling: true
  },
  basemap: {
    debug: false
  },
  data: {
    debug: false,
    timestep: 0,
    limitZoom: false,
    minZoom: 1,
    maxZoom: 2
  }
};

const panel = new Pane();
const playbackFolder = panel.addFolder({title: 'Playback', expanded: true});
playbackFolder.addInput(panelSettings.playback, 'speed', {min: 0.2, max: 3, label: 'speed (fps)'});
playbackFolder.addInput(panelSettings.playback, 'waitForFrames');
playbackFolder.addInput(panelSettings.playback, 'allowDownsampling');

const basemapFolder = panel.addFolder({title: 'Basemap', expanded: true});
basemapFolder.addInput(panelSettings.basemap, 'debug');

const dataFolder = panel.addFolder({title: 'Data Overlay', expanded: true});
dataFolder.addInput(panelSettings.data, 'debug');
dataFolder.addInput(panelSettings.data, 'limitZoom', {label: 'limit zoom'});
dataFolder.addInput(panelSettings.data, 'minZoom', {min: 1, max: 7, step: 1});
dataFolder.addInput(panelSettings.data, 'maxZoom', {min: 1, max: 7, step: 1});

// @ts-ignore
panel.containerElem_.style.zIndex = '999';

panel.on('change', () => {
  updateProps();
});

let basemapProps = {
  id: 'basemap',
  zIndex: 0,
  minZoom: 1,
  maxZoom: 4,
  urlParameters: {},
  getUrl: ({x, y, zoom}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.1/basemaps/land/${zoom}/${x}/${y}.png`
} as LayerProps;

let dataLayerProps = {
  id: 'permafrost.pfr',
  urlParameters: {timestep: 0},
  zIndex: 1,
  minZoom: 1,
  maxZoom: 4,
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.6.5/permafrost.pfr/tiles/${timestep}/${zoom}/${x}/${y}.png`
} as LayerProps<{timestep: number}>;

let layers = [basemapProps, dataLayerProps];

const globe = new WebGlGlobe(document.body, {
  layers: layers,
  cameraView: {lat: 50, lng: 100, distance: 22e6}
});

const layerStates: Record<string, LayerLoadingState> = {};
globe.addEventListener('layerLoadingStateChanged', ev => {
  console.log('[%s] loadingStateChanged: %o', ev.detail.layer.id, ev.detail.state);

  layerStates[ev.detail.layer.id] = ev.detail.state;
});

function checkState(layerState: LayerLoadingState, minState: LayerLoadingState): boolean {
  if (minState === LayerLoadingState.READY)
    return layerState === LayerLoadingState.READY || layerState === LayerLoadingState.IDLE;
  if (minState === LayerLoadingState.IDLE) return layerState === LayerLoadingState.IDLE;

  return minState === LayerLoadingState.LOADING;
}

function awaitLoadingState(layerId: string, state: LayerLoadingState): Promise<void> {
  if (checkState(layerStates[layerId], state)) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    globe.addEventListener('layerLoadingStateChanged', function listener(ev) {
      if (ev.detail.layer.id === layerId && checkState(ev.detail.state, state)) {
        globe.removeEventListener('layerLoadingStateChanged', listener);
        resolve();
      }
    });
  });
}
function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const timeslider = document.querySelector('.timeslider input') as HTMLInputElement;
const valueDisplay = document.querySelector('.timeslider .value-display') as HTMLElement;
const prevBtn = document.querySelector('#timestep-prev') as HTMLElement;
const nextBtn = document.querySelector('#timestep-next') as HTMLElement;
const playBtn = document.querySelector('#play-pause') as HTMLElement;

function updateProps() {
  const layers = [
    {
      ...basemapProps,
      debug: panelSettings.basemap.debug
    },
    {
      ...dataLayerProps,
      debug: panelSettings.data.debug,
      urlParameters: {timestep: panelSettings.data.timestep}
    } as LayerProps<{timestep: number}>
  ];

  if (panelSettings.data.limitZoom) {
    layers[1].minZoom = panelSettings.data.minZoom;
    layers[1].maxZoom = panelSettings.data.maxZoom;
  }

  globe.setProps({
    allowDownsampling: panelSettings.playback.allowDownsampling,
    layers
  });
}

function updateTimestep(timestep: number) {
  timeslider.value = String(timestep);
  valueDisplay.textContent = String(timestep);

  panelSettings.data.timestep = timestep;

  updateProps();
}

let isPlaying = false;
let playbackTimeout = 0;

async function loop() {
  const t0 = performance.now();
  const max = Number(timeslider.max);
  const curr = timeslider.valueAsNumber;

  const timestep = (curr + 1) % max;

  if (panelSettings.playback.waitForFrames) {
    await awaitLoadingState(
      dataLayerProps.id,
      panelSettings.playback.allowDownsampling ? LayerLoadingState.READY : LayerLoadingState.IDLE
    );

    await timeout(100);
  }

  updateTimestep(timestep);

  if (isPlaying) {
    const dt = performance.now() - t0;
    const timeout = Math.max(300, 1000 / panelSettings.playback.speed - dt);

    playbackTimeout = setTimeout(loop, timeout);
  }
}

function play() {
  isPlaying = true;
  playBtn.textContent = 'Pause';
  void loop();
}

function pause() {
  isPlaying = false;
  playBtn.textContent = 'Play';
  clearTimeout(playbackTimeout);
  playbackTimeout = 0;
}

prevBtn.addEventListener('click', () => {
  updateTimestep(Math.max(0, timeslider.valueAsNumber - 1));
});

nextBtn.addEventListener('click', () => {
  updateTimestep(Math.min(Number(timeslider.max), timeslider.valueAsNumber + 1));
});

playBtn.addEventListener('click', () => {
  if (isPlaying) {
    pause();
  } else {
    play();
  }
});

timeslider.addEventListener('input', () => {
  updateTimestep(timeslider.valueAsNumber);
});

// @ts-ignore
const stats = globe.scheduler.stats;
// @ts-ignore
window.stats = stats;
// @ts-ignore
window.globe = globe;
