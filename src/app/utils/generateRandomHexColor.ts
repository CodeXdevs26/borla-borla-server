export default function generateRandomHexColor() {
  const r = Math.floor(Math.random() * 128); // Red component: 0-127
  const g = Math.floor(Math.random() * 128); // Green component: 0-127
  const b = Math.floor(Math.random() * 128); // Blue component: 0-127

  // Convert to hexadecimal and return as a color
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
