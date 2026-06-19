export function captureElementCanvasesAsDataUrl(element, options = {}) {
  if (!element) {
    throw new Error('Chart element is required');
  }

  const canvases = Array.from(element.querySelectorAll('canvas'));
  if (!canvases.length) {
    throw new Error('No chart canvases found inside element');
  }

  const rect = element.getBoundingClientRect();
  const pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;
  const background = options.background || '#ffffff';
  const mimeType = options.mimeType || 'image/png';
  const quality = options.quality;

  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(rect.width * pixelRatio));
  output.height = Math.max(1, Math.round(rect.height * pixelRatio));

  const context = output.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, output.width, output.height);

  canvases.forEach((canvas) => {
    const canvasRect = canvas.getBoundingClientRect();
    const x = Math.round((canvasRect.left - rect.left) * pixelRatio);
    const y = Math.round((canvasRect.top - rect.top) * pixelRatio);
    const width = Math.round(canvasRect.width * pixelRatio);
    const height = Math.round(canvasRect.height * pixelRatio);

    context.drawImage(canvas, x, y, width, height);
  });

  return output.toDataURL(mimeType, quality);
}

const drawImage = (context, image, x, y, width, height) => new Promise((resolve, reject) => {
  image.onload = () => {
    context.drawImage(image, x, y, width, height);
    resolve();
  };
  image.onerror = reject;
});

const svgToImage = (svg) => {
  const clonedSvg = svg.cloneNode(true);
  const rect = svg.getBoundingClientRect();
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('width', String(Math.max(1, Math.round(rect.width))));
  clonedSvg.setAttribute('height', String(Math.max(1, Math.round(rect.height))));
  clonedSvg.setAttribute('viewBox', `0 0 ${Math.max(1, Math.round(rect.width))} ${Math.max(1, Math.round(rect.height))}`);

  const svgString = new XMLSerializer().serializeToString(clonedSvg);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  return image;
};

export async function captureElementVisualAsDataUrl(element, options = {}) {
  if (!element) {
    throw new Error('Chart element is required');
  }

  const drawableElements = Array.from(element.querySelectorAll('canvas, svg'));
  if (!drawableElements.length) {
    throw new Error('No drawable chart elements found inside element');
  }

  const rect = element.getBoundingClientRect();
  const pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;
  const background = options.background || '#ffffff';
  const mimeType = options.mimeType || 'image/png';
  const quality = options.quality;

  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(rect.width * pixelRatio));
  output.height = Math.max(1, Math.round(rect.height * pixelRatio));

  const context = output.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, output.width, output.height);

  for (const drawable of drawableElements) {
    const drawableRect = drawable.getBoundingClientRect();
    const x = Math.round((drawableRect.left - rect.left) * pixelRatio);
    const y = Math.round((drawableRect.top - rect.top) * pixelRatio);
    const width = Math.round(drawableRect.width * pixelRatio);
    const height = Math.round(drawableRect.height * pixelRatio);

    if (drawable.tagName.toLowerCase() === 'canvas') {
      context.drawImage(drawable, x, y, width, height);
    } else {
      const image = svgToImage(drawable);
      await drawImage(context, image, x, y, width, height);
    }
  }

  return output.toDataURL(mimeType, quality);
}

export function dataUrlToBase64(dataUrl) {
  return dataUrl.replace(/^data:[^;]+;base64,/, '');
}
