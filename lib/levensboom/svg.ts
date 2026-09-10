import { generateTree, GROUND_Y, MIN_SCENE_HEIGHT, MIN_SCENE_WIDTH, TRUNK_X, type TreeScene } from './generate';
import { buildPalette, type Season, type TimeOfDay } from './palette';
import { speciesParams } from './species';
// The ridge and the per-scene land live in backdrop.ts so study artwork can
// draw the same horizon without importing the tree renderer.
import { backdrop, f } from './backdrop';

/**
 * The tree as a static SVG string. Pure and clock-free, so it can run at build
 * time (the landing page is `force-static`) and in a server component, where
 * there is no canvas. Not a third renderer in spirit: it draws the same scene
 * graph the canvas draws, minus motion, animals and the fine backdrop details,
 * and the client swaps a `TreeCanvas` in once it is on screen.
 *
 * Leaves are sampled down to `maxLeaves` so a level-18 tree does not ship a
 * thousand ellipses in the HTML; the remaining ones are drawn a little larger
 * to keep the canopy full.
 */

export type TreeSvgOptions = {
  seed: string;
  level: number;
  frac?: number;
  health?: number;
  species?: string;
  scene?: string;
  framing?: 'scene' | 'portrait';
  width: number;
  height: number;
  season?: Season;
  timeOfDay?: TimeOfDay;
  maxLeaves?: number;
  /** Extra attributes on the root element, e.g. `aria-hidden="true"`. */
  rootAttributes?: string;
};

type Frame = { scale: number; originX: number; originY: number; pivotX: number; pivotY: number; groundTop: number };

function measure(width: number, height: number, scene: TreeScene, framing: 'scene' | 'portrait'): Frame {
  const { minX, maxX, minY } = scene.bounds;
  const contentW = Math.max(1, maxX - minX);
  const treeH = Math.max(1, GROUND_Y - minY);
  if (framing === 'portrait') {
    const padX = width * 0.1;
    const padY = height * 0.1;
    const scale = Math.min((width - 2 * padX) / contentW, (height - 2 * padY) / treeH);
    const originX = width / 2 - ((minX + maxX) / 2) * scale;
    const pivotY = height - padY * 1.15;
    const originY = pivotY - GROUND_Y * scale;
    return { scale, originX, originY, pivotX: originX + TRUNK_X * scale, pivotY, groundTop: pivotY };
  }
  const band = height * 0.12;
  const sceneW = Math.max(contentW, MIN_SCENE_WIDTH);
  const sceneH = Math.max(treeH, MIN_SCENE_HEIGHT);
  const scale = Math.min((width * 0.9) / sceneW, ((height - band) * 0.84) / sceneH);
  const groundTop = height - band;
  const pivotY = groundTop + 0.6 * scale;
  const originX = width / 2 - ((minX + maxX) / 2) * scale;
  const originY = pivotY - GROUND_Y * scale;
  return { scale, originX, originY, pivotX: originX + TRUNK_X * scale, pivotY, groundTop };
}

function normal(dx: number, dy: number): [number, number] {
  const length = Math.hypot(dx, dy) || 1;
  return [-dy / length, dx / length];
}

function branchPath(scene: TreeScene, frame: Frame): string {
  const { scale, originX, originY } = frame;
  let d = '';
  for (const b of scene.branches) {
    const x0 = originX + b.x0 * scale;
    const y0 = originY + b.y0 * scale;
    const cx = originX + b.cx * scale;
    const cy = originY + b.cy * scale;
    const x1 = originX + b.x1 * scale;
    const y1 = originY + b.y1 * scale;
    const w0 = Math.max(0.6, (b.w0 * scale) / 2);
    const w1 = Math.max(0.4, (b.w1 * scale) / 2);
    const [n0x, n0y] = normal(cx - x0, cy - y0);
    const [n1x, n1y] = normal(x1 - cx, y1 - cy);
    const nmx = ((n0x + n1x) / 2) * ((w0 + w1) / 2);
    const nmy = ((n0y + n1y) / 2) * ((w0 + w1) / 2);
    d +=
      `M${f(x0 + n0x * w0)} ${f(y0 + n0y * w0)}` +
      `Q${f(cx + nmx)} ${f(cy + nmy)} ${f(x1 + n1x * w1)} ${f(y1 + n1y * w1)}` +
      `L${f(x1 - n1x * w1)} ${f(y1 - n1y * w1)}` +
      `Q${f(cx - nmx)} ${f(cy - nmy)} ${f(x0 - n0x * w0)} ${f(y0 - n0y * w0)}Z`;
  }
  return d;
}

