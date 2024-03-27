import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {Pane} from 'tweakpane';

import type {LayerProps} from '../../src/loader/types/layer';
import {LayerDebugMode, LayerLoadingState} from '../../src/loader/types/layer';
import {RenderMode} from '../../src/renderer/types/renderer';

const DATASET_BASE_URL = 'https://storage.googleapis.com/esa-cfs-tiles/1.15.1';
const DATASET_INDEX_URL = `https://storage.googleapis.com/esa-cfs-storage/1.15.1/layers/layers-en.json`;
const DEFAULT_BASEMAP = 'land';

const BASEMAP_MAX_ZOOM = {
  atmosphere: 4,
  blue: 4,
  colored: 5,
  dark: 4,
  land: 4,
  ocean: 4
} as const;

const settings = {
  dataset: {
    datasetId: '',
    basemapId: '',
    timestamps: [],
    timeFormat: null as Intl.DateTimeFormat | null,
    timestep: 0
  },
  playback: {
    speed: 1.5,
    waitForFrames: true,
    allowDownsampling: true
  },
  basemap: {
    debug: false,
    debugMode: LayerDebugMode.OVERLAY
  },
  data: {
    debug: false,
    debugMode: LayerDebugMode.OVERLAY,
    limitZoom: false,
    minZoom: 1,
    maxZoom: 2
  },
  renderer: {
    renderMode: RenderMode.GLOBE,
    atmosphere: false,
    atmosphereColor: {r: 255, g: 255, b: 255, a: 1},
    shading: false
  }
};

const panel = new Pane();
const datasetsFolder = panel.addFolder({title: 'datasets', expanded: true});
const playbackFolder = panel.addFolder({title: 'Playback', expanded: true});
playbackFolder.addInput(settings.playback, 'speed', {min: 0.2, max: 3, label: 'speed (fps)'});
playbackFolder.addInput(settings.playback, 'waitForFrames');
playbackFolder.addInput(settings.playback, 'allowDownsampling');

const rendererFolder = panel.addFolder({title: 'Renderer', expanded: true});
rendererFolder.addInput(settings.renderer, 'renderMode', {
  options: {globe: RenderMode.GLOBE, map: RenderMode.MAP}
});
rendererFolder.addInput(settings.renderer, 'atmosphere');
rendererFolder.addInput(settings.renderer, 'atmosphereColor', {
  label: 'atm. color',
  color: {alpha: true}
});
rendererFolder.addInput(settings.renderer, 'shading');

const basemapFolder = panel.addFolder({title: 'Basemap', expanded: true});
basemapFolder.addInput(settings.basemap, 'debug');
basemapFolder.addInput(settings.basemap, 'debugMode', {
  options: {replace: LayerDebugMode.REPLACE, overlay: LayerDebugMode.OVERLAY}
});

const dataFolder = panel.addFolder({title: 'Data Overlay', expanded: true});
dataFolder.addInput(settings.data, 'debug');
dataFolder.addInput(settings.data, 'debugMode', {
  options: {replace: LayerDebugMode.REPLACE, overlay: LayerDebugMode.OVERLAY}
});

dataFolder.addInput(settings.data, 'limitZoom', {label: 'limit zoom'});
dataFolder.addInput(settings.data, 'minZoom', {min: 1, max: 7, step: 1});
dataFolder.addInput(settings.data, 'maxZoom', {min: 1, max: 7, step: 1});

// @ts-ignore
panel.containerElem_.style.zIndex = '999';

panel.on('change', () => {
  console.log('panel change', settings);
  updateProps();
});

