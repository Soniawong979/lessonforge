import { useRef, useState, type ChangeEvent } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useOutlineDraft } from './hooks/useOutlineDraft'
import type { OutlineSlide } from './types/outline'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const MAX_FILE_SIZE = 50 * 1024 * 1024

type ExtractedPage = {
  pageNumber: number
  text: string
}

type ExtractionProgress = {
  currentPage: number
  totalPages: number
}

const MAX_BULLET_LENGTH = 240
const MAX_BULLETS_PER_SLIDE = 5

function splitLongText(text: string): string[] {
  const characters = Array.from(text)
  const chunks: string[] = []

  while (characters.length > MAX_BULLET_LENGTH) {
    chunks.push(characters.splice(0, MAX_BULLET_LENGTH).join(''))
  }

  if (characters.length > 0) {
    chunks.push(characters.join(''))
  }

  return chunks.map((chunk) => chunk.trim()).filter(Boolean)
}

function splitPageIntoBullets(text: string): string[] {
  const paragraphs = text.split(/\n+/u).map((paragraph) => paragraph.trim())
  const bullets: string[] = []

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      continue
    }

    const sentences = paragraph
      .split(/(?<=[。！？.!?])\s*/u)
      .map((sentence) => sentence.trim())
      .filter(Boolean)

    for (const sentence of sentences) {
      bullets.push(...splitLongText(sentence))
    }
  }

  return bullets
}

function createInitialOutline(pages: ExtractedPage[]): OutlineSlide[] {
  const slides: OutlineSlide[] = []

  for (const page of pages) {
    const bullets = splitPageIntoBullets(page.text)

    for (
      let start = 0;
      start < bullets.length;
      start += MAX_BULLETS_PER_SLIDE
    ) {
      const slideBullets = bullets.slice(
        start,
        start + MAX_BULLETS_PER_SLIDE,
      )
      const firstBullet = slideBullets[0] ?? ''
      const title =
        firstBullet.length > 36
          ? `${firstBullet.slice(0, 36)}…`
          : firstBullet || `第 ${page.pageNumber} 页内容`

      slides.push({
        id: crypto.randomUUID(),
        title,
        bullets: slideBullets,
        sourcePageNumbers: [page.pageNumber],
      })
    }
  }

  return slides
}

