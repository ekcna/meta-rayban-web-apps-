import {useState} from 'react';
import {App as WearablesApp, Page, useBackNavigation} from '@wearables-ui-toolkit/mrbd';
import SearchScreen from './components/SearchScreen';
import DetailScreen from './components/DetailScreen';
import type {VideoResult} from './lib/youtube';

export default function App() {
  const [selected, setSelected] = useState<VideoResult | null>(null);

  useBackNavigation(() => {
    if (selected) {
      setSelected(null);
      return;
    }
    return false;
  });

  return (
    <WearablesApp>
      <Page
        headerText={selected ? selected.title : 'YouTube Search'}
        headerMaxLines={selected ? 2 : 1}
        enableSystemBarInset={false}
      >
        <div className="app-shell">
          <SearchScreen hidden={selected !== null} onSelect={setSelected} />
          {selected && <DetailScreen video={selected} />}
        </div>
      </Page>
    </WearablesApp>
  );
}
