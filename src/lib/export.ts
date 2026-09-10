import { formatHours, formatMs, formatNumber, formatUsd } from "./format";
import type { CompareResponse, EstimateResponse } from "./types";

type Row = Array<string | number>;

function escapeCsv(value: string | number): string {
  const text = String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: Row[]): string {
  return (
    "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")
  );
}

export function downloadFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function exportEstimateCsv(data: EstimateResponse): void {
  const rows: Row[] = [
    ["Cuestalo - Estimacion de proyecto"],
    ["Fecha", data.at],
    ["Modelo estimador", data.model],
    ["Tipo", data.plan.projectType],
    ["Complejidad", data.plan.complexity],
    ["Resumen", data.plan.summary],
    [],
    ["Totales"],
    ["Funcionalidades", data.totals.featureCount],
    ["Horas humanas", data.totals.humanHours],
    ["Horas por dev", data.totals.humanHours / data.schedule.teamSize],
    ["Devs", data.schedule.teamSize],
    ["Coste desarrollo (USD)", data.schedule.humanCost],
    ["Tokens entrada IA", data.totals.aiInputTokens],
    ["Tokens salida IA", data.totals.aiOutputTokens],
    [],
    ["Coste IA por modelo (USD)"],
    ["Modelo", "Valle respaldo", "Valle cache", "Punta respaldo", "Punta cache"],
    ...data.aiCosts.map((cost) => [
      cost.label,
      cost.offPeak.miss.toFixed(6),
      cost.offPeak.cached50.toFixed(6),
      cost.peak.miss.toFixed(6),
      cost.peak.cached50.toFixed(6),
    ]),
    [],
    ["Funcionalidades"],
    ["Nombre", "Complejidad", "Horas", "Tokens entrada", "Tokens salida"],
    ...data.plan.features.map((feature) => [
      feature.name,
      feature.complexity,
      feature.humanHours,
      feature.aiInputTokens,
      feature.aiOutputTokens,
    ]),
  ];

  if (data.plan.assumptions.length) {
    rows.push([], ["Supuestos"], ...data.plan.assumptions.map((a) => [a]));
  }
  if (data.plan.risks.length) {
    rows.push([], ["Riesgos"], ...data.plan.risks.map((r) => [r]));
  }
  if (data.plan.notes) {
    rows.push([], ["Notas", data.plan.notes]);
  }

  downloadFile(`cuestalo-estimacion-${stamp()}.csv`, toCsv(rows), "text/csv");
}

