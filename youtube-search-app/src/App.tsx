import {useState} from 'react';
import {
  circlePlayOutline,
  filmStripStackOutline,
  flameOutline,
  houseOutline,
  searchOutline,
} from '@wearables-ui-toolkit/icons';
import {App as WearablesApp, Page, SubNavigationPager, useBackNavigation} from '@wearables-ui-toolkit/mrbd';
import HomeScreen from './components/HomeScreen';
import SearchScreen from './components/SearchScreen';
import TrendingScreen from './components/TrendingScreen';
import ShortsScreen from './components/ShortsScreen';
import SubscriptionsScreen from './components/SubscriptionsScreen';
import DetailScreen from './components/DetailScreen';
import {signIn} from './lib/googleAuth';
import type {ChannelResult, VideoResult} from './lib/youtube';

const TABS = [
  {label: 'Home', icon: houseOutline},
  {label: 'Search', icon: searchOutline},
  {label: 'Trending', icon: flameOutline},
  {label: 'Shorts', icon: circlePlayOutline},
  {label: 'Subscriptions', icon: filmStripStackOutline},
];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [selected, setSelected] = useState<VideoResult | null>(null);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelResult | null>(null);

  function handleSelect(video: VideoResult) {
    setVideoExpanded(false);
    setSelected(video);
  }

  function handleSignIn() {
    signIn()
      .then(token => setAccessToken(token))
      .catch(() => {});
  }

  useBackNavigation(() => {
    if (videoExpanded) {
      setVideoExpanded(false);
      return;
    }
    if (selected) {
      setSelected(null);
      return;
    }
    if (selectedChannel) {
      setSelectedChannel(null);
      return;
    }
    if (activeTab !== 0) {
      setActiveTab(0);
      return;
    }
    return false;
  });

  return (
    <WearablesApp>
      <Page
        headerText={selected?.title}
        headerMaxLines={2}
        enableSystemBarInset={false}
        showHeader={Boolean(selected) && !videoExpanded}
      >
        <div className="app-shell">
          <SubNavigationPager
            items={TABS}
            currentPageIndex={activeTab}
            onPageChange={index => setActiveTab(index)}
            useBackButtonForHome={false}
            ariaLabel="Main menu"
          >
            <HomeScreen hidden={activeTab !== 0} accessToken={accessToken} onSelect={handleSelect} />
            <SearchScreen hidden={activeTab !== 1} onSelect={handleSelect} />
            <TrendingScreen hidden={activeTab !== 2} onSelect={handleSelect} />
            <ShortsScreen hidden={activeTab !== 3} onSelect={handleSelect} />
            <SubscriptionsScreen
              hidden={activeTab !== 4}
              accessToken={accessToken}
              onSignIn={handleSignIn}
              onSelect={handleSelect}
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
            />
          </SubNavigationPager>

          {selected && (
            <DetailScreen
              video={selected}
              expanded={videoExpanded}
              onToggleExpand={() => setVideoExpanded(current => !current)}
            />
          )}
        </div>
      </Page>
    </WearablesApp>
  );
}
