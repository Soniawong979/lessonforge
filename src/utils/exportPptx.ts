import PptxGenJS from 'pptxgenjs'
import type { OutlineSlide } from '../types/outline'

const CONTENT_X = 0.9
const CONTENT_WIDTH = 11.55
const CONTENT_TOP = 1.85
const CONTENT_BOTTOM = 6.85
const MAX_BODY_FONT_SIZE = 22
const MIN_BODY_FONT_SIZE = 9
const ESTIMATED_CHARACTERS_PER_LINE = 82
const LINE_HEIGHT_FACTOR = 1.35
const BULLET_GAP = 0.12

function estimateLineCount(text: string): number {
  return text.split('\n').reduce((total, line) => {
    const width = Array.from(line).reduce(
      (sum, character) =>
        sum + (character.codePointAt(0)! > 0x2e7f ? 2 : 1),
      0,
    )
    return total + Math.max(1, Math.ceil(width / ESTIMATED_CHARACTERS_PER_LINE))
  }, 0)
}

function calculateBodyFontSize(bullets: string[]): number {
  if (bullets.length === 0) {
    return MAX_BODY_FONT_SIZE
  }

  const totalLines = bullets.reduce(
    (total, bullet) => total + estimateLineCount(bullet),
    0,
  )
  const availableHeight =
    CONTENT_BOTTOM - CONTENT_TOP - BULLET_GAP * (bullets.length - 1)
  const estimatedFontSize =
    (availableHeight * 72) / (totalLines * LINE_HEIGHT_FACTOR)

  return Math.max(
    MIN_BODY_FONT_SIZE,
    Math.min(MAX_BODY_FONT_SIZE, estimatedFontSize),
  )
}

function addSlideContent(
  slide: PptxGenJS.Slide,
  outlineSlide: OutlineSlide,
  slideNumber: number,
  slideCount: number,
) {
  const title = outlineSlide.title.trim()
    ? outlineSlide.title
    : '（未命名标题）'
  slide.addText(title, {
    x: 0.8,
    y: 0.55,
    w: 11.85,
    h: 1.1,
    fontFace: 'Microsoft YaHei',
    fontSize: 30,
    bold: true,
    color: '182230',
    margin: 0,
    breakLine: false,
    valign: 'middle',
    fit: 'shrink',
    objectName: `幻灯片 ${slideNumber} 标题`,
  })

  const bullets = outlineSlide.bullets.filter((bullet) => bullet.trim().length > 0)
  if (bullets.length > 0) {
    const fontSize = calculateBodyFontSize(bullets)
    let y = CONTENT_TOP

    for (const [index, bullet] of bullets.entries()) {
      const lineCount = estimateLineCount(bullet)
      const height = Math.max(
        0.34,
        (lineCount * fontSize * LINE_HEIGHT_FACTOR) / 72,
      )

      slide.addText(bullet, {
        x: CONTENT_X,
        y,
        w: CONTENT_WIDTH,
        h: height,
        fontFace: 'Microsoft YaHei',
        fontSize,
        color: '344054',
        margin: 0.04,
        breakLine: false,
        valign: 'middle',
        fit: 'shrink',
        bullet: { indent: fontSize },
        objectName: `幻灯片 ${slideNumber} 要点 ${index + 1}`,
      })

      y += height + BULLET_GAP
    }
  }

  slide.addText(`${slideNumber} / ${slideCount}`, {
    x: 11.8,
    y: 7.05,
    w: 0.75,
    h: 0.2,
    fontFace: 'Microsoft YaHei',
    fontSize: 9,
    color: '667085',
    align: 'right',
    margin: 0,
    objectName: `幻灯片 ${slideNumber} 页码`,
  })
}

export async function exportOutlineToPptx(
  slides: OutlineSlide[],
  fileName: string,
): Promise<void> {
  if (slides.length === 0) {
    throw new Error('大纲为空，无法导出 PPTX。')
  }

  const presentation = new PptxGenJS()
  presentation.layout = 'LAYOUT_WIDE'
  presentation.author = 'LessonForge'
  presentation.subject = '由 LessonForge 编辑的大纲'
  presentation.title = 'LessonForge 课件'
  presentation.theme = {
    headFontFace: 'Microsoft YaHei',
    bodyFontFace: 'Microsoft YaHei',
  }

  slides.forEach((outlineSlide, index) => {
    const slide = presentation.addSlide()
    slide.background = { color: 'FFFFFF' }
    addSlideContent(slide, outlineSlide, index + 1, slides.length)
  })

  await presentation.writeFile({ fileName })
}
