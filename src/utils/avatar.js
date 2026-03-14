import { createAvatar } from '@dicebear/core'
import {
  pixelArt,
  adventurer,
  bottts,
  croodles,
  funEmoji,
  dylan,
} from '@dicebear/collection'

const COLLECTIONS = {
  'pixel-art':  pixelArt,
  'adventurer': adventurer,
  'bottts':     bottts,
  'croodles':   croodles,
  'fun-emoji':  funEmoji,
  'dylan':      dylan,
}

export const AVATAR_STYLES = [
  { id: 'pixel-art',  label: 'Pixel Art' },
  { id: 'adventurer', label: 'Adventure' },
  { id: 'bottts',     label: 'Bottts' },
  { id: 'croodles',   label: 'Croodles' },
  { id: 'fun-emoji',  label: 'Fun Emoji' },
  { id: 'dylan',      label: 'Dylan' },
]

function getCollection(style) {
  return COLLECTIONS[style] ?? pixelArt
}

function applyStyleDefaults(style, opts) {
  if (style === 'croodles') {
    if (opts.scale == null) opts.scale = 130
    if (opts.translateY == null) opts.translateY = -5
  }
  return opts
}

export function buildAvatarSrc(avatar) {
  if (!avatar) return null
  const { style, ...opts } = avatar
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    createAvatar(getCollection(style), applyStyleDefaults(style, opts)).toString()
  )}`
}

export function buildAvatarSvg(avatar) {
  if (!avatar) return null
  const { style, ...opts } = avatar
  return createAvatar(getCollection(style), applyStyleDefaults(style, opts)).toString()
}