export function renderTreeSvg(options: TreeSvgOptions): string {
  const { width, height } = options;
  const framing = options.framing ?? 'scene';
  const scene = generateTree({
    seed: options.seed,
    level: options.level,
    frac: options.frac ?? 0.5,
    health: options.health ?? 1,
    species: options.species,
  });
  const palette = buildPalette(options.season ?? 'summer', options.timeOfDay ?? 'day', options.health ?? 1, {
    scene: options.scene,
    species: options.species,
  });
  const frame = measure(width, height, scene, framing);
  const { scale, originX, originY, pivotX, pivotY, groundTop } = frame;
  const sp = speciesParams(options.species);
  const id = `lb${Math.abs(hash(`${options.seed}${options.level}${framing}${width}`)).toString(36)}`;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" ${options.rootAttributes ?? 'role="img"'}>`,
  );
  parts.push(
    `<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.skyTop}"/><stop offset="1" stop-color="${palette.skyBottom}"/></linearGradient>` +
      `<radialGradient id="${id}d" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="${palette.skyBottom}"/><stop offset="1" stop-color="${palette.skyTop}"/></radialGradient>` +
      `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.ground}"/><stop offset="1" stop-color="${palette.groundDeep}"/></linearGradient></defs>`,
  );

  if (framing === 'portrait') {
    parts.push(`<rect width="${width}" height="${height}" fill="url(#${id}d)"/>`);
    const rx = Math.max(6, ((scene.bounds.maxX - scene.bounds.minX) / 2) * scale * 0.55);
    parts.push(`<ellipse cx="${f(pivotX)}" cy="${f(pivotY)}" rx="${f(rx)}" ry="${f(Math.max(1.5, 1.6 * scale))}" fill="${palette.ground}" opacity="0.9"/>`);
    parts.push(`<ellipse cx="${f(pivotX)}" cy="${f(pivotY + 0.4 * scale)}" rx="${f(rx * 0.7)}" ry="${f(Math.max(1, 1.1 * scale))}" fill="${palette.bark}" opacity="0.25"/>`);
  } else {
    parts.push(`<rect width="${width}" height="${height}" fill="url(#${id}s)"/>`);
    parts.push(backdrop(palette, width, height, groundTop));
    parts.push(`<rect x="0" y="${f(groundTop)}" width="${width}" height="${f(height - groundTop)}" fill="url(#${id}g)"/>`);
    parts.push(`<ellipse cx="${f(pivotX)}" cy="${f(groundTop + 0.2 * scale)}" rx="${f(Math.max(8, 14 * scale))}" ry="${f(Math.max(2, 2.2 * scale))}" fill="${palette.ground}"/>`);
    parts.push(`<ellipse cx="${f(pivotX)}" cy="${f(pivotY + 0.6 * scale)}" rx="${f(Math.max(6, 11 * scale))}" ry="${f(Math.max(1.2, 1.6 * scale))}" fill="${palette.bark}" opacity="0.2"/>`);
  }

  parts.push(`<path d="${branchPath(scene, frame)}" fill="${palette.bark}"/>`);

  // Leaves: sampled, larger. A frond keeps its blade shape as a long ellipse.
  const visible = scene.leaves.filter((leaf) => leaf.visible);
  const maxLeaves = options.maxLeaves ?? 320;
  const stride = Math.max(1, Math.ceil(visible.length / maxLeaves));
  const boost = Math.min(1.6, Math.sqrt(stride));
  const leafScale = (1.1 + 0.8 * scene.growth) * scale * boost;
  let leaves = '';
  let alt = '';
  for (let i = 0; i < visible.length; i += stride) {
    const leaf = visible[i];
    const x = originX + leaf.x * scale;
    const y = originY + leaf.y * scale;
    const size = leaf.size * leafScale * (leaf.open ? 1 : 0.5);
    let rx = size;
    let ry = size * 0.55;
    let ox = size * 0.6;
    switch (sp.leafShape) {
      case 'narrow':
        rx = size * 1.3;
        ry = size * 0.32;
        ox = size * 0.7;
        break;
      case 'large':
        rx = size * 1.05;
        ry = size * 0.85;
        ox = size * 0.65;
        break;
      case 'almond':
        rx = size * 1.15;
        ry = size * 0.42;
        ox = size * 0.65;
        break;
      case 'needle':
        rx = size * 0.9;
        ry = size * 0.25;
        ox = size * 0.5;
        break;
      case 'frond':
        rx = size * 1.6;
        ry = size * 0.22;
        ox = size * 1.6;
        break;
      default:
        break;
    }
    const el = `<ellipse cx="${f(x + Math.cos((leaf.angle * Math.PI) / 180) * ox)}" cy="${f(y + Math.sin((leaf.angle * Math.PI) / 180) * ox)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(leaf.angle)} ${f(x + Math.cos((leaf.angle * Math.PI) / 180) * ox)} ${f(y + Math.sin((leaf.angle * Math.PI) / 180) * ox)})"${leaf.open ? '' : ' opacity="0.75"'}/>`;
    if (leaf.phase > 0.5) alt += el;
    else leaves += el;
  }
  parts.push(`<g fill="${palette.leaf}">${leaves}</g><g fill="${palette.leafAlt}">${alt}</g>`);

  if (palette.blossom && scene.blossoms.length > 0) {
    let blossoms = '';
    for (const b of scene.blossoms) {
      blossoms += `<circle cx="${f(originX + b.x * scale)}" cy="${f(originY + b.y * scale)}" r="${f(b.size * leafScale * 0.8)}"/>`;
    }
    parts.push(`<g fill="${palette.blossom}">${blossoms}</g>`);
  }

  if (scene.fruits.length > 0) {
    let fruits = '';
    for (const fruit of scene.fruits) {
      const size = Math.max(1.4, fruit.size * leafScale * 1.15);
      fruits += `<circle cx="${f(originX + fruit.x * scale)}" cy="${f(originY + fruit.y * scale)}" r="${f(size * 0.8)}"/>`;
    }
    parts.push(`<g fill="${palette.fruit}">${fruits}</g>`);
  }

  parts.push('</svg>');
  return parts.join('');
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return h;
}
