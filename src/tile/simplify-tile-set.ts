import {TileId} from './tileId';

function filterHierarchicalDuplicates(tileIds: string[]) {
  const tiles = tileIds.map(id => TileId.fromId(id));
  const tileset = new Set(tiles);

  // sort by zoom-level
  tiles.sort((a, b) => a.zoom - b.zoom);

  console.log(tiles);

  for (let i = 0; i < tiles.length; i++) {
    // when all children are contained in the tileset, we can skip the tile itself.
    if (tiles[i].children.every(ct => tileset.has(ct))) {
      tileset.delete(tiles[i]);
    }
  }
  console.log([...tileset].map(t => t.id));
}



filterHierarchicalDuplicates([
  '0/0/0',
  '0/1/0',
  '1/0/0',
  '1/1/0',
  '1/2/0',
  '1/3/0',
  '1/0/1',
  '1/1/1',
  '1/3/1'
]);

