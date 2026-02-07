import React, { useState, useRef, useEffect } from 'react';
import '../styles/AddTreeModal.css';

interface AddTreeModalProps {
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string; icon_url: string }) => Promise<void>;
}

const DEFAULT_TREE_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23667eea'%3E%3Cpath d='M12 2C8 2 6 5 6 8c0 2 1 3 2 4H4v2h3l-1 6h3v-4h4v4h3l-1-6h3v-2h-4c1-1 2-2 2-4 0-3-2-6-6-6z'/%3E%3C/svg%3E";

export const AddTreeModal: React.FC<AddTreeModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setIconUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    const picture = iconUrl.trim() || DEFAULT_TREE_ICON;
    setSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() || '',
        icon_url: picture,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tree');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="add-tree-overlay" onClick={handleOverlayClick}>
      <div className="add-tree-modal">
        <h2>Add Tree</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tree-name">Name (required)</label>
            <input
              id="tree-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith Family"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Picture (required)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="form-file"
            />
            {iconUrl ? (
              <div className="add-tree-preview">
                <img src={iconUrl} alt="Preview" />
                <button
                  type="button"
                  className="add-tree-remove-pic"
                  onClick={() => {
                    setIconUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="add-tree-hint">Upload an image or use default icon when you save.</p>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="tree-desc">Description (optional)</label>
            <textarea
              id="tree-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this tree"
              rows={3}
            />
          </div>
          {error && <p className="add-tree-error">{error}</p>}
          <div className="add-tree-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Tree'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
