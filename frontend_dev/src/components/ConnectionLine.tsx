import { useState } from 'react'
import type { Connection } from '../types'
import type { Profile } from '../types'
import '../styles/ConnectionLine.css'

interface ConnectionLineProps {
  connection: Connection
  fromProfile: Profile
  toProfile: Profile
  onEdit?: (connectionId: string) => void
}

function ConnectionLine({ connection, fromProfile, toProfile, onEdit }: ConnectionLineProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Card dimensions
  const CARD_WIDTH = 200
  const CARD_MIN_HEIGHT = 150
  
  // Calculate bottom center points of cards
  const fromX = fromProfile.x + CARD_WIDTH / 2
  const fromY = fromProfile.y + CARD_MIN_HEIGHT
  const toX = toProfile.x + CARD_WIDTH / 2
  const toY = toProfile.y + CARD_MIN_HEIGHT

  // Manhattan routing: vertical down -> horizontal -> vertical to target
  const VERTICAL_OFFSET = 20 // Distance to drop down before going horizontal
  const midY = Math.max(fromY, toY) + VERTICAL_OFFSET
  
  // Create path for Manhattan routing
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
