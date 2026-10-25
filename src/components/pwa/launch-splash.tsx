'use client';

import { useEffect, useRef, useState } from 'react';

// Animated launch screen for the installed PWA and the Android app, played once
// per launch (Konga-style: the OS splash hands over to a matching first frame,
// then the logo animates and fades into the page).
//
// The overlay is server-rendered but hidden. The inline script below runs while
// the HTML is parsed, before first paint, and sets data-play only when the site
// was opened as an app. So browser visitors never see a flash, and app users
// see the purple frame immediately. CSS also hides it from 768px up (desktop
// stays desktop-standard). Append ?splash=1 to any URL to preview it.

const SESSION_KEY = 'jm_launch_played';
const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_URL?.trim() || '/images/logo.png';

// In the Android app it also sets the status/nav bar icons: light over the purple
// on Android 15+ (where the purple shows under transparent bars; older versions
// have opaque white bars), dark for the white header once it fades, or straight
// away if it doesn't play. The bridge is injected before parsing, so this doesn't
// wait for hydration.
const PLAY_SCRIPT = `(function(){try{
var e=document.getElementById("jm-launch");if(!e)return;
var c=window.Capacitor,sb=c&&c.isNativePlatform&&c.isNativePlatform()&&c.Plugins&&c.Plugins.SystemBars;
function bars(s){if(sb)sb.setStyle({style:s}).catch(function(){})}
var f=location.search.indexOf("splash=1")>-1;
var app=!!sb||window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
if(!f&&(!app||sessionStorage.getItem("${SESSION_KEY}"))){bars("LIGHT");return}
sessionStorage.setItem("${SESSION_KEY}","1");
e.setAttribute("data-play","");
e.addEventListener("pointerdown",function(){e.setAttribute("data-skip","")},{once:true});
var v=/Android (\d+)/.exec(navigator.userAgent||"");if(v&&+v[1]>=15)bars("DARK");
var done=false;function end(){if(!done){done=true;bars("LIGHT")}}
e.addEventListener("animationend",function(ev){if(ev.target===e&&ev.animationName.indexOf("jm-launch-out")===0)end()});
setTimeout(end,2500);
}catch(x){}})()`;

// Orange sparks (the cart's colour) rising off the wave. x and bottom are
// percentages of the screen; delay is in ms; size is in px.
const SPARKS = [
  { x: 14, bottom: 22, delay: 380, size: 6 },
  { x: 30, bottom: 30, delay: 520, size: 4 },
  { x: 47, bottom: 24, delay: 440, size: 7 },
  { x: 63, bottom: 32, delay: 600, size: 5 },
  { x: 78, bottom: 26, delay: 480, size: 6 },
  { x: 90, bottom: 34, delay: 660, size: 4 },
];

// The wave from the bottom of the logo, as a wide repeat so it can sway.
const WAVE = 'M0 120C180 70 360 70 540 110S900 170 1080 120 1260 60 1440 100V240H0Z';

function InlineScript({ html }: { html: string }) {
  // Runs during HTML parsing on hard loads; inert text/plain on the client.
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function LaunchSplash() {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.hasAttribute('data-play')) {
      setGone(true);
      return;
    }
    // Safety net in case animationend never fires (hidden tab, desktop width).
    const t = window.setTimeout(() => setGone(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <>
      <div
        id="jm-launch"
        ref={ref}
        className="jm-launch"
        aria-hidden="true"
        suppressHydrationWarning
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && e.animationName.startsWith('jm-launch-out')) setGone(true);
        }}
      >
        <div className="jm-launch__waves">
          <svg className="jm-launch__wave jm-launch__wave--back" viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true">
            <path d={WAVE} />
          </svg>
          <svg className="jm-launch__wave jm-launch__wave--front" viewBox="0 0 1440 240" preserveAspectRatio="none" aria-hidden="true">
            <path d={WAVE} />
          </svg>
          {SPARKS.map(({ x, bottom, delay, size }, i) => (
            <span
              key={i}
              className="jm-launch__spark"
              style={{ left: `${x}%`, bottom: `${bottom}%`, width: size, height: size, animationDelay: `${delay}ms` }}
            />
          ))}
        </div>

        <div className="jm-launch__lockup">
          <span className="jm-launch__halo" />
          <div className="jm-launch__logo">
            {/* Same file the header shows, so it's usually cached already. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="" width={136} height={136} decoding="sync" fetchPriority="high" />
            <span className="jm-launch__shine" />
          </div>
          <span className="jm-launch__tagline">Your one-stop marketplace</span>
        </div>
      </div>
      <InlineScript html={PLAY_SCRIPT} />
    </>
  );
}
