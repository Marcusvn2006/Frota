// Confere os bytes iniciais do arquivo (magic numbers) em vez de confiar no
// Content-Type declarado pelo cliente. O bucket "fotos-vistoria" restringe
// MIME types, mas essa checagem do Storage valida o Content-Type que NÓS
// enviamos no upload — se confiarmos cegamente em `file.type`, alguém pode
// mandar bytes arbitrários rotulados como "image/jpeg" e a restrição do
// bucket não pega nada. Aqui a verdade vem do conteúdo, não do rótulo.
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((b, i) => bytes[i] === b);
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Retorna o MIME real do arquivo pelos primeiros bytes, ou null se não for uma imagem JPEG/PNG/WEBP reconhecida. */
export function sniffImageMime(buffer: ArrayBuffer): ImageMime | null {
  const bytes = new Uint8Array(buffer.slice(0, 12));

  if (matchesSignature(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (matchesSignature(bytes, PNG_SIGNATURE)) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
