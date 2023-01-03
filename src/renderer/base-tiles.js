const baseUrl = 'https://storage.googleapis.com/esa-cfs-tiles/1.4.1/basemaps';

export function getBaseTiles(basemap) {
  return Array.from({length: 8}).map((_, i) => {
    const columns = Math.pow(2, 1 + 1);
    const rows = Math.pow(2, 1);
    const row = Math.floor(i / columns);
    const column = i % columns;

    return {
      zoom: 1,
      index: i,
      url: baseUrl + '/' + basemap,
      row,
      column
    };
  });
}
