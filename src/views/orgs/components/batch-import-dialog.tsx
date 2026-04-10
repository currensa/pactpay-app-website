import apis from '@/apis'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, CheckCircle, Download, Upload, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

type Step = 'upload' | 'preview' | 'importing' | 'result'

interface PreviewRow { cells: string[]; valid: boolean }
interface BatchResult {
  total: number; successCount: number; failCount: number
  results: Array<{ row: number; email: string; success: boolean; message: string }>
}

export function BatchImportDialog({ open, onOpenChange, onComplete }: Props) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [total, setTotal] = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<BatchResult | null>(null)

  const resetState = () => {
    setStep('upload'); setHeaders([]); setPreviewRows([]); setResult(null); setProgress({ current: 0, total: 0 })
  }

  const handleOpenChange = (val: boolean) => {
    if (!importing) { onOpenChange(val); if (!val) resetState() }
  }

  const parseCsvForPreview = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { total: 0, headers: [] as string[], rows: [] as PreviewRow[] }
    const hdrs = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const emailIdx = hdrs.findIndex(h => h.toLowerCase() === 'email')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/"/g, ''))
      const email = emailIdx >= 0 ? (cells[emailIdx] ?? '') : ''
      return { cells, valid: emailIdx < 0 || (!!email && emailRegex.test(email)) }
    })
    return { total: rows.length, headers: hdrs, rows }
  }

  const parseXlsxForPreview = (arrayBuffer: ArrayBuffer) => {
    const wb = XLSX.read(arrayBuffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
    if (data.length < 2) return { total: 0, headers: [] as string[], rows: [] as PreviewRow[] }
    const hdrs = (data[0] as string[]).map(h => String(h).trim())
    const emailIdx = hdrs.findIndex(h => h.toLowerCase() === 'email')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const dataRows = data.slice(1).filter(r => (r as string[]).some(c => String(c).trim()))
    const rows = dataRows.map(row => {
      const cells = (row as string[]).map(c => String(c ?? '').trim())
      const email = emailIdx >= 0 ? (cells[emailIdx] ?? '') : ''
      return { cells, valid: emailIdx < 0 || (!!email && emailRegex.test(email)) }
    })
    return { total: rows.length, headers: hdrs, rows }
  }

  const handleFile = (file: File) => {
    const isXlsx = file.name.endsWith('.xlsx')
    const isCsv = file.name.endsWith('.csv')
    if (!isXlsx && !isCsv) {
      toast({ title: 'Error', description: 'Please upload a CSV or XLSX file', variant: 'destructive' }); return
    }
    const reader = new FileReader()
    if (isXlsx) {
      reader.onload = e => {
        const { total: t, headers: h, rows } = parseXlsxForPreview(e.target?.result as ArrayBuffer)
        setTotal(t); setHeaders(h); setPreviewRows(rows); setStep('preview')
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = e => {
        const { total: t, headers: h, rows } = parseCsvForPreview(e.target?.result as string)
        setTotal(t); setHeaders(h); setPreviewRows(rows); setStep('preview')
      }
      reader.readAsText(file)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const { blob, filename } = await apis.organization.getInviteImportTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to download template', variant: 'destructive' })
    }
  }

  const handleConfirmImport = async () => {
    const activeHeaders = headers.map((h, idx) => ({ h, idx })).filter(({ h }) => h.trim() !== '')
    const emailIdx = activeHeaders.findIndex(({ h }) => h.toLowerCase() === 'email')
    const validRows = previewRows.filter(r => r.valid)
    if (validRows.length === 0) return

    setImporting(true)
    setProgress({ current: 0, total: validRows.length })
    setStep('importing')

    const results: BatchResult['results'] = []
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const payload: Record<string, string> = {}
      activeHeaders.forEach(({ h, idx }) => { payload[h] = row.cells[idx] ?? '' })
      const email = emailIdx >= 0 ? (row.cells[activeHeaders[emailIdx].idx] ?? '') : ''
      const rowNum = previewRows.indexOf(row) + 2
      try {
        await apis.organization.sendEmailInvitation(payload)
        results.push({ row: rowNum, email, success: true, message: '' })
      } catch (error: any) {
        results.push({ row: rowNum, email, success: false, message: error?.response?.data?.message || 'Failed' })
      }
      setProgress({ current: i + 1, total: validRows.length })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    setResult({ total: validRows.length, successCount, failCount, results })
    setImporting(false)
    setStep('result')
    onComplete()
  }

  const handleDownloadErrorReport = () => {
    if (!result) return
    const activeHeaders = headers.map((h, idx) => ({ h, idx })).filter(({ h }) => h.trim() !== '')
    const failedResults = result.results.filter(r => !r.success)
    const hdrs = [...activeHeaders.map(({ h }) => h), 'Error']
    const dataRows = failedResults.map(r => {
      const rowData = previewRows[r.row - 2]
      const activeCells = activeHeaders.map(({ idx }) => rowData ? (rowData.cells[idx] ?? '') : '')
      return [...activeCells, r.message || '']
    })
    const ws = XLSX.utils.aoa_to_sheet([hdrs, ...dataRows])
    ws['!cols'] = hdrs.map(h => ({ wch: Math.max(20, h.length + 4) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Errors')
    XLSX.writeFile(wb, 'import-error-report.xlsx')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[580px] p-[24px] gap-0 flex flex-col gap-[20px]">
        <DialogHeader className="p-0">
          <DialogTitle className="text-[16px] font-semibold leading-[24px] text-[#1c1c26]">Batch Import Members</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <>
            <button onClick={handleDownloadTemplate} className="flex items-center gap-[4px] text-[13px] font-semibold text-[#5e85ee] hover:opacity-80 transition-opacity w-fit">
              <Download className="h-[14px] w-[14px]" />
              Download Template
            </button>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-[10px] h-[200px] rounded-[12px] bg-[#f5f5f5] cursor-pointer transition-colors ${isDragging ? 'border-2 border-dashed border-[#5e85ee]' : 'hover:bg-[#ececec]'}`}
            >
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] bg-[#d2d2d4]">
                <Upload className="h-[24px] w-[24px] text-white" />
              </div>
              <div className="flex flex-col items-center gap-[2px]">
                <p className="text-[13px] leading-[20px] text-[#1c1c26]">Click or drag to upload file</p>
                <p className="text-[12px] leading-[18px] text-[#8d8d93]">Supports CSV / XLSX, Max 5MB</p>
              </div>
            </div>
            <input type="file" ref={fileInputRef} accept=".csv,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="flex items-center gap-[12px]">
              <p className="text-[14px] leading-[22px] text-[#1c1c26]">Total: {total} rows</p>
              <div className="flex items-center gap-[2px]">
                <CheckCircle className="h-[18px] w-[18px] text-[#5ddd22]" />
                <p className="text-[14px] leading-[22px] text-[#1c1c26]">Valid: {previewRows.filter(r => r.valid).length}</p>
              </div>
              <div className="flex items-center gap-[2px]">
                <XCircle className="h-[18px] w-[18px] text-[#d92b2b]" />
                <p className="text-[14px] leading-[22px] text-[#1c1c26]">Invalid: {previewRows.filter(r => !r.valid).length}</p>
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <p className="text-[11px] leading-[16px] text-[#8d8d93]">Preview of the first 10 items</p>
              <div className="border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden">
                <div className="overflow-y-auto max-h-[260px]">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0">
                      <tr className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.12)]">
                        {headers.filter(h => h.trim() !== '').map((h, i) => <th key={i} className="px-[14px] py-[5px] text-left text-[11px] leading-[16px] text-[#8d8d93] font-normal whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 10).map((row, i) => {
                        const activeHeaders = headers.map((h, idx) => ({ h, idx })).filter(({ h }) => h.trim() !== '')
                        const emailActiveIdx = activeHeaders.findIndex(({ h }) => h.toLowerCase() === 'email')
                        return (
                          <tr key={i} className={`border-b border-[rgba(0,0,0,0.12)] last:border-b-0 ${!row.valid ? 'bg-[rgba(217,43,43,0.04)]' : ''}`}>
                            {activeHeaders.map(({ idx }, j) => {
                              const cell = row.cells[idx] ?? ''
                              return (
                                <td key={j} className="px-[14px] py-[10px] text-[13px] leading-[20px] whitespace-nowrap">
                                  {j === emailActiveIdx && !row.valid ? (
                                    <div className="flex items-center gap-[4px]">
                                      <span className="text-[#d92b2b]">{cell || '—'}</span>
                                      <AlertCircle className="h-[12px] w-[12px] text-[#d92b2b] shrink-0" />
                                    </div>
                                  ) : (
                                    <span className="text-[#1c1c26]">{cell || '—'}</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-[10px]">
              <button onClick={() => setStep('upload')} className="rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors">Back</button>
              <button onClick={handleConfirmImport} disabled={importing} className="rounded-[12px] bg-[#5e85ee] px-[14px] py-[8px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60">Import</button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-[8px] h-[200px] w-full rounded-[12px] bg-[#f5f5f5]">
            <div className="h-[36px] w-[36px] animate-spin rounded-full border-[3px] border-[#5e85ee] border-t-transparent border-r-transparent" />
            <p className="text-[14px] leading-[22px] text-[#1c1c26]">Importing... {progress.current}/{progress.total}</p>
          </div>
        )}

        {step === 'result' && (
          <div className="flex flex-col items-center justify-center gap-[10px] h-[200px] w-full rounded-[12px] bg-[#f5f5f5]">
            {result?.failCount === 0 ? (
              <>
                <CheckCircle className="h-[52px] w-[52px] text-[#5ddd22]" strokeWidth={1.5} />
                <p className="text-[14px] leading-[22px] text-[#1c1c26]">{result.successCount} members imported successfully.</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-[52px] w-[52px] text-[#ffa800]" strokeWidth={1.5} />
                <p className="text-[14px] leading-[22px] text-[#1c1c26]">
                  {result?.successCount} successed, <span className="text-[#d92b2b]">{result?.failCount}</span> failed.
                </p>
                <button onClick={handleDownloadErrorReport} className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f0f0f0] transition-colors">
                  <Download className="h-[14px] w-[14px]" />
                  Download error report
                </button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
