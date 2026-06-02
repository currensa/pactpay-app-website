import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/utils/i18n'
import { IconCamera } from '@tabler/icons-react'
import { Loader2, RotateCcw, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

type ValidationErrorKind = 'size' | 'type' | 'crop'
type Variant = 'avatar' | 'logo'

interface CroppedImagePayload {
  file: File
  previewUrl: string
}

interface ImageCropUploadProps {
  imageUrl?: string | null
  alt: string
  fallback: string
  variant: Variant
  helperText?: string
  actionLabel?: string
  uploading?: boolean
  disabled?: boolean
  maxFileSizeMb?: number
  acceptedMimeTypes?: string[]
  previewWrapperClassName?: string
  onCropped: (payload: CroppedImagePayload) => void | Promise<void>
  onValidationError?: (kind: ValidationErrorKind) => void
}

const CROP_SIZE = 320
const OUTPUT_SIZE = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.01
const MIN_ROTATION = -180
const MAX_ROTATION = 180
const ROTATION_STEP = 1

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function degToRad(value: number) {
  return (value * Math.PI) / 180
}

function getRotatedBounds(width: number, height: number, rotation: number, scale: number) {
  const rad = degToRad(rotation)
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))

  return {
    width: (width * cos + height * sin) * scale,
    height: (width * sin + height * cos) * scale,
  }
}

function getBaseScale(width: number, height: number, rotation: number) {
  const bounds = getRotatedBounds(width, height, rotation, 1)
  return Math.max(CROP_SIZE / bounds.width, CROP_SIZE / bounds.height)
}

function clampOffset(
  offset: { x: number; y: number },
  naturalWidth: number,
  naturalHeight: number,
  rotation: number,
  scale: number,
) {
  const bounds = getRotatedBounds(naturalWidth, naturalHeight, rotation, scale)
  return {
    x: clamp(offset.x, -(bounds.width - CROP_SIZE) / 2, (bounds.width - CROP_SIZE) / 2),
    y: clamp(offset.y, -(bounds.height - CROP_SIZE) / 2, (bounds.height - CROP_SIZE) / 2),
  }
}

function buildCroppedFilename(filename: string, mimeType: string) {
  const baseName = filename.replace(/\.[^/.]+$/, '')
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  return `${baseName || 'image'}-cropped.${extension}`
}

async function loadImage(sourceUrl: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image for crop'))
    image.src = sourceUrl
  })
}

async function createCroppedFile(params: {
  sourceUrl: string
  filename: string
  mimeType: string
  naturalWidth: number
  naturalHeight: number
  scale: number
  rotation: number
  offset: { x: number; y: number }
}) {
  const { sourceUrl, filename, mimeType, naturalWidth, naturalHeight, scale, rotation, offset } = params
  const image = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  const stageRatio = OUTPUT_SIZE / CROP_SIZE
  context.translate(OUTPUT_SIZE / 2 + offset.x * stageRatio, OUTPUT_SIZE / 2 + offset.y * stageRatio)
  context.rotate(degToRad(rotation))
  context.scale(scale * stageRatio, scale * stageRatio)
  context.drawImage(image, -naturalWidth / 2, -naturalHeight / 2, naturalWidth, naturalHeight)

  const outputType = mimeType === 'image/png' || mimeType === 'image/webp' ? mimeType : 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blobValue => {
      if (!blobValue) {
        reject(new Error('Failed to create cropped image blob'))
        return
      }
      resolve(blobValue)
    }, outputType, outputType === 'image/jpeg' ? 0.92 : undefined)
  })

  return new File([blob], buildCroppedFilename(filename, outputType), { type: outputType })
}

