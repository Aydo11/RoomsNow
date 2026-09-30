// Generates branded illustration placeholders (replaced with real photos in the admin).
const fs = require('fs');
const path = require('path');

const N = '#013F58', N2 = '#0B5575', P = '#F54C61', P2 = '#FF8A98', CREAM = '#FFF6F1', SAND = '#F3E6DC', WOOD = '#C98F63', LEAF = '#2E8B6E';
const W = 1200, H = 800;
const svg = (body, bg = ['#FFE3E7', '#FFF6F1']) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FD3EA"/><stop offset="1" stop-color="#DDF1F8"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2C3A6"/><stop offset="1" stop-color="#CFA884"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>${body}</svg>`;

const plant = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M0 0 C-60 -40 -70 -120 -20 -170 C-10 -110 0 -60 0 0Z" fill="${LEAF}"/>
<path d="M0 0 C50 -50 90 -110 50 -180 C20 -120 5 -70 0 0Z" fill="#3FA383"/>
<path d="M0 0 C-20 -70 10 -150 60 -120 C30 -80 10 -40 0 0Z" fill="#257459"/>
<path d="M-45 0 H45 L35 80 H-35Z" fill="${P}"/><rect x="-50" y="-8" width="100" height="16" rx="6" fill="#E23A50"/></g>`;
const windowEl = (x, y, w, h) => `<g><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="10" fill="#fff"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>
<circle cx="${x + w * .75}" cy="${y + h * .3}" r="${w * .09}" fill="#FFF3C4"/>
<path d="M${x} ${y + h * .8} Q${x + w * .3} ${y + h * .55} ${x + w * .55} ${y + h * .75} T${x + w} ${y + h * .7} V${y + h} H${x}Z" fill="#7CC4A4"/>
<rect x="${x + w / 2 - 5}" y="${y}" width="10" height="${h}" fill="#fff"/><rect x="${x}" y="${y + h / 2 - 5}" width="${w}" height="10" fill="#fff"/>
<path d="M${x - 30} ${y - 30} H${x + w * .38} Q${x + w * .2} ${y + h * .5} ${x + w * .05} ${y + h + 40} H${x - 30}Z" fill="${P2}" opacity=".85"/>
<path d="M${x + w + 30} ${y - 30} H${x + w * .62} Q${x + w * .8} ${y + h * .5} ${x + w * .95} ${y + h + 40} H${x + w + 30}Z" fill="${P2}" opacity=".85"/>
<rect x="${x - 50}" y="${y - 40}" width="${w + 100}" height="12" rx="6" fill="${N}"/></g>`;

function bedroom(accent = P, wall = ['#FDEDEF', '#FFF8F4'], flip = false) {
  const g = `<rect y="560" width="${W}" height="240" fill="url(#floor)"/>