let basemapProps: LayerProps = {
  id: 'basemap',
  type: 'tile',
  zIndex: 0,
  minZoom: 1,
  maxZoom: 4,
  debug: settings.basemap.debug,
  debugMode: settings.basemap.debugMode,
  urlParameters: {},
  getUrl: ({x, y, zoom}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.1/basemaps/colored/${zoom}/${x}/${y}.png`
};

let dataLayerProps: LayerProps<{timestep: number}> = {
  id: 'datalayer',
  type: 'tile',
  urlParameters: {timestep: 0},
  zIndex: 1,
  minZoom: 1,
  debug: settings.data.debug,
  debugMode: settings.data.debugMode,
  maxZoom: 4,
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.6.5/permafrost.pfr/tiles/${timestep}/${zoom}/${x}/${y}.png`
};

const datasets: Record<string, any> = {};

async function fetchDataset(datasetId: string) {
  if (!datasetId) return {basemap: 'colored'};
  if (datasets[datasetId]) return Promise.resolve(datasets[datasetId]);

  const url = `${DATASET_BASE_URL}/${datasetId}/metadata.json`;
  const dataset = await fetch(url).then(res => res.json());

  datasets[datasetId] = dataset;

  return dataset;
}

async function initDatasets() {
  const datasets = await fetch(DATASET_INDEX_URL).then(res => res.json());

  const options: Record<string, string> = {none: ''};

  for (let dataset of datasets) {
    datasets[dataset.id] = dataset;
    options[dataset.shortName] = dataset.id;
  }

  const datasetInput = datasetsFolder.addInput(settings.dataset, 'datasetId', {options});
  datasetInput.on('change', async ev => {
    const dataset = await fetchDataset(ev.value);
    console.log(dataset);

    let {
      basemap = DEFAULT_BASEMAP,
      timestamps = [],
      timeFormat = {},
      type = 'image',
      zoomLevels = 4
    } = dataset;

    if (String(zoomLevels).includes('-'))
      zoomLevels = Number(String(zoomLevels).split('-').at(-1)) + 1;

    basemapProps = {
      ...basemapProps,
      minZoom: 1,
      maxZoom: BASEMAP_MAX_ZOOM[basemap as never] || 4,
      getUrl: ({x, y, zoom}) => `${DATASET_BASE_URL}/basemaps/${basemap}/${zoom}/${x}/${y}.png`
    };

    dataLayerProps = {
      ...dataLayerProps,
      minZoom: 1,
      maxZoom: zoomLevels - 1,
      type: type === 'image' ? 'image' : 'tile',
      getUrl:
        type === 'tiles'
          ? ({x, y, zoom, timestep}) =>
              `${DATASET_BASE_URL}/${dataset.id}/tiles/${timestep}/${zoom}/${x}/${y}.png`
          : ({timestep}) => `${DATASET_BASE_URL}/${dataset.id}/tiles/${timestep}/full.png`
    };

    settings.dataset.timestep = 0;
    settings.dataset.timestamps = timestamps.map((t: string) => new Date(t));
    settings.dataset.timeFormat = timeFormat
      ? new Intl.DateTimeFormat(navigator.language, timeFormat)
      : null;

    updateProps();
  });
}

void initDatasets();

let layers = [basemapProps];

const globe = new WebGlGlobe(document.querySelector('#globe')!, {
  layers: layers,
  cameraView: {lat: 22, lng: 0, altitude: 22e6},
  renderMode: settings.renderer.renderMode
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
  const layers: LayerProps<any>[] = [
    {
      ...basemapProps,
      debug: settings.basemap.debug,
      debugMode: settings.basemap.debugMode
    }
  ];

  const timestep = settings.dataset.timestep;
  if (settings.dataset.datasetId) {
    layers.push({
      ...dataLayerProps,
      debug: settings.data.debug,
      debugMode: settings.data.debugMode,
      urlParameters: {timestep: timestep}
    } as LayerProps<{timestep: number}>);
  }

  if (settings.data.limitZoom) {
    layers[1].minZoom = settings.data.minZoom;
    layers[1].maxZoom = settings.data.maxZoom;
  }

  const {r, g, b} = settings.renderer.atmosphereColor;

  globe.setProps({
    allowDownsampling: settings.playback.allowDownsampling,
    renderMode: settings.renderer.renderMode,
    renderOptions: {
      atmosphereEnabled: settings.renderer.atmosphere,
      atmosphereStrength: settings.renderer.atmosphereColor.a,
      atmosphereColor: [r / 255, g / 255, b / 255],
      shadingEnabled: settings.renderer.shading
    },

    layers
  });

  timeslider.value = String(timestep);
  timeslider.max = String(settings.dataset.timestamps.length);
  valueDisplay.textContent = `${timestep}`;
  if (settings.dataset.timeFormat) {
    const ts = settings.dataset.timestamps[timestep];
    valueDisplay.textContent += ` (${settings.dataset.timeFormat.format(ts)})`;
  }
}

function updateTimestep(timestep: number) {
  settings.dataset.timestep = timestep;

  updateProps();
}

let isPlaying = false;
let playbackTimeout = 0;

async function loop() {
  const t0 = performance.now();
  const max = Number(timeslider.max);
  const curr = timeslider.valueAsNumber;

  const timestep = (curr + 1) % max;

  if (settings.playback.waitForFrames) {
    await awaitLoadingState(
      dataLayerProps.id,
      settings.playback.allowDownsampling ? LayerLoadingState.READY : LayerLoadingState.IDLE
    );

    await timeout(100);
  }

  updateTimestep(timestep);

  if (isPlaying) {
    const dt = performance.now() - t0;
    const timeout = Math.max(300, 1000 / settings.playback.speed - dt);

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