export function exportCompareCsv(data: CompareResponse): void {
  const rows: Row[] = [
    ["Cuestalo - Comparacion de modelos"],
    ["Fecha", data.at],
    ["Tarifa", data.tier],
    [],
    [
      "Modelo",
      "OK",
      "TTFT ms",
      "Total ms",
      "Tokens/s",
      "Tokens entrada",
      "Tokens salida",
      "Razonamiento",
      "Cache hit",
      "Coste valle (USD)",
      "Coste punta (USD)",
    ],
    ...data.results.map((result) => [
      result.model,
      result.ok ? "si" : "no",
      Math.round(result.ttftMs ?? 0),
      Math.round(result.totalMs ?? 0),
      (result.tokensPerSecond ?? 0).toFixed(1),
      result.usage?.promptTokens ?? 0,
      result.usage?.completionTokens ?? 0,
      result.usage?.reasoningTokens ?? 0,
      result.usage?.cachedTokens ?? 0,
      (result.cost?.offPeak.totalCost ?? 0).toFixed(6),
      (result.cost?.peak.totalCost ?? 0).toFixed(6),
    ]),
  ];

  downloadFile(`cuestalo-comparacion-${stamp()}.csv`, toCsv(rows), "text/csv");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportEstimatePdf(data: EstimateResponse): boolean {
  const costRows = data.aiCosts
    .map(
      (cost) => `<tr>
        <td>${esc(cost.label)}</td>
        <td class="num">${formatUsd(cost.offPeak.miss)}</td>
        <td class="num">${formatUsd(cost.offPeak.cached50)}</td>
        <td class="num">${formatUsd(cost.peak.miss)}</td>
        <td class="num">${formatUsd(cost.peak.cached50)}</td>
      </tr>`,
    )
    .join("");

  const featureRows = data.plan.features
    .map(
      (feature) => `<tr>
        <td><strong>${esc(feature.name)}</strong><br><span class="muted">${esc(feature.description)}</span></td>
        <td>${esc(feature.complexity)}</td>
        <td class="num">${feature.humanHours.toFixed(1)} h</td>
        <td class="num">${formatNumber(feature.aiInputTokens)} / ${formatNumber(feature.aiOutputTokens)}</td>
      </tr>`,
    )
    .join("");

  const list = (items: string[]) =>
    items.length
      ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
      : "<p class='muted'>—</p>";

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Cuestalo - Presupuesto</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 40px; }
  h1 { margin: 0; font-size: 26px; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #10b981; padding-bottom: 4px; }
  .muted { color: #64748b; font-size: 12px; }
  .meta { color: #475569; font-size: 12px; margin-top: 4px; }
  .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; min-width: 130px; }
  .card .k { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .04em; }
  .card .v { font-size: 16px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; }
  .num { text-align: right; white-space: nowrap; }
  ul { margin: 4px 0; padding-left: 18px; font-size: 12px; }
  footer { margin-top: 28px; color: #94a3b8; font-size: 11px; }
</style></head>
<body>
  <h1>Cuestalo · Presupuesto de proyecto</h1>
  <div class="meta">${esc(data.plan.projectType)} · complejidad ${esc(data.plan.complexity)} · generado el ${new Date(data.at).toLocaleString("es-ES")} · modelo ${esc(data.model)}</div>
  <p>${esc(data.plan.summary)}</p>

  <div class="cards">
    <div class="card"><div class="k">Funcionalidades</div><div class="v">${data.totals.featureCount}</div></div>
    <div class="card"><div class="k">Esfuerzo humano</div><div class="v">${formatHours(data.totals.humanHours)}</div></div>
    <div class="card"><div class="k">Por dev</div><div class="v">${formatHours(data.totals.humanHours / data.schedule.teamSize)}</div></div>
    <div class="card"><div class="k">Coste desarrollo</div><div class="v">${formatUsd(data.schedule.humanCost)}</div></div>
    <div class="card"><div class="k">Tokens IA</div><div class="v">${formatNumber(data.totals.aiTotalTokens)}</div></div>
  </div>

  <h2>Coste de IA por modelo</h2>
  <table>
    <thead><tr><th>Modelo</th><th>Valle respaldo</th><th>Valle caché</th><th>Punta respaldo</th><th>Punta caché</th></tr></thead>
    <tbody>${costRows}</tbody>
  </table>

  <h2>Funcionalidades</h2>
  <table>
    <thead><tr><th>Funcionalidad</th><th>Complejidad</th><th>Horas</th><th>Tokens in/out</th></tr></thead>
    <tbody>${featureRows}</tbody>
  </table>

  <h2>Stack, supuestos y riesgos</h2>
  <p class="muted">Stack sugerido: ${data.plan.suggestedStack.map(esc).join(", ") || "—"}</p>
  ${list(data.plan.assumptions)}
  ${data.plan.risks.length ? `<p class="muted">Riesgos:</p>${list(data.plan.risks)}` : ""}
  ${data.plan.notes ? `<p class="muted">Notas: ${esc(data.plan.notes)}</p>` : ""}

  <footer>Estimación generada con Cuestalo. El coste de IA es orientativo y depende del uso real y de los precios vigentes de DeepSeek. Esta llamada de estimación: ${formatUsd(data.estimationCall.totalCost)} en ${formatMs(data.timing.totalMs)}.</footer>
  <script>window.onload = function () { window.print(); };</script>
</body></html>`;

  const printWindow = window.open("", "_blank", "width=920,height=1000");
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
