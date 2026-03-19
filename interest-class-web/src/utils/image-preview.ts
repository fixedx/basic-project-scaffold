import { ossApi } from '@/api/oss'

const isDirectUrl = (url: string) => {
  return url.startsWith('http://')
    || url.startsWith('https://')
    || url.startsWith('/')
    || url.startsWith('./')
    || url.startsWith('../')
    || url.startsWith('data:')
    || url.startsWith('blob:')
    || url.startsWith('wxfile://')
}

export const resolvePreviewUrl = async (url: string): Promise<string> => {
  if (!url) return ''
  if (isDirectUrl(url)) return url

  const res = await ossApi.getPreviewUrl(url)
  return res.url
}

export const resolvePreviewUrls = async (urls: string[]): Promise<string[]> => {
  const validUrls = (urls || []).filter(Boolean)
  return Promise.all(validUrls.map((url) => resolvePreviewUrl(url)))
}

export const previewSingleImage = async (url: string) => {
  const resolvedUrl = await resolvePreviewUrl(url)
  if (!resolvedUrl) return

  uni.previewImage({
    urls: [resolvedUrl],
    current: resolvedUrl,
  })
}

export const previewImageList = async (urls: string[], current: number | string = 0) => {
  const resolvedUrls = await resolvePreviewUrls(urls)
  if (!resolvedUrls.length) return

  const currentUrl = typeof current === 'number'
    ? resolvedUrls[current] || resolvedUrls[0]
    : await resolvePreviewUrl(current)

  uni.previewImage({
    urls: resolvedUrls,
    current: currentUrl || resolvedUrls[0],
  })
}