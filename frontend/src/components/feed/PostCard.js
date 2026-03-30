// frontend/src/components/feed/PostCard.jsx
import { useState } from 'react';
import { Heart, MessageCircle, MapPin, Building2, Plane, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toggleLike, deletePost } from '../../services/feedApi';
import CommentsDrawer from './CommentsDrawer';

const CATEGORY_STYLES = {
  story:  { label: '✈️ Story',   cls: 'bg-blue-50   text-blue-700   border-blue-200'   },
  photo:  { label: '📷 Photo',   cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  review: { label: '⭐ Review',  cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  tip:    { label: '💡 Tip',     cls: 'bg-green-50  text-green-700  border-green-200'  },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Avatar = ({ name, avatar }) => {
  if (avatar) return (
    <img
      src={`http://localhost:5000${avatar}`}
      alt={name}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white"
    />
  );
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-white">
      {name?.charAt(0).toUpperCase()}
    </div>
  );
};

export default function PostCard({ post, onUpdated, onDeleted }) {
  const myId = localStorage.getItem('userId');
  const isOwner = post.author?._id === myId;

  const [liked,        setLiked]        = useState(post.likes?.includes(myId));
  const [likeCount,    setLikeCount]    = useState(post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [imgIdx,       setImgIdx]       = useState(0);

  const cat = CATEGORY_STYLES[post.category] || CATEGORY_STYLES.story;

  const handleLike = async () => {
    // Optimistic
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    try {
      await toggleLike(post._id);
    } catch (_) {
      setLiked(prev => !prev);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(post._id);
      onDeleted?.(post._id);
    } catch (_) {}
    setShowMenu(false);
  };

  return (
    <>
      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar name={post.author?.fullName} avatar={post.author?.avatar} />
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {post.author?.fullName || 'Traveller'}
              </p>
              <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Category badge */}
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cat.cls}`}>
              {cat.label}
            </span>

            {/* Menu */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(p => !p)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition text-gray-400"
                >
                  <MoreHorizontal size={16} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36 overflow-hidden">
                      <button
                        onClick={() => { setShowMenu(false); onUpdated?.(post, 'edit'); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Pencil size={14} /> Edit post
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} /> Delete post
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Tags row */}
        {(post.destination || post.hotel || post.flight) && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {post.destination && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                <MapPin size={11} />
                {post.destination.name}, {post.destination.country}
              </span>
            )}
            {post.hotel && (
              <span className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full">
                <Building2 size={11} />
                {post.hotel.name}
              </span>
            )}
            {post.flight && (
              <span className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full">
                <Plane size={11} />
                {post.flight.airline} {post.flight.flightNumber}
              </span>
            )}
          </div>
        )}

        {/* Images */}
        {post.images?.length > 0 && (
          <div className="relative bg-gray-50">
            <img
              src={`http://localhost:5000${post.images[imgIdx]}`}
              alt="post"
              className="w-full max-h-80 object-cover"
            />
            {post.images.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {post.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === imgIdx ? 'bg-white w-3' : 'bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
            {post.images.length > 1 && imgIdx > 0 && (
              <button
                onClick={() => setImgIdx(p => p - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs transition"
              >‹</button>
            )}
            {post.images.length > 1 && imgIdx < post.images.length - 1 && (
              <button
                onClick={() => setImgIdx(p => p + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs transition"
              >›</button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-4 border-t border-gray-50">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm font-medium transition-all ${
              liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-current' : ''} />
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-amber-500 transition"
          >
            <MessageCircle size={18} />
            <span>{commentCount}</span>
          </button>
        </div>
      </article>

      {showComments && (
        <CommentsDrawer
          post={post}
          onClose={() => setShowComments(false)}
          onCommentCountChange={(delta) => setCommentCount(p => p + delta)}
        />
      )}
    </>
  );
}