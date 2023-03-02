import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerDebugMode} from '../../src/loader/types/layer';
import type {LayerProps} from '../../src/loader/types/layer';
import {Pane} from 'tweakpane';

const panelSettings = {
  playback: {
    speed: 1.5
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
playbackFolder.addInput(panelSettings.playback, 'speed', {min: 0, max: 3});

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
  // debug: true,
  debugMode: LayerDebugMode.OVERLAY,
  zIndex: 0,
  minZoom: 1,
  maxZoom: 4,
  urlParameters: {},
  getUrl: ({x, y, zoom}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.1/basemaps/land/${zoom}/${x}/${y}.png`
} as LayerProps;

let permafrostProps = {
  id: 'permafrost.pfr',
  // debug: true,
  debugMode: LayerDebugMode.OVERLAY,
  urlParameters: {timestep: 0},
  zIndex: 1,
  minZoom: 1,
  maxZoom: 4,
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.6.5/permafrost.pfr/tiles/${timestep}/${zoom}/${x}/${y}.png`
} as LayerProps<{timestep: number}>;

let layers = [basemapProps, permafrostProps];

const globe = new WebGlGlobe(document.body, {layers: layers});

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
      ...permafrostProps,
      debug: panelSettings.data.debug,
      urlParameters: {timestep: panelSettings.data.timestep}
    } as LayerProps<{timestep: number}>
  ];

  if (panelSettings.data.limitZoom) {
    layers[1].minZoom = panelSettings.data.minZoom;
    layers[1].maxZoom = panelSettings.data.maxZoom;
  }

  globe.setProps({layers});
}

function updateTimestep(timestep: number) {
  timeslider.value = String(timestep);
  valueDisplay.textContent = String(timestep);

  panelSettings.data.timestep = timestep;

  updateProps();
}

prevBtn.addEventListener('click', () => {
  updateTimestep(Math.max(0, timeslider.valueAsNumber - 1));
});

nextBtn.addEventListener('click', () => {
  updateTimestep(Math.min(Number(timeslider.max), timeslider.valueAsNumber + 1));
});

let isPlaying = false;
let playbackTimeout = 0;

function loop() {
  const max = Number(timeslider.max);
  const curr = timeslider.valueAsNumber;

  const timestep = (curr + 1) % max;
  updateTimestep(timestep);
  playbackTimeout = setTimeout(loop, 1000 / panelSettings.playback.speed);
}

function play() {
  isPlaying = true;
  playBtn.textContent = 'Pause';
  loop();
}

function pause() {
  isPlaying = false;
  playBtn.textContent = 'Play';
  clearTimeout(playbackTimeout);
  playbackTimeout = 0;
}

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
