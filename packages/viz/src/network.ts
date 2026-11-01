import { escapeXml } from './escape';
import { palette } from './palette';
import { clampNumber, compareText, emptyFrame, finiteNumber, num, svgFrame, truncateText } from './svg';

export interface NetworkNode {
  id: string;
  label?: string;
  weight?: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  weight?: number;
}

export interface NetworkOptions {
  width?: number;
  height?: number;
  title?: string;
  desc?: string;
  maxLabels?: number;
  iterations?: number;
}

interface CleanNode {
  id: string;
  label: string;
  weight: number;
}

interface CleanLink {
  source: string;
  target: string;
  weight: number;
}

interface PositionedNode extends CleanNode {
  x: number;
  y: number;
  radius: number;
}

interface PositionedLink {
  source: PositionedNode;
  target: PositionedNode;
  weight: number;
  width: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 380;
const GOLDEN_ANGLE = 2.399963229728653;

function nodeRadius(weight: number, maxWeight: number): number {
  if (maxWeight <= 0) return 7;
  return Math.round(clampNumber(6 + 14 * Math.sqrt(weight / maxWeight), 6, 20) * 100) / 100;
}

function concentricLayout(
  nodes: CleanNode[],
  width: number,
  height: number,
): PositionedNode[] {
  const maxWeight = Math.max(0, ...nodes.map((node) => node.weight));
  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.max(40, Math.min(width, height) / 2 - 54);
  const ordered = [...nodes].sort((a, b) => b.weight - a.weight || compareText(a.id, b.id));

  return ordered.map((node, index) => {
    const angle = index * GOLDEN_ANGLE;
    const ring = outer * Math.sqrt((index + 1) / Math.max(1, ordered.length));
    return {
      ...node,
      x: cx + ring * Math.cos(angle),
      y: cy + ring * Math.sin(angle),
      radius: nodeRadius(node.weight, maxWeight),
    };
  });
}

function forceLayout(
  nodes: CleanNode[],
  links: CleanLink[],
  width: number,
  height: number,
  iterations: number,
): PositionedNode[] {
  const placed = concentricLayout(nodes, width, height);
  if (placed.length <= 1 || links.length === 0) return placed;

  const indexById = new Map(placed.map((node, index) => [node.id, index]));
  const edges = links
    .map((link) => {
      const source = indexById.get(link.source);
      const target = indexById.get(link.target);
      return source === undefined || target === undefined ? null : { source, target, weight: link.weight };
    })
    .filter((edge): edge is { source: number; target: number; weight: number } => edge !== null);

  if (edges.length === 0) return placed;

  const maxLinkWeight = Math.max(0, ...edges.map((edge) => edge.weight));
  const cx = width / 2;
  const cy = height / 2;
  const positions = placed.map((node) => ({ x: node.x, y: node.y }));
  const forces = placed.map(() => ({ x: 0, y: 0 }));

  for (let step = 0; step < iterations; step += 1) {
    const cooling = 1 - step / Math.max(1, iterations);
    for (const force of forces) {
      force.x = 0;
      force.y = 0;
    }

    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        let dx = positions[i].x - positions[j].x;
        let dy = positions[i].y - positions[j].y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.001) {
          dx = ((i + 1) % 7) - 3 || 1;
          dy = ((j + 1) % 5) - 2 || 1;
          distance = Math.hypot(dx, dy);
        }
        const strength = (16000 / (distance * distance)) * cooling;
        forces[i].x += (dx / distance) * strength;
        forces[i].y += (dy / distance) * strength;
        forces[j].x -= (dx / distance) * strength;
        forces[j].y -= (dy / distance) * strength;
      }
    }

    for (const edge of edges) {
      const dx = positions[edge.target].x - positions[edge.source].x;
      const dy = positions[edge.target].y - positions[edge.source].y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const rest = 108 + 54 * (1 - edge.weight / Math.max(1, maxLinkWeight));
      const strength = ((distance - rest) * 0.014 * cooling) / distance;
      const fx = dx * strength;
      const fy = dy * strength;
      forces[edge.source].x += fx;
      forces[edge.source].y += fy;
      forces[edge.target].x -= fx;
      forces[edge.target].y -= fy;
    }

    for (let i = 0; i < positions.length; i += 1) {
      forces[i].x += (cx - positions[i].x) * 0.002 * cooling;
      forces[i].y += (cy - positions[i].y) * 0.002 * cooling;
      positions[i].x = clampNumber(positions[i].x + forces[i].x, 32, width - 32);
      positions[i].y = clampNumber(positions[i].y + forces[i].y, 32, height - 32);
    }
  }

  return placed.map((node, index) => ({ ...node, x: positions[index].x, y: positions[index].y }));
}

