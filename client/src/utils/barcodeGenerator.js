// Pure JavaScript Code 128 / EAN Barcode SVG Generator
// Zero external dependencies, 100% offline, crisp vector SVG output for thermal labels and A4 sheets

const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106
];

export function generateCode128Svg(text, { height = 50, barWidth = 2, showText = true } = {}) {
  const clean = String(text || '').trim();
  if (!clean) return '';

  // Start with Code 128 Subset B (Start Code 104)
  const codes = [104];
  let checksum = 104;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 32;
    const val = Math.max(0, Math.min(charCode, 105));
    codes.push(val);
    checksum += val * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  // Build pattern
  let modules = '';
  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c] || '212222';
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      const isBar = j % 2 === 0;
      modules += (isBar ? '1' : '0').repeat(width);
    }
  }

  const totalWidth = modules.length * barWidth;
  let rects = '';
  let x = 0;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') {
      rects += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="#000000" />`;
    }
    x += barWidth;
  }

  const svgHeight = showText ? height + 16 : height;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="${totalWidth}" height="${svgHeight}">
      ${rects}
      ${
        showText
          ? `<text x="${totalWidth / 2}" y="${height + 13}" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">${clean}</text>`
          : ''
      }
    </svg>
  `;
}

// Generate unique 13-digit retail barcode with authentic EAN-13 Modulo-10 checksum
export function generateRetailEAN13(seedNum) {
  // Indian Retail Prefix 890 + 9 random/sequential digits + 1 check digit
  const prefix = '890';
  const middle = String(seedNum || Math.floor(100000000 + Math.random() * 900000000)).slice(-9).padStart(9, '0');
  const base12 = prefix + middle;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base12 + checkDigit;
}
