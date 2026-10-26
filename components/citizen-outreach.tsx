'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, PhoneCall, Volume2, VolumeX } from 'lucide-react';
import { districts } from '@/lib/data';

export function CitizenOutreach() {
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState('Nyabihu');
  const [screen, setScreen] = useState<'idle' | 'menu' | 'alert' | 'shelter' | 'confirmed'>('idle');
  const [voice, setVoice] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const message = `CYIRABURAMBE: Ibiza by'inkangu mu Karere ka ${district}. Kurikiza amabwiriza y'inzego z'ibanze.`;

  function stopAudio() {
    if (timer.current) clearTimeout(timer.current);
    void audio.current?.close();
    audio.current = null;
    setPlaying(false);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); void audio.current?.close(); }, []);
  async function previewAudio() {
    if (playing) { stopAudio(); return; }
    try {
      const context = new AudioContext(); audio.current = context;
      await context.resume();
      // A generated chime deliberately represents an audio mock, not translated speech.
      [0, .5, 1].forEach((offset) => {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0, context.currentTime + offset);
        gain.gain.linearRampToValueAtTime(.07, context.currentTime + offset + .03);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + offset + .3);
        oscillator.start(context.currentTime + offset); oscillator.stop(context.currentTime + offset + .32);
      });
      setPlaying(true); timer.current = setTimeout(stopAudio, 1600);
    } catch { stopAudio(); }
  }

  return <section className="panel outreach">
    <button className="outreach-toggle" aria-expanded={open} aria-controls="outreach-content" onClick={() => { setOpen(!open); if (open) stopAudio(); }}>
      <span><PhoneCall size={17}/> Citizen Outreach &amp; USSD Simulator</span><ChevronDown size={17} className={open ? 'rotate-chevron' : ''}/>
    </button>
    {open && <div id="outreach-content" className="outreach-content">
      <div className="outreach-settings"><span className="simulation-badge">SANDBOX · NO MESSAGES SENT</span><h3>Reach every household.</h3><p>Test a feature-phone alert journey in Kinyarwanda, with an optional voice-channel mock.</p>
        <label className="field">Recipient district<select value={district} onChange={e => { setDistrict(e.target.value); setScreen('idle'); stopAudio(); }}>{districts.map(d => <option key={d.name}>{d.name}</option>)}</select></label>
        <label className="voice-toggle"><input type="checkbox" checked={voice} onChange={e => { setVoice(e.target.checked); stopAudio(); }}/><Volume2 size={16}/> Enable voice-alert preview mock</label>
        {voice && <div className="voice-preview"><button className="button secondary" onClick={previewAudio}>{playing ? <VolumeX size={15}/> : <Volume2 size={15}/>} {playing ? 'Stop preview' : 'Play mock alert chime'}</button><p>Audio mock: three alert tones. The Kinyarwanda transcript appears on the phone; recorded speech is not included.</p></div>}
        <p className="feature-note">Illustrative translation for judging; local-language review is required before operational use.</p>
      </div>
      <div className="mock-phone"><div className="phone-status"><span>RWANDA · DEMO</span><span>USSD</span></div><div className="phone-screen" aria-live="polite" lang={screen === 'idle' ? 'en' : 'rw'}>
        {screen === 'idle' && <><strong>*182#</strong><p>Dial the demo early warning service.</p></>}
        {screen === 'menu' && <><strong>Murakaza neza</strong><p>1. Imiburo y'ibiza<br/>2. Aho gutabarizwa<br/>0. Gusohoka</p></>}
        {screen === 'alert' && <><strong>⚠ IMBURI Y'IBIZA</strong><p>{message}</p><p>1. Nakiriye ubutumwa<br/>0. Gusubira inyuma</p></>}
        {screen === 'shelter' && <><strong>Aho gutabarizwa</strong><p>{district} · Demo assembly point A</p><p>Hamagara inzego z'ibanze.</p></>}
        {screen === 'confirmed' && <><strong>Murakoze.</strong><p>Ubutumwa bwakiriwe.</p><p>Demo acknowledgement recorded.</p></>}
      </div><div className="phone-actions">
        {screen === 'idle' ? <button onClick={() => setScreen('menu')}>Dial *182#</button> : <>
          {screen === 'menu' && <><button onClick={() => setScreen('alert')}>1 · Alerts</button><button onClick={() => setScreen('shelter')}>2 · Assistance</button></>}
          {screen === 'alert' && <button onClick={() => setScreen('confirmed')}>1 · Acknowledge</button>}
          {screen !== 'menu' && <button onClick={() => setScreen('menu')}>0 · Back</button>}
          <button onClick={() => { setScreen('idle'); stopAudio(); }}>End session</button>
        </>}
      </div></div>
    </div>}
  </section>;
}
