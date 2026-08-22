export function clampCardPosition(
  position: { readonly x: number; readonly y: number },
  viewport: { readonly width: number; readonly height: number },
  card: { readonly width: number; readonly height: number },
) {
  const inset = 8;
  return {
    x: Math.max(
      inset,
      Math.min(Math.max(inset, viewport.width - card.width - inset), position.x),
    ),
    y: Math.max(
      inset,
      Math.min(Math.max(inset, viewport.height - card.height - inset), position.y),
    ),
  };
}