${windowEl(720, 150, 300, 260)}
<rect x="170" y="170" width="200" height="150" rx="8" fill="#fff"/><rect x="186" y="186" width="168" height="118" fill="${N}"/>
<circle cx="240" cy="250" r="32" fill="${accent}"/><path d="M186 304 L270 230 L354 304Z" fill="${N2}"/>
<ellipse cx="600" cy="690" rx="420" ry="60" fill="${accent}" opacity=".25"/>
<rect x="250" y="340" width="520" height="210" rx="40" fill="${N}"/>
<rect x="230" y="500" width="560" height="120" rx="24" fill="#fff"/>
<path d="M230 520 H790 V600 Q790 640 750 640 H270 Q230 640 230 600Z" fill="${accent}"/>
<path d="M430 505 H790 V600 Q790 640 750 640 H470 Q430 640 430 600Z" fill="#fff" opacity=".22"/>
<rect x="280" y="450" width="160" height="80" rx="30" fill="#fff"/><rect x="460" y="450" width="160" height="80" rx="30" fill="#FFF2F4"/>
<rect x="250" y="640" width="24" height="60" fill="${N}"/><rect x="746" y="640" width="24" height="60" fill="${N}"/>
<rect x="850" y="500" width="150" height="160" rx="14" fill="${WOOD}"/><rect x="866" y="560" width="118" height="10" rx="5" fill="#B57B51"/>
<circle cx="925" cy="400" r="130" fill="url(#glow)"/>
<path d="M880 440 H970 L950 370 H900Z" fill="#FFD9A0"/><rect x="920" y="440" width="10" height="60" fill="${N}"/>
${plant(1080, 620, .9)}`;
  return svg(flip ? `<g transform="translate(${W} 0) scale(-1 1)">${g}</g>` : g, wall);
}
const lounge = () => svg(`<rect y="580" width="${W}" height="220" fill="url(#floor)"/>
${windowEl(140, 140, 280, 280)}
<rect x="560" y="170" width="120" height="160" rx="6" fill="#fff"/><rect x="572" y="182" width="96" height="136" fill="${P}"/>
<rect x="700" y="210" width="150" height="120" rx="6" fill="#fff"/><rect x="712" y="222" width="126" height="96" fill="${N2}"/><circle cx="775" cy="270" r="26" fill="${P2}"/>
<rect x="870" y="190" width="100" height="140" rx="6" fill="#fff"/><rect x="882" y="202" width="76" height="116" fill="#FFD9A0"/>
<ellipse cx="700" cy="720" rx="420" ry="50" fill="${N}" opacity=".12"/>
<rect x="470" y="400" width="520" height="160" rx="50" fill="${N}"/>
<rect x="440" y="480" width="580" height="150" rx="40" fill="${N2}"/>
<rect x="500" y="470" width="220" height="90" rx="30" fill="#1A6A8E"/><rect x="740" y="470" width="220" height="90" rx="30" fill="#1A6A8E"/>
<rect x="520" y="420" width="90" height="80" rx="24" fill="${P}" transform="rotate(-10 565 460)"/><rect x="860" y="420" width="90" height="80" rx="24" fill="#FFD9A0" transform="rotate(8 905 460)"/>
<rect x="470" y="630" width="20" height="50" fill="${N}"/><rect x="970" y="630" width="20" height="50" fill="${N}"/>
<ellipse cx="300" cy="680" rx="150" ry="26" fill="${P}" opacity=".85"/><rect x="170" y="600" width="260" height="20" rx="10" fill="${WOOD}"/><rect x="190" y="620" width="14" height="60" fill="${WOOD}"/><rect x="396" y="620" width="14" height="60" fill="${WOOD}"/>
<circle cx="260" cy="585" r="20" fill="#fff"/><rect x="310" y="570" width="60" height="30" rx="6" fill="${N}"/>
<circle cx="1100" cy="330" r="130" fill="url(#glow)"/><path d="M1060 360 H1140 L1120 290 H1080Z" fill="#FFD9A0"/><rect x="1096" y="360" width="8" height="260" fill="${N}"/><rect x="1060" y="615" width="80" height="12" rx="6" fill="${N}"/>`, ['#FFEFF1', '#FFF9F5']);

const kitchen = () => svg(`<rect y="600" width="${W}" height="200" fill="#E9DCD2"/>
${windowEl(470, 130, 260, 200)}
<rect x="80" y="120" width="330" height="170" rx="10" fill="${N}"/><rect x="95" y="135" width="145" height="140" rx="6" fill="${N2}"/><rect x="250" y="135" width="145" height="140" rx="6" fill="${N2}"/>
<rect x="790" y="120" width="330" height="170" rx="10" fill="${N}"/><rect x="805" y="135" width="145" height="140" rx="6" fill="${N2}"/><rect x="960" y="135" width="145" height="140" rx="6" fill="${N2}"/>
<rect x="60" y="420" width="1080" height="30" rx="8" fill="#fff"/>
<rect x="80" y="450" width="1040" height="180" fill="${N}"/>
${[0, 1, 2, 3, 4].map(i => `<rect x="${95 + i * 205}" y="465" width="190" height="150" rx="8" fill="${N2}"/><rect x="${170 + i * 205}" y="480" width="40" height="8" rx="4" fill="#fff" opacity=".7"/>`).join('')}
<path d="M240 420 Q240 360 280 350 H320 Q360 360 360 420Z" fill="${P}"/><rect x="286" y="330" width="28" height="22" rx="6" fill="${N}"/>
<rect x="700" y="360" width="70" height="60" rx="10" fill="#fff"/><rect x="780" y="350" width="50" height="70" rx="10" fill="#FFD9A0"/>
${plant(930, 420, .55)}${plant(560, 420, .45)}`, ['#FFF1EE', '#FFFAF6']);

const house = () => svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="980" cy="160" r="70" fill="#FFF3C4"/>
<ellipse cx="200" cy="140" rx="110" ry="36" fill="#fff" opacity=".85"/><ellipse cx="760" cy="110" rx="90" ry="28" fill="#fff" opacity=".85"/>
<rect y="660" width="${W}" height="140" fill="#7CC4A4"/><rect y="680" width="${W}" height="120" fill="#9E9A94"/>
${[0, 1, 2].map(i => { const x = 90 + i * 350; const c = ['#B5563F', '#A34A37', '#B96149'][i]; return `
<path d="M${x - 10} 300 L${x + 165} 180 L${x + 340} 300Z" fill="${N}"/>
<rect x="${x}" y="300" width="330" height="380" fill="${c}"/>
${Array.from({ length: 12 }, (_, r) => `<rect x="${x}" y="${310 + r * 31}" width="330" height="2" fill="#000" opacity=".08"/>`).join('')}
<rect x="${x + 40}" y="340" width="100" height="110" rx="4" fill="#fff"/><rect x="${x + 50}" y="350" width="80" height="90" fill="url(#sky)"/>
<rect x="${x + 190}" y="340" width="100" height="110" rx="4" fill="#fff"/><rect x="${x + 200}" y="350" width="80" height="90" fill="url(#sky)"/>
<rect x="${x + 40}" y="500" width="100" height="110" rx="4" fill="#fff"/><rect x="${x + 50}" y="510" width="80" height="90" fill="url(#sky)"/>
<path d="M${x + 190} 680 V540 Q${x + 240} 490 ${x + 290} 540 V680Z" fill="${i === 1 ? P : N2}"/><circle cx="${x + 270}" cy="610" r="6" fill="#FFD9A0"/>
<rect x="${x + 250}" y="220" width="36" height="70" fill="${c}"/>`; }).join('')}
<circle cx="1120" cy="560" r="90" fill="${LEAF}"/><rect x="1110" y="600" width="20" height="80" fill="#6B4A2E"/>`);

