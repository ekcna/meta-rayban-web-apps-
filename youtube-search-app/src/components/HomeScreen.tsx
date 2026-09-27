import {useEffect, useRef, useState} from 'react';
import {TextColor, TextStyle, TextView, VerticalList} from '@wearables-ui-toolkit/mrbd';
import {
  fetchChannelUploads,
  fetchSubscriptions,
  fetchTrending,
  type VideoResult,
} from '../lib/youtube';
import {readApiKey} from '../lib/apiKeyStore';
import StatusMessage, {type SearchStatus} from './StatusMessage';

const MAX_SUBSCRIBED_CHANNELS = 3;
const MAX_RESULTS = 24;

function interleave(lists: VideoResult[][]): VideoResult[] {
  const merged: VideoResult[] = [];
  for (let i = 0; ; i++) {
    let addedAny = false;
    for (const list of lists) {
      if (list[i]) {
        merged.push(list[i]);
        addedAny = true;
      }
    }
    if (!addedAny) break;
  }
  return merged;
}

function dedupeById(videos: VideoResult[]): VideoResult[] {
  const seen = new Set<string>();
  const unique: VideoResult[] = [];
  for (const video of videos) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    unique.push(video);
  }
  return unique;
}

export default function HomeScreen({
  hidden,
  accessToken,
  onSelect,
}: {
  hidden: boolean;
  accessToken: string | null;
  onSelect: (video: VideoResult) => void;
}) {
  const [results, setResults] = useState<VideoResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>({kind: 'loading'});
  const loadedForRef = useRef<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const authKey = accessToken ?? 'signed-out';
    if (loadedForRef.current === authKey) return;
    loadedForRef.current = authKey;

    const apiKey = readApiKey();
    if (!apiKey) {
      setStatus({kind: 'missingKey'});
      return;
    }
    if (!navigator.onLine) {
      setStatus({kind: 'offline'});
      return;
    }

    const controller = new AbortController();
    setStatus({kind: 'loading'});

    async function load() {
      const trending = await fetchTrending(apiKey as string, controller.signal);

      if (!accessToken) {
        return trending;
      }

      const channels = await fetchSubscriptions(accessToken, controller.signal);
      const uploadLists = await Promise.all(
        channels
          .slice(0, MAX_SUBSCRIBED_CHANNELS)
          .map(channel =>
            fetchChannelUploads(channel.id, apiKey as string, controller.signal).catch(
              () => [] as VideoResult[],
            ),
          ),
      );
      return interleave([...uploadLists, trending]);
    }

    load()
      .then(videos => {
        const deduped = dedupeById(videos).slice(0, MAX_RESULTS);
        setResults(deduped);
        setStatus(deduped.length === 0 ? {kind: 'empty', query: 'recommended videos'} : {kind: 'idle'});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : "Couldn't load recommendations.",
        });
      });

    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!hidden && lastSelectedIdRef.current) {
      itemRefs.current.get(lastSelectedIdRef.current)?.focus();
    }
  }, [hidden]);

  return (
    <div className={`tab-page${hidden ? ' hidden' : ''}`}>
      <VerticalList ariaLabel="Recommended for you" tabIndex={0} insetForHeader>
        {results.length > 0 ? (
          results.map(video => (
            <button
              key={video.id}
              type="button"
              className="home-card"
              ref={element => {
                if (element) itemRefs.current.set(video.id, element);
              }}
              onClick={() => {
                lastSelectedIdRef.current = video.id;
                onSelect(video);
              }}
            >
              <img className="home-card-thumb" src={video.thumbnailUrl} alt="" />
              <span className="home-card-duration">{video.duration}</span>
              <div className="home-card-body">
                <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED} className="home-card-title">
                  {video.title}
                </TextView>
                <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                  {video.channelTitle}
                </TextView>
                <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                  {video.viewCount}
                </TextView>
              </div>
            </button>
          ))
        ) : (
          <div className="content-inset status-message">
            <StatusMessage status={status} />
          </div>
        )}
      </VerticalList>
    </div>
  );
}
