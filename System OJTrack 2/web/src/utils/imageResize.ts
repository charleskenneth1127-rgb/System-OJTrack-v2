/**
 * Downscales an image file to at most `maxDimension` px per side (preserving
 * aspect ratio) and re-encodes it as JPEG, using a canvas — no extra
 * dependency needed. Unlike image_picker on mobile, the browser File API has
 * no built-in resizing, so avatar uploads here would otherwise ship whatever
 * multi-megapixel file the user's OS file picker handed over.
 */
export async function resizeImageFile(file: File, maxDimension: number, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob || file
  } finally {
    bitmap.close()
  }
}
