import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "file:///C:/Users/woody/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const root = process.cwd();
const outputDirectory = path.join(root, "marketing", "assets", "facebook");
await mkdir(outputDirectory, { recursive: true });

const logo = await readFile(path.join(root, "public", "brand", "roomsnow-logo-white.svg"));
const logoData = `data:image/svg+xml;base64,${logo.toString("base64")}`;

const posts = [
  {
    file: "roomsnow-room-viewing-checklist.png",
    image: "public/demo-listings/supported-bedroom.png",
    label: "FREE ROOM VIEWING GUIDE",
    title: "Viewing a room soon?",
    body: "Check the room, shared spaces, safety, costs and paperwork before you choose.",
    cta: "Read the free checklist",
    url: "roomsnow.co.uk/guides",
    position: "50% 48%",
  },
  {
    file: "roomsnow-referrer-search.png",
    image: "public/demo-listings/shared-kitchen.png",
    label: "FOR HOUSING PROFESSIONALS",
    title: "A clearer route to current vacancies",
    body: "Search by location, support need and availability, then contact the provider directly.",
    cta: "Search on RoomsNow",
    url: "roomsnow.co.uk",
    position: "50% 50%",
  },
  {
    file: "roomsnow-provider-listings.png",
    image: "public/locations/birmingham.webp",
    label: "FOR ACCOMMODATION PROVIDERS",
    title: "Make available rooms easier to find",
    body: "Keep vacancy details current and receive direct enquiries from people and referral teams.",
    cta: "List accommodation",
    url: "roomsnow.co.uk/advertise-accommodation",
    position: "50% 44%",
  },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const post of posts) {
    const photo = await readFile(path.join(root, post.image));
    const photoData = `data:image/${post.image.endsWith("webp") ? "webp" : "png"};base64,${photo.toString("base64")}`;
    await page.setContent(`
      <!doctype html><html><head><style>
      *{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:Arial,sans-serif;background:#eaf4fb}
      .card{position:relative;width:1080px;height:1350px;overflow:hidden;background:#092b49}
      .photo{position:absolute;inset:0 0 445px;background-image:url('${photoData}');background-size:cover;background-position:${post.position}}
      .photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,31,53,.04),rgba(7,31,53,.10) 62%,rgba(7,31,53,.95))}
      .logo{position:absolute;left:66px;top:55px;width:340px;height:auto;filter:drop-shadow(0 2px 8px rgba(0,0,0,.24))}
      .panel{position:absolute;left:0;right:0;bottom:0;min-height:520px;padding:54px 66px 54px;background:linear-gradient(135deg,#092b49,#105f9b)}
      .label{font-size:24px;letter-spacing:2.4px;font-weight:800;color:#a8d8ff;margin-bottom:22px}
      h1{font-size:62px;line-height:1.03;letter-spacing:-2.2px;color:white;margin:0 0 25px;max-width:930px}
      p{font-size:31px;line-height:1.32;color:rgba(255,255,255,.88);margin:0;max-width:900px}
      .footer{display:flex;justify-content:space-between;align-items:center;margin-top:38px;padding-top:30px;border-top:2px solid rgba(255,255,255,.20)}
      .cta{display:inline-block;background:white;color:#0b568c;font-weight:800;font-size:24px;padding:18px 25px;border-radius:14px}
      .url{color:white;font-size:22px;font-weight:700}
      .accent{position:absolute;right:-85px;bottom:305px;width:270px;height:270px;border-radius:50%;background:rgba(102,187,255,.18)}
      </style></head><body><main class="card"><div class="photo"></div><img class="logo" src="${logoData}"/><div class="accent"></div><section class="panel"><div class="label">${post.label}</div><h1>${post.title}</h1><p>${post.body}</p><div class="footer"><span class="cta">${post.cta}</span><span class="url">${post.url}</span></div></section></main></body></html>
    `, { waitUntil: "load" });
    await page.screenshot({ path: path.join(outputDirectory, post.file) });
  }
} finally {
  await browser.close();
}

console.log(`Created ${posts.length} Facebook images in ${outputDirectory}`);
