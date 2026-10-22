import { useRef, useState, type ChangeEvent } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
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

function App() {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [pages, setPages] = useState<ExtractedPage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<ExtractionProgress | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const requestIdRef = useRef(0)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)

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

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>LessonForge</h1>
        <p className="subtitle">将教学 PDF 整理为可编辑的演示文稿</p>
      </header>

      <section className="upload-panel" aria-labelledby="upload-heading">
        <h2 id="upload-heading">提取 PDF 文字</h2>
        <p className="upload-description">
          选择教学 PDF，按页查看可读取的文字。文件仅在浏览器本地处理，不会上传到服务器。
        </p>
        <label className="file-picker" htmlFor="pdf-file">
          <span>选择 PDF 文件</span>
          <input
            id="pdf-file"
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
