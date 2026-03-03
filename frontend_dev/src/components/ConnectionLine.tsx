import { useState } from 'react'
import type { Connection } from '../types'
import type { Profile } from '../types'
import '../styles/ConnectionLine.css'

interface ConnectionLineProps {
  connection: Connection
  fromProfile: Profile
  toProfile: Profile
  /** Index of this connection among all from the same source (0-based). */
  connectionIndex?: number
  /** Total number of connections from the same source card. */
  connectionCountFromSource?: number
  /** Index of this connection among all to the same target (0-based). */
  connectionIndexToTarget?: number
  /** Total number of connections to the same target card. */
  connectionCountToTarget?: number
  onEdit?: (connectionId: string) => void
}

const ROW_HEIGHT = 36 // Vertical space per connection row (fits label + padding)
const BASE_OFFSET = 24   // Clear space above cards before first horizontal segment

function ConnectionLine({
  connection,
  fromProfile,
  toProfile,
  connectionIndex = 0,
  connectionCountFromSource = 1,
  connectionIndexToTarget = 0,
  connectionCountToTarget = 1,
  onEdit,
}: ConnectionLineProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Card dimensions (match ProfileCard.css: width 200px, anchor at top-left)
  const CARD_WIDTH = 200

  // Stagger attachment when multiple lines leave the same card: slight horizontal fan-out
  const fanOutFrom = connectionCountFromSource > 1
    ? (connectionIndex - (connectionCountFromSource - 1) / 2) * 12
    : 0

  // Stagger attachment when multiple lines arrive at the same card: arrows land at separate points
  const fanOutTo = connectionCountToTarget > 1
    ? (connectionIndexToTarget - (connectionCountToTarget - 1) / 2) * 14
    : 0

  const fromX = fromProfile.x + CARD_WIDTH / 2 + fanOutFrom
  const fromY = fromProfile.y
  const toX = toProfile.x + CARD_WIDTH / 2 + fanOutTo
  const toY = toProfile.y

  // Manhattan routing: vertical up from each card, then horizontal above both.
  // Stagger midY per connection so lines and labels don't overlap.
  const midY = Math.min(fromY, toY) - BASE_OFFSET - connectionIndex * ROW_HEIGHT

  // Path: from top-center of card A → up → across → down → top-center of card B
  const pathData = `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`

  // Calculate label position (middle of horizontal segment)
  const labelX = (fromX + toX) / 2
  const labelY = midY

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(connection.id)
  }

  return (
    <g>
      <path
        d={pathData}
        className={`connection-line ${isHovered ? 'hovered' : ''}`}
        stroke="#667eea"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        style={{ pointerEvents: 'stroke' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <foreignObject
        x={labelX - 80}
        y={labelY - 20}
        width="160"
        height="40"
        className="connection-label-container"
        style={{ pointerEvents: 'all', overflow: 'visible' }}
      >
        <div
          className="connection-label"
          onClick={handleLabelClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className="connection-label-text">{connection.relationshipText}</span>
        </div>
      </foreignObject>
    </g>
  )
}

export default ConnectionLine
