// frontend/src/components/feed/PostCard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  MapPin,
  Building2,
  Plane,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toggleLike, deletePost } from '../../services/feedApi';
import CommentsDrawer from './CommentsDrawer';

const CATEGORY_STYLES = {
  story:  { label: 'Story',   cls: 'bg-blue-50   text-blue-700   border-blue-200'   },
  photo:  { label: 'Photo',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  review: { label: 'Review',  cls: 'bg-slate-50  text-slate-700  border-slate-200'  },
  tip:    { label: 'Tip',     cls: 'bg-emerald-50  text-emerald-700  border-emerald-200'  },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const mediaUrl = (value) => {
  if (!value) return '';
  if (String(value).startsWith('http://') || String(value).startsWith('https://')) return value;
  return `http://localhost:5000${value}`;
};

const Avatar = ({ name, avatar }) => {
  if (avatar) return (
    <img
      src={mediaUrl(avatar)}
      alt={name}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white"
    />
  );
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-white">
      {name?.charAt(0).toUpperCase()}
    </div>
  );
};

export default function PostCard({ post, onUpdated, onDeleted }) {
  const token = localStorage.getItem('token');
  let decoded = null;
  try {
    decoded = token ? JSON.parse(atob(token.split('.')[1])) : null;
  } catch (_) {}

  const myId = localStorage.getItem('userId') || decoded?.id || decoded?._id;
  const authorId = post.author?._id;
  const isOwner = Boolean(authorId && myId && String(authorId) === String(myId));
  const authorProfileHref = isOwner ? '/profile' : authorId ? `/profile/${authorId}` : '/profile';
  const hasLiked = (likes) =>
    myId ? Array.isArray(likes) && likes.some(id => String(id) === String(myId)) : false;

  const [liked,        setLiked]        = useState(hasLiked(post.likes));
  const [likeCount,    setLikeCount]    = useState(post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [imgIdx,       setImgIdx]       = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);

  const cat = CATEGORY_STYLES[post.category] || CATEGORY_STYLES.story;

  useEffect(() => {
    setLiked(hasLiked(post.likes));
    setLikeCount(post.likes?.length || post.likeCount || 0);
    setCommentCount(post.commentCount || 0);
    setImgIdx(0);
  }, [post.likes, post.likeCount, post.commentCount]);

  const handleLike = async () => {
    try {
      const res = await toggleLike(post._id);
      setLiked(Boolean(res.data?.liked));
      setLikeCount(Number(res.data?.likeCount ?? 0));
    } catch (_) {
      // ignore
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
            {authorId ? (
              <Link to={authorProfileHref} className="flex-shrink-0" aria-label="View profile">
                <Avatar name={post.author?.fullName} avatar={post.author?.avatar} />
              </Link>
            ) : (
              <Avatar name={post.author?.fullName} avatar={post.author?.avatar} />
            )}
            <div>
              {authorId ? (
                <Link
                  to={authorProfileHref}
                  className="text-sm font-semibold text-gray-900 leading-tight hover:underline"
                >
                  {post.author?.fullName || 'Traveller'}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {post.author?.fullName || 'Traveller'}
                </p>
              )}
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
          <div className="bg-gray-50">
            {/* Facebook-style photo blocks */}
            {post.images.length === 1 && (
              <button
                type="button"
                onClick={() => { setViewerIdx(0); setShowImageViewer(true); }}
                className="relative w-full h-[360px] overflow-hidden bg-black"
                aria-label="Open photo"
              >
                <img src={mediaUrl(post.images[0])} alt="post" className="w-full h-full object-contain" loading="lazy" />
              </button>
            )}

            {post.images.length === 2 && (
              <div className="grid grid-cols-2 gap-0.5 h-[360px] bg-white">
                {post.images.slice(0, 2).map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => { setViewerIdx(i); setShowImageViewer(true); }}
                    className="relative overflow-hidden bg-black"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <img src={mediaUrl(img)} alt="post" className="w-full h-full object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {post.images.length === 3 && (
              <div className="grid grid-cols-2 gap-0.5 h-[360px] bg-white">
                <button
                  type="button"
                  onClick={() => { setViewerIdx(0); setShowImageViewer(true); }}
                  className="row-span-2 relative overflow-hidden bg-black"
                  aria-label="Open photo 1"
                >
                  <img src={mediaUrl(post.images[0])} alt="post" className="w-full h-full object-contain" loading="lazy" />
                </button>
                {[1, 2].map((i) => (
                  <button
                    key={post.images[i]}
                    type="button"
                    onClick={() => { setViewerIdx(i); setShowImageViewer(true); }}
                    className="relative overflow-hidden bg-black"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <img src={mediaUrl(post.images[i])} alt="post" className="w-full h-full object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {post.images.length >= 4 && (
              <div className="grid grid-cols-2 gap-0.5 h-[360px] bg-white">
                {[0, 1, 2, 3].map((i) => {
                  const extra = post.images.length - 4;
                  const isLast = i === 3 && extra > 0;
                  return (
                    <button
                      key={`${post.images[i]}-${i}`}
                      type="button"
                      onClick={() => { setViewerIdx(i); setShowImageViewer(true); }}
                      className="relative overflow-hidden bg-black"
                      aria-label={`Open photo ${i + 1}`}
                    >
                      <img src={mediaUrl(post.images[i])} alt="post" className="w-full h-full object-contain" loading="lazy" />
                      {isLast && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                          <span className="text-white text-3xl font-bold">+{extra}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Fullscreen image viewer */}
        {showImageViewer && post.images?.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setShowImageViewer(false)}
          >
            <button
              type="button"
              className="absolute top-6 right-6 z-10 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition text-white"
              onClick={(e) => { e.stopPropagation(); setShowImageViewer(false); }}
              aria-label="Close image viewer"
            >
              <X className="h-7 w-7" />
            </button>

            {post.images.length > 1 && (
              <button
                type="button"
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIdx((prev) => {
                    const next = (prev - 1 + post.images.length) % post.images.length;
                    setImgIdx(next);
                    return next;
                  });
                }}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            {post.images.length > 1 && (
              <button
                type="button"
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIdx((prev) => {
                    const next = (prev + 1) % post.images.length;
                    setImgIdx(next);
                    return next;
                  });
                }}
                aria-label="Next image"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}

            <div className="relative max-w-5xl w-full px-4" onClick={(e) => e.stopPropagation()}>
              <img
                src={mediaUrl(post.images[viewerIdx])}
                alt="post fullscreen"
                className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
              <p className="text-white text-center mt-5 text-lg font-medium">
                {viewerIdx + 1} / {post.images.length}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-4 border-t border-gray-50">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              liked ? 'text-red-600 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart
              size={18}
              strokeWidth={liked ? 2.5 : 2}
              fill={liked ? 'currentColor' : 'none'}
            />
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
          >
            <MessageCircle size={18} />
            <span>{commentCount}</span>
          </button>

          {isOwner && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdated?.(post, 'edit')}
                className="text-xs px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
              >
                Delete
              </button>
            </div>
          )}
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