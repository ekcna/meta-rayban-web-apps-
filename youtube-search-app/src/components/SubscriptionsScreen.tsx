import {useEffect, useState} from 'react';
import {arrowLoginOutline} from '@wearables-ui-toolkit/icons';
import {
  AvatarShape,
  Button,
  ButtonRail,
  IndeterminateLoader,
  IndeterminateLoaderSize,
  ListItem,
  TextStyle,
  TextView,
  VerticalList,
} from '@wearables-ui-toolkit/mrbd';
import {readApiKey} from '../lib/apiKeyStore';
import {
  fetchChannelUploads,
  fetchSubscriptions,
  type ChannelResult,
  type VideoResult,
} from '../lib/youtube';

type Status = {kind: 'loading'} | {kind: 'error'; message: string} | {kind: 'ready'};

function StatusPane({status, emptyMessage}: {status: Status; emptyMessage: string}) {
  return (
    <div className="content-inset status-message">
      {status.kind === 'error' ? (
        <TextView as="p" textStyle={TextStyle.BODY2}>
          {status.message}
        </TextView>
      ) : status.kind === 'loading' ? (
        <IndeterminateLoader size={IndeterminateLoaderSize.MEDIUM} />
      ) : (
        <TextView as="p" textStyle={TextStyle.BODY2}>
          {emptyMessage}
        </TextView>
      )}
    </div>
  );
}

export default function SubscriptionsScreen({
  hidden,
  accessToken,
  onSignIn,
  onSelect,
  selectedChannel,
  onSelectChannel,
}: {
  hidden: boolean;
  accessToken: string | null;
  onSignIn: () => void;
  onSelect: (video: VideoResult) => void;
  selectedChannel: ChannelResult | null;
  onSelectChannel: (channel: ChannelResult | null) => void;
}) {
  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [channelsStatus, setChannelsStatus] = useState<Status>({kind: 'loading'});
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [videosStatus, setVideosStatus] = useState<Status>({kind: 'loading'});

  useEffect(() => {
    if (!accessToken) return;
    setChannelsStatus({kind: 'loading'});
    const controller = new AbortController();
    fetchSubscriptions(accessToken, controller.signal)
      .then(items => {
        setChannels(items);
        setChannelsStatus({kind: 'ready'});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setChannelsStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : "Couldn't load subscriptions.",
        });
      });
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!selectedChannel) {
      setVideos([]);
      return;
    }
    const apiKey = readApiKey();
    if (!apiKey) {
      setVideosStatus({kind: 'error', message: 'No API key configured.'});
      return;
    }
    setVideosStatus({kind: 'loading'});
    const controller = new AbortController();
    fetchChannelUploads(selectedChannel.id, apiKey, controller.signal)
      .then(items => {
        setVideos(items);
        setVideosStatus({kind: 'ready'});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setVideosStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : "Couldn't load videos.",
        });
      });
    return () => controller.abort();
  }, [selectedChannel]);

  if (!accessToken) {
    return (
      <div className={`tab-page subs-signin${hidden ? ' hidden' : ''}`}>
        <div className="content-inset status-message">
          <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
            See your subscriptions
          </TextView>
          <TextView as="p" textStyle={TextStyle.BODY2}>
            Sign in with Google to view channels you're subscribed to.
          </TextView>
        </div>
        <div className="action-dock">
          <ButtonRail>
            <Button title="Sign in with Google" icon={arrowLoginOutline} onClick={onSignIn} />
          </ButtonRail>
        </div>
      </div>
    );
  }

  if (selectedChannel) {
    if (videosStatus.kind !== 'ready' || videos.length === 0) {
      return (
        <div className={`tab-page${hidden ? ' hidden' : ''}`}>
          <StatusPane
            status={videosStatus}
            emptyMessage={`${selectedChannel.title} has no recent uploads.`}
          />
        </div>
      );
    }
    return (
      <div className={`tab-page${hidden ? ' hidden' : ''}`}>
        <VerticalList ariaLabel={`Videos from ${selectedChannel.title}`} tabIndex={0} insetForHeader>
          {videos.map(video => (
            <ListItem
              key={video.id}
              title={video.title}
              subtitle={`${video.channelTitle} · ${video.duration}`}
              subtitleMaxLines={1}
              avatarSrc={video.thumbnailUrl}
              avatarShape={AvatarShape.ROUNDED_RECTANGLE}
              avatarAlt=""
              onClick={() => onSelect(video)}
            />
          ))}
        </VerticalList>
      </div>
    );
  }

  if (channelsStatus.kind !== 'ready' || channels.length === 0) {
    return (
      <div className={`tab-page${hidden ? ' hidden' : ''}`}>
        <StatusPane status={channelsStatus} emptyMessage="No subscriptions found." />
      </div>
    );
  }

  return (
    <div className={`tab-page${hidden ? ' hidden' : ''}`}>
      <VerticalList ariaLabel="Your subscriptions" tabIndex={0} insetForHeader>
        {channels.map(channel => (
          <ListItem
            key={channel.id}
            title={channel.title}
            avatarSrc={channel.thumbnailUrl}
            avatarAlt=""
            onClick={() => onSelectChannel(channel)}
          />
        ))}
      </VerticalList>
    </div>
  );
}
