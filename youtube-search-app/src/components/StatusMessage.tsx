import {IndeterminateLoader, IndeterminateLoaderSize, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';

export type SearchStatus =
  | {kind: 'missingKey'}
  | {kind: 'offline'}
  | {kind: 'idle'}
  | {kind: 'loading'}
  | {kind: 'empty'; query: string}
  | {kind: 'error'; message: string};

export default function StatusMessage({status}: {status: SearchStatus}) {
  if (status.kind === 'loading') {
    return (
      <div className="status-message">
        <IndeterminateLoader size={IndeterminateLoaderSize.MEDIUM} />
        <TextView as="p" textStyle={TextStyle.BODY2}>
          Searching YouTube…
        </TextView>
      </div>
    );
  }

  const {heading, body} = describe(status);
  return (
    <div className="status-message">
      <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
        {heading}
      </TextView>
      <TextView as="p" textStyle={TextStyle.BODY2}>
        {body}
      </TextView>
    </div>
  );
}

function describe(status: Exclude<SearchStatus, {kind: 'loading'}>): {heading: string; body: string} {
  switch (status.kind) {
    case 'missingKey':
      return {
        heading: 'No API key configured',
        body: 'Add a free YouTube Data API v3 key to VITE_YOUTUBE_API_KEY in .env.local, then restart the dev server.',
      };
    case 'offline':
      return {
        heading: "You're offline",
        body: 'Connect to the internet and search again.',
      };
    case 'idle':
      return {
        heading: 'Search YouTube',
        body: 'Type a query above and press Select to see results.',
      };
    case 'empty':
      return {
        heading: 'No results',
        body: `Nothing matched "${status.query}". Try different words.`,
      };
    case 'error':
      return {
        heading: "Search didn't go through",
        body: status.message,
      };
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}
