// Replace disk reading logic with:
let pdfBase64: string | null = document.fileData || null;

if (!pdfBase64 && document.filePath) {
  const cleanRelative = document.filePath.replace(/^[/\\]+/, "");
  const diskPath = path.join(process.cwd(), "public", cleanRelative);
  if (fs.existsSync(diskPath)) {
    try {
      pdfBase64 = fs.readFileSync(diskPath).toString("base64");
    } catch (e) {}
  }
}