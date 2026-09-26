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
import {readApiKey, saveApiKey} from '../lib/apiKeyStore';
import {searchVideos, YouTubeApiError, type VideoResult} from '../lib/youtube';
import OnScreenKeyboard from './OnScreenKeyboard';
import StatusMessage, {type SearchStatus} from './StatusMessage';

const SUGGESTIONS = ['Lo-fi beats', 'Guitar lesson', 'News recap'];

export default function SearchScreen({
  hidden,
  onSelect,
}: {
  hidden: boolean;
  onSelect: (video: VideoResult) => void;
}) {
  const [queryText, setQueryText] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [apiKey, setApiKey] = useState<string | undefined>(() => readApiKey());
  const [results, setResults] = useState<VideoResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>(
    apiKey ? {kind: 'idle'} : {kind: 'missingKey'},
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
    if (!trimmed || !apiKey) return;

    if (!navigator.onLine) {
      setStatus({kind: 'offline'});
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResults([]);
    setStatus({kind: 'loading'});

    searchVideos(trimmed, apiKey, controller.signal)
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

  function handleKeyboardSubmit() {
    runSearch(queryText);
    setKeyboardOpen(false);
  }

  function handleSaveKey(draft: string) {
    const trimmed = draft.trim();
    if (!trimmed) return;
    saveApiKey(trimmed);
    setApiKey(trimmed);
    setKeyDraft('');
    setStatus({kind: 'idle'});
  }

  if (keyboardOpen) {
    return (
      <div className={`search-shell${hidden ? ' hidden' : ''}`}>
        <OnScreenKeyboard
          value={queryText}
          onChange={setQueryText}
          onSubmit={handleKeyboardSubmit}
          onClose={() => setKeyboardOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`search-shell${hidden ? ' hidden' : ''}`}>
      <VerticalList ariaLabel="Search YouTube" tabIndex={0} insetForHeader>
        <div className="search-bar-row" onClick={() => setKeyboardOpen(true)}>
          <InputTextView
            text={queryText}
            onTextChange={setQueryText}
            hint="Search YouTube"
            showActionButton
            actionLabel="Search"
            onSend={runSearch}
          />
        </div>

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
            {status.kind === 'missingKey' && (
              <div className="key-entry-row">
                <InputTextView
                  text={keyDraft}
                  onTextChange={setKeyDraft}
                  hint="Paste your API key"
                  showActionButton
                  actionLabel="Save"
                  onSend={handleSaveKey}
                />
              </div>
            )}
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