const keys = () => svg(`<circle cx="600" cy="400" r="300" fill="${P}" opacity=".12"/><circle cx="600" cy="400" r="220" fill="${P}" opacity=".15"/>
<circle cx="600" cy="220" r="46" fill="none" stroke="#B9C2C8" stroke-width="16"/>
<g transform="rotate(-20 600 260)"><circle cx="520" cy="330" r="70" fill="#E8B84A"/><circle cx="520" cy="330" r="24" fill="#FFF6F1"/><rect x="505" y="390" width="30" height="230" rx="6" fill="#E8B84A"/><rect x="535" y="530" width="40" height="22" fill="#E8B84A"/><rect x="535" y="580" width="30" height="22" fill="#E8B84A"/></g>
<g transform="rotate(18 600 260)"><circle cx="690" cy="330" r="62" fill="#B9C2C8"/><circle cx="690" cy="330" r="20" fill="#FFF6F1"/><rect x="676" y="385" width="28" height="200" rx="6" fill="#B9C2C8"/><rect x="704" y="500" width="34" height="20" fill="#B9C2C8"/><rect x="704" y="545" width="26" height="20" fill="#B9C2C8"/></g>
<g transform="rotate(6 600 260)"><rect x="560" y="260" width="200" height="130" rx="30" fill="${N}"/><path d="M620 350 V310 L660 280 L700 310 V350Z" fill="${P}"/></g>`);

