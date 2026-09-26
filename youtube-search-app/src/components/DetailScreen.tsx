import {Panel, ReadMoreTextView, ScrollView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {formatRelativeDate, type VideoResult} from '../lib/youtube';

export default function DetailScreen({video}: {video: VideoResult}) {
  return (
    <ScrollView ariaLabel={`Details for ${video.title}`} tabIndex={0} insetForHeader>
      <Panel width="100%">
        <div className="detail-content">
          <img className="detail-thumbnail" src={video.thumbnailUrl} alt="" />

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
