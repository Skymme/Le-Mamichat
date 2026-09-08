/**
 * Reduit les photos trop grandes pour l'usage qu'on en fait.
 *
 * Les images de la vente flash sortaient a 1900 px de large pour etre
 * affichees dans une vignette de 200 px : 17 Mo pour huit objets. On les
 * ramene a une largeur raisonnable, qui reste confortable a la loupe et a
 * l'impression.
 *
 *   npm run images                    traite public/images/vente-flash
 *   node scripts/images.mjs a b c     traite ces dossiers-la
 *
 * Le dossier est passe en argument A DESSEIN : le carnet de Tunisie et la
 * carte, eux, doivent garder leur definition -- on les ouvre a la loupe pour
 * lire l'ecriture.
 *
 * PNG 8 bits non entrelace, avec ou sans canal alpha. Reduction par moyenne
 * de boite : pour un agrandissement il faudrait autre chose, mais on ne fait
 * que reduire.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'

/** Largeur maximale : ~270 dpi pour une carte de 85 mm sur le papier. */
const MAX_WIDTH = 900
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

// --- CRC32, tel que le specifie le format PNG -----------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'latin1')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), data.length + 8)
  return out
}

// --- Lecture ---------------------------------------------------------------
function decode(file) {
  const buf = readFileSync(file)
  if (!buf.subarray(0, 8).equals(SIG)) return null

  const idat = []
  let width = 0
  let height = 0
  let canaux = 3
  let pos = 8

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || (data[9] !== 2 && data[9] !== 6) || data[12] !== 0) return null
      canaux = data[9] === 6 ? 4 : 3
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    pos += len + 12
  }

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = canaux
  const stride = width * bpp
  const px = Buffer.alloc(height * stride)

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const cur = px.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null

    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0
      const b = prev ? prev[i] : 0
      const c = prev && i >= bpp ? prev[i - bpp] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[i] = v & 0xff
    }
  }

  return { width, height, px, canaux }
}

/** Moyenne de boite : chaque pixel d'arrivee est la moyenne de sa zone source. */
function resample({ width, height, px, canaux }, w, h) {
  const out = Buffer.alloc(w * h * canaux)
  const sx = width / w
  const sy = height / h

  for (let y = 0; y < h; y += 1) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.min(height, Math.ceil((y + 1) * sy)))

    for (let x = 0; x < w; x += 1) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.min(width, Math.ceil((x + 1) * sx)))

      const somme = [0, 0, 0, 0]
      let n = 0
      for (let yy = y0; yy < y1; yy += 1) {
        let o = (yy * width + x0) * canaux
        for (let xx = x0; xx < x1; xx += 1) {
          for (let c = 0; c < canaux; c += 1) somme[c] += px[o + c]
          o += canaux
          n += 1
        }
      }

      const d = (y * w + x) * canaux
      for (let c = 0; c < canaux; c += 1) out[d + c] = (somme[c] / n + 0.5) | 0
    }
  }

  return out
}

/** Filtre Paeth sur chaque ligne : c'est celui qui comprime le mieux une photo. */
function encode(file, px, w, h, canaux) {
  const stride = w * canaux
  const raw = Buffer.alloc(h * (stride + 1))

  for (let y = 0; y < h; y += 1) {
    const off = y * (stride + 1)
    raw[off] = 4
    for (let i = 0; i < stride; i += 1) {
      const a = i >= canaux ? px[y * stride + i - canaux] : 0
      const b = y > 0 ? px[(y - 1) * stride + i] : 0
      const c = y > 0 && i >= canaux ? px[(y - 1) * stride + i - canaux] : 0
      const p = a + b - c
      const pa = Math.abs(p - a)
      const pb = Math.abs(p - b)
      const pc = Math.abs(p - c)
      const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      raw[off + 1 + i] = (px[y * stride + i] - pred) & 0xff
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = canaux === 4 ? 6 : 2

  writeFileSync(file, Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]))
}

const dossiers = process.argv.slice(2)
if (dossiers.length === 0) dossiers.push('public/images/vente-flash')

let avantTotal = 0
let apresTotal = 0

for (const dossier of dossiers) {
  for (const nom of readdirSync(dossier)) {
    if (!nom.toLowerCase().endsWith('.png')) continue
    const fichier = join(dossier, nom)

    const img = decode(fichier)
    if (!img) {
      console.log(`  ${nom} : format non gere, laisse tel quel`)
      continue
    }
    if (img.width <= MAX_WIDTH) {
      console.log(`  ${nom} : deja sous ${MAX_WIDTH} px, laisse tel quel`)
      continue
    }

    const avant = statSync(fichier).size
    const w = MAX_WIDTH
    const h = Math.max(1, Math.round((img.height * w) / img.width))
    encode(fichier, resample(img, w, h), w, h, img.canaux)
    const apres = statSync(fichier).size

    avantTotal += avant
    apresTotal += apres
    console.log(
      `  ${nom.padEnd(34)} ${img.width}x${img.height} -> ${w}x${h}` +
      `   ${(avant / 1024) | 0} Ko -> ${(apres / 1024) | 0} Ko`,
    )
  }
}

if (avantTotal) {
  console.log(
    `\nTotal : ${(avantTotal / 1024 / 1024).toFixed(1)} Mo -> ` +
    `${(apresTotal / 1024 / 1024).toFixed(1)} Mo`,
  )
}
