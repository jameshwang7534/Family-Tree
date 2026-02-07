import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { Tree } from '../types';
import { treeService } from '../services/treeService';

const SELECTED_TREE_ID_KEY = 'family-tree-selected-tree-id';

interface TreeContextType {
  selectedTreeId: string | null;
  selectedTree: Tree | null;
  setSelectedTreeId: (id: string | null) => void;
  trees: Tree[];
  loading: boolean;
  refreshTrees: () => Promise<void>;
  clearSelection: () => void;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

export const TreeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTreeId, setSelectedTreeIdState] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_TREE_ID_KEY)
  );
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);

  const setSelectedTreeId = useCallback((id: string | null) => {
    setSelectedTreeIdState(id);
    if (id) localStorage.setItem(SELECTED_TREE_ID_KEY, id);
    else localStorage.removeItem(SELECTED_TREE_ID_KEY);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTreeIdState(null);
    setSelectedTree(null);
    localStorage.removeItem(SELECTED_TREE_ID_KEY);
  }, []);

  const refreshTrees = useCallback(async () => {
    try {
      const list = await treeService.listMyTrees();
      setTrees(list);
      return list;
    } catch {
      setTrees([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    treeService
      .listMyTrees()
      .then((list) => {
        if (!cancelled) setTrees(list);
      })
      .catch(() => {
        if (!cancelled) setTrees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTreeId) {
      setSelectedTree(null);
      return;
    }
    const t = trees.find((x) => x.id === selectedTreeId);
    if (t) {
      setSelectedTree(t);
      return;
    }
    treeService.getTree(selectedTreeId).then((tree) => {
      setSelectedTree(tree || null);
      if (!tree) setSelectedTreeId(null);
    });
  }, [selectedTreeId, trees, setSelectedTreeId]);

  const value: TreeContextType = {
    selectedTreeId,
    selectedTree,
    setSelectedTreeId,
    trees,
    loading,
    refreshTrees,
    clearSelection,
  };

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
};

export const useTree = () => {
  const context = useContext(TreeContext);
  if (!context) throw new Error('useTree must be used within TreeProvider');
  return context;
};
