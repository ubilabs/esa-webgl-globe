# WebGL Globe

Examples: https://storage.googleapis.com/ubilabs-webgl-globe/examples/index.html

## Description

A 3D Globe library for rendering raster tiles in equirectangular projection 
for the ['Climate from space' app and website](https://cfs.climate.esa.int/).

**Features:**

- Interactive 3D globe with basic user interaction for panning and zooming
- Support for multiple layers (e.g. base map and dataset)
- Support for single image (typically 2048x1024px) and tiled (256px tilesize) 
  datasets
- Support for HTML Markers
- External camera-controls
- As the library and rendering is relatively efficient, it is possible to 
  render several globes side-by-side on the same page 
- Support for smooth blend over between different datasets and timesteps.
- Tile loading and data handling optimized for animated datasets.
- lightweight bundle: ~120kb gzipped

## Installation

> **IMPORTANT:** as this is a pre-release version, it has not yet been
> published to npm and usage as a module has not yet been tested.

## Usage

```typescript
import {WebGlGlobe} from '@ubilabs/esa-webgl-globe';

const globe = new WebGlGlobe(domElement, {
  layers: [{
    id: 'basemap',
    zIndex: 0,
    maxZoom: 4,
    getUrl: ({x, y, zoom}) =>
      `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/dark/${zoom}/${x}/${y}.png`
  }]
});
```

## Contributing

We are generally happy to accept contributions from outside collaborators. If 
you are interested in contributing to the project, please use the 
issue-tracker to open a feature-request and discuss your ideas with us before 
starting the implementation. This is to save us all from having to reject 
pull-requests for being out of scope or not being aligned with internal 
goals for this project. 

### Development

For development, you need to have a working git-client and nodejs available.
After cloning the repository, install the development dependencies using:

```sh
npm install
```

After that, you can start the vite development-server, which will serve the
examples in [`./examples`](./examples) via http://localhost:5173/.

```sh
npm start
```

### Publishing / Deployment

#### Examples

The example files are built and copied to a Google Cloud Storage Bucket
(requires properly configured installation of `gcloud` / `gsutil` and an account
with write access) using the `deploy:examples` npm-task.

```sh
npm run deploy:examples
```

### Release

TBD
