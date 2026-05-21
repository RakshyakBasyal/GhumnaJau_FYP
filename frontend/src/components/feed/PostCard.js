// frontend/src/components/feed/PostCard.jsx
// Fix: removed socket.io from inside PostCard entirely.
// Live updates (likes, comments) are handled by the Feed-level socket and
// passed down via prop updates. This eliminates the _s is not a function
// React Fast Refresh error caused by io() inside a component body.

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, MessageCircle, Bookmark, MoreHorizontal, Trash2,
  Edit2, MapPin, Star, Send, Loader2, DollarSign,
  ChevronDown, ChevronUp, HelpCircle, Check, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  likePost, unlikePost, savePost, unsavePost,
  getComments, addComment, deleteComment,
  addAnswer, likeAnswer,
} from '../../services/feedApi';
import { useToast } from '../../context/ToastContext';

const BASE_URL = 'http://localhost:5000';

const avatarUrl = (v) => {
  if (!v) return '';
  if (String(v).includes('googleusercontent.com')) return '';
  return String(v).startsWith('http') ? v : (BASE_URL + v);
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return Math.floor(diff / 60) + 'm';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const StarDisplay = ({ rating, size = 13 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
      />
    ))}
  </div>
);

const PhotoGrid = ({ images, onPhotoClick }) => {
  const count = images.length;
  if (count === 0) return null;

  const renderImage = (img, className, idx) => (
    <div key={idx} className={'relative overflow-hidden cursor-pointer ' + className} onClick={() => onPhotoClick(idx)}>
      <img src={BASE_URL + img} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
    </div>
  );

  if (count === 1) {
    return (
      <div className="w-full max-h-[500px] overflow-hidden bg-gray-50 cursor-pointer" onClick={() => onPhotoClick(0)}>
        <img src={BASE_URL + images[0]} alt="" className="w-full h-auto object-contain max-h-[500px]" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 h-72">
        {images.map((img, i) => renderImage(img, 'h-full', i))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 h-80">
        {renderImage(images[0], 'h-full row-span-2', 0)}
        {renderImage(images[1], 'h-full', 1)}
        {renderImage(images[2], 'h-full', 2)}
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5 h-80">
        {images.slice(0, 4).map((img, i) => renderImage(img, 'h-full', i))}
      </div>
    );
  }

  // 5 or more
  return (
    <div className="grid grid-cols-6 gap-0.5 h-80">
      {renderImage(images[0], 'col-span-3 row-span-2 h-full', 0)}
      {renderImage(images[1], 'col-span-3 row-span-1 h-full', 1)}
      {renderImage(images[2], 'col-span-1 row-span-1 h-full', 2)}
      {renderImage(images[3], 'col-span-1 row-span-1 h-full', 3)}
      <div className="col-span-1 row-span-1 relative cursor-pointer" onClick={() => onPhotoClick(4)}>
        <img src={BASE_URL + images[4]} alt="" className="w-full h-full object-cover" />
        {count > 5 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xl font-bold">+{count - 4}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CAT_STYLE = {
  photo:    'bg-blue-50 text-blue-700 border-blue-100',
  story:    'bg-purple-50 text-purple-700 border-purple-100',
  tip:      'bg-amber-50 text-amber-700 border-amber-100',
  review:   'bg-emerald-50 text-emerald-700 border-emerald-100',
  question: 'bg-rose-50 text-rose-700 border-rose-100',
};

const CAT_LABEL = {
  photo: 'Travel Photo', story: 'Story', tip: 'Tip', review: 'Review', question: 'Question',
};

export default function PostCard({ post, onUpdated, onDeleted }) {
  const { showToast } = useToast();

  const myId = (() => {
    const t = localStorage.getItem('token');
    if (!t) return null;
    try {
      const d = JSON.parse(atob(t.split('.')[1]));
      return (d && (d.id || d._id)) || null;
    } catch (_) { return null; }
  })();

  // Derive initial state from post prop
  const [liked,      setLiked]      = useState(() => (post.likes || []).some((l) => String(l) === String(myId)));
  const [likeCount,  setLikeCount]  = useState(() => post.likeCount || (post.likes || []).length || 0);
  const [saved,      setSaved]      = useState(() => (post.saves || []).some((s) => String(s) === String(myId)));
  const [saveCount,  setSaveCount]  = useState(() => post.saveCount || 0);
  const [commentCount, setCommentCount] = useState(() => post.commentCount || 0);
  const [comments,   setComments]   = useState([]);
  const [showComments,  setShowComments]  = useState(false);
  const [commentText,   setCommentText]   = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [showAnswers,  setShowAnswers]  = useState(false);
  const [answerText,   setAnswerText]   = useState('');
  const [answers,      setAnswers]      = useState(() => post.answers || []);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [showHeart,  setShowHeart]  = useState(false);
  const [viewerIdx,   setViewerIdx]  = useState(-1);

  const menuRef  = useRef(null);
  const isAuthor = String(post.author?._id || post.author) === String(myId);
  const images   = post.images || [];

  // Keep local counts in sync when parent re-renders the post prop
  // (e.g. when Feed socket updates postLiked / commentAdded)
  useEffect(() => {
    setLiked((post.likes || []).some((l) => String(l) === String(myId)));
    setLikeCount(post.likeCount || (post.likes || []).length || 0);
  }, [post.likes, post.likeCount]);

  useEffect(() => {
    setCommentCount(post.commentCount || 0);
  }, [post.commentCount]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!showComments) return;
    getComments(post._id).then((res) => setComments(res.data || [])).catch(() => {});
  }, [showComments, post._id]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      wasLiked ? await unlikePost(post._id) : await likePost(post._id);
    } catch (_) {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) handleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaveCount((c) => wasSaved ? c - 1 : c + 1);
    try {
      wasSaved ? await unsavePost(post._id) : await savePost(post._id);
      showToast(wasSaved ? 'Post unsaved' : 'Saved!', 'success');
    } catch (_) {
      setSaved(wasSaved);
      setSaveCount((c) => wasSaved ? c + 1 : c - 1);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await addComment(post._id, commentText.trim());
      setComments((prev) => [...prev, res.data]);
      setCommentCount((c) => c + 1);
      setCommentText('');
    } catch (_) {
      showToast('Failed to comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(post._id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch (_) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim() || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      const res = await addAnswer(post._id, answerText.trim());
      setAnswers(res.data.answers || []);
      setAnswerText('');
    } catch (_) {
      showToast('Failed to post answer', 'error');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleLikeAnswer = async (answerId) => {
    try {
      await likeAnswer(post._id, answerId);
      setAnswers((prev) =>
        prev.map((a) => {
          if (String(a._id) !== String(answerId)) return a;
          const wasLiked = a.likes.some((l) => String(l) === String(myId));
          const newLikes = wasLiked
            ? a.likes.filter((l) => String(l) !== String(myId))
            : [...a.likes, myId];
          return { ...a, likes: newLikes, likeCount: newLikes.length };
        })
      );
    } catch (_) {}
  };

  const authorAv   = avatarUrl(post.author?.avatar);
  const authorName = post.author?.fullName || 'Traveler';
  const catStyle   = CAT_STYLE[post.category] || CAT_STYLE.photo;
  const catLabel   = CAT_LABEL[post.category] || post.category;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5">
        <Link to={'/profile/' + (post.author?._id || '')} className="flex items-center gap-3 group min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
            {authorAv
              ? <img src={authorAv} alt={authorName} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-blue-700 font-bold text-sm">{authorName.charAt(0).toUpperCase()}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition leading-tight truncate">{authorName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={'text-[9px] font-bold px-1.5 py-0.5 rounded-md border ' + catStyle}>{catLabel}</span>
              {post.destinationName && (
                <span className="text-[9px] text-gray-400 flex items-center gap-0.5 font-medium">
                  <MapPin size={8} /> {post.destinationName}
                </span>
              )}
              <span className="text-[9px] text-gray-400 flex-shrink-0 font-medium">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {post.budget && (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 rounded-lg flex items-center gap-0.5">
              <DollarSign size={9} /> {post.budget}
            </span>
          )}
          {isAuthor && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 w-36">
                  <button
                    onClick={() => { setShowMenu(false); onUpdated(post, 'edit'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDeleted(post._id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Review rating ────────────────────────────────────────────────── */}
      {post.category === 'review' && post.rating && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <StarDisplay rating={post.rating} />
          <span className="text-xs font-bold text-amber-600">{post.rating}/5</span>
          {post.reviewType && (
            <span className="text-[10px] text-gray-400 capitalize">{post.reviewType} review</span>
          )}
        </div>
      )}

      {/* ── Images ───────────────────────────────────────────────────────── */}
      {images.length > 0 && (
        <div className="relative" onDoubleClick={handleDoubleTap}>
          <PhotoGrid images={images} onPhotoClick={(idx) => setViewerIdx(idx)} />
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <Heart
                size={80}
                className="text-white fill-white drop-shadow-2xl"
                style={{
                  animation: 'heartPop 0.75s ease-out forwards',
                }}
              />
            </div>
          )}
          <style>{`@keyframes heartPop{0%{transform:scale(.3);opacity:0}30%{transform:scale(1.3);opacity:1}60%{transform:scale(1);opacity:1}100%{transform:scale(1.1);opacity:0}}`}</style>
        </div>
      )}

      {/* ── Photo Viewer Modal ─────────────────────────────────────────── */}
      {viewerIdx >= 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-hidden" onClick={() => setViewerIdx(-1)}>
          <button onClick={(e) => { e.stopPropagation(); setViewerIdx(-1); }} className="absolute top-6 right-6 z-[110] bg-white/10 p-4 rounded-full hover:bg-white/20 transition text-white">
            <X size={32} />
          </button>
          
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setViewerIdx((p) => (p - 1 + images.length) % images.length); }} 
                className="absolute left-6 top-1/2 -translate-y-1/2 z-[110] bg-white/10 p-5 rounded-full hover:bg-white/20 transition text-white">
                <ChevronLeft size={40} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setViewerIdx((p) => (p + 1) % images.length); }} 
                className="absolute right-6 top-1/2 -translate-y-1/2 z-[110] bg-white/10 p-5 rounded-full hover:bg-white/20 transition text-white">
                <ChevronRight size={40} />
              </button>
            </>
          )}

          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={BASE_URL + images[viewerIdx]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl transition-all duration-300" />
            {images.length > 1 && (
              <p className="text-white mt-6 text-lg font-bold tracking-widest">{viewerIdx + 1} / {images.length}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {post.content && (
        <div className="px-3.5 pt-2.5 pb-1">
          <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-line">{post.content}</p>
        </div>
      )}

      {/* ── Question answers ─────────────────────────────────────────────── */}
      {post.category === 'question' && (
        <div className="px-4 py-3 border-t border-gray-50 mt-1">
          <button
            onClick={() => setShowAnswers((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            <HelpCircle size={14} />
            {answers.length === 0 ? 'Be the first to answer' : answers.length + ' answer' + (answers.length !== 1 ? 's' : '')}
            {showAnswers ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAnswers && (
            <div className="mt-3 space-y-3">
              {answers.map((ans) => {
                const ansAv    = avatarUrl(ans.author?.avatar);
                const ansName  = ans.author?.fullName || 'Traveler';
                const ansLiked = (ans.likes || []).some((l) => String(l) === String(myId));
                return (
                  <div key={ans._id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-blue-100 flex-shrink-0 mt-0.5">
                      {ansAv
                        ? <img src={ansAv} alt={ansName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-blue-700">{ansName.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <Link to={'/profile/' + (ans.author?._id || '')} className="text-xs font-bold text-gray-900 hover:text-blue-600 transition">{ansName}</Link>
                        <span className="text-[10px] text-gray-400">{timeAgo(ans.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-700">{ans.text}</p>
                      <button
                        onClick={() => handleLikeAnswer(ans._id)}
                        className={'mt-1.5 flex items-center gap-1 text-[10px] font-semibold transition ' + (ansLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}
                      >
                        <Heart size={11} className={ansLiked ? 'fill-red-500' : ''} />
                        {ans.likeCount || 0}
                      </button>
                    </div>
                  </div>
                );
              })}

              <form onSubmit={handleAnswer} className="flex gap-2 mt-2">
                <input
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Write your answer..."
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!answerText.trim() || submittingAnswer}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {submittingAnswer ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Answer
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Action bar ───────────────────────────────────────────────────── */}
      <div className="px-3.5 py-2.5 flex items-center gap-4 border-t border-gray-50 mt-1">
        <button
          onClick={handleLike}
          className={'flex items-center gap-1 text-xs font-bold transition-all active:scale-90 ' + (liked ? 'text-red-500' : 'text-gray-500 hover:text-red-400')}
        >
          <Heart size={16} className={liked ? 'fill-red-500' : ''} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className={'flex items-center gap-1 text-xs font-bold transition ' + (showComments ? 'text-blue-600' : 'text-gray-500 hover:text-blue-500')}
        >
          <MessageCircle size={16} />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>

        <button
          onClick={handleSave}
          className={'flex items-center gap-1 text-xs font-bold transition ml-auto active:scale-90 ' + (saved ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500')}
        >
          <Bookmark size={16} className={saved ? 'fill-blue-600' : ''} />
        </button>
      </div>

      {/* ── Comments ─────────────────────────────────────────────────────── */}
      {showComments && (
        <div className="border-t border-gray-50 px-4 pt-3 pb-4 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => {
              const cAv   = avatarUrl(c.author?.avatar);
              const cName = c.author?.fullName || 'Traveler';
              const cText = c.content || c.text || '';
              const isMyComment = String(c.author?._id) === String(myId);
              return (
                <div key={c._id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mt-0.5">
                    {cAv
                      ? <img src={cAv} alt={cName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{cName.charAt(0)}</div>}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 group">
                    <div className="flex items-center justify-between">
                      <Link to={'/profile/' + (c.author?._id || '')} className="text-xs font-bold text-gray-900 hover:text-blue-600 transition">{cName}</Link>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                        {(isMyComment || isAuthor) && (
                          <button
                            onClick={() => handleDeleteComment(c._id)}
                            className="ml-1 p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{cText}</p>
                  </div>
                </div>
              );
            })
          )}

          <form onSubmit={handleComment} className="flex items-center gap-2 mt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submittingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}