import { jsPDF } from 'jspdf';
import { findLineaCatalogEntry, formatLineaCatalogEntryLines } from './lineaCatalog';
import { Linea, parseGeometry } from './supabase';
import { GeoJSONGeometry } from '../types/geo';

export type FaultForReport = {
  id: string;
  ocurrencia_ts: string;
  km: number;
  tipo: string;
  descripcion: string | null;
  estado: string;
  geom: string | GeoJSONGeometry | null;
  estructuraReferencia?: string;
  estructuraDetalle?: string;
};

export type LineForReport = Pick<Linea, 'numero' | 'nombre'> | null;

type JsPDFWithLink = jsPDF & {
  textWithLink?: (text: string, x: number, y: number, options: { url: string }) => void;
};

type Rgb = readonly [number, number, number];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidLatLon(lat: unknown, lon: unknown): lat is number {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function formatDateLong(value: Date) {
  return value.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(value: Date) {
  return `${formatDateLong(value)} - ${formatTime(value)}`;
}

function getEstadoLabel(estado: string) {
  return (
    {
      ABIERTA: 'Abierta',
      EN_ATENCION: 'En atención',
      CERRADA: 'Cerrada',
    } as const
  )[estado as 'ABIERTA' | 'EN_ATENCION' | 'CERRADA'] ?? estado;
}

function getEstadoPalette(estado: string): { fill: Rgb; text: Rgb; border: Rgb } {
  switch (estado) {
    case 'ABIERTA':
      return {
        fill: [254, 242, 242],
        text: [185, 28, 28],
        border: [252, 165, 165],
      };
    case 'CERRADA':
      return {
        fill: [240, 253, 244],
        text: [21, 128, 61],
        border: [134, 239, 172],
      };
    case 'EN_ATENCION':
    default:
      return {
        fill: [255, 247, 237],
        text: [180, 83, 9],
        border: [253, 186, 116],
      };
  }
}

export function generateFaultPDF(falla: FaultForReport, linea: LineForReport) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as JsPDFWithLink;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentW = pageW - margin * 2;
  const bottomSafe = 72;
  let y = 96;

  const C = {
    text: [15, 23, 42] as Rgb,
    subtext: [51, 65, 85] as Rgb,
    muted: [100, 116, 139] as Rgb,
    line: [226, 232, 240] as Rgb,
    panel: [255, 255, 255] as Rgb,
    panelSoft: [246, 250, 248] as Rgb,
    brand: [21, 122, 90] as Rgb,
    brandSoft: [232, 244, 239] as Rgb,
    brandText: [11, 61, 46] as Rgb,
    white: [255, 255, 255] as Rgb,
  };

  const setText = (rgb: Rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: Rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: Rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  const folio = falla.id.slice(0, 8).toUpperCase();
  const estadoText = getEstadoLabel(falla.estado);
  const estadoPalette = getEstadoPalette(falla.estado);
  const lineaText = `${linea?.numero || 'N/A'}${linea?.nombre ? ` - ${linea.nombre}` : ''}`;
  const kmText = Number.isFinite(falla.km) ? `${falla.km.toFixed(1)} km` : 'N/A';
  const ocurrencia = new Date(falla.ocurrencia_ts);
  const generado = new Date();

  const geom = parseGeometry(falla.geom ?? null);
  const coords = geom?.type === 'Point' ? geom.coordinates : null;
  const latRaw = coords ? Number(coords[1]) : null;
  const lonRaw = coords ? Number(coords[0]) : null;
  const hasValidCoords = isValidLatLon(latRaw, lonRaw);
  const lat = hasValidCoords ? latRaw : null;
  const lon = hasValidCoords ? lonRaw : null;
  const coordsText = hasValidCoords && lat !== null && lon !== null ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : 'No disponible';
  const mapsUrl = hasValidCoords && lat !== null && lon !== null ? `https://www.google.com/maps?q=${lat},${lon}` : null;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - bottomSafe) {
      doc.addPage();
      drawHeader(true);
    }
  };

  const drawRoundedPanel = (x: number, yy: number, w: number, h: number, fill: Rgb, stroke = C.line) => {
    setFill(fill);
    setDraw(stroke);
    doc.setLineWidth(1);
    doc.roundedRect(x, yy, w, h, 18, 18, 'FD');
  };

  const drawHeader = (isContinuation = false) => {
    setFill(C.brand);
    doc.roundedRect(margin, 26, 8, 34, 4, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setText(C.brandText);
    doc.text('LINERGY', margin + 18, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(C.subtext);
    doc.text('Reporte operativo de incidencia', margin + 18, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(C.muted);
    doc.text(`Folio ${folio}`, pageW - margin, 40, { align: 'right' });
    doc.text(`Emitido ${formatDateTime(generado)}`, pageW - margin, 55, { align: 'right' });

    setDraw(C.line);
    doc.setLineWidth(1);
    doc.line(margin, 74, pageW - margin, 74);

    if (isContinuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setText(C.muted);
      doc.text('Continuación', pageW - margin, 88, { align: 'right' });
    }

    y = 98;
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
    doc.setPage(pageNumber);
    setDraw(C.line);
    doc.setLineWidth(1);
    doc.line(margin, pageH - 44, pageW - margin, pageH - 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setText(C.muted);
    doc.text('Documento generado automáticamente por Linergy', margin, pageH - 26);
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageW - margin, pageH - 26, { align: 'right' });
  };

  const drawSectionKicker = (title: string, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    setText(C.brand);
    doc.text(title.toUpperCase(), margin, yy);
  };

  const drawValueBlock = (label: string, value: string, x: number, yy: number, width: number, valueSize = 11) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    setText(C.muted);
    doc.text(label.toUpperCase(), x, yy);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(valueSize);
    setText(C.text);
    const lines = doc.splitTextToSize(value || 'N/A', width);
    doc.text(lines, x, yy + 16);
    return yy + 16 + lines.length * (valueSize + 2);
  };

  const drawMiniMetric = (x: number, yy: number, w: number, label: string, value: string) => {
    drawRoundedPanel(x, yy, w, 60, C.panel, C.line);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(C.muted);
    doc.text(label.toUpperCase(), x + 14, yy + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(C.text);
    const lines = doc.splitTextToSize(value || 'N/A', w - 28);
    doc.text(lines, x + 14, yy + 38);
  };

  const drawStatusPill = (text: string, xRight: number, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const width = doc.getTextWidth(text) + 22;
    const x = xRight - width;

    setFill(estadoPalette.fill);
    setDraw(estadoPalette.border);
    doc.roundedRect(x, yy, width, 24, 12, 12, 'FD');

    setText(estadoPalette.text);
    doc.text(text, x + width / 2, yy + 15.5, { align: 'center' });
    setText(C.text);
  };

  const drawInfoTable = (title: string, rows: Array<[string, string]>) => {
    const rowHeight = 30;
    const tableTopPad = 24;
    const headingPad = 18;
    const colGap = 16;
    const colW = (contentW - colGap) / 2;
    const totalRows = Math.ceil(rows.length / 2);
    const panelH = headingPad + tableTopPad + totalRows * rowHeight + 18;

    ensureSpace(panelH + 14);
    drawRoundedPanel(margin, y, contentW, panelH, C.panel);
    drawSectionKicker(title, y + headingPad);

    let rowY = y + headingPad + tableTopPad;
    for (let index = 0; index < totalRows; index += 1) {
      const left = rows[index * 2];
      const right = rows[index * 2 + 1];

      if (index % 2 === 0) {
        setFill(C.panelSoft);
        doc.rect(margin + 12, rowY - 16, contentW - 24, rowHeight, 'F');
      }

      const renderRowCell = (baseX: number, row: [string, string] | undefined) => {
        if (!row) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        setText(C.muted);
        doc.text(row[0].toUpperCase(), baseX, rowY - 1);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.9);
        setText(C.text);
        const valueLines = doc.splitTextToSize(row[1] || 'N/A', colW - 6);
        doc.text(valueLines, baseX, rowY + 13);
      };

      renderRowCell(margin + 20, left);
      renderRowCell(margin + 20 + colW + colGap, right);

      setDraw(C.line);
      doc.setLineWidth(1);
      doc.line(margin + 12, rowY + 14, pageW - margin - 12, rowY + 14);
      rowY += rowHeight;
    }

    y += panelH + 14;
  };

  drawHeader(false);

  const summaryHeight = 166;
  ensureSpace(summaryHeight + 14);
  drawRoundedPanel(margin, y, contentW, summaryHeight, C.brandSoft, [208, 229, 220]);
  drawSectionKicker('Resumen ejecutivo', y + 20);
  drawStatusPill(estadoText, margin + contentW - 18, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  setText(C.text);
  const lineTitleLines = doc.splitTextToSize(lineaText, contentW - 200);
  doc.text(lineTitleLines, margin + 18, y + 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setText(C.subtext);
  doc.text(`ID ${falla.id}`, margin + 18, y + 82 + Math.max(0, lineTitleLines.length - 1) * 18);

  const metaX = margin + contentW - 178;
  drawValueBlock('Generado', formatDateTime(generado), metaX, y + 46, 150, 10.3);
  drawValueBlock('Folio', folio, metaX, y + 92, 150, 11);

  const metricsY = y + 98;
  const metricGap = 12;
  const metricW = (contentW - 36 - metricGap * 2) / 3;
  drawMiniMetric(margin + 18, metricsY, metricW, 'Kilómetro', kmText);
  drawMiniMetric(margin + 18 + metricW + metricGap, metricsY, metricW, 'Tipo', falla.tipo || 'N/A');
  drawMiniMetric(margin + 18 + (metricW + metricGap) * 2, metricsY, metricW, 'Ocurrencia', formatDateTime(ocurrencia));
  y += summaryHeight + 14;

  const descriptionText = falla.descripcion?.trim() || 'Sin descripción adicional.';
  const descriptionLines = doc.splitTextToSize(descriptionText, contentW - 36);
  const descriptionHeight = Math.max(106, 44 + descriptionLines.length * 14);
  ensureSpace(descriptionHeight + 14);
  drawRoundedPanel(margin, y, contentW, descriptionHeight, C.panel);
  drawSectionKicker('Descripción', y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  setText(C.subtext);
  doc.text(descriptionLines, margin + 18, y + 48);
  y += descriptionHeight + 14;

  const locationHeight = mapsUrl ? 142 : 120;
  ensureSpace(locationHeight + 14);
  drawRoundedPanel(margin, y, contentW, locationHeight, C.panel);
  drawSectionKicker('Ubicación', y + 20);

  const locColX = margin + 18;
  const locRightX = margin + contentW / 2 + 10;
  drawValueBlock('Coordenadas', coordsText, locColX, y + 44, contentW / 2 - 32, 11);
  drawValueBlock('Estructura(s)', falla.estructuraReferencia || 'N/A', locRightX, y + 44, contentW / 2 - 32, 11);
  drawValueBlock('Detalle', falla.estructuraDetalle || 'Sin referencia adicional', locColX, y + 88, contentW / 2 - 32, 9.8);
  drawValueBlock('Referencia', mapsUrl ? 'Abrir ubicación en Google Maps' : 'Sin vínculo disponible', locRightX, y + 88, contentW / 2 - 32, 9.8);

  if (mapsUrl) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    setText(C.brand);
    if (typeof doc.textWithLink === 'function') {
      doc.textWithLink('Abrir Google Maps', locRightX, y + 129, { url: mapsUrl });
    } else {
      doc.text('Abrir Google Maps', locRightX, y + 129);
    }
  }
  setText(C.text);
  y += locationHeight + 14;

  const entry = findLineaCatalogEntry(linea?.numero ?? linea?.nombre ?? null);
  if (entry) {
    drawInfoTable('Ficha técnica de la línea', [
      ['Clave enlace', entry.claveEnlace],
      ['Descripción', entry.descripcion],
      ['Área', String(entry.area ?? 'N/A')],
      ['Tensión', entry.tension],
      ['Kms', String(entry.kms ?? 'N/A')],
      ['NC', String(entry.nc ?? 'N/A')],
      ['Conductor', entry.conductor],
      ['Tip. estruct', entry.tipoEstructura],
      ['# estructuras', String(entry.numEstructuras ?? 'N/A')],
      ['Año', String(entry.anio ?? 'N/A')],
      ['Comp', entry.comp],
      ['Clave SAP', entry.cveSap],
      ['Brecha', String(entry.brecha ?? 'N/A')],
      ['Config. cond', entry.confCond],
      ['Pob', entry.pob],
      ['Ent', entry.ent],
    ]);
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    drawFooter(page, totalPages);
  }

  doc.setPage(1);
  doc.save(`reporte-falla-${folio}.pdf`);
}

export function copyFaultText(falla: FaultForReport, linea: LineForReport) {
  const text = generateFaultText(falla, linea);
  navigator.clipboard.writeText(text);
}

function generateFaultText(falla: FaultForReport, linea: LineForReport): string {
  const fecha = new Date(falla.ocurrencia_ts);
  const fechaStr = fecha.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const horaStr = fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const estadoText = getEstadoLabel(falla.estado);

  const geom = parseGeometry(falla.geom ?? null);
  const coords =
    geom?.type === 'Point' &&
    Array.isArray(geom.coordinates) &&
    geom.coordinates.length >= 2
      ? geom.coordinates
      : null;

  const latRaw = coords ? Number(coords[1]) : null;
  const lonRaw = coords ? Number(coords[0]) : null;
  const hasValidCoords = isValidLatLon(latRaw, lonRaw);
  const lat = hasValidCoords ? latRaw : null;
  const lon = hasValidCoords ? lonRaw : null;
  const coordsText = hasValidCoords && lat !== null && lon !== null ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : 'No disponible';
  const mapsUrl = hasValidCoords && lat !== null && lon !== null ? `https://www.google.com/maps?q=${lat},${lon}` : null;

  return `REPORTE DE FALLA - LINERGY

Folio: ${falla.id.slice(0, 8).toUpperCase()}
Línea: ${linea?.numero || 'N/A'}${linea?.nombre ? ` - ${linea.nombre}` : ''}
${(() => {
  const entry = findLineaCatalogEntry(linea?.numero ?? linea?.nombre ?? null);
  if (!entry) return '';
  const lines = formatLineaCatalogEntryLines(entry);
  return `\nFICHA TÉCNICA DE LA LÍNEA:\n${lines.join('\n')}\n`;
})()}Kilómetro: ${Number.isFinite(falla.km) ? falla.km.toFixed(1) : 'N/A'} km
Tipo de falla: ${falla.tipo}
Estado: ${estadoText}

Ocurrencia: ${fechaStr} - ${horaStr}

Ubicación:
Coordenadas: ${coordsText}
${mapsUrl ? `Google Maps: ${mapsUrl}` : 'Google Maps: N/A'}

Descripción:
${falla.descripcion || 'Sin descripción adicional'}

ID de falla: ${falla.id}
`;
}
