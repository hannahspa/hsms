/**
 * Nén toàn bộ ảnh gallery từ 3-5MB xuống ~100-200KB.
 * Output: public/images/gallery-opt/ (cùng cấu trúc thư mục)
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SRC = 'public/images/gallery'
const OUT = 'public/images/gallery-opt'
const MAX_WIDTH = 1200
const QUALITY = 82

function walkDir(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('._')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      files.push(...walkDir(full))
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(e.name)) {
      files.push(full)
    }
  }
  return files
}

async function main() {
  const files = walkDir(SRC)
  console.log(`Tìm thấy ${files.length} ảnh\n`)

  let totalBefore = 0
  let totalAfter = 0
  let count = 0

  for (const srcPath of files) {
    const relPath = path.relative(SRC, srcPath)
    const outPath = path.join(OUT, relPath).replace(/\.(png|jpe?g|webp)$/i, '.jpg')

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outPath), { recursive: true })

    const beforeSize = fs.statSync(srcPath).size
    totalBefore += beforeSize

    try {
      await sharp(srcPath)
        .resize(MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(outPath)

      const afterSize = fs.statSync(outPath).size
      totalAfter += afterSize
      count++

      const pct = ((1 - afterSize / beforeSize) * 100).toFixed(0)
      const beforeKB = (beforeSize / 1024).toFixed(0)
      const afterKB = (afterSize / 1024).toFixed(0)
      console.log(`${pct}%  ${beforeKB}KB → ${afterKB}KB  ${relPath}`)
    } catch (err) {
      console.error(`LỖI: ${relPath} — ${err.message}`)
    }
  }

  const totalBeforeMB = (totalBefore / 1024 / 1024).toFixed(1)
  const totalAfterMB = (totalAfter / 1024 / 1024).toFixed(1)
  const savedPct = ((1 - totalAfter / totalBefore) * 100).toFixed(0)
  console.log(`\n──────────────────────────────`)
  console.log(`${count} ảnh  |  ${totalBeforeMB}MB → ${totalAfterMB}MB  |  Tiết kiệm ${savedPct}%`)
}

main()
