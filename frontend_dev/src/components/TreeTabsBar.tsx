import React from 'react'
import type { Tree } from '../types'
import '../styles/TreeTabsBar.css'

export const TREE_TABS_BAR_HEIGHT = 52

interface TreeTabsBarProps {
  trees: Tree[]
  selectedTreeId: string | null
  onSelectTree: (treeId: string) => void
  onAddTree: () => void
}

export function TreeTabsBar({ trees, selectedTreeId, onSelectTree, onAddTree }: TreeTabsBarProps) {
  return (
    <div className="tree-tabs-bar" style={{ height: TREE_TABS_BAR_HEIGHT }}>
      <div className="tree-tabs-list">
        {trees.map((tree) => (
          <button
            key={tree.id}
            type="button"
            className={`tree-tab ${tree.id === selectedTreeId ? 'tree-tab-active' : ''}`}
            onClick={() => onSelectTree(tree.id)}
          >
            <span className="tree-tab-icon">
              {tree.iconUrl ? (
                <img src={tree.iconUrl} alt="" />
              ) : (
                <span className="tree-tab-icon-default">🌳</span>
              )}
            </span>
            <span className="tree-tab-label">{tree.name || 'Unnamed'}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="tree-tabs-add"
        onClick={onAddTree}
        title="Add tree"
      >
        + Add
      </button>
    </div>
  )
}
