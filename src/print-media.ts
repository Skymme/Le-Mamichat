/**
 * Equivalents papier des medias interactifs.
 *
 * Chaque bloc declare ses propres titre, consigne, apercu et QR. Ainsi le
 * PDF garde le bon contexte sans dupliquer un gabarit pour chaque video.
 */
function value(element: HTMLElement, name: string): string | null {
  const content = element.dataset[name]
  return content && content.trim() ? content.trim() : null
}

function image(className: string, source: string): HTMLImageElement {
  const element = document.createElement('img')
  element.className = className
  element.src = source
  element.alt = ''
  return element
}

export function setupPrintMedia(): void {
  document.querySelectorAll<HTMLElement>('[data-print-media]').forEach((media) => {
    const title = value(media, 'printTitle')
    const description = value(media, 'printDescription')
    const preview = value(media, 'printPreview')
    const qr = value(media, 'printQr')

    if (!title || !description || !preview || !qr) return

    const reel = document.createElement('div')
    reel.className = 'reel'
    reel.setAttribute('aria-hidden', 'true')
    reel.append(image('reel__still', preview))

    const foot = document.createElement('div')
    foot.className = 'reel__foot'
    foot.append(image('reel__qr', qr))

    const copy = document.createElement('p')
    copy.className = 'reel__copy'

    const heading = document.createElement('b')
    heading.textContent = title

    const instruction = document.createElement('span')
    instruction.textContent = description

    copy.append(heading, instruction)
    foot.append(copy)
    reel.append(foot)

    const caption = media.querySelector('figcaption')
    if (caption) media.insertBefore(reel, caption)
    else media.append(reel)
  })
}
