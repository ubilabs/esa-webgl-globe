import {BufferAttribute, BufferGeometry} from 'three';

/* Creates geometries like this:
 *                     _________
              / \      \___|___/
             /_|_\      \__|__/
            /__|__\      \_|_/
           /___|___\      \ /
             north      south
*/

export function getPoleGeometry(segments: number = 1, north: boolean = true) {
  const l = 1;

  const quads = Array.from({length: segments * segments})
    .map(() =>
      // prettier-ignore
      [
        0,1,0,   0,0,0,   1,1,0,
        0,0,0,   1,0,0,   1,1,0
      ]
    )
    .map((quad, i) => {
      const row = Math.floor(i / segments);
      const column = i % segments;
      for (let j = 0; j < quad.length; j += 3) {
        quad[j] += column;
        quad[j + 1] += row;
      }
      return quad;
    })
    .map(quad => quad.map(p => (p * l) / segments)) // correct scale
    // squeeze x
    .map(quad => {
      for (let j = 0; j < quad.length; j += 3) {
        const y = quad[j + 1];

        // set x
        if (north && y === 1) {
          quad[j] = 0.5;
        }

        if (!north && y === 0) {
          quad[j] = 0.5;
        }
      }

      return quad;
    })
    .map(quad => quad.map(p => p * 2 - 1)) // map to -1...1
    // set z to 0
    .map(quad => {
      for (let j = 0; j < quad.length; j += 3) {
        quad[j + 2] = 0;
      }
      return quad;
    });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(quads.flat()), 3));
  return geometry;
}
