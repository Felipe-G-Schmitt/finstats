// Helpers puros — moeda BRL, datas, ids
import { MESES, MESES_CURTO } from './theme';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// formata numero -> "R$ 1.234,56"
export function brl(valor) {
  const n = Number(valor) || 0;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// formata sem o "R$" (p/ inputs e labels compactos)
export function num(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// versao compacta p/ eixos de grafico: 1.2k, 3.4M
export function compacto(valor) {
  const n = Math.abs(Number(valor) || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
  return String(Math.round(n));
}

// converte texto digitado ("1.234,56" ou "1234.56" ou "1234,56") -> numero
export function parseValor(texto) {
  if (texto == null) return 0;
  let s = String(texto).trim().replace(/[^\d.,-]/g, '');
  if (s.includes(',')) {
    // formato BR: ponto = milhar, virgula = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ---- datas (string ISO "YYYY-MM-DD") ----
export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

// "YYYY-MM" da data
export function mesDe(iso) {
  return (iso || '').slice(0, 7);
}

// "YYYY-MM" do mes atual
export function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

// "YYYY-MM" -> "Junho 2026"
export function rotuloMes(ym) {
  if (!ym) return '';
  const [a, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

// "YYYY-MM" -> "Jun" (curto)
export function rotuloMesCurto(ym) {
  if (!ym) return '';
  const m = Number(ym.split('-')[1]);
  return MESES_CURTO[m - 1];
}

// "YYYY-MM-DD" -> "24/06"
export function diaMes(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// "YYYY-MM-DD" -> "24 jun"
export function diaMesExtenso(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d} ${MESES_CURTO[Number(m) - 1].toLowerCase()}`;
}

// avanca/retrocede um mes a partir de "YYYY-MM"
export function deslocaMes(ym, delta) {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ultimos N meses (mais antigo -> atual) a partir de hoje
export function ultimosMeses(n) {
  const out = [];
  let ym = mesAtual();
  for (let i = 0; i < n; i++) {
    out.unshift(ym);
    ym = deslocaMes(ym, -1);
  }
  return out;
}