function settle(
  placed: PositionedNode[],
  width: number,
  height: number,
  padding: number,
): PositionedNode[] {
  if (placed.length === 0) return placed;

  const xs = placed.map((node) => node.x);
  const ys = placed.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const targetW = Math.max(1, width - padding * 2);
  const targetH = Math.max(1, height - padding * 2);
  const scale = Math.min(spanX > 0 ? targetW / spanX : 1, spanY > 0 ? targetH / spanY : 1, 2.2);
  const offsetX = padding + (targetW - spanX * scale) / 2;
  const offsetY = padding + (targetH - spanY * scale) / 2;

  const fitted = placed.map((node) => ({
    ...node,
    x: offsetX + (node.x - minX) * scale,
    y: offsetY + (node.y - minY) * scale,
  }));

  for (let pass = 0; pass < 24; pass += 1) {
    let moved = false;
    for (let i = 0; i < fitted.length; i += 1) {
      for (let j = i + 1; j < fitted.length; j += 1) {
        const dx = fitted[j].x - fitted[i].x;
        const dy = fitted[j].y - fitted[i].y;
        const distance = Math.hypot(dx, dy);
        const minimum = fitted[i].radius + fitted[j].radius + 16;
        if (distance >= minimum) continue;
        const nx = distance < 0.001 ? 1 : dx / distance;
        const ny = distance < 0.001 ? 0 : dy / distance;
        const push = (minimum - distance) / 2 + 0.5;
        fitted[i].x = clampNumber(fitted[i].x - nx * push, padding, width - padding);
        fitted[i].y = clampNumber(fitted[i].y - ny * push, padding, height - padding);
        fitted[j].x = clampNumber(fitted[j].x + nx * push, padding, width - padding);
        fitted[j].y = clampNumber(fitted[j].y + ny * push, padding, height - padding);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return fitted;
}

export function networkSvg(
  nodes: readonly NetworkNode[],
  links: readonly NetworkLink[],
  opts: NetworkOptions = {},
): string {
  const width = Math.max(240, finiteNumber(opts.width, DEFAULT_WIDTH));
  const height = Math.max(200, finiteNumber(opts.height, DEFAULT_HEIGHT));
  const title = opts.title ?? '关系网络图';
  const maxLabels = Math.max(1, Math.round(finiteNumber(opts.maxLabels, 12)));
  const iterations = Math.max(0, Math.min(400, Math.round(finiteNumber(opts.iterations, 160))));

  const seen = new Set<string>();
  const cleanNodes: CleanNode[] = [];
  for (const node of nodes ?? []) {
    const id = String(node?.id ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    cleanNodes.push({
      id,
      label: String(node?.label ?? id),
      weight: Math.max(0, finiteNumber(node?.weight, 0)),
    });
  }

  if (cleanNodes.length === 0) {
    return emptyFrame(width, height, '暂无关系数据', title);
  }

  const cleanLinks: CleanLink[] = (links ?? [])
    .map((link) => ({
      source: String(link?.source ?? ''),
      target: String(link?.target ?? ''),
      weight: Math.max(0, finiteNumber(link?.weight, 0)),
    }))
    .filter((link) => link.source !== link.target && seen.has(link.source) && seen.has(link.target));

  const dense = cleanNodes.length > 30;
  const placed = settle(
    dense
      ? concentricLayout(cleanNodes, width, height)
      : forceLayout(cleanNodes, cleanLinks, width, height, iterations),
    width,
    height,
    36,
  );

  const byId = new Map(placed.map((node) => [node.id, node]));
  const maxLinkWeight = Math.max(0, ...cleanLinks.map((link) => link.weight));
  const positionedLinks: PositionedLink[] = cleanLinks
    .map((link) => {
      const source = byId.get(link.source);
      const target = byId.get(link.target);
      if (!source || !target) return null;
      return {
        source,
        target,
        weight: link.weight,
        width: Math.round(clampNumber(maxLinkWeight <= 0 ? 1 : 1 + 4 * Math.sqrt(link.weight / maxLinkWeight), 1, 5) * 100) / 100,
      };
    })
    .filter((link): link is PositionedLink => link !== null);

  const ranked = [...placed].sort((a, b) => b.weight - a.weight || compareText(a.id, b.id));
  const visibleLabels = new Set(
    (dense ? ranked.slice(0, maxLabels) : ranked).map((node) => node.id),
  );

  const edges = positionedLinks
    .map(
      (link) =>
        `<line class="viz-network-edge" x1="${num(link.source.x)}" y1="${num(link.source.y)}" x2="${num(link.target.x)}" y2="${num(link.target.y)}" stroke="${palette.tealLight}" stroke-opacity="0.4" stroke-width="${num(link.width)}" stroke-linecap="round"/>`,
    )
    .join('\n');

  const nodeMarkup = placed
    .map((node) => {
      const label = visibleLabels.has(node.id)
        ? `<text class="viz-network-label" x="${num(node.x)}" y="${num(node.y + node.radius + 13)}" text-anchor="middle" fill="${palette.ink}" font-size="11">${escapeXml(truncateText(node.label, 8))}</text>`
        : '';
      return [
        `<a class="viz-network-node" href="#person-${escapeXml(encodeURIComponent(node.id))}" data-person-id="${escapeXml(node.id)}" aria-label="${escapeXml(`${node.label}，往来 ${Math.round(node.weight)} 次`)}">`,
        `<circle cx="${num(node.x)}" cy="${num(node.y)}" r="${num(node.radius)}" fill="${palette.paper}" stroke="none"/>`,
        `<circle cx="${num(node.x)}" cy="${num(node.y)}" r="${num(node.radius)}" fill="${palette.teal}" fill-opacity="0.18" stroke="${palette.teal}" stroke-width="1.4"/>`,
        label,
        '</a>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const densityNote = dense
    ? `<text class="viz-network-density" x="${num(width - 14)}" y="${num(height - 12)}" text-anchor="end" fill="${palette.inkSoft}" font-size="10">${placed.length} 人 · 仅标注前 ${maxLabels} 位</text>`
    : '';

  const top = ranked
    .slice(0, 5)
    .map((node) => `${node.label} ${Math.round(node.weight)} 次`)
    .join('、');
  const summary = `${placed.length} 个节点、${positionedLinks.length} 条来往${top ? `；${top}` : ''}`;

  const body = ['<g class="viz-network">', edges, nodeMarkup, densityNote, '</g>'].filter(Boolean).join('\n');

  return svgFrame(
    {
      width,
      height,
      title,
      desc: opts.desc ?? summary,
      ariaLabel: `${title}：${summary}`,
    },
    body,
  );
}
