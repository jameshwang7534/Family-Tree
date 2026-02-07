const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const treeService = {
  listMyTrees: async () => {
    const response = await fetch(`${API_BASE_URL}/trees`, {
      method: 'GET',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Unauthorized');
      throw new Error('Failed to fetch trees');
    }
    return response.json();
  },

  createTree: async (payload: { name: string; description?: string; icon_url?: string }) => {
    const response = await fetch(`${API_BASE_URL}/trees`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || 'Failed to create tree');
    }
    return response.json();
  },

  getTree: async (treeId: string) => {
    const response = await fetch(`${API_BASE_URL}/trees/${treeId}`, {
      method: 'GET',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch tree');
    }
    return response.json();
  },
};
