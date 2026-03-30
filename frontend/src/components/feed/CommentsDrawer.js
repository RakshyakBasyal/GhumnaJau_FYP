// frontend/src/components/feed/CommentsDrawer.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader, Pencil, Trash2 } from 'lucide-react';
import { getComments, addComment, editComment, deleteComment } from '../../services/feedApi';

const Avatar = ({ name, avatar, size = 8 }) => {
  const sizeClass = `w-${size} h-${size}`;
  if (avatar) return (
    <img
      src={`http://localhost:5000${avatar}`}
      alt={name}
      className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
    />
  );
  return (
    <div className={`${sizeClass} rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-xs flex-shrink-0`}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function CommentsDrawer({ post, onClose, onCommentCountChange }) {
  const [comments,    setComments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [input,       setInput]       = useState('');
  const [editingId,   setEditingId]   = useState(null);
  const [editContent, setEditContent] = useState('');
  const inputRef = useRef();
  const bottomRef = useRef();

  const myId = localStorage.getItem('userId');

  useEffect(() => {
    fetchComments();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [post._id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await getComments(post._id);
      setComments(res.data.comments);
    } catch (_) {}
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(post._id, input.trim());
      setComments(prev => [...prev, res.data]);
      setInput('');
      onCommentCountChange?.(1);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (_) {}
    setSubmitting(false);
  };

  const handleEdit = async (id) => {
    if (!editContent.trim()) return;
    try {
      const res = await editComment(id, editContent.trim());
      setComments(prev => prev.map(c => c._id === id ? res.data : c));
      setEditingId(null);
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(id);
      setComments(prev => prev.filter(c => c._id !== id));
      onCommentCountChange?.(-1);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:w-96 h-[75vh] sm:h-full sm:max-h-screen flex flex-col rounded-t-2xl sm:rounded-none shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Comments</h3>
            <p className="text-xs text-gray-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={17} className="text-gray-500" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader size={20} className="animate-spin text-amber-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment._id} className="flex gap-2.5">
                <Avatar name={comment.author?.fullName} avatar={comment.author?.avatar} size={7} />
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-800 mb-0.5">
                      {comment.author?.fullName || 'User'}
                    </p>
                    {editingId === comment._id ? (
                      <div className="flex gap-2 mt-1">
                        <input
                          className="flex-1 text-xs border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleEdit(comment._id)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleEdit(comment._id)}
                          className="text-xs text-amber-600 font-semibold hover:text-amber-700"
                        >Save</button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >Cancel</button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-700 leading-relaxed">{comment.content}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
                    {comment.author?._id === myId && editingId !== comment._id && (
                      <>
                        <button
                          onClick={() => { setEditingId(comment._id); setEditContent(comment.content); }}
                          className="text-xs text-gray-400 hover:text-amber-600 flex items-center gap-1 transition"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleAdd} className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
          <Avatar name={localStorage.getItem('username') || 'U'} size={7} />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || submitting}
            className="w-8 h-8 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
          >
            {submitting
              ? <Loader size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </form>
      </div>
    </div>
  );
}