/**
 * Generate app icons for PWA and Capacitor.
 * Run: node scripts/generate-icons.js
 *
 * Creates simple tree-themed icons using an SVG canvas.
 * Replace these with proper designed icons before store submission.
 */

const fs = require("fs");
const path = require("path");

// Simple SVG icon with the Family Builder tree logo
function createIconSvg(size) {
  const padding = Math.round(size * 0.15);
  const treeSize = size - padding * 2;
  const cx = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#FFF8F0"/>
  <g transform="translate(${cx}, ${size * 0.48})" fill="#2D9D78">
    <!-- Tree crown -->
    <polygon points="0,${-treeSize * 0.38} ${treeSize * 0.22},${-treeSize * 0.08} ${-treeSize * 0.22},${-treeSize * 0.08}" />
    <polygon points="0,${-treeSize * 0.28} ${treeSize * 0.28},${treeSize * 0.06} ${-treeSize * 0.28},${treeSize * 0.06}" />
    <polygon points="0,${-treeSize * 0.16} ${treeSize * 0.34},${treeSize * 0.2} ${-treeSize * 0.34},${treeSize * 0.2}" />
    <!-- Trunk -->
    <rect x="${-treeSize * 0.06}" y="${treeSize * 0.18}" width="${treeSize * 0.12}" height="${treeSize * 0.18}" rx="${treeSize * 0.02}" fill="#8B5E3C"/>
  </g>
</svg>`;
}

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (can be converted to PNG with sharp/canvas later)
for (const size of [192, 512]) {
  const svg = createIconSvg(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
}

// Also create a simple favicon SVG
const faviconSvg = createIconSvg(32);
fs.writeFileSync(path.join(__dirname, "..", "public", "favicon.svg"), faviconSvg);
console.log("Created favicon.svg");

console.log("\nNote: Convert SVGs to PNGs for production:");
console.log("  npx sharp-cli -i public/icons/icon-192.svg -o public/icons/icon-192.png");
console.log("  npx sharp-cli -i public/icons/icon-512.svg -o public/icons/icon-512.png");
