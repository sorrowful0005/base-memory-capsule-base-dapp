import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(new URL("..", import.meta.url).pathname);
const outDir = join(root, "base-submission");

const W = 1284;
const H = 2778;

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, maxChars) {
  const words = text.split(" ");
  const result = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      result.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) result.push(current);
  return result;
}

function frame(content, bg = "#f4efe9") {
  return `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#ddd2c3"/>
      </linearGradient>
      <pattern id="paper" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="#8a755f" opacity=".08"/>
      </pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#paper)"/>
    ${content}
  </svg>`;
}

function header(title, subtitle) {
  const lines = wrap(subtitle, 34);
  return `
    <text x="72" y="110" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#876544">BASE MEMORY CAPSULE</text>
    <text x="72" y="232" font-family="Georgia, serif" font-size="88" font-weight="700" fill="#2e231d">${esc(title)}</text>
    ${lines.map((line, index) => `<text x="76" y="${308 + index * 44}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#6c5a4e">${esc(line)}</text>`).join("")}
  `;
}

function pill(x, y, text, fill, fg = "#2e231d") {
  return `
    <rect x="${x}" y="${y}" rx="28" width="${text.length * 16 + 76}" height="56" fill="${fill}" stroke="#2e231d" stroke-width="3"/>
    <text x="${x + 30}" y="${y + 37}" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="${fg}">${esc(text)}</text>
  `;
}

function panel(x, y, width, height, title, lines, dark = false) {
  const bg = dark ? "#2e231d" : "#fffdf9";
  const fg = dark ? "#ffffff" : "#2e231d";
  const sub = dark ? "#f3e7da" : "#6c5a4e";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="32" fill="${bg}" stroke="#2e231d" stroke-width="4"/>
      <text x="${x + 28}" y="${y + 54}" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="${sub}">${esc(title)}</text>
      ${lines.map((line, index) => `<text x="${x + 28}" y="${y + 118 + index * 40}" font-family="Arial, sans-serif" font-size="34" font-weight="${index === 0 ? 900 : 700}" fill="${index === 0 ? fg : sub}">${esc(line)}</text>`).join("")}
    </g>
  `;
}

function button(x, y, width, text, fill, fg = "#ffffff") {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="96" rx="48" fill="${fill}" stroke="#2e231d" stroke-width="4"/>
    <text x="${x + width / 2}" y="${y + 61}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="${fg}">${esc(text)}</text>
  `;
}

function screenshot1() {
  const content = `
    ${header("Seal a note for the future.", "Write one message, choose its unlock date, and archive it on Base with a calm, document-like flow.")}
    ${pill(72, 408, "Archive flow", "#d6c1a1")}
    ${pill(260, 408, "Future unlock", "#ffffff")}
    ${panel(72, 540, 1140, 286, "Seal capsule", ["Title: Note to future me", "Unlock in: 30 days", "State: waiting to be sealed"], false)}
    ${panel(72, 872, 548, 246, "Message", ["I hope I still remember why this season mattered.", "This note is stored for later."], false)}
    ${panel(664, 872, 548, 246, "Archive rules", ["One note per capsule", "Opens only after its date"], false)}
    ${panel(72, 1166, 1140, 290, "Capsule record", ["Creator: 0x9936...9652", "Unlock date: Jun 12, 2026", "State: sealed"], true)}
    ${panel(72, 1508, 1140, 250, "Why it works", ["Personal but structured", "Mobile-first input flow", "Onchain timestamp is the core proof"], false)}
    ${button(72, 2522, 1140, "Seal on Base", "#2e231d")}
  `;
  return frame(content);
}

function screenshot2() {
  const content = `
    ${header("The capsule is waiting.", "Users can revisit a capsule, see the unlock date, and understand that the message remains sealed until then.")}
    ${pill(72, 408, "Sealed", "#d6c1a1")}
    ${pill(212, 408, "Capsule ID 12", "#ffffff")}
    ${panel(72, 536, 360, 246, "Unlock date", ["Jun 12, 2026", "Fixed onchain timestamp"], false)}
    ${panel(462, 536, 360, 246, "Time left", ["30d 0h left", "Not openable yet"], false)}
    ${panel(852, 536, 360, 246, "Creator", ["0x9936...9652", "Original author"], false)}
    ${panel(72, 840, 1140, 310, "Sealed note", ["This message stays sealed until its unlock date arrives.", "The archive view makes the waiting state obvious on mobile."], true)}
    ${panel(72, 1208, 1140, 286, "Archive panel", ["Capsule ID: 12", "Status: sealed", "Open action disabled until the date arrives"], false)}
    ${panel(72, 1544, 1140, 254, "Status", ["Capsule recorded on Base.", "Unlock date is visible, but the full note remains hidden."], true)}
    ${button(72, 2522, 1140, "Open capsule", "#d6c1a1", "#2e231d")}
  `;
  return frame(content, "#ebe2d7");
}

