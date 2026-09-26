import {
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

export default function DetailScreen({video}: {video: VideoResult}) {
  return (
    <ScrollView ariaLabel={`Details for ${video.title}`} tabIndex={0} insetForHeader>
      <Panel width="100%">
        <div className="detail-content">
          <Surface cornerRadius={SurfaceCornerRadius.MEDIUM} className="detail-video-frame">
            <iframe
              className="detail-video"
              src={`https://www.youtube.com/embed/${video.id}`}
              title={video.title}
              allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </Surface>

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
  );
}
