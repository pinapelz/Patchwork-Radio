import RadioPlayer from "./RadioPlayer";

export default function App() {
  return (
    <div className="app">
      <RadioPlayer
        streamUrl="https://a4.asurahosting.com:6930/radio.mp3"
        nowPlayingUrl="https://a4.asurahosting.com/api/nowplaying_static/patchworkarchive.json"
        m3uUrl="https://a4.asurahosting.com/public/patchworkarchive/playlist.m3u"
      />
    </div>
  );
}
