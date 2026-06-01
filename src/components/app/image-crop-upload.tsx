import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/utils/i18n'
import { IconCamera } from '@tabler/icons-react'
import { Loader2, RotateCcw, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
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

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
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
        <DialogContent className="max-w-[640px] rounded-[28px] p-[28px]">
          <DialogHeader className="gap-[8px]">
            <DialogTitle>{t('common.imageCrop.title')}</DialogTitle>
            <DialogDescription>{t('common.imageCrop.description')}</DialogDescription>
          </DialogHeader>

          <div className="mt-[20px] flex flex-col gap-[20px]">
            <div className="rounded-[24px] bg-[linear-gradient(180deg,#f7f8fb_0%,#eef2ff_100%)] p-[20px]">
              <div
                className={cn(
                  'relative mx-auto h-[360px] w-full max-w-[520px] overflow-hidden rounded-[20px] bg-[#dde4ff] touch-none',
                  isDragging ? 'cursor-grabbing' : 'cursor-grab',
                )}
                onPointerDown={event => {
                  if (!naturalSize.width || !naturalSize.height) return
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
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg) scale(${scale})`,
                      transformOrigin: 'center center',
                    }}
                  />
                ) : null}

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="relative h-[320px] w-[320px] rounded-[28px] border border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
                    style={{ backdropFilter: 'blur(1px)' }}
                  >
                    <div className="absolute left-1/3 top-0 h-full w-px bg-white/35" />
                    <div className="absolute left-2/3 top-0 h-full w-px bg-white/35" />
                    <div className="absolute left-0 top-1/3 h-px w-full bg-white/35" />
                    <div className="absolute left-0 top-2/3 h-px w-full bg-white/35" />
                    <div className="absolute left-0 top-0 h-[24px] w-[24px] rounded-tl-[24px] border-l-[3px] border-t-[3px] border-white" />
                    <div className="absolute right-0 top-0 h-[24px] w-[24px] rounded-tr-[24px] border-r-[3px] border-t-[3px] border-white" />
                    <div className="absolute bottom-0 left-0 h-[24px] w-[24px] rounded-bl-[24px] border-b-[3px] border-l-[3px] border-white" />
                    <div className="absolute bottom-0 right-0 h-[24px] w-[24px] rounded-br-[24px] border-b-[3px] border-r-[3px] border-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[rgba(0,0,0,0.08)] bg-white p-[16px]">
              <div className="flex items-center justify-between gap-[12px]">
                <p className="text-[13px] leading-[20px] text-[#606067]">{t('common.imageCrop.hint')}</p>
                <Button type="button" variant="outline" size="sm" onClick={resetTransform} disabled={savingCrop}>
                  <RotateCcw className="h-[14px] w-[14px]" />
                  {t('common.imageCrop.reset')}
                </Button>
              </div>

              <div className="mt-[16px] flex flex-col gap-[14px]">
                <label className="flex items-center gap-[12px]">
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

                <label className="flex items-center gap-[12px]">
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

          <DialogFooter className="mt-[24px]">
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
