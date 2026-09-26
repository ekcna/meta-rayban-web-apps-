import {useEffect, useRef, useState} from 'react';
import {AvatarShape, ListItem, VerticalList} from '@wearables-ui-toolkit/mrbd';
import {fetchTrending, type VideoResult} from '../lib/youtube';
import {readApiKey} from '../lib/apiKeyStore';
import StatusMessage, {type SearchStatus} from './StatusMessage';

export default function TrendingScreen({
  hidden,
  onSelect,
}: {
  hidden: boolean;
  onSelect: (video: VideoResult) => void;
}) {
  const [results, setResults] = useState<VideoResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>({kind: 'loading'});
  const loadedRef = useRef(false);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const lastSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

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
    fetchTrending(apiKey, controller.signal)
      .then(items => {
        setResults(items);
        if (items.length === 0) setStatus({kind: 'empty', query: 'trending videos'});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : "Couldn't load trending videos.",
        });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!hidden && lastSelectedIdRef.current) {
      itemRefs.current.get(lastSelectedIdRef.current)?.focus();
    }
  }, [hidden]);

  return (
    <div className={`tab-page${hidden ? ' hidden' : ''}`}>
      <VerticalList ariaLabel="Trending videos" tabIndex={0} insetForHeader>
        {results.length > 0 ? (
          results.map(video => (
            <ListItem
              key={video.id}
              ref={element => {
                if (element) itemRefs.current.set(video.id, element);
              }}
              title={video.title}
              subtitle={`${video.channelTitle} · ${video.duration}`}
              subtitleMaxLines={1}
              avatarSrc={video.thumbnailUrl}
              avatarShape={AvatarShape.ROUNDED_RECTANGLE}
              avatarAlt=""
              onClick={() => {
                lastSelectedIdRef.current = video.id;
                onSelect(video);
              }}
            />
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
