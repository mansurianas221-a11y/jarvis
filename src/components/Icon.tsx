/**
 * Jarvis — Icon set.
 *
 * A single, self-contained icon component built on react-native-svg so the app
 * has zero icon-font dependencies and renders identically on iOS/Android/web.
 * Every glyph is an original 24×24 line drawing.
 */
import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  Line,
  Path,
  Polyline,
  Rect,
  type SvgProps,
} from 'react-native-svg';

export type IconName =
  | 'mic'
  | 'micOff'
  | 'stop'
  | 'send'
  | 'home'
  | 'chat'
  | 'history'
  | 'settings'
  | 'sparkles'
  | 'copy'
  | 'share'
  | 'trash'
  | 'check'
  | 'close'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'arrowRight'
  | 'telegram'
  | 'telegramPlane'
  | 'volume'
  | 'volumeOff'
  | 'refresh'
  | 'moon'
  | 'sun'
  | 'auto'
  | 'shield'
  | 'globe'
  | 'wave'
  | 'speed'
  | 'info'
  | 'search'
  | 'pin'
  | 'pinOff'
  | 'edit'
  | 'plus'
  | 'alert'
  | 'wifiOff'
  | 'keyboard'
  | 'user'
  | 'bot'
  | 'arrowDown'
  | 'play'
  | 'pause'
  | 'sliders'
  | 'lock'
  | 'heart'
  | 'code';

interface IconProps extends Omit<SvgProps, 'color'> {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke width in the 24×24 viewBox. */
  strokeWidth?: number;
  /** Filled variants where applicable. */
  filled?: boolean;
}

export function Icon({
  name,
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 1.8,
  filled = false,
  ...rest
}: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  const solid = { fill: color, stroke: 'none' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      {renderIcon(name, common, solid, color, filled)}
    </Svg>
  );
}

type Common = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};
type Solid = { fill: string; stroke: 'none' };

