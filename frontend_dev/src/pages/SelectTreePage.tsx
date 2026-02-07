import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTree } from '../context/TreeContext';
import { AddTreeModal } from '../components/AddTreeModal';
import { treeService } from '../services/treeService';
import '../styles/SelectTree.css';

export const SelectTreePage: React.FC = () => {
  const navigate = useNavigate();
  const { trees, loading, setSelectedTreeId, refreshTrees } = useTree();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSelectTree = useCallback(
    (treeId: string) => {
      setSelectedTreeId(treeId);
      navigate('/', { replace: true });
    },
    [setSelectedTreeId, navigate]
  );

  const handleAddTreeSubmit = useCallback(
    async (payload: { name: string; description: string; icon_url: string }) => {
      const created = await treeService.createTree({
        name: payload.name,
        description: payload.description || undefined,
        icon_url: payload.icon_url || undefined,
      });
      await refreshTrees();
      setSelectedTreeId(created.id);
      navigate('/', { replace: true });
    },
    [refreshTrees, setSelectedTreeId, navigate]
  );

  if (loading) {
    return (
      <div className="select-tree-page">
        <div className="select-tree-loading">Loading trees…</div>
      </div>
    );
  }

  return (
    <div className="select-tree-page">
      <h1 className="select-tree-title">Choose a tree</h1>
      <div className="select-tree-grid">
        {trees.map((tree) => (
          <button
            key={tree.id}
            type="button"
            className="select-tree-card"
            onClick={() => handleSelectTree(tree.id)}
          >
            <div className="select-tree-card-icon">
              {tree.iconUrl ? (
                <img src={tree.iconUrl} alt="" />
              ) : (
                <div className="select-tree-card-icon-default" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8 2 6 5 6 8c0 2 1 3 2 4H4v2h3l-1 6h3v-4h4v4h3l-1-6h3v-2h-4c1-1 2-2 2-4 0-3-2-6-6-6z" />
                  </svg>
                </div>
              )}
            </div>
            <span className="select-tree-card-name">{tree.name}</span>
          </button>
        ))}
        <button
          type="button"
          className="select-tree-card select-tree-card-add"
          onClick={() => setShowAddModal(true)}
        >
          <div className="select-tree-card-icon select-tree-card-icon-add">
            <span aria-hidden>+</span>
          </div>
          <span className="select-tree-card-name">Add Tree</span>
        </button>
      </div>
      {showAddModal && (
        <AddTreeModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTreeSubmit}
        />
      )}
    </div>
  );
};
