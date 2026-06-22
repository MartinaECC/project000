const { createWorker } = require('tesseract.js');

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    throw new Error('Usage: node ocr_page.js <image>');
  }

  const worker = await createWorker('chi_sim+eng');
  const { data } = await worker.recognize(imagePath);
  await worker.terminate();
  process.stdout.write(data.text || '');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
