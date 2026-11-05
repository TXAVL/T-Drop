const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function rgbaToBmp24(pixels, width, height, bgColor = { r: 255, g: 255, b: 255 }) {
  const rowBytes = width * 3;
  const padding = (4 - (rowBytes % 4)) % 4;
  const paddedRowBytes = rowBytes + padding;
  const imageSize = paddedRowBytes * height;
  const fileSize = 54 + imageSize;

  const buf = Buffer.alloc(fileSize);

  // File header (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt32LE(54, 10);

  // DIB header (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(imageSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  let destOffset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const r = pixels[srcOffset];
      const g = pixels[srcOffset + 1];
      const b = pixels[srcOffset + 2];
      const a = pixels[srcOffset + 3] / 255;

      const finalR = Math.round(r * a + bgColor.r * (1 - a));
      const finalG = Math.round(g * a + bgColor.g * (1 - a));
      const finalB = Math.round(b * a + bgColor.b * (1 - a));

      buf[destOffset++] = finalB;
      buf[destOffset++] = finalG;
      buf[destOffset++] = finalR;
    }
    for (let p = 0; p < padding; p++) {
      buf[destOffset++] = 0;
    }
  }

  return buf;
}

// 1. Sidebar Installer SVG (164 x 314)
const sidebarInstallerSvg = `
<svg width="164" height="314" viewBox="0 0 164 314" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#070913" />
      <stop offset="45%" stop-color="#0b1124" />
      <stop offset="80%" stop-color="#111630" />
      <stop offset="100%" stop-color="#0a0d18" />
    </linearGradient>

    <!-- Neon Glows -->
    <radialGradient id="cyanGlow" cx="50%" cy="25%" r="65%">
      <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="purpleGlow" cx="60%" cy="70%" r="55%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#c084fc" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- T-Drop Mark Gradient -->
    <linearGradient id="tMarkGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>

    <!-- Glass Surface Gradient -->
    <linearGradient id="glassCard" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>

    <!-- Pill Gradient -->
    <linearGradient id="pillGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.4" />
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="164" height="314" fill="url(#bgGrad)" />

  <!-- Ambient Light Orbs -->
  <circle cx="82" cy="75" r="95" fill="url(#cyanGlow)" />
  <circle cx="95" cy="220" r="85" fill="url(#purpleGlow)" />

  <!-- Subtle Circuit/Grid Lines -->
  <g opacity="0.12" stroke="#38bdf8" stroke-width="0.75" stroke-dasharray="3,3">
    <line x1="20" y1="0" x2="20" y2="314" />
    <line x1="144" y1="0" x2="144" y2="314" />
    <line x1="0" y1="140" x2="164" y2="140" />
    <line x1="0" y1="260" x2="164" y2="260" />
  </g>

  <!-- Glass Card Container for Logo -->
  <rect x="27" y="24" width="110" height="110" rx="24" fill="url(#glassCard)" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.4" />
  
  <!-- Decorative Inner Glow -->
  <rect x="28" y="25" width="108" height="50" rx="23" fill="#ffffff" opacity="0.06" />

  <!-- Central T-Drop Mark -->
  <g transform="translate(82, 79)">
    <!-- Water Ripple Droplets -->
    <circle cx="0" cy="0" r="32" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.25" />
    
    <!-- Stylized Drop Silhouette -->
    <path d="M0 -26 C12 -12 24 4 24 16 C24 29 13 38 0 38 C-13 38 -24 29 -24 16 C-24 4 -12 -12 0 -26 Z" 
          fill="url(#tMarkGrad)" opacity="0.95" />
          
    <!-- Stylized 'T' Cutout / Neon core -->
    <path d="M -13 -2 L 13 -2 L 13 4 L 4 4 L 4 22 L -4 22 L -4 4 L -13 4 Z" 
          fill="#0c1222" opacity="0.92" />
    <path d="M -11 0 L 11 0 L 11 2 L 2 2 L 2 20 L -2 20 L -2 2 L -11 2 Z" 
          fill="#ffffff" opacity="0.85" />
  </g>

  <!-- Brand Typography -->
  <!-- Main Title: T-DROP -->
  <text x="82" y="166" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
    T-DROP
  </text>

  <!-- Accent Line -->
  <line x1="42" y1="176" x2="122" y2="176" stroke="url(#tMarkGrad)" stroke-width="2" stroke-linecap="round" />

  <!-- Subtitle: SMART CLIPBOARD -->
  <text x="82" y="194" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="9" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1.8">
    SMART CLIPBOARD
  </text>
  <text x="82" y="208" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="8.5" font-weight="600" fill="#c084fc" text-anchor="middle" letter-spacing="1">
    &amp; AI OCR STUDIO
  </text>

  <!-- Feature Pills -->
  <g transform="translate(18, 224)">
    <rect width="128" height="20" rx="10" fill="url(#pillGrad)" stroke="#818cf8" stroke-width="0.75" stroke-opacity="0.5" />
    <text x="64" y="13.5" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="8" font-weight="600" fill="#e2e8f0" text-anchor="middle">
      ⚡ Supercharged Workflow
    </text>
  </g>

  <!-- Footer Info -->
  <g transform="translate(82, 280)">
    <!-- Version Tag -->
    <rect x="-35" y="-14" width="70" height="15" rx="7.5" fill="#0f172a" stroke="#334155" stroke-width="0.7" />
    <text x="0" y="-3.5" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="7.5" font-weight="600" fill="#94a3b8" text-anchor="middle">
      v0.3.0 Release
    </text>

    <!-- Developer Credit -->
    <text x="0" y="14" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="7.5" font-weight="500" fill="#64748b" text-anchor="middle">
      Crafted by TXAVL
    </text>
  </g>
</svg>
`;

