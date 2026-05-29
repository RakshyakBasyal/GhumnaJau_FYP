// frontend/src/components/feed/PostCard.jsx
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
  addAnswer, likeAnswer, deletePost,
} from '../../services/feedApi';
import { useToast } from '../../context/ToastContext';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const avatarUrl = (v) => {
  if (!v) return '';
  const s = String(v);
  return s.startsWith('http') ? s : BASE_URL + s;
};
const imgUrl = (v) => {
  if (!v) return '';
  const s = String(v);
  return s.startsWith('http') ? s : BASE_URL + s;
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const StarDisplay = ({ rating, size = 12 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(n => (
      <Star key={n} size={size}
        className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
    ))}
  </div>
);

// ── Carousel — NO zoom cursor, click opens fullscreen viewer ─────────────────
const ImageCarousel = ({ images, onOpenViewer }) => {
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);
  const count  = images.length;
  if (count === 0) return null;

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + count) % count); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % count); };

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) dx < 0
      ? setIdx(i => (i + 1) % count)
      : setIdx(i => (i - 1 + count) % count);
    startX.current = null;
  };

  return (
    <div className="relative select-none" style={{ background: '#fff' }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="cursor-pointer" onClick={() => onOpenViewer(idx)}>
        <img
          src={imgUrl(images[idx])}
          alt=""
          draggable={false}
          className="w-full block"
          style={{ maxHeight: '480px', objectFit: 'contain', background: '#fff' }}
        />
      </div>

      {count > 1 && (
        <>
          {idx > 0 && (
            <button onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-sm">
              <ChevronLeft size={16} />
            </button>
          )}
          {idx < count - 1 && (
            <button onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-sm">
              <ChevronRight size={16} />
            </button>
          )}
          <div className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
            {idx + 1}/{count}
          </div>
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className="transition-all duration-200 rounded-full"
                style={{ width: i === idx ? 14 : 5, height: 5, background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CAT_STYLE = {
  photo:    'bg-blue-50 text-blue-600 border-blue-100',
  story:    'bg-purple-50 text-purple-600 border-purple-100',
  tip:      'bg-amber-50 text-amber-600 border-amber-100',
  review:   'bg-emerald-50 text-emerald-600 border-emerald-100',
  question: 'bg-rose-50 text-rose-600 border-rose-100',
};
const CAT_LABEL = {
  photo: 'Photo', story: 'Story', tip: 'Tip', review: 'Review', question: 'Question',
};

export default function PostCard({ post, onUpdated, onDeleted }) {
  const { showToast } = useToast();

  const myId = (() => {
    const t = localStorage.getItem('token');
    if (!t) return null;
    try { const d = JSON.parse(atob(t.split('.')[1])); return (d && (d.id || d._id)) || null; }
    catch (_) { return null; }
  })();

  const [liked,             setLiked]             = useState(() => (post.likes || []).some(l => String(l) === String(myId)));
  const [likeCount,         setLikeCount]         = useState(() => post.likeCount || (post.likes || []).length || 0);
  const [saved,             setSaved]             = useState(() => (post.saves || []).some(s => String(s) === String(myId)));
  const [commentCount,      setCommentCount]      = useState(() => post.commentCount || 0);
  const [comments,          setComments]          = useState([]);
  const [showComments,      setShowComments]      = useState(false);
  const [commentText,       setCommentText]       = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu,          setShowMenu]          = useState(false);
  const [deleting,          setDeleting]          = useState(false);
  const [showAnswers,       setShowAnswers]       = useState(false);
  const [answerText,        setAnswerText]        = useState('');
  const [answers,           setAnswers]           = useState(() => post.answers || []);
  const [submittingAnswer,  setSubmittingAnswer]  = useState(false);
  const [showHeart,         setShowHeart]         = useState(false);
  const [viewerIdx,         setViewerIdx]         = useState(-1);
  const [expanded,          setExpanded]          = useState(false);

  const menuRef  = useRef(null);
  const isAuthor = String(post.author?._id || post.author) === String(myId);
  const images   = post.images || [];

  useEffect(() => {
    setLiked((post.likes || []).some(l => String(l) === String(myId)));
    setLikeCount(post.likeCount || (post.likes || []).length || 0);
  }, [post.likes, post.likeCount]);

  useEffect(() => { setCommentCount(post.commentCount || 0); }, [post.commentCount]);

  useEffect(() => {
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    if (!showComments) return;
    getComments(post._id).then(res => setComments(res.data || [])).catch(() => {});
  }, [showComments, post._id]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try { wasLiked ? await unlikePost(post._id) : await likePost(post._id); }
    catch (_) { setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1); }
  };

  const handleDoubleTap = () => {
    if (!liked) handleLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const handleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      wasSaved ? await unsavePost(post._id) : await savePost(post._id);
      showToast(wasSaved ? 'Removed from saved' : 'Saved!', 'success');
    } catch (_) { setSaved(wasSaved); }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true); setShowMenu(false);
    try {
      await deletePost(post._id);
      showToast('Post deleted', 'success');
      onDeleted(post._id);
    } catch (_) { showToast('Failed to delete', 'error'); }
    finally { setDeleting(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await addComment(post._id, commentText.trim());
      setComments(prev => [...prev, res.data]);
      setCommentCount(c => c + 1);
      setCommentText('');
    } catch (_) { showToast('Failed to comment', 'error'); }
    finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(post._id, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      setCommentCount(c => Math.max(0, c - 1));
    } catch (_) { showToast('Failed', 'error'); }
  };

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!answerText.trim() || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      const res = await addAnswer(post._id, answerText.trim());
      setAnswers(res.data.answers || []);
      setAnswerText('');
    } catch (_) { showToast('Failed', 'error'); }
    finally { setSubmittingAnswer(false); }
  };

  const handleLikeAnswer = async (answerId) => {
    try {
      await likeAnswer(post._id, answerId);
      setAnswers(prev => prev.map(a => {
        if (String(a._id) !== String(answerId)) return a;
        const wasLiked = a.likes.some(l => String(l) === String(myId));
        const newLikes = wasLiked
          ? a.likes.filter(l => String(l) !== String(myId))
          : [...a.likes, myId];
        return { ...a, likes: newLikes, likeCount: newLikes.length };
      }));
    } catch (_) {}
  };

  const authorAv   = avatarUrl(post.author?.avatar);
  const authorName = post.author?.fullName || 'Traveler';
  const catStyle   = CAT_STYLE[post.category] || CAT_STYLE.photo;
  const catLabel   = CAT_LABEL[post.category] || post.category;

  const CONTENT_LIMIT = 120;
  const content = post.content || '';
  const isLong  = content.length > CONTENT_LIMIT;
  const displayContent = isLong && !expanded ? content.slice(0, CONTENT_LIMIT) + '…' : content;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <Link to={'/profile/' + (post.author?._id || '')} className="flex items-center gap-2.5 group min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0 ring-2 ring-white shadow-sm">
            {authorAv
              ? <img src={authorAv} alt={authorName} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-blue-700 font-bold text-xs">{authorName.charAt(0).toUpperCase()}</div>}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 group-hover:text-blue-600 transition leading-tight truncate">{authorName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={'text-[9px] font-semibold px-1.5 py-0.5 rounded border ' + catStyle}>{catLabel}</span>
              {post.destinationName && (
                <span className="text-[9px] text-gray-400 flex items-center gap-0.5 truncate">
                  <MapPin size={7} /> {post.destinationName}
                </span>
              )}
              <span className="text-[9px] text-gray-300">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {post.budget && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded flex items-center gap-0.5">
              <DollarSign size={8} /> {post.budget}
            </span>
          )}
          {isAuthor && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(v => !v)}
                className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition">
                {deleting ? <Loader2 size={14} className="animate-spin text-red-400" /> : <MoreHorizontal size={14} />}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 w-32 overflow-hidden">
                  <button onClick={() => { setShowMenu(false); onUpdated(post, 'edit'); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                    <Edit2 size={11} /> Edit
                  </button>
                  <button onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Caption ─────────────────────────────────────────────── */}
      {content && (
        <div className="px-3 pb-2">
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-line">
            <span className="font-semibold text-gray-900">{authorName} </span>
            {displayContent}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(v => !v)}
              className="text-[11px] text-gray-400 hover:text-gray-600 mt-0.5">
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </div>
      )}

      {/* ── Review rating ───────────────────────────────────────── */}
      {post.category === 'review' && post.rating && (
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <StarDisplay rating={post.rating} />
          <span className="text-[10px] font-semibold text-amber-600">{post.rating}/5</span>
          {post.reviewType && <span className="text-[9px] text-gray-400 capitalize">{post.reviewType}</span>}
        </div>
      )}

      {/* ── Image carousel ──────────────────────────────────────── */}
      {images.length > 0 && (
        <div className="relative" onDoubleClick={handleDoubleTap}>
          <ImageCarousel images={images} onOpenViewer={i => setViewerIdx(i)} />
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
              <Heart size={70} className="text-white fill-white drop-shadow-2xl"
                style={{ animation: 'heartPop 0.75s ease-out forwards' }} />
            </div>
          )}
          <style>{`@keyframes heartPop{0%{transform:scale(.3);opacity:0}30%{transform:scale(1.3);opacity:1}60%{transform:scale(1);opacity:1}100%{transform:scale(1.1);opacity:0}}`}</style>
        </div>
      )}

      {/* ── Action bar ──────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-3">
        <button onClick={handleLike}
          className={'flex items-center gap-1 text-[11px] font-semibold transition active:scale-90 ' + (liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}>
          <Heart size={18} className={liked ? 'fill-red-500' : ''} />
        </button>
        <button onClick={() => setShowComments(v => !v)}
          className={'flex items-center gap-1 text-[11px] font-semibold transition ' + (showComments ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500')}>
          <MessageCircle size={18} />
        </button>
        <button onClick={handleSave}
          className={'flex items-center ml-auto transition active:scale-90 ' + (saved ? 'text-blue-600' : 'text-gray-400 hover:text-blue-500')}>
          <Bookmark size={18} className={saved ? 'fill-blue-600' : ''} />
        </button>
      </div>

      {likeCount > 0 && (
        <div className="px-3 pb-1">
          <span className="text-[12px] font-semibold text-gray-800">{likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}</span>
        </div>
      )}

      {commentCount > 0 && !showComments && (
        <div className="px-3 pb-2">
          <button onClick={() => setShowComments(true)} className="text-[11px] text-gray-400 hover:text-gray-600">
            View all {commentCount} comment{commentCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* ── Question answers ────────────────────────────────────── */}
      {post.category === 'question' && (
        <div className="px-3 pb-3 border-t border-gray-50 pt-2">
          <button onClick={() => setShowAnswers(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
            <HelpCircle size={12} />
            {answers.length === 0 ? 'Be the first to answer' : `${answers.length} answer${answers.length !== 1 ? 's' : ''}`}
            {showAnswers ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showAnswers && (
            <div className="mt-2 space-y-2">
              {answers.map(ans => {
                const ansAv    = avatarUrl(ans.author?.avatar);
                const ansName  = ans.author?.fullName || 'Traveler';
                const ansLiked = (ans.likes || []).some(l => String(l) === String(myId));
                return (
                  <div key={ans._id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
                      {ansAv ? <img src={ansAv} alt={ansName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-blue-700">{ansName.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-2.5 py-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-semibold text-gray-900">{ansName}</span>
                        <span className="text-[9px] text-gray-400">{timeAgo(ans.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-gray-700">{ans.text}</p>
                      <button onClick={() => handleLikeAnswer(ans._id)}
                        className={'mt-1 flex items-center gap-0.5 text-[9px] font-semibold ' + (ansLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}>
                        <Heart size={9} className={ansLiked ? 'fill-red-500' : ''} /> {ans.likeCount || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
              <form onSubmit={handleAnswer} className="flex gap-1.5 mt-1.5">
                <input value={answerText} onChange={e => setAnswerText(e.target.value)}
                  placeholder="Write your answer…"
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-xl text-[11px] focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="submit" disabled={!answerText.trim() || submittingAnswer}
                  className="px-2.5 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                  {submittingAnswer ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Comments ────────────────────────────────────────────── */}
      {showComments && (
        <div className="border-t border-gray-50 px-3 pt-2 pb-3 space-y-2">
          {comments.length === 0
            ? <p className="text-[11px] text-gray-400 text-center py-2">No comments yet.</p>
            : comments.map(c => {
                const cAv   = avatarUrl(c.author?.avatar);
                const cName = c.author?.fullName || 'Traveler';
                const cText = c.content || c.text || '';
                const isMyComment = String(c.author?._id) === String(myId);
                return (
                  <div key={c._id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mt-0.5">
                      {cAv ? <img src={cAv} alt={cName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-400">{cName.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 group">
                      <p className="text-[12px] text-gray-800 leading-snug">
                        <Link to={'/profile/' + (c.author?._id || '')}
                          className="font-semibold text-gray-900 hover:text-blue-600 mr-1">{cName}</Link>
                        {cText}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-gray-300">{timeAgo(c.createdAt)}</span>
                        {(isMyComment || isAuthor) && (
                          <button onClick={() => handleDeleteComment(c._id)}
                            className="text-[9px] text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          <form onSubmit={handleComment} className="flex items-center gap-2 pt-1 border-t border-gray-50">
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 text-[12px] outline-none text-gray-700 placeholder-gray-300 bg-transparent" />
            <button type="submit" disabled={!commentText.trim() || submittingComment}
              className="text-[11px] font-semibold text-blue-600 disabled:text-blue-300 transition">
              {submittingComment ? <Loader2 size={11} className="animate-spin" /> : 'Post'}
            </button>
          </form>
        </div>
      )}

      {/* ── Full-screen viewer ──────────────────────────────────── */}
      {viewerIdx >= 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setViewerIdx(-1)}>
          <button onClick={e => { e.stopPropagation(); setViewerIdx(-1); }}
            className="absolute top-5 right-5 z-[110] bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition text-white">
            <X size={20} />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setViewerIdx(p => (p - 1 + images.length) % images.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] bg-white/10 p-3 rounded-full hover:bg-white/20 transition text-white">
                <ChevronLeft size={26} />
              </button>
              <button onClick={e => { e.stopPropagation(); setViewerIdx(p => (p + 1) % images.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] bg-white/10 p-3 rounded-full hover:bg-white/20 transition text-white">
                <ChevronRight size={26} />
              </button>
            </>
          )}
          <div className="max-w-4xl w-full flex flex-col items-center px-4" onClick={e => e.stopPropagation()}>
            <img src={imgUrl(images[viewerIdx])} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            {images.length > 1 && (
              <p className="text-white/50 mt-3 text-sm">{viewerIdx + 1} / {images.length}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}