import {useEffect, useState} from 'react';
import {expandOutline} from '@wearables-ui-toolkit/icons';
import {
  Button,
  ButtonRail,
  Panel,
  ReadMoreTextView,
  ScrollView,
  Surface,
  SurfaceCornerRadius,
  TextColor,
  TextStyle,
  TextView,
} from '@wearables-ui-toolkit/mrbd';
import {formatRelativeDate, type VideoResult} from '../lib/youtube';

export default function DetailScreen({
  video,
  expanded,
  onToggleExpand,
}: {
  video: VideoResult;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    if (!expanded) return;
    function handleResize() {
      setViewportSize({width: window.innerWidth, height: window.innerHeight});
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [expanded]);

  return (
    <div className={`detail-shell${expanded ? ' expanded' : ''}`}>
      {expanded ? (
        <div className="detail-video-expanded">
          <iframe
            className="detail-video"
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            width={viewportSize.width}
            height={viewportSize.height}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          />
        </div>
      ) : (
        <ScrollView ariaLabel={`Details for ${video.title}`} tabIndex={0} insetForHeader>
          <Panel width="100%">
            <div className="content-inset">
              <div className="detail-video-wrap">
                <Surface
                  cornerRadius={SurfaceCornerRadius.MEDIUM}
                  className="detail-video-frame"
                  width="100%"
                  height="100%"
                >
                  <iframe
                    className="detail-video"
                    src={`https://www.youtube.com/embed/${video.id}`}
                    title={video.title}
                    allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                  />
                </Surface>
              </div>

              <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
                {video.channelTitle}
              </TextView>
              <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                {video.viewCount} · {video.duration}
              </TextView>
              <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                Uploaded {formatRelativeDate(video.publishedAt)}
              </TextView>

              <ReadMoreTextView
                textStyle={TextStyle.BODY2}
                textColor={TextColor.SECONDARY}
                maxLines={5}
                readMoreLabel="More"
              >
                {video.description || 'No description provided.'}
              </ReadMoreTextView>
            </div>
          </Panel>
        </ScrollView>
      )}

      {!expanded && (
        <div className="action-dock">
          <ButtonRail>
            <Button
              title="Fill screen"
              icon={expandOutline}
              ariaLabel="Fill screen with video"
              onClick={onToggleExpand}
            />
          </ButtonRail>
        </div>
      )}
    </div>
  );
}