const people = (bg, extra = '') => {
  const skins = ['#8D5524', '#C68642', '#F1C27D', '#6B3E26', '#E0AC69', '#A0522D'];
  const shirts = [P, N, '#F7B267', N2, P2, LEAF];
  return svg(`${extra}${[0, 1, 2, 3, 4].map(i => { const x = 180 + i * 210, y = 330 + (i % 2) * 40; return `
<path d="M${x - 95} 800 V${y + 230} Q${x - 95} ${y + 130} ${x} ${y + 130} Q${x + 95} ${y + 130} ${x + 95} ${y + 230} V800Z" fill="${shirts[i]}"/>
<circle cx="${x}" cy="${y + 50}" r="68" fill="${skins[i]}"/>
<path d="M${x - 70} ${y + 40} Q${x - 60} ${y - 30} ${x} ${y - 22} Q${x + 70} ${y - 30} ${x + 70} ${y + 36} Q${x + 30} ${y} ${x - 70} ${y + 40}Z" fill="#2B1B12"/>
<path d="M${x - 22} ${y + 78} Q${x} ${y + 96} ${x + 22} ${y + 78}" stroke="#2B1B12" stroke-width="6" fill="none" stroke-linecap="round"/>`; }).join('')}`, bg);
};
const community = () => people(['#FFE3E7', '#FFF6F1'], `<circle cx="600" cy="360" r="330" fill="${P}" opacity=".1"/><path d="M0 800 Q600 560 1200 800Z" fill="${N}" opacity=".08"/>`);
const lunch = () => svg(`<ellipse cx="600" cy="460" rx="520" ry="260" fill="${WOOD}"/><ellipse cx="600" cy="440" rx="500" ry="240" fill="#D9A274"/>
${[[330, 360], [600, 300], [870, 360], [420, 560], [780, 560]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="92" fill="#fff"/><circle cx="${x}" cy="${y}" r="66" fill="${['#F7B267', P2, '#7CC4A4', '#E86A5A', '#F4D35E'][i]}"/><circle cx="${x - 18}" cy="${y - 10}" r="18" fill="#fff" opacity=".5"/>`).join('')}
<circle cx="600" cy="460" r="70" fill="${N}"/><circle cx="600" cy="460" r="50" fill="${P}"/>`, ['#FFEFF1', '#FFF9F5']);
const cricket = () => svg(`<rect width="${W}" height="${H}" fill="#8FD0A8"/><rect y="0" width="${W}" height="300" fill="url(#sky)"/>
<path d="M0 300 Q600 250 1200 300 V800 H0Z" fill="#6BBF8A"/><path d="M440 800 L520 320 H680 L760 800Z" fill="#E6D3A3"/>
<g fill="#fff"><rect x="560" y="300" width="10" height="90"/><rect x="590" y="300" width="10" height="90"/><rect x="620" y="300" width="10" height="90"/><rect x="556" y="296" width="80" height="6"/></g>
<g transform="rotate(-35 820 520)"><rect x="800" y="330" width="40" height="120" rx="8" fill="${N}"/><rect x="780" y="440" width="80" height="260" rx="30" fill="#EBC98C"/></g>
<circle cx="360" cy="560" r="44" fill="${P}"/><path d="M322 540 Q360 580 398 540" stroke="#fff" stroke-width="5" fill="none"/>`);
const badminton = () => svg(`<rect width="${W}" height="${H}" fill="${N}"/>
<path d="M100 800 L300 200 H900 L1100 800Z" fill="#1B7A5A"/><g stroke="#fff" stroke-width="6" fill="none"><path d="M100 800 L300 200 H900 L1100 800"/><path d="M200 500 H1000"/><path d="M600 200 V800"/></g>
<rect x="160" y="440" width="880" height="12" fill="#fff"/><rect x="160" y="452" width="880" height="80" fill="#fff" opacity=".2"/>
<g transform="rotate(30 380 380)"><ellipse cx="380" cy="300" rx="80" ry="110" fill="none" stroke="${P}" stroke-width="16"/><rect x="372" y="405" width="16" height="200" rx="8" fill="${P}"/></g>
<g transform="rotate(-25 820 280)"><path d="M790 240 L850 240 L880 340 L760 340Z" fill="#fff"/><circle cx="820" cy="360" r="32" fill="#FFD9A0"/></g>`);
const news = () => svg(`<rect x="300" y="160" width="600" height="480" rx="24" fill="#fff"/><rect x="340" y="200" width="520" height="70" rx="10" fill="${N}"/>
<rect x="340" y="300" width="250" height="180" rx="10" fill="${P}"/><g fill="#E7E1DC">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="620" y="${300 + i * 32}" width="240" height="14" rx="7"/>`).join('')}${[0, 1, 2].map(i => `<rect x="340" y="${510 + i * 32}" width="520" height="14" rx="7"/>`).join('')}</g>`);

module.exports = function generatePlaceholders(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const all = {
    'bedroom-1': bedroom(P), 'bedroom-2': bedroom(N2, ['#EAF4F8', '#FFF8F4'], true), 'bedroom-3': bedroom('#F7B267', ['#FFF3E6', '#FFFAF6']),
    lounge: lounge(), kitchen: kitchen(), house: house(), keys: keys(), community: community(), lunch: lunch(), cricket: cricket(), badminton: badminton(), news: news(),
  };
  for (const [k, v] of Object.entries(all)) fs.writeFileSync(path.join(dir, `${k}.svg`), v);
};

if (require.main === module) module.exports(path.join(__dirname, '..', 'public', 'img', 'placeholders'));
