import {useEffect, useRef, useState} from 'react';
import {
  AvatarShape,
  Button,
  ButtonRail,
  InputTextView,
  ListItem,
  Toast,
  VerticalList,
} from '@wearables-ui-toolkit/mrbd';
import {searchVideos, YouTubeApiError, type VideoResult} from '../lib/youtube';
import StatusMessage, {type SearchStatus} from './StatusMessage';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const SUGGESTIONS = ['Lo-fi beats', 'Guitar lesson', 'News recap'];

export default function SearchScreen({
  hidden,
  onSelect,
}: {
  hidden: boolean;
  onSelect: (video: VideoResult) => void;
}) {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>(
    API_KEY ? {kind: 'idle'} : {kind: 'missingKey'},
  );

  const abortRef = useRef<AbortController | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const lastSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!hidden && lastSelectedIdRef.current) {
      itemRefs.current.get(lastSelectedIdRef.current)?.focus();
    }
  }, [hidden]);

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed || !API_KEY) return;

    if (!navigator.onLine) {
      setStatus({kind: 'offline'});
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResults([]);
    setStatus({kind: 'loading'});

    searchVideos(trimmed, API_KEY, controller.signal)
      .then(items => {
        setResults(items);
        setStatus(items.length === 0 ? {kind: 'empty', query: trimmed} : {kind: 'idle'});
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof YouTubeApiError
            ? error.userMessage
            : "Couldn't reach YouTube. Check your connection.";
        setStatus({kind: 'error', message});
        Toast.show('Search failed', message);
      });
  }

  function handleSelect(video: VideoResult, element: HTMLDivElement | null) {
    lastSelectedIdRef.current = video.id;
    if (element) itemRefs.current.set(video.id, element);
    onSelect(video);
  }

  function handleSuggestion(query: string) {
    setQueryText(query);
    runSearch(query);
  }

  return (
    <div className={`search-shell${hidden ? ' hidden' : ''}`}>
      <div className="search-bar-row">
        <InputTextView
          text={queryText}
          onTextChange={setQueryText}
          hint="Search YouTube"
          showActionButton
          actionLabel="Search"
          onSend={runSearch}
        />
      </div>

      <VerticalList ariaLabel="Search results" tabIndex={0} insetForHeader={false}>
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
              onClick={() => handleSelect(video, itemRefs.current.get(video.id) ?? null)}
            />
          ))
        ) : (
          <div className="content-inset status-message">
            <StatusMessage status={status} />
          </div>
        )}
      </VerticalList>

      {results.length === 0 && (
        <div className="action-dock">
          <ButtonRail>
            {SUGGESTIONS.map(suggestion => (
              <Button
                key={suggestion}
                title={suggestion}
                onClick={() => handleSuggestion(suggestion)}
              />
            ))}
          </ButtonRail>
        </div>
      )}
    </div>
  );
}