// 2. Sidebar Uninstaller SVG (164 x 314)
const sidebarUninstallerSvg = `
<svg width="164" height="314" viewBox="0 0 164 314" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="unBgGrad" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#0c0a09" />
      <stop offset="50%" stop-color="#181412" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>

    <radialGradient id="amberGlow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#fb7185" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="unMarkGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="50%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>

    <linearGradient id="unGlassCard" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02" />
    </linearGradient>
  </defs>

  <rect width="164" height="314" fill="url(#unBgGrad)" />
  <circle cx="82" cy="80" r="95" fill="url(#amberGlow)" />

  <rect x="27" y="24" width="110" height="110" rx="24" fill="url(#unGlassCard)" stroke="#f97316" stroke-width="1.2" stroke-opacity="0.35" />

  <g transform="translate(82, 79)">
    <circle cx="0" cy="0" r="32" fill="none" stroke="#f97316" stroke-width="1" opacity="0.2" />
    <path d="M0 -26 C12 -12 24 4 24 16 C24 29 13 38 0 38 C-13 38 -24 29 -24 16 C-24 4 -12 -12 0 -26 Z" 
          fill="url(#unMarkGrad)" opacity="0.9" />
    <path d="M -13 -2 L 13 -2 L 13 4 L 4 4 L 4 22 L -4 22 L -4 4 L -13 4 Z" 
          fill="#1c1917" opacity="0.92" />
    <path d="M -11 0 L 11 0 L 11 2 L 2 2 L 2 20 L -2 20 L -2 2 L -11 2 Z" 
          fill="#ffffff" opacity="0.8" />
  </g>

  <text x="82" y="166" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
    T-DROP
  </text>
  <line x1="42" y1="176" x2="122" y2="176" stroke="url(#unMarkGrad)" stroke-width="2" stroke-linecap="round" />

  <text x="82" y="196" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="10" font-weight="700" fill="#fb7185" text-anchor="middle" letter-spacing="1.5">
    UNINSTALLER
  </text>
  <text x="82" y="214" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="8.5" font-weight="500" fill="#a8a29e" text-anchor="middle">
    We hope to see you again!
  </text>

  <g transform="translate(82, 280)">
    <text x="0" y="5" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="8" font-weight="500" fill="#78716c" text-anchor="middle">
      T-Drop by TXAVL
    </text>
  </g>
</svg>
`;

// 3. Header Installer SVG (150 x 57)
const headerInstallerSvg = `
<svg width="150" height="57" viewBox="0 0 150 57" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <radialGradient id="hdrGlow" cx="80%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Header background matches NSIS default white -->
  <rect width="150" height="57" fill="#ffffff" />
  <rect width="150" height="57" fill="url(#hdrGlow)" />

  <!-- Right Logo Mark -->
  <g transform="translate(118, 28.5)">
    <!-- Rounded Container -->
    <rect x="-19" y="-19" width="38" height="38" rx="9" fill="#0f172a" />
    <path d="M0 -12 C5.5 -5 11 2 11 8 C11 14 6 18 0 18 C-6 18 -11 14 -11 8 C-11 2 -5.5 -5 0 -12 Z" 
          fill="url(#hdrGrad)" />
    <!-- T Letter inside -->
    <path d="M -6 -1 L 6 -1 L 6 2 L 2 2 L 2 10 L -2 10 L -2 2 L -6 2 Z" fill="#ffffff" />
  </g>

  <!-- Left Text -->
  <text x="88" y="26" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="13" font-weight="800" fill="#0f172a" text-anchor="end" letter-spacing="0.5">
    T-Drop
  </text>
  <text x="88" y="39" font-family="'Segoe UI', Inter, Arial, sans-serif" font-size="7.5" font-weight="600" fill="#0284c7" text-anchor="end" letter-spacing="0.5">
    Smart Clipboard
  </text>
</svg>
`;

// Output directories
const resDir = path.join(__dirname, '..', 'resources');
const buildDir = path.join(__dirname, '..', 'build');
for (const d of [resDir, buildDir]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// Render and convert
function generateBmp(svgStr, width, height, filename, bgColor) {
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: width } });
  const rendered = resvg.render();
  const pixels = rendered.pixels;
  const bmpBuf = rgbaToBmp24(pixels, width, height, bgColor);
  fs.writeFileSync(path.join(resDir, filename), bmpBuf);
  fs.writeFileSync(path.join(buildDir, filename), bmpBuf);
  console.log(`Generated ${filename} in /resources & /build (${bmpBuf.length} bytes, ${width}x${height})`);
}

generateBmp(sidebarInstallerSvg, 164, 314, 'installerSidebar.bmp', { r: 7, g: 9, b: 19 });
generateBmp(sidebarUninstallerSvg, 164, 314, 'uninstallerSidebar.bmp', { r: 12, g: 10, b: 9 });
generateBmp(headerInstallerSvg, 150, 57, 'installerHeader.bmp', { r: 255, g: 255, b: 255 });

console.log('All NSIS visual assets generated successfully in /build!');