function renderIcon(name: IconName, c: Common, s: Solid, color: string, filled: boolean) {
  switch (name) {
    case 'mic':
      return (
        <>
          <Rect x="9" y="2.5" width="6" height="11" rx="3" {...c} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" {...c} />
          <Line x1="12" y1="18" x2="12" y2="21.5" {...c} />
          <Line x1="8.5" y1="21.5" x2="15.5" y2="21.5" {...c} />
        </>
      );

    case 'micOff':
      return (
        <>
          <Path d="M9 5.5a3 3 0 0 1 6 0v6c0 .5-.1 1-.3 1.4" {...c} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 10 5.5" {...c} />
          <Path d="M18.5 11.5v.6" {...c} />
          <Line x1="12" y1="18" x2="12" y2="21.5" {...c} />
          <Line x1="3.5" y1="3" x2="20.5" y2="21" {...c} />
        </>
      );

    case 'stop':
      return <Rect x="6" y="6" width="12" height="12" rx="3" {...s} />;

    case 'send':
      return (
        <>
          <Path d="M21 3 10.5 13.5" {...c} />
          <Path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z" {...c} />
        </>
      );

    case 'home':
      return (
        <>
          <Path d="M3.5 10.5 12 3.5l8.5 7" {...c} />
          <Path d="M5.5 9.5v10a1 1 0 0 0 1 1h3.5v-5.5h4V20.5H17a1 1 0 0 0 1-1v-10" {...c} />
        </>
      );

    case 'chat':
      return (
        <>
          <Path d="M20.5 12c0 4.1-3.8 7.5-8.5 7.5-1 0-2-.2-2.9-.5L4 21l1.3-3.7A7 7 0 0 1 3.5 12C3.5 7.9 7.3 4.5 12 4.5s8.5 3.4 8.5 7.5z" {...c} />
          <Line x1="8.5" y1="10.5" x2="8.5" y2="10.6" {...c} strokeWidth={2.6} />
          <Line x1="12" y1="10.5" x2="12" y2="10.6" {...c} strokeWidth={2.6} />
          <Line x1="15.5" y1="10.5" x2="15.5" y2="10.6" {...c} strokeWidth={2.6} />
        </>
      );

    case 'history':
      return (
        <>
          <Path d="M3.8 12a8.2 8.2 0 1 0 2.6-6" {...c} />
          <Polyline points="3.2,4.2 3.2,8.2 7.2,8.2" {...c} />
          <Polyline points="12,7.5 12,12 15,14" {...c} />
        </>
      );

    case 'settings':
      return (
        <>
          <Circle cx="12" cy="12" r="3.2" {...c} />
          <Path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" {...c} />
        </>
      );

    case 'sparkles':
      return (
        <>
          <Path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" {...(filled ? s : c)} />
          <Path d="M18.5 14.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" {...(filled ? s : c)} />
          <Path d="M5.5 16l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6L3.3 18l1.6-.6.6-1.6z" {...(filled ? s : c)} />
        </>
      );

    case 'copy':
      return (
        <>
          <Rect x="8.5" y="8.5" width="12" height="12" rx="2.5" {...c} />
          <Path d="M15.5 5.5v-.7A2.3 2.3 0 0 0 13.2 2.5H5.8A2.3 2.3 0 0 0 3.5 4.8v7.4a2.3 2.3 0 0 0 2.3 2.3h.7" {...c} />
        </>
      );

    case 'share':
      return (
        <>
          <Circle cx="18" cy="5" r="2.6" {...c} />
          <Circle cx="6" cy="12" r="2.6" {...c} />
          <Circle cx="18" cy="19" r="2.6" {...c} />
          <Line x1="8.3" y1="10.8" x2="15.7" y2="6.2" {...c} />
          <Line x1="8.3" y1="13.2" x2="15.7" y2="17.8" {...c} />
        </>
      );

    case 'trash':
      return (
        <>
          <Path d="M4 7h16" {...c} />
          <Path d="M9.5 7V5.2A1.7 1.7 0 0 1 11.2 3.5h1.6A1.7 1.7 0 0 1 14.5 5.2V7" {...c} />
          <Path d="M6.5 7l.8 12.2a1.8 1.8 0 0 0 1.8 1.7h5.8a1.8 1.8 0 0 0 1.8-1.7L17.5 7" {...c} />
          <Line x1="10.5" y1="11" x2="10.5" y2="17" {...c} />
          <Line x1="13.5" y1="11" x2="13.5" y2="17" {...c} />
        </>
      );

    case 'check':
      return <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" {...c} strokeWidth={2.2} />;

    case 'close':
      return (
        <>
          <Line x1="5.5" y1="5.5" x2="18.5" y2="18.5" {...c} />
          <Line x1="18.5" y1="5.5" x2="5.5" y2="18.5" {...c} />
        </>
      );

    case 'chevronRight':
      return <Polyline points="9,5 16,12 9,19" {...c} />;

    case 'chevronLeft':
      return <Polyline points="15,5 8,12 15,19" {...c} />;

    case 'chevronDown':
      return <Polyline points="5,9 12,16 19,9" {...c} />;

    case 'arrowRight':
      return (
        <>
          <Line x1="4" y1="12" x2="20" y2="12" {...c} />
          <Polyline points="13.5,5.5 20,12 13.5,18.5" {...c} />
        </>
      );

    case 'arrowDown':
      return (
        <>
          <Line x1="12" y1="4" x2="12" y2="20" {...c} />
          <Polyline points="5.5,13.5 12,20 18.5,13.5" {...c} />
        </>
      );

    /** Paper-plane Telegram glyph (original drawing, not the official logo). */
    case 'telegramPlane':
      return (
        <>
          <Path d="M21.5 3.2 2.9 10.4c-.8.3-.8 1.4 0 1.7l4.6 1.5 1.7 5.2c.2.7 1.1.9 1.6.3l2.5-2.7 4.7 3.4c.6.4 1.4.1 1.6-.6l3-14.3c.2-.9-.7-1.6-1.6-1.3z" {...c} />
          <Polyline points="7.5,13.6 16.5,7.5" {...c} />
        </>
      );

    case 'telegram':
      return (
        <>
          <Circle cx="12" cy="12" r="9.2" {...c} />
          <Path d="M16.4 7.6 6.9 11.2c-.5.2-.5.9 0 1.1l2.3.8 1 3.1c.1.4.6.5.9.2l1.4-1.3 2.4 1.8c.4.3.9.1 1-.4l1.7-8.2c.1-.5-.4-.9-1.2-.7z" {...c} />
          <Polyline points="9.2,13.1 14.4,9.4" {...c} />
        </>
      );

    case 'volume':
      return (
        <>
          <Path d="M4 9.5h3.2L12 5.3v13.4L7.2 14.5H4A1.2 1.2 0 0 1 2.8 13.3v-2.6A1.2 1.2 0 0 1 4 9.5z" {...c} />
          <Path d="M15.5 8.6a5 5 0 0 1 0 6.8" {...c} />
          <Path d="M18.3 6a8.6 8.6 0 0 1 0 12" {...c} />
        </>
      );

    case 'volumeOff':
      return (
        <>
          <Path d="M4 9.5h3.2L12 5.3v13.4L7.2 14.5H4A1.2 1.2 0 0 1 2.8 13.3v-2.6A1.2 1.2 0 0 1 4 9.5z" {...c} />
          <Line x1="16" y1="9.5" x2="21" y2="14.5" {...c} />
          <Line x1="21" y1="9.5" x2="16" y2="14.5" {...c} />
        </>
      );

    case 'refresh':
      return (
        <>
          <Path d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8" {...c} />
          <Polyline points="20.5,3.8 20.5,7.8 16.5,7.8" {...c} />
        </>
      );

    case 'moon':
      return (
        <Path
          d="M20.5 14.3A8.7 8.7 0 0 1 9.7 3.5a8.8 8.8 0 1 0 10.8 10.8z"
          {...(filled ? s : c)}
        />
      );

    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4.2" {...c} />
          <Line x1="12" y1="2.5" x2="12" y2="5" {...c} />
          <Line x1="12" y1="19" x2="12" y2="21.5" {...c} />
          <Line x1="2.5" y1="12" x2="5" y2="12" {...c} />
          <Line x1="19" y1="12" x2="21.5" y2="12" {...c} />
          <Line x1="5.3" y1="5.3" x2="7.1" y2="7.1" {...c} />
          <Line x1="16.9" y1="16.9" x2="18.7" y2="18.7" {...c} />
          <Line x1="18.7" y1="5.3" x2="16.9" y2="7.1" {...c} />
          <Line x1="7.1" y1="16.9" x2="5.3" y2="18.7" {...c} />
        </>
      );

    case 'auto':
      return (
        <>
          <Rect x="2.5" y="4.5" width="19" height="12" rx="2.6" {...c} />
          <Line x1="8" y1="20.5" x2="16" y2="20.5" {...c} />
          <Path d="M7.5 11.5 9.6 7l2.1 4.5" {...c} />
          <Line x1="8.1" y1="10.2" x2="11.1" y2="10.2" {...c} />
          <Circle cx="16" cy="9.2" r="2.6" {...c} />
        </>
      );

    case 'shield':
      return (
        <>
          <Path d="M12 2.7 4.5 5.8v5.6c0 4.4 3.1 8.4 7.5 9.9 4.4-1.5 7.5-5.5 7.5-9.9V5.8L12 2.7z" {...c} />
          <Polyline points="8.7,11.8 11.1,14.2 15.6,9.7" {...c} />
        </>
      );

    case 'globe':
      return (
        <>
          <Circle cx="12" cy="12" r="9.2" {...c} />
          <Ellipse cx="12" cy="12" rx="4.2" ry="9.2" {...c} />
          <Line x1="3" y1="9.2" x2="21" y2="9.2" {...c} />
          <Line x1="3" y1="14.8" x2="21" y2="14.8" {...c} />
        </>
      );

    case 'wave':
      return (
        <>
          <Line x1="3" y1="9" x2="3" y2="15" {...c} />
          <Line x1="7" y1="5.5" x2="7" y2="18.5" {...c} />
          <Line x1="11" y1="8" x2="11" y2="16" {...c} />
          <Line x1="15" y1="3.5" x2="15" y2="20.5" {...c} />
          <Line x1="19" y1="7" x2="19" y2="17" {...c} />
        </>
      );

    case 'speed':
      return (
        <>
          <Path d="M4.2 17.8a9 9 0 1 1 15.6 0" {...c} />
          <Line x1="12" y1="12" x2="16.2" y2="8.3" {...c} />
          <Circle cx="12" cy="12" r="1.6" {...s} />
          <Line x1="5.2" y1="13.4" x2="6.8" y2="13.9" {...c} />
          <Line x1="18.8" y1="13.4" x2="17.2" y2="13.9" {...c} />
        </>
      );

    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="9.2" {...c} />
          <Line x1="12" y1="10.8" x2="12" y2="17" {...c} />
          <Circle cx="12" cy="7.4" r="1.1" {...s} />
        </>
      );

    case 'search':
      return (
        <>
          <Circle cx="10.8" cy="10.8" r="6.6" {...c} />
          <Line x1="15.6" y1="15.6" x2="20.8" y2="20.8" {...c} />
        </>
      );

    case 'pin':
      return (
        <Path
          d="M14.6 2.8l6.6 6.6-2.3 1.1a3 3 0 0 0-1.5 1.4l-2 4.4-1.3-1.3-2.6 2.6 1 4.4-1.6 1.6-6-6 1.6-1.6 4.4 1 2.6-2.6-1.3-1.3 4.4-2a3 3 0 0 0 1.4-1.5l1.2-2.8z"
          {...(filled ? s : c)}
        />
      );

    case 'pinOff':
      return (
        <>
          <Path d="M14.6 2.8l6.6 6.6-2.3 1.1a3 3 0 0 0-1.5 1.4l-1 2.2" {...c} />
          <Path d="M13.9 14.3l-1.4 1.3 1 4.4-1.6 1.6-6-6 1.6-1.6 4.4 1 1.2-1.2" {...c} />
          <Line x1="3" y1="3" x2="21" y2="21" {...c} />
        </>
      );

    case 'edit':
      return (
        <>
          <Path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5z" {...c} />
          <Line x1="13.8" y1="6.7" x2="17.3" y2="10.2" {...c} />
        </>
      );

    case 'plus':
      return (
        <>
          <Line x1="12" y1="4.5" x2="12" y2="19.5" {...c} strokeWidth={2.2} />
          <Line x1="4.5" y1="12" x2="19.5" y2="12" {...c} strokeWidth={2.2} />
        </>
      );

    case 'alert':
      return (
        <>
          <Path d="M12 3.6 2.8 19.6a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5L12 3.6z" {...c} />
          <Line x1="12" y1="9.4" x2="12" y2="14.2" {...c} />
          <Circle cx="12" cy="17.4" r="1.1" {...s} />
        </>
      );

    case 'wifiOff':
      return (
        <>
          <Path d="M2.5 8.6a16 16 0 0 1 8-3.9" {...c} />
          <Path d="M21.5 8.6a16 16 0 0 0-6.2-3.6" {...c} />
          <Path d="M5.8 12.4a11 11 0 0 1 4-2.2" {...c} />
          <Path d="M18.2 12.4a11 11 0 0 0-3.4-2" {...c} />
          <Path d="M9 16a6 6 0 0 1 6 0" {...c} />
          <Circle cx="12" cy="19.4" r="1.1" {...s} />
          <Line x1="3" y1="3" x2="21" y2="21" {...c} />
        </>
      );

    case 'keyboard':
      return (
        <>
          <Rect x="2.5" y="6.5" width="19" height="11" rx="2.6" {...c} />
          <Line x1="6" y1="10.2" x2="6" y2="10.3" {...c} strokeWidth={2.4} />
          <Line x1="9.5" y1="10.2" x2="9.5" y2="10.3" {...c} strokeWidth={2.4} />
          <Line x1="13" y1="10.2" x2="13" y2="10.3" {...c} strokeWidth={2.4} />
          <Line x1="16.5" y1="10.2" x2="16.5" y2="10.3" {...c} strokeWidth={2.4} />
          <Line x1="8" y1="14" x2="16" y2="14" {...c} />
        </>
      );

    case 'user':
      return (
        <>
          <Circle cx="12" cy="8" r="4.2" {...c} />
          <Path d="M4.4 20.5a7.6 7.6 0 0 1 15.2 0" {...c} />
        </>
      );

    case 'bot':
      return (
        <>
          <Rect x="4.2" y="7.8" width="15.6" height="11.4" rx="3.2" {...c} />
          <Line x1="12" y1="3" x2="12" y2="7.8" {...c} />
          <Circle cx="12" cy="2.6" r="1.2" {...s} />
          <Circle cx="9.2" cy="12.6" r="1.3" {...s} />
          <Circle cx="14.8" cy="12.6" r="1.3" {...s} />
          <Line x1="9.6" y1="16.2" x2="14.4" y2="16.2" {...c} />
        </>
      );

    case 'play':
      return <Path d="M7.5 4.8 19.5 12 7.5 19.2V4.8z" {...(filled ? s : c)} />;

    case 'pause':
      return (
        <>
          <Rect x="7" y="5" width="3.6" height="14" rx="1.4" {...s} />
          <Rect x="13.4" y="5" width="3.6" height="14" rx="1.4" {...s} />
        </>
      );

    case 'sliders':
      return (
        <>
          <Line x1="3.5" y1="7" x2="20.5" y2="7" {...c} />
          <Circle cx="9" cy="7" r="2.4" {...c} />
          <Line x1="3.5" y1="17" x2="20.5" y2="17" {...c} />
          <Circle cx="15.5" cy="17" r="2.4" {...c} />
        </>
      );

    case 'lock':
      return (
        <>
          <Rect x="4.5" y="10.5" width="15" height="10" rx="2.8" {...c} />
          <Path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" {...c} />
          <Circle cx="12" cy="15.4" r="1.4" {...s} />
        </>
      );

    case 'heart':
      return (
        <Path
          d="M12 20.3s-7.7-4.6-9.3-9A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 9.3 4.9c-1.6 4.4-9.3 9-9.3 9z"
          {...(filled ? s : c)}
        />
      );

    case 'code':
      return (
        <>
          <Polyline points="8.5,7 3.5,12 8.5,17" {...c} />
          <Polyline points="15.5,7 20.5,12 15.5,17" {...c} />
          <Line x1="13.5" y1="4.5" x2="10.5" y2="19.5" {...c} />
        </>
      );

    default:
      return <Circle cx="12" cy="12" r="9" {...c} />;
  }
}

/** Convenience wrapper used by tab bars. */
export function TabIcon({
  name,
  focused,
  color,
  size = 24,
}: {
  name: IconName;
  focused: boolean;
  color: string;
  size?: number;
}) {
  return <Icon name={name} size={size} color={color} filled={focused} strokeWidth={focused ? 2 : 1.7} />;
}