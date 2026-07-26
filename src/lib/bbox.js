export function unionBbox(bboxes) {
  const x0 = Math.min(...bboxes.map((b) => b.x0))
  const y0 = Math.min(...bboxes.map((b) => b.y0))
  const x1 = Math.max(...bboxes.map((b) => b.x1))
  const y1 = Math.max(...bboxes.map((b) => b.y1))
  return { x0, y0, x1, y1 }
}
