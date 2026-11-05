/**
 * The "T-Drop" branding lettering: a smooth continuous flourish stroke
 * covering the T-Drop glass badge and typography in the 800x640 window.
 */
export const PEN_PATH =
  'M 215 300 C 235 255, 275 255, 295 300 C 315 345, 335 345, 355 300 C 390 260, 440 340, 490 300 C 530 260, 570 340, 605 300'

/** Places the pen in the window (direct coordinates, 1:1 scale). */
export const PEN_TRANSFORM = 'translate(0 0) scale(1)'

/** Width of the reveal stroke to fully unmask the T-Drop glass brandmark. */
export const PEN_WIDTH = 60

/** Where the brand backdrop sits in the window. */
export const GLASS_BOX = { x: 200, y: 240, width: 400, height: 120 }
export const SHADOW_BOX = { x: 190, y: 230, width: 420, height: 140 }
export const BLUR_BOX = { left: 180, top: 220, width: 440, height: 160 }

/**
 * How far along the line the pen is (0..1) at 120 even steps of the writing
 * time: smooth hand-written curve with realistic acceleration and deceleration.
 */
export const PEN_PACE = [
  0.0000, 0.0050, 0.0103, 0.0159, 0.0217, 0.0269, 0.0323, 0.0382, 0.0450, 0.0536, 0.0620, 0.0698,
  0.0779, 0.0874, 0.0973, 0.1058, 0.1131, 0.1205, 0.1281, 0.1362, 0.1447, 0.1524, 0.1600, 0.1685,
  0.1814, 0.1942, 0.2015, 0.2089, 0.2181, 0.2326, 0.2420, 0.2495, 0.2571, 0.2656, 0.2741, 0.2817,
  0.2891, 0.2964, 0.3044, 0.3127, 0.3204, 0.3279, 0.3359, 0.3435, 0.3509, 0.3607, 0.3723, 0.3803,
  0.3877, 0.3951, 0.4037, 0.4176, 0.4314, 0.4407, 0.4482, 0.4556, 0.4636, 0.4726, 0.4807, 0.4885,
  0.4971, 0.5071, 0.5165, 0.5244, 0.5318, 0.5391, 0.5468, 0.5551, 0.5634, 0.5710, 0.5787, 0.5880,
  0.6023, 0.6128, 0.6202, 0.6275, 0.6390, 0.6525, 0.6608, 0.6685, 0.6768, 0.6868, 0.6941, 0.7015,
  0.7101, 0.7175, 0.7248, 0.7342, 0.7424, 0.7499, 0.7574, 0.7648, 0.7725, 0.7809, 0.7892, 0.7967,
  0.8043, 0.8127, 0.8211, 0.8291, 0.8375, 0.8453, 0.8530, 0.8634, 0.8794, 0.8868, 0.8942, 0.9054,
  0.9167, 0.9260, 0.9338, 0.9414, 0.9490, 0.9567, 0.9626, 0.9680, 0.9730, 0.9792, 0.9869, 0.9938,
  1.0000
]

/** The pen's progress along the line (0..1) at writing time t (0..1). */
export function penProgress(t: number): number {
  const x = Math.min(1, Math.max(0, t)) * (PEN_PACE.length - 1)
  const i = Math.min(PEN_PACE.length - 2, Math.floor(x))
  return PEN_PACE[i] + (PEN_PACE[i + 1] - PEN_PACE[i]) * (x - i)
}