export function ImageCropUpload({
  imageUrl,
  alt,
  fallback,
  variant,
  helperText,
  actionLabel,
  uploading = false,
  disabled = false,
  maxFileSizeMb = 2,
  acceptedMimeTypes,
  previewWrapperClassName,
  onCropped,
  onValidationError,
}: ImageCropUploadProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const cropMaskId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropStageRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const [cropOpen, setCropOpen] = useState(false)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceFilename, setSourceFilename] = useState('image')
  const [sourceMimeType, setSourceMimeType] = useState('image/jpeg')
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [rotation, setRotation] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [savingCrop, setSavingCrop] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const accept = useMemo(
    () => acceptedMimeTypes?.join(',') ?? 'image/png,image/jpeg,image/jpg,image/webp',
    [acceptedMimeTypes],
  )

  const baseScale = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) return 1
    return getBaseScale(naturalSize.width, naturalSize.height, rotation)
  }, [naturalSize.height, naturalSize.width, rotation])

  const scale = baseScale * zoom
  const imageTransform = `translate3d(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px), 0) rotate(${rotation}deg) scale(${scale})`
  const cropViewportSize = isMobile ? 280 : CROP_SIZE
  const cropViewportRadius = 28
  const previewScale = cropViewportSize / CROP_SIZE
  const previewTransform = `translate3d(calc(-50% + ${offset.x * previewScale}px), calc(-50% + ${offset.y * previewScale}px), 0) rotate(${rotation}deg) scale(${scale * previewScale})`
  const stageHeight = isMobile ? 316 : 360
  const stageMaxWidth = isMobile ? 520 : 560
  const overlayInsetY = (stageHeight - cropViewportSize) / 2
  const overlayInsetX = cropViewportSize / 2

  const updateZoom = (nextZoom: number, nextRotation = rotation) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    const nextScale = baseScale * clampedZoom
    setZoom(clampedZoom)
    setOffset(current => clampOffset(current, naturalSize.width, naturalSize.height, nextRotation, nextScale))
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      setOffset(
        clampOffset(
          {
            x: dragState.originX + (event.clientX - dragState.startX),
            y: dragState.originY + (event.clientY - dragState.startY),
          },
          naturalSize.width,
          naturalSize.height,
          rotation,
          scale,
        ),
      )
    }

    const handlePointerUp = () => {
      dragStateRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isDragging, naturalSize.height, naturalSize.width, rotation, scale])

  useEffect(() => {
    if (!cropOpen) {
      setNaturalSize({ width: 0, height: 0 })
      setZoom(MIN_ZOOM)
      setRotation(0)
      setOffset({ x: 0, y: 0 })
      setIsDragging(false)
      dragStateRef.current = null
      return
    }

    setOffset(current => clampOffset(current, naturalSize.width, naturalSize.height, rotation, scale))
  }, [cropOpen, naturalSize.height, naturalSize.width, rotation, scale])

  const handleSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const isAllowedType = acceptedMimeTypes?.length
      ? acceptedMimeTypes.includes(file.type)
      : file.type.startsWith('image/')

    if (!isAllowedType) {
      onValidationError?.('type')
      return
    }

    if (file.size > maxFileSizeMb * 1024 * 1024) {
      onValidationError?.('size')
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Failed to read selected file'))
      reader.readAsDataURL(file)
    }).catch(() => null)

    if (!dataUrl) {
      onValidationError?.('crop')
      return
    }

    setSourceUrl(dataUrl)
    setSourceFilename(file.name)
    setSourceMimeType(file.type || 'image/jpeg')
    setCropOpen(true)
  }

  const handleCropConfirm = async () => {
    if (!sourceUrl || !naturalSize.width || !naturalSize.height || savingCrop) return

    try {
      setSavingCrop(true)
      const croppedFile = await createCroppedFile({
        sourceUrl,
        filename: sourceFilename,
        mimeType: sourceMimeType,
        naturalWidth: naturalSize.width,
        naturalHeight: naturalSize.height,
        scale,
        rotation,
        offset,
      })

      const previewUrl = URL.createObjectURL(croppedFile)
      await onCropped({ file: croppedFile, previewUrl })
      setCropOpen(false)
    } catch {
      onValidationError?.('crop')
    } finally {
      setSavingCrop(false)
    }
  }

  const resetTransform = () => {
    setZoom(MIN_ZOOM)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
  }

  const openFilePicker = () => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }

  const renderAvatar = () => (
    <div className="flex flex-col items-center gap-[6px]">
      <button
        type="button"
        onClick={openFilePicker}
        disabled={disabled || uploading}
        className={cn(
          'group relative flex items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[rgba(0,0,0,0.12)] bg-[#f5f5f5] transition-colors hover:border-[#5e85ee] disabled:cursor-not-allowed disabled:opacity-60',
          previewWrapperClassName,
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[28px] font-bold text-[#8d8d93]">
            {fallback}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? <Loader2 className="h-[20px] w-[20px] animate-spin text-white" /> : <IconCamera className="h-[20px] w-[20px] text-white" />}
        </div>
      </button>
      {actionLabel ? (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={disabled || uploading}
          className="text-[12px] leading-[18px] text-[#1c1c26] transition-colors hover:text-[#5e85ee] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
        </button>
      ) : null}
      {helperText ? <p className="text-[12px] leading-[18px] text-[#8d8d93]">{helperText}</p> : null}
    </div>
  )

  const renderLogo = () => (
    <div className="flex items-start gap-[14px]">
      <button
        type="button"
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#1c1c26]',
          previewWrapperClassName,
        )}
        onClick={openFilePicker}
        disabled={disabled || uploading}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span className="select-none text-[28px] font-semibold text-white">{fallback}</span>
        )}
      </button>
      <div className="flex flex-col gap-[8px]">
        {actionLabel ? (
          <button
            type="button"
            onClick={openFilePicker}
            disabled={disabled || uploading}
            className="flex w-fit items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : <Upload className="h-[14px] w-[14px]" />}
            {actionLabel}
          </button>
        ) : null}
        {helperText ? <p className="text-[12px] leading-[18px] text-[#bbbbbe]">{helperText}</p> : null}
      </div>
    </div>
  )

  return (
    <>
      {variant === 'avatar' ? renderAvatar() : renderLogo()}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={event => void handleSelectFile(event)}
      />

      <Dialog open={cropOpen} onOpenChange={open => !savingCrop && setCropOpen(open)}>
        <DialogContent className="max-w-[620px] rounded-[24px] p-[14px] sm:p-[20px]">
          <DialogHeader className="gap-[4px]">
            <DialogTitle>{t('common.imageCrop.title')}</DialogTitle>
            <DialogDescription>{t('common.imageCrop.description')}</DialogDescription>
          </DialogHeader>

          <div className="mt-[12px] flex flex-col gap-[12px]">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,#f7f8fb_0%,#eef2ff_100%)] p-[8px] sm:p-[12px]">
              <div
                ref={cropStageRef}
                className={cn(
                  'relative mx-auto w-full overflow-hidden rounded-[20px] bg-[#dde4ff] touch-none',
                  isDragging ? 'cursor-grabbing' : 'cursor-grab',
                )}
                style={{
                  height: `${stageHeight}px`,
                  maxWidth: `${stageMaxWidth}px`,
                }}
                onPointerDown={event => {
                  if (!naturalSize.width || !naturalSize.height) return
                  event.preventDefault()
                  cropStageRef.current?.setPointerCapture?.(event.pointerId)
                  dragStateRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: offset.x,
                    originY: offset.y,
                  }
                  setIsDragging(true)
                }}
                onWheel={event => {
                  event.preventDefault()
                  if (!naturalSize.width || !naturalSize.height) return
                  const delta = event.deltaY > 0 ? -0.08 : 0.08
                  updateZoom(zoom + delta)
                }}
              >
                {sourceUrl ? (
                  <img
                    src={sourceUrl}
                    alt={alt}
                    draggable={false}
                    onLoad={event => {
                      const image = event.currentTarget
                      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight })
                      setZoom(MIN_ZOOM)
                      setRotation(0)
                      setOffset({ x: 0, y: 0 })
                    }}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: `${naturalSize.width}px`,
                      height: `${naturalSize.height}px`,
                      transform: previewTransform,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                    }}
                  />
                ) : null}

                <div className="pointer-events-none absolute inset-0">
                  <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${stageMaxWidth} ${stageHeight}`} preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <mask id={cropMaskId}>
                        <rect width={stageMaxWidth} height={stageHeight} fill="white" />
                        <rect
                          x={(stageMaxWidth - cropViewportSize) / 2}
                          y={overlayInsetY}
                          width={cropViewportSize}
                          height={cropViewportSize}
                          rx={cropViewportRadius}
                          fill="black"
                        />
                      </mask>
                    </defs>
                    <rect width={stageMaxWidth} height={stageHeight} fill="rgba(15,23,42,0.55)" mask={`url(#${cropMaskId})`} />
                  </svg>

                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: `${cropViewportSize}px`,
                      height: `${cropViewportSize}px`,
                    }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-transparent">
                      {sourceUrl ? (
                        <img
                          src={sourceUrl}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          className="absolute left-1/2 top-1/2 max-w-none select-none"
                          style={{
                            width: `${naturalSize.width}px`,
                            height: `${naturalSize.height}px`,
                            transform: previewTransform,
                            transformOrigin: 'center center',
                            willChange: 'transform',
                          }}
                        />
                      ) : null}

                      <div className="absolute left-1/3 top-0 h-full w-px bg-white/35" />
                      <div className="absolute left-2/3 top-0 h-full w-px bg-white/35" />
                      <div className="absolute left-0 top-1/3 h-px w-full bg-white/35" />
                      <div className="absolute left-0 top-2/3 h-px w-full bg-white/35" />
                    </div>

                    <svg
                      className="absolute inset-0 h-full w-full"
                      viewBox={`0 0 ${cropViewportSize} ${cropViewportSize}`}
                      fill="none"
                      aria-hidden="true"
                    >
                      <rect
                        x="0.5"
                        y="0.5"
                        width={cropViewportSize - 1}
                        height={cropViewportSize - 1}
                        rx={cropViewportRadius}
                        stroke="rgba(255,255,255,0.8)"
                      />
                      <path d={`M ${cropViewportSize / 3} 0 L ${cropViewportSize / 3} ${cropViewportSize}`} stroke="rgba(255,255,255,0.35)" />
                      <path d={`M ${(cropViewportSize * 2) / 3} 0 L ${(cropViewportSize * 2) / 3} ${cropViewportSize}`} stroke="rgba(255,255,255,0.35)" />
                      <path d={`M 0 ${cropViewportSize / 3} L ${cropViewportSize} ${cropViewportSize / 3}`} stroke="rgba(255,255,255,0.35)" />
                      <path d={`M 0 ${(cropViewportSize * 2) / 3} L ${cropViewportSize} ${(cropViewportSize * 2) / 3}`} stroke="rgba(255,255,255,0.35)" />

                      <path d={`M 0 ${24} L 0 ${cropViewportRadius} Q 0 0 ${cropViewportRadius} 0 L 24 0`} stroke="white" strokeWidth="3" strokeLinecap="round" />
                      <path d={`M ${cropViewportSize - 24} 0 L ${cropViewportSize - cropViewportRadius} 0 Q ${cropViewportSize} 0 ${cropViewportSize} ${cropViewportRadius} L ${cropViewportSize} 24`} stroke="white" strokeWidth="3" strokeLinecap="round" />
                      <path d={`M 0 ${cropViewportSize - 24} L 0 ${cropViewportSize - cropViewportRadius} Q 0 ${cropViewportSize} ${cropViewportRadius} ${cropViewportSize} L 24 ${cropViewportSize}`} stroke="white" strokeWidth="3" strokeLinecap="round" />
                      <path d={`M ${cropViewportSize - 24} ${cropViewportSize} L ${cropViewportSize - cropViewportRadius} ${cropViewportSize} Q ${cropViewportSize} ${cropViewportSize} ${cropViewportSize} ${cropViewportSize - cropViewportRadius} L ${cropViewportSize} ${cropViewportSize - 24}`} stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-[rgba(0,0,0,0.08)] bg-white p-[12px] sm:p-[14px]">
              <div className="flex items-center justify-between gap-[8px]">
                <p className="text-[13px] leading-[20px] text-[#606067]">{t('common.imageCrop.hint')}</p>
                <Button type="button" variant="outline" size="sm" onClick={resetTransform} disabled={savingCrop}>
                  <RotateCcw className="h-[14px] w-[14px]" />
                  {t('common.imageCrop.reset')}
                </Button>
              </div>

              <div className="mt-[12px] flex flex-col gap-[10px]">
                <label className="flex items-center gap-[10px]">
                  <span className="w-[56px] shrink-0 text-[13px] font-medium leading-[20px] text-[#1c1c26]">
                    {t('common.imageCrop.zoom')}
                  </span>
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={ZOOM_STEP}
                    value={zoom}
                    onChange={event => updateZoom(Number(event.target.value))}
                    className="h-[4px] flex-1 accent-[#5e85ee]"
                  />
                  <span className="w-[44px] text-right text-[12px] leading-[18px] text-[#8d8d93]">{zoom.toFixed(2)}x</span>
                </label>

                <label className="flex items-center gap-[10px]">
                  <span className="w-[56px] shrink-0 text-[13px] font-medium leading-[20px] text-[#1c1c26]">
                    {t('common.imageCrop.rotate')}
                  </span>
                  <input
                    type="range"
                    min={MIN_ROTATION}
                    max={MAX_ROTATION}
                    step={ROTATION_STEP}
                    value={rotation}
                    onChange={event => {
                      const nextRotation = Number(event.target.value)
                      const nextBaseScale = getBaseScale(naturalSize.width, naturalSize.height, nextRotation)
                      const nextScale = nextBaseScale * zoom
                      setRotation(nextRotation)
                      setOffset(current => clampOffset(current, naturalSize.width, naturalSize.height, nextRotation, nextScale))
                    }}
                    className="h-[4px] flex-1 accent-[#5e85ee]"
                  />
                  <span className="w-[44px] text-right text-[12px] leading-[18px] text-[#8d8d93]">{rotation}°</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-[14px]">
            <Button type="button" variant="outline" onClick={() => setCropOpen(false)} disabled={savingCrop}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleCropConfirm()} disabled={savingCrop}>
              {savingCrop ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
