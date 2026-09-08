/**
 * Grave les QR codes du journal, une fois pour toutes.
 *
 * Un QR est une image fixe : le generer dans le navigateur a chaque impression
 * obligeait a embarquer une bibliotheque de 25 ko dans le journal, et ne
 * fonctionnait que si le lecteur passait par le bouton -- un Ctrl+P donnait un
 * cadre vide. On le fabrique donc ici, et le journal se contente d'un <img>.
 *
 *   npm run qr        regenere les images
 *
 * A relancer seulement si une adresse change ci-dessous.
 */
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import QRCode from 'qrcode'

/** Une entree = un fichier a graver. */
const CODES = [
  {
    fichier: 'public/images/divers/qr-antartica.png',
    url: 'https://photos.er-974.com/s/mamicha-video',
    quoi: 'le film Antartica',
  },
  {
    fichier: 'public/images/divers/qr-mistinguette.png',
    url: 'https://photos.er-974.com/api/assets/c3c7624c-2832-4496-8749-a3a60e0a5504/video/playback?slug=mistinguette&c=k1kGHIZwO3qwiWpiq3b2vMa%2Fag%3D%3D',
    quoi: 'la vidéo des 70 ans',
  },
  {
    fichier: 'public/images/divers/qr-marilou-qi-gong.png',
    url: 'https://photos.er-974.com/api/assets/ce547e35-df1f-4e75-b8d5-1d177b3619a3/video/playback?slug=marilou-qi-gong&c=o9cNJIaHZ4iAh3h1iIhncGQGZw%3D%3D',
    quoi: 'la séance de Qi Gong avec Marilou',
  },
  {
    fichier: 'public/images/divers/qr-goulette-marsa.png',
    url: null,
    quoi: 'la musique Tunis Goulette Marsa (QR fourni)',
  },
]

// Correction d'erreur haute : un QR imprime puis photographie de travers, sur
// du papier qui aura vecu, doit rester lisible.
const OPTIONS = {
  width: 640,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: { dark: '#1F1B16', light: '#F6F1E7' },
}

for (const { fichier, url, quoi } of CODES) {
  if (!url) {
    console.log(`${fichier}  conserve (${quoi})`)
    continue
  }

  await mkdir(dirname(fichier), { recursive: true })
  await QRCode.toFile(fichier, url, OPTIONS)
  console.log(`${fichier}  ->  ${url}  (${quoi})`)
}
