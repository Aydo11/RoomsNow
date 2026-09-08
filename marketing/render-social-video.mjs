import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "file:///C:/Users/woody/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const root = process.cwd();
const imagePath = path.join(root, "marketing", "assets", "roomsnow-hmo-checklist-background.png");
const logoPath = path.join(root, "public", "brand", "roomsnow-logo-white.svg");
const outputPath = path.join(root, "marketing", "assets", "roomsnow-hmo-viewing-checklist-reel.webm");
const previewPath = path.join(root, "marketing", "assets", "roomsnow-hmo-viewing-checklist-preview.png");

await mkdir(path.dirname(outputPath), { recursive: true });

const [imageBytes, logoBytes] = await Promise.all([readFile(imagePath), readFile(logoPath)]);
const background = `data:image/png;base64,${imageBytes.toString("base64")}`;
const logo = `data:image/svg+xml;base64,${logoBytes.toString("base64")}`;

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent("<canvas id='canvas' width='1080' height='1920'></canvas>");

  const base64Video = await page.evaluate(async ({ background, logo }) => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const loadImage = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

    const [photo, brandLogo] = await Promise.all([loadImage(background), loadImage(logo)]);
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm;codecs=vp8";
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const duration = 15_000;
    const startedAt = performance.now();
    let stopped = false;

    const drawRoundedPanel = (x, y, width, height, radius, fill) => {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fillStyle = fill;
      ctx.fill();
    };

    const wrapText = (text, x, y, maxWidth, lineHeight) => {
      const words = text.split(" ");
      let line = "";
      let lineY = y;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, lineY);
          line = word;
          lineY += lineHeight;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, x, lineY);
    };

    const render = (now) => {
      const elapsed = Math.min(now - startedAt, duration);
      const progress = elapsed / duration;
      const scale = 1.02 + progress * 0.08;
      const coverScale = Math.max(1080 / photo.width, 1920 / photo.height) * scale;
      const width = photo.width * coverScale;
      const height = photo.height * coverScale;
      const x = (1080 - width) / 2;
      const y = (1920 - height) / 2 - progress * 30;

      ctx.clearRect(0, 0, 1080, 1920);
      ctx.drawImage(photo, x, y, width, height);

      const shade = ctx.createLinearGradient(0, 0, 0, 1920);
      shade.addColorStop(0, "rgba(8, 38, 66, 0.76)");
      shade.addColorStop(0.30, "rgba(8, 38, 66, 0.10)");
      shade.addColorStop(0.68, "rgba(8, 38, 66, 0.12)");
      shade.addColorStop(1, "rgba(8, 38, 66, 0.88)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 1080, 1920);

      ctx.drawImage(brandLogo, 70, 58, 310, 78);
      ctx.textBaseline = "top";

      const phases = [
        { start: 0, end: 3.2, kicker: "ROOM VIEWING GUIDE", title: "Viewing an HMO room soon?", body: "Save this before you go." },
        { start: 3.2, end: 6.3, kicker: "CHECK THE ROOM", title: "Locks, damp, heating and storage", body: "Take notes and compare the advert." },
        { start: 6.3, end: 9.4, kicker: "CHECK SHARED SPACES", title: "Kitchen, bathrooms and fire safety", body: "Ask who manages repairs and cleaning." },
        { start: 9.4, end: 12.3, kicker: "CHECK THE COST", title: "Rent, bills, deposit and paperwork", body: "Get every important detail in writing." },
        { start: 12.3, end: 15.1, kicker: "FREE ROOMSNOW CHECKLIST", title: "Feel prepared before you choose", body: "roomsnow.co.uk/guides" },
      ];
      const seconds = elapsed / 1000;
      const phase = phases.find((item) => seconds >= item.start && seconds < item.end) ?? phases.at(-1);
      const phaseProgress = Math.min(1, Math.max(0, (seconds - phase.start) / 0.38));
      ctx.globalAlpha = phaseProgress;

      drawRoundedPanel(54, 1310, 972, 470, 32, "rgba(8, 38, 66, 0.88)");
      ctx.fillStyle = "#9dd4ff";
      ctx.font = "700 30px Arial";
      ctx.letterSpacing = "2px";
      ctx.fillText(phase.kicker, 102, 1368);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 62px Arial";
      wrapText(phase.title, 102, 1432, 870, 72);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "400 34px Arial";
      wrapText(phase.body, 102, 1628, 870, 46);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(54, 1838, 972 * Math.min(1, progress), 6);

      if (elapsed < duration) requestAnimationFrame(render);
      else if (!stopped) {
        stopped = true;
        recorder.stop();
      }
    };

    recorder.start(500);
    requestAnimationFrame(render);
    await new Promise((resolve) => { recorder.onstop = resolve; });
    const blob = new Blob(chunks, { type: mimeType });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const block = 0x8000;
    for (let i = 0; i < bytes.length; i += block) {
      binary += String.fromCharCode(...bytes.subarray(i, i + block));
    }
    return btoa(binary);
  }, { background, logo });

  await writeFile(outputPath, Buffer.from(base64Video, "base64"));
  const preview = await page.evaluate(async (encodedVideo) => {
    const video = document.createElement("video");
    video.muted = true;
    video.src = `data:video/webm;base64,${encodedVideo}`;
    await new Promise((resolve) => { video.onloadedmetadata = resolve; });
    video.currentTime = 7;
    await new Promise((resolve) => { video.onseeked = resolve; });
    const frame = document.createElement("canvas");
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.getContext("2d").drawImage(video, 0, 0);
    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      image: frame.toDataURL("image/png").split(",")[1],
    };
  }, base64Video);
  await writeFile(previewPath, Buffer.from(preview.image, "base64"));
  console.log(JSON.stringify({ outputPath, previewPath, duration: preview.duration, width: preview.width, height: preview.height }));
} finally {
  await browser.close();
}
