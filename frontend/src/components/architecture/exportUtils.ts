import { downloadArchitectureReportPdf } from '../../api/architecture';

/**
 * Exports an SVG DOM element to a .svg file download.
 */
export const exportSvg = (svgElement: SVGSVGElement, filename: string = 'architecture-diagram.svg'): void => {
  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export SVG:', err);
  }
};

/**
 * Renders an SVG DOM element to high-res PNG canvas and downloads it.
 */
export const exportPng = (
  svgElement: SVGSVGElement,
  filename: string = 'architecture-diagram.png',
  scale: number = 2
): void => {
  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const bbox = svgElement.getBoundingClientRect();
      const width = (bbox.width || 1200) * scale;
      const height = (bbox.height || 800) * scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }

      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          URL.revokeObjectURL(url);
          return;
        }
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error('Error loading SVG for PNG export');
    };
    img.src = url;
  } catch (err) {
    console.error('Failed to export PNG:', err);
  }
};

/**
 * Downloads the server-generated multi-page PDF Architecture Report.
 */
export const exportArchitectureReportPdf = async (
  repositoryId: string,
  analysisId: string,
  filenamePrefix: string = 'codemind-architecture-report'
): Promise<void> => {
  const blob = await downloadArchitectureReportPdf(repositoryId, analysisId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${repositoryId.substring(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
