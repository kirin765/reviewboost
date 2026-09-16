const path = require("path");
const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const fs = require("fs");

(async () => {
  const htmlPath = path.join(__dirname, "..", "docs", "naver-login", "서비스-소개-자료.html");
  const pdfPath = path.join(__dirname, "..", "docs", "naver-login", "서비스-소개-자료.pdf");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(600); // let images/fonts settle
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "13mm", right: "13mm" }
  });
  await browser.close();
  const sizeMB = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2);
  console.log("PDF OK:", pdfPath, sizeMB + "MB");
})().catch((e) => { console.error(String(e).slice(0, 2000)); process.exit(1); });
