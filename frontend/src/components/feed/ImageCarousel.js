import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BASE_URL = 'http://localhost:5000';

const imgUrl = (v) => {
  if (!v) return '';
  return String(v).startsWith('http') ? v : (BASE_URL + v);
};

export default function ImageCarousel({ images, onDoubleTap }) {
  const [idx, setIdx]               = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [layers, setLayers]         = useState({
    a: { src: imgUrl(images[0]), visible: true  },
    b: { src: '',               visible: false },
  });

  const activeLayer = useRef('a');
  const touchStart  = useRef(null);
  const animRef     = useRef(null);

  const goTo = useCallback((newIdx) => {
    if (transitioning || newIdx === idx) return;
    if (animRef.current) clearTimeout(animRef.current);

    const newSrc   = imgUrl(images[newIdx]);
    const current  = activeLayer.current;
    const incoming = current === 'a' ? 'b' : 'a';

    setLayers((prev) => ({
      ...prev,
      [incoming]: { src: newSrc, visible: false },
    }));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitioning(true);
        setIdx(newIdx);
        setLayers({
          [current]:  { src: imgUrl(images[idx]),    visible: false },
          [incoming]: { src: newSrc,                 visible: true  },
        });
        activeLayer.current = incoming;

        animRef.current = setTimeout(() => setTransitioning(false), 260);
      });
    });
  }, [idx, images, transitioning]);

  const prev = (e) => { e.stopPropagation(); goTo((idx - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); goTo((idx + 1) % images.length); };

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0
        ? goTo((idx + 1) % images.length)
        : goTo((idx - 1 + images.length) % images.length);
    }
    touchStart.current = null;
  };

  if (!images || images.length === 0) return null;

  return (
    <div
      className="relative w-full bg-black select-none overflow-hidden"
      style={{ minHeight: 180, maxHeight: 520 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {['a', 'b'].map((layer) => (
        <div
          key={layer}
          aria-hidden={!layers[layer].visible}
          style={{
            position:   'absolute',
            inset:       0,
            opacity:     layers[layer].visible ? 1 : 0,
            transition: 'opacity 0.24s ease',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {layers[layer].src && (
            <>
              {/* Blurred background fill */}
              <img
                src={layers[layer].src}
                alt=""
                aria-hidden="true"
                style={{
                  position:  'absolute',
                  inset:      0,
                  width:     '100%',
                  height:    '100%',
                  objectFit: 'cover',
                  filter:    'blur(18px)',
                  transform: 'scale(1.12)',
                  opacity:    0.45,
                  pointerEvents: 'none',
                }}
              />
              {/* Main image — object-contain, never cropped */}
              <img
                src={layers[layer].src}
                alt=""
                onDoubleClick={onDoubleTap}
                style={{
                  position:  'relative',
                  zIndex:     1,
                  maxWidth:  '100%',
                  maxHeight:  520,
                  width:     'auto',
                  height:    'auto',
                  display:   'block',
                  objectFit: 'contain',
                  cursor:    'pointer',
                }}
                draggable={false}
              />
            </>
          )}
        </div>
      ))}

      {/* Invisible spacer keeps container height = natural image height */}
      <img
        src={imgUrl(images[idx])}
        alt=""
        aria-hidden="true"
        style={{
          display:   'block',
          width:     '100%',
          height:    'auto',
          maxHeight:  520,
          opacity:    0,
          pointerEvents: 'none',
          position:  'relative',
          zIndex:     0,
        }}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`rounded-full transition-all duration-200 ${
                  i === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          <div className="absolute top-2.5 right-2.5 z-30 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            {idx + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}