function App() {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [pages, setPages] = useState<ExtractedPage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<ExtractionProgress | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [hasNoReadableText, setHasNoReadableText] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportErrorMessage, setExportErrorMessage] = useState('')
  const [exportStatusMessage, setExportStatusMessage] = useState('')
  const {
    draft,
    pendingDraft,
    saveStatus,
    recoveryStatus,
    storageError,
    replaceDraft,
    updateDraft,
    restorePendingDraft,
    dismissPendingDraft,
    deleteDraft,
  } = useOutlineDraft()
  const slides = draft?.slides ?? []
  const requestIdRef = useRef(0)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)
  const exportInProgressRef = useRef(false)
  const exportRequestIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) {
      return
    }

    const requestId = ++requestIdRef.current
    const previousTask = loadingTaskRef.current
    loadingTaskRef.current = null

    setSelectedFileName(file.name)
    setPages([])
    setProgress(null)
    setErrorMessage('')
    setHasNoReadableText(false)
    setExportErrorMessage('')
    setExportStatusMessage('')
    setIsLoading(false)

    const hasPdfExtension = /\.pdf$/i.test(file.name)
    const hasPdfMimeType = !file.type || file.type === 'application/pdf'

    if (!hasPdfExtension || !hasPdfMimeType) {
      setErrorMessage('请选择 PDF 文件（文件名需以 .pdf 结尾）。')
      return
    }

    if (file.size === 0) {
      setErrorMessage('这个文件为空，请选择有效的 PDF 文件。')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('文件大小不能超过 50 MB，请选择较小的 PDF 文件。')
      return
    }

    setIsLoading(true)

    try {
      if (previousTask) {
        await previousTask.destroy()
      }

      if (requestId !== requestIdRef.current) {
        return
      }

      const fileData = new Uint8Array(await file.arrayBuffer())

      if (requestId !== requestIdRef.current) {
        return
      }

      const loadingTask = pdfjsLib.getDocument({ data: fileData })
      loadingTaskRef.current = loadingTask
      const pdf = await loadingTask.promise
      const extractedPages: ExtractedPage[] = []

      setProgress({ currentPage: 0, totalPages: pdf.numPages })

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (requestId !== requestIdRef.current) {
          return
        }

        const page = await pdf.getPage(pageNumber)
        const textContent = await page.getTextContent()
        const text = textContent.items
          .map((item) =>
            'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '',
          )
          .join('')
          .replace(/[ \t]+\n/g, '\n')
          .trim()

        extractedPages.push({ pageNumber, text })
        setProgress({ currentPage: pageNumber, totalPages: pdf.numPages })
      }

      if (requestId === requestIdRef.current) {
        setPages(extractedPages)
        const initialOutline = createInitialOutline(extractedPages)
        replaceDraft(file.name, initialOutline)
        setHasNoReadableText(initialOutline.length === 0)
      }
    } catch (error: unknown) {
      if (requestId === requestIdRef.current) {
        const details =
          error instanceof Error ? ` ${error.message}` : ''
        setErrorMessage(
          `无法读取或解析这个 PDF。请确认文件有效且未受密码保护。${details}`,
        )
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingTaskRef.current = null
        setIsLoading(false)
      }
    }
  }

  function updateSlide(
    slideId: string,
    update: (slide: OutlineSlide) => OutlineSlide,
  ) {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      slides: currentDraft.slides.map((slide) =>
        slide.id === slideId ? update(slide) : slide,
      ),
    }))
  }

  function moveSlide(slideIndex: number, direction: -1 | 1) {
    updateDraft((currentDraft) => {
      const destination = slideIndex + direction
      if (
        destination < 0 ||
        destination >= currentDraft.slides.length
      ) {
        return currentDraft
      }

      const reordered = [...currentDraft.slides]
      ;[reordered[slideIndex], reordered[destination]] = [
        reordered[destination],
        reordered[slideIndex],
      ]
      return { ...currentDraft, slides: reordered }
    })
  }

  function addSlide() {
    updateDraft((currentDraft) => ({
      ...currentDraft,
      slides: [
        ...currentDraft.slides,
        {
          id: crypto.randomUUID(),
          title: '新幻灯片',
          bullets: [''],
          sourcePageNumbers: [],
        },
      ],
    }))
  }

  function handleSlideTitleChange(slideId: string, title: string) {
    updateSlide(slideId, (slide) => ({ ...slide, title }))
  }

  function handleBulletChange(
    slideId: string,
    bulletIndex: number,
    text: string,
  ) {
    updateSlide(slideId, (slide) => ({
      ...slide,
      bullets: slide.bullets.map((bullet, index) =>
        index === bulletIndex ? text : bullet,
      ),
    }))
  }

  async function handleExportPptx() {
    if (exportInProgressRef.current) {
      return
    }

    if (!draft || slides.length === 0) {
      setExportErrorMessage('当前没有可导出的幻灯片，请先添加幻灯片。')
      setExportStatusMessage('')
      return
    }

    const exportRequestId = ++exportRequestIdRef.current
    exportInProgressRef.current = true
    setIsExporting(true)
    setExportErrorMessage('')
    setExportStatusMessage('')

    const baseName = (draft.sourcePdfName ?? selectedFileName)
      .replace(/\.pdf$/i, '')
      .replace(/[<>:"/\\|?*]/g, '-')
      .trim()
      .slice(0, 80)
    const fileName = `${baseName || 'lessonforge'}-slides.pptx`

    try {
      const { exportOutlineToPptx } = await import('./utils/exportPptx')
      await exportOutlineToPptx(slides, fileName)
      if (exportRequestId === exportRequestIdRef.current) {
        setExportStatusMessage(`已生成并下载 ${fileName}`)
      }
    } catch (error: unknown) {
      if (exportRequestId === exportRequestIdRef.current) {
        const details = error instanceof Error ? ` ${error.message}` : ''
        setExportErrorMessage(`PPTX 导出失败，请稍后重试。${details}`)
      }
    } finally {
      if (exportRequestId === exportRequestIdRef.current) {
        exportInProgressRef.current = false
        setIsExporting(false)
      }
    }
  }

  async function handleDeleteDraft() {
    const confirmed = window.confirm(
      '确定删除本地草稿吗？这会同时清除当前编辑中的大纲，且无法撤销。',
    )
    if (!confirmed) {
      return
    }

    try {
      deleteDraft()
    } catch {
      return
    }

    const deletionRequestId = ++requestIdRef.current
    const previousTask = loadingTaskRef.current
    loadingTaskRef.current = null
    ++exportRequestIdRef.current
    exportInProgressRef.current = false

    setSelectedFileName('')
    setPages([])
    setIsLoading(false)
    setProgress(null)
    setErrorMessage('')
    setHasNoReadableText(false)
    setIsExporting(false)
    setExportErrorMessage('')
    setExportStatusMessage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (previousTask) {
      try {
        await previousTask.destroy()
      } catch {
        if (deletionRequestId === requestIdRef.current) {
          setErrorMessage('草稿已删除，但正在解析的 PDF 任务未能立即停止。')
        }
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>LessonForge</h1>
        <p className="subtitle">将教学 PDF 整理为可编辑的演示文稿</p>
      </header>

      {recoveryStatus === 'available' && pendingDraft && (
        <section
          className="draft-recovery"
          aria-labelledby="draft-recovery-heading"
        >
          <h2 id="draft-recovery-heading">发现本地草稿</h2>
          <p>
            {pendingDraft.sourcePdfName
              ? `来源 PDF：${pendingDraft.sourcePdfName}。`
              : '这是手动创建的大纲草稿。'}
            {' '}上次保存于{' '}
            {new Date(pendingDraft.updatedAt).toLocaleString()}。
            草稿不包含 PDF 原文件。
          </p>
          <div className="draft-actions">
            <button
              className="primary-button"
              type="button"
              onClick={restorePendingDraft}
            >
              恢复草稿
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={dismissPendingDraft}
            >
              暂不恢复
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={handleDeleteDraft}
            >
              删除本地草稿
            </button>
          </div>
        </section>
      )}

      {recoveryStatus === 'invalid' && (
        <section className="draft-notice" role="alert">
          <p>
            本地草稿数据损坏或版本不兼容，无法恢复。你可以删除损坏的草稿后继续使用。
          </p>
          <button
            className="danger-button"
            type="button"
            onClick={handleDeleteDraft}
          >
            删除本地草稿
          </button>
        </section>
      )}

      {recoveryStatus === 'unavailable' && (
        <p className="error-message" role="alert">
          无法读取浏览器本地存储。当前页面仍可使用，但草稿恢复和自动保存可能不可用。
          {storageError}
        </p>
      )}

      {storageError && !draft && recoveryStatus !== 'unavailable' && (
        <p className="error-message" role="alert">
          {storageError}
        </p>
      )}

      <section className="upload-panel" aria-labelledby="upload-heading">
        <h2 id="upload-heading">提取 PDF 文字</h2>
        <p className="upload-description">
          选择教学 PDF，按页查看可读取的文字。文件仅在浏览器本地处理，不会上传到服务器。
        </p>
        <label className="file-picker" htmlFor="pdf-file">
          <span>选择 PDF 文件</span>
          <input
            id="pdf-file"
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
          />
        </label>
        <p className="file-limit">仅支持 PDF 文件，大小上限为 50 MB。</p>

        {selectedFileName && (
          <p className="selected-file" aria-live="polite">
            当前文件：<strong>{selectedFileName}</strong>
          </p>
        )}
        {isLoading && (
          <p className="status-message" role="status">
            正在读取并提取文字
            {progress &&
              `（第 ${progress.currentPage} / ${progress.totalPages} 页）`}
            …
          </p>
        )}
        {errorMessage && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}
      </section>

      {hasNoReadableText && (
        <p className="empty-outline-message" role="status">
          PDF 已读取，但没有提取到可生成大纲的文字。扫描版 PDF 暂不支持 OCR。
        </p>
      )}

      {draft && (
        <section className="outline" aria-labelledby="outline-heading">
          <div className="results-header">
            <div>
              <h2 id="outline-heading">课件大纲（初稿）</h2>
              <p className="outline-description">
                根据每页提取文字的段落和句子切分生成，不代表已理解教学语义；请继续检查和编辑。
              </p>
              {draft.sourcePdfName && pages.length === 0 && (
                <p className="draft-source">
                  大纲来源 PDF：{draft.sourcePdfName}。PDF 文件不会保存在草稿中；重新上传后可查看原文。
                </p>
              )}
              <p
                className={`draft-save-status draft-save-status-${saveStatus}`}
                role="status"
              >
                {saveStatus === 'pending' && '有更改等待自动保存…'}
                {saveStatus === 'saving' && '正在保存草稿…'}
                {saveStatus === 'saved' && '草稿已保存到此浏览器'}
                {saveStatus === 'error' && '草稿保存失败'}
              </p>
              {storageError && recoveryStatus !== 'unavailable' && (
                <p className="error-message" role="alert">
                  {storageError}
                </p>
              )}
            </div>
            <div className="outline-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={addSlide}
              >
                添加幻灯片
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleExportPptx}
                disabled={isExporting || slides.length === 0}
              >
                {isExporting ? '正在导出…' : '导出 PPTX'}
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteDraft}
              >
                删除本地草稿
              </button>
            </div>
          </div>
          {exportStatusMessage && (
            <p className="export-status" role="status">
              {exportStatusMessage}
            </p>
          )}
          {exportErrorMessage && (
            <p className="error-message" role="alert">
              {exportErrorMessage}
            </p>
          )}
          {slides.length === 0 ? (
            <p className="empty-outline-message">
              当前大纲没有幻灯片。你可以添加一张空白幻灯片后再导出。
            </p>
          ) : (
            <div className="slide-list">
              {slides.map((slide, slideIndex) => (
              <article className="slide-card" key={slide.id}>
                <div className="slide-card-header">
                  <h3>幻灯片 {slideIndex + 1}</h3>
                  <div className="slide-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => moveSlide(slideIndex, -1)}
                      disabled={slideIndex === 0}
                      aria-label={`将幻灯片 ${slideIndex + 1} 上移`}
                    >
                      上移
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => moveSlide(slideIndex, 1)}
                      disabled={slideIndex === slides.length - 1}
                      aria-label={`将幻灯片 ${slideIndex + 1} 下移`}
                    >
                      下移
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() =>
                        updateDraft((currentDraft) => ({
                          ...currentDraft,
                          slides: currentDraft.slides.filter(
                            (currentSlide) => currentSlide.id !== slide.id,
                          ),
                        }))
                      }
                      aria-label={`删除幻灯片 ${slideIndex + 1}`}
                    >
                      删除幻灯片
                    </button>
                  </div>
                </div>

                <label className="editor-label" htmlFor={`title-${slide.id}`}>
                  标题
                  <textarea
                    id={`title-${slide.id}`}
                    className="editor-input title-input"
                    value={slide.title}
                    rows={2}
                    onChange={(event) =>
                      handleSlideTitleChange(slide.id, event.currentTarget.value)
                    }
                  />
                </label>

                <div className="bullet-editor">
                  <div className="bullet-editor-header">
                    <span className="editor-label">要点</span>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        updateSlide(slide.id, (currentSlide) => ({
                          ...currentSlide,
                          bullets: [...currentSlide.bullets, ''],
                        }))
                      }
                    >
                      添加要点
                    </button>
                  </div>
                  {slide.bullets.map((bullet, bulletIndex) => (
                    <div className="bullet-row" key={bulletIndex}>
                      <textarea
                        className="editor-input bullet-input"
                        aria-label={`幻灯片 ${slideIndex + 1} 要点 ${bulletIndex + 1}`}
                        value={bullet}
                        rows={2}
                        onChange={(event) =>
                          handleBulletChange(
                            slide.id,
                            bulletIndex,
                            event.currentTarget.value,
                          )
                        }
                      />
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() =>
                          updateSlide(slide.id, (currentSlide) => ({
                            ...currentSlide,
                            bullets: currentSlide.bullets.filter(
                              (_, currentIndex) => currentIndex !== bulletIndex,
                            ),
                          }))
                        }
                        aria-label={`删除幻灯片 ${slideIndex + 1} 的要点 ${bulletIndex + 1}`}
                      >
                        删除要点
                      </button>
                    </div>
                  ))}
                </div>

                <p className="slide-source">
                  来源 PDF 页码：
                  {slide.sourcePageNumbers.length > 0
                    ? slide.sourcePageNumbers.map((pageNumber, index) => (
                        <span key={pageNumber}>
                          {index > 0 ? '、' : ''}
                          第 {pageNumber} 页
                        </span>
                      ))
                    : '手动添加'}
                </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {pages.length > 0 && (
        <section className="results" aria-labelledby="results-heading">
          <div className="results-header">
            <h2 id="results-heading">提取结果</h2>
            <span>{pages.length} 页</span>
          </div>
          <p className="ocr-note">
            如果页面是扫描图片，本版本无法识别其中的文字（暂不支持 OCR）。
          </p>
          <div className="page-list">
            {pages.map((page) => (
              <article className="page-card" key={page.pageNumber}>
                <h3>第 {page.pageNumber} 页</h3>
                <p className="page-text">
                  {page.text || '本页未提取到可读取的文字。'}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