function screenshot3() {
  const content = `
    ${header("Open the message.", "Once the date arrives, the capsule can be opened and the original archived note becomes visible.")}
    ${pill(72, 408, "Opened", "#ffffff")}
    ${pill(214, 408, "Archive record", "#d6c1a1")}
    ${panel(72, 540, 548, 276, "Capsule title", ["Note to future me", "Opened after unlock date", "Capsule ID: 12"], false)}
    ${panel(664, 540, 548, 276, "Timeline", ["Created: May 13, 2026", "Opened: Jun 12, 2026", "State: visible"], true)}
    ${panel(72, 874, 1140, 306, "Opened message", ["I hope I still remember why this season mattered and what I was building through it.", "The note is now permanently readable."], false)}
    ${panel(72, 1238, 1140, 290, "Archive receipt", ["Creator stays visible", "Unlock date stays visible", "Opened state is now part of the record"], true)}
    ${panel(72, 1582, 1140, 254, "Post-open state", ["Sealed once", "Opened after date", "Readable from then on"], false)}
    ${button(72, 2522, 1140, "Capsule opened", "#2e231d")}
  `;
  return frame(content, "#e4d8c9");
}

function iconSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="#f4efe9"/>
    <rect x="138" y="138" width="748" height="748" rx="96" fill="#fffdf9" stroke="#2e231d" stroke-width="24"/>
    <rect x="226" y="222" width="572" height="580" rx="42" fill="#ece2d4" stroke="#2e231d" stroke-width="18"/>
    <rect x="276" y="292" width="472" height="76" rx="18" fill="#d6c1a1"/>
    <rect x="276" y="408" width="472" height="44" rx="12" fill="#d6c1a1"/>
    <rect x="276" y="484" width="472" height="44" rx="12" fill="#d6c1a1"/>
    <circle cx="512" cy="646" r="86" fill="#2e231d"/>
    <path d="M512 606v58" stroke="#fffdf9" stroke-width="18" stroke-linecap="round"/>
    <path d="M512 686h2" stroke="#fffdf9" stroke-width="18" stroke-linecap="round"/>
  </svg>`;
}

function thumbnailSvg() {
  return `
  <svg width="1910" height="1000" viewBox="0 0 1910 1000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f4efe9"/>
        <stop offset="100%" stop-color="#ddd2c3"/>
      </linearGradient>
    </defs>
    <rect width="1910" height="1000" fill="url(#bg)"/>
    <text x="96" y="198" font-family="Georgia, serif" font-size="112" font-weight="700" fill="#2e231d">Base Memory Capsule</text>
    <text x="100" y="292" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="#6c5a4e">Seal one message, wait for its date, and open it later on Base.</text>
    ${pill(100, 348, "Archive-style flow", "#d6c1a1")}
    ${pill(394, 348, "Future unlock", "#ffffff")}
    ${button(100, 448, 430, "Seal capsule", "#2e231d")}
    ${button(560, 448, 430, "Open later", "#d6c1a1", "#2e231d")}
    ${panel(1186, 124, 624, 250, "Sealed state", ["Unlock date: Jun 12, 2026", "State: sealed", "Message hidden until then"], true)}
    ${panel(1186, 420, 624, 250, "Opened state", ["Original note becomes visible", "Archive record stays timestamped"], false)}
    ${panel(1186, 734, 624, 180, "Capsule style", ["Quiet, archival, and clearly built as a time-capsule archive surface"], true)}
  </svg>`;
}

async function writePng(name, svg, width = W, height = H) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(file);
  return file;
}

async function writeJpg(name, svg, width, height) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(file);
  return file;
}

await mkdir(outDir, { recursive: true });

const files = [
  await writeJpg("app-icon.jpg", iconSvg(), 1024, 1024),
  await writeJpg("app-thumbnail.jpg", thumbnailSvg(), 1910, 1000),
  await writePng("screenshot-1.png", screenshot1()),
  await writePng("screenshot-2.png", screenshot2()),
  await writePng("screenshot-3.png", screenshot3()),
];

const manifest = {
  generatedAt: new Date().toISOString(),
  files,
};

await writeFile(
  join(outDir, "asset-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);

for (const file of files) {
  console.log(file);
}
