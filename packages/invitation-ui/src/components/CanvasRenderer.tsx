import type { CanvasConfig } from '../types/invitation';

interface Props {
  config: CanvasConfig;
}

/**
 * 그림판(canvas) 읽기 전용 렌더 — 미리보기/발행본 공용.
 * 단일 SVG(viewBox)로 감싸 위치·크기·글씨 크기까지 부모 폭에 맞춰 균일 스케일한다.
 * 좌표는 에디터(CanvasEditor)와 동일한 viewBox px. 브러시 fillOpacity 0.7은 에디터와 일치해야 함.
 * 제목·부제목이 있으면 다른 섹션과 동일한 헤더(영문 부제목 + 한글 제목)를 캔버스 위에 표시한다.
 */
export function CanvasRenderer({ config }: Props) {
  const { title, subtitle, items, backgroundColor, viewBox } = config;
  const hasTitle = !!title?.trim();
  const hasSubtitle = !!subtitle?.trim();
  const hasHeader = hasTitle || hasSubtitle;
  // 제목·부제목도 없고 요소도 없으면 섹션 자체를 비표시. 헤더만 있어도(그림 없이) 렌더한다.
  if (items.length === 0 && !hasHeader) return null;

  const ordered = [...items].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div>
      {hasHeader && (
        <div className="px-7 pt-12">
          {hasSubtitle && (
            <div className="font-italic italic font-normal text-[13px] text-sky tracking-[.18em] uppercase text-center mb-1.5">
              {subtitle}
            </div>
          )}
          {hasTitle && (
            <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px]">
              {title}
            </div>
          )}
          {/* 다른 섹션 헤더와 동일한 장식 구분선 */}
          <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
        </div>
      )}
      {items.length > 0 && (
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="청첩장 그림판"
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: `${viewBox.width} / ${viewBox.height}`,
            background: backgroundColor === 'transparent' ? undefined : backgroundColor,
          }}
        >
          {ordered.map((item) => {
            const cx = item.x + item.width / 2;
            const cy = item.y + item.height / 2;
            const transform = item.rotation ? `rotate(${item.rotation} ${cx} ${cy})` : undefined;

            if (item.type === 'drawing') {
              return (
                <g key={item.id} transform={transform}>
                  <svg
                    x={item.x}
                    y={item.y}
                    width={item.width}
                    height={item.height}
                    viewBox={`0 0 ${item.viewBox.width} ${item.viewBox.height}`}
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                  >
                    {item.strokes.map((s, i) => (
                      <path key={i} d={s.d} fill={s.color} fillOpacity={s.tool === 'brush' ? 0.7 : 1} stroke="none" />
                    ))}
                  </svg>
                </g>
              );
            }

            if (item.type === 'text') {
              return (
                <g key={item.id} transform={transform}>
                  <foreignObject x={item.x} y={item.y} width={item.width} height={item.height}>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: item.fontSize,
                        fontFamily: item.fontFamily,
                        color: item.color,
                        lineHeight: 1.2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                      }}
                    >
                      {item.text}
                    </div>
                  </foreignObject>
                </g>
              );
            }

            return (
              <g key={item.id} transform={transform}>
                {/* 원격 URL·data URI 모두 안정적으로 렌더되도록 SVG <image> 대신 foreignObject+img 사용
                    (카카오톡 등 인앱 웹뷰에서 <image href> 외부 리소스 미표시 회피) */}
                <foreignObject x={item.x} y={item.y} width={item.width} height={item.height}>
                  <img
                    src={item.imageUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </foreignObject>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
