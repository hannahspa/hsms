import { BADGE } from '../../constants/colors'

/** Badge — nhãn trạng thái chuẩn. tone: success|danger|warning|info|neutral|primary|gold */
export default function Badge({ tone = 'neutral', children, style }) {
  const t = BADGE[tone] || BADGE.neutral
  return <span style={{ ...BADGE.style, ...t, ...style }}>{children}</span>
}
