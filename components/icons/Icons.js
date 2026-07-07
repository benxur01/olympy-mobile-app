import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

export const OlympyLogo = ({ size = 52, ring = COLORS.blue, laurel = COLORS.gold, strokeWidth = 3.4, showHand = true }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx="24" cy="20" r="11" fill="none" stroke={ring} strokeWidth={strokeWidth} />
    <Path d="M17 29 13 42l11-6 11 6-4-13" fill="none" stroke={laurel} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    {showHand && <Path d="M24 15v6l4 3" stroke={ring} strokeWidth={2.6} fill="none" strokeLinecap="round" />}
  </Svg>
);

export const MenuIcon = ({ size = 22, color = COLORS.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 7h16M4 12h16M4 17h10" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

export const BellIcon = ({ size = 18, color = COLORS.textSecondary, strokeWidth = 1.8 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3a6 6 0 0 0-6 6v3.5L4 16h16l-2-3.5V9a6 6 0 0 0-6-6zM10 19a2 2 0 0 0 4 0" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const HomeIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 11 12 4l8 7v8h-5.5v-5h-5v5H4z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const CalendarIcon = ({ size = 23, color = COLORS.textMuted, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="5" width="18" height="16" rx="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const TargetIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={2} fill="none" />
    <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={2} fill="none" />
  </Svg>
);

export const BarsIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="12" width="4" height="8" rx="1.5" fill={color} />
    <Rect x="10" y="6" width="4" height="14" rx="1.5" fill={color} />
    <Rect x="16" y="9" width="4" height="11" rx="1.5" fill={color} />
  </Svg>
);

export const UserIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M4.5 20c.7-3.4 4-5 7.5-5s6.8 1.6 7.5 5" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);

export const UsersIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="9" cy="8" r="3.4" stroke={color} strokeWidth={2} fill="none" />
    <Circle cx="16.5" cy="9.5" r="2.6" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M3.5 19c.6-3 3-4.5 5.5-4.5s4.9 1.5 5.5 4.5M15 14.8c2 .2 4 1.4 4.5 3.7" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);

export const SettingsIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.35.95A7 7 0 0 0 14 5.1L13.6 2.6h-3.2L10 5.1a7 7 0 0 0-2.5 1.44l-2.36-.95-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .48.05.94.14 1.4l-2 1.55 2 3.46 2.35-.95c.73.63 1.58 1.13 2.51 1.44l.4 2.5h3.2l.4-2.5a7 7 0 0 0 2.5-1.44l2.36.95 2-3.46-2-1.55c.09-.46.14-.92.14-1.4z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const InboxIcon = ({ size = 23, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 5h16v14H4V5zm0 4h16M9 13h6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const QuestionCircleIcon = ({ size = 23, color = COLORS.textMuted, r = 8.5, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r={r} stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-.9.8-.9 1.7M12 17v.3" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
  </Svg>
);

export const ChevronRightIcon = ({ size = 14, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
  </Svg>
);

export const ChevronDownIcon = ({ size = 10, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
  </Svg>
);

export const BackIcon = ({ size = 15, color = COLORS.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
  </Svg>
);

export const CheckIcon = ({ size = 13, color = COLORS.greenLight, strokeWidth = 3 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 12.5l5 5 11-11" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
  </Svg>
);

export const CloseIcon = ({ size = 11, color = COLORS.red, strokeWidth = 3 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const PlusIcon = ({ size = 16, color = COLORS.white, strokeWidth = 2.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

export const SearchIcon = ({ size = 15, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M16.5 16.5 21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const StarIcon = ({ size = 16, color = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 16.5 6.4 20l1.6-6.3-5-4.2 6.5-.5L12 3z" fill={color} />
  </Svg>
);

export const SparkleIcon = ({ size = 12, color = COLORS.blueLight }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" fill={color} />
  </Svg>
);

export const FlameIcon = ({ size = 14, color = COLORS.orange }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2C12 8 5 9 5 15a7 7 0 0 0 14 0C19 9 12 8 12 2z" fill={color} />
  </Svg>
);

export const TrophyIcon = ({ size = 16, color = COLORS.gold, strokeWidth = 1.8, full = true }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {full ? (
      <Path d="M8 21h8M12 17v4M5 4h14v4a7 7 0 0 1-14 0V4zM5 6H3a2 2 0 0 0 2 4M19 6h2a2 2 0 0 1-2 4" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <Path d="M8 21h8M12 17v4M5 4h14v4a7 7 0 0 1-14 0V4z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
    )}
  </Svg>
);

export const MedalIcon = ({ size = 19, color = COLORS.gold, strokeWidth = 1.8 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="9" r="5" stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Path d="M9 13.5 8 21l4-2 4 2-1-7.5" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const LightningIcon = ({ size = 15, color = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill={color} />
  </Svg>
);

export const CrownIcon = ({ size = 20, color = COLORS.gold }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.5 10h-15L3 8z" fill={color} />
  </Svg>
);

export const LockIcon = ({ size = 15, color = COLORS.gold, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke={color} strokeWidth={strokeWidth} />
    <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={strokeWidth} fill="none" />
  </Svg>
);

export const ClockIcon = ({ size = 14, color = COLORS.green, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Path d="M12 8v4l3 2" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
  </Svg>
);

export const AlarmIcon = ({ size = 13, color = COLORS.red }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth={2} fill="none" />
    <Path d="M12 9v4l3 2M9 2h6" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
  </Svg>
);

export const WarningIcon = ({ size = 16, color = COLORS.orange }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3 2 20h20L12 3z" stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
    <Path d="M12 10v4M12 17v.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const EyeIcon = ({ size = 20, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" stroke={color} strokeWidth={1.8} fill="none" />
    <Circle cx="12" cy="12" r="2.8" stroke={color} strokeWidth={1.8} fill="none" />
  </Svg>
);

export const TelegramIcon = ({ size = 20, color = COLORS.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M21 4 3 11.5l5.5 2L10 19l3-3.5 5 3.5L21 4z" fill={color} />
  </Svg>
);

export const ChatFabIcon = ({ size = 24, bubble = COLORS.white, star = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4V6z" fill={bubble} />
    <Path d="M12 7.2l.9 2 2.1.3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 9.5l2.1-.3.9-2z" fill={star} />
  </Svg>
);

export const SendIcon = ({ size = 18, color = COLORS.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 12h13M13 6l6 6-6 6" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DownloadIcon = ({ size = 15, color = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 4v11M8 11l4 4 4-4M5 19h14" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ShareIcon = ({ size = 17, color = COLORS.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 15V4M8 8l4-4 4 4M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const EditIcon = ({ size = 12, color = COLORS.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const CameraIcon = ({ size = 14, color = COLORS.white, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8a2 2 0 0 1 2-2h1.5l1.2-1.8a1 1 0 0 1 .8-.4h5a1 1 0 0 1 .8.4L16.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
    <Circle cx="12" cy="12.5" r="3.2" stroke={color} strokeWidth={strokeWidth} fill="none" />
  </Svg>
);

export const QrIcon = ({ size = 20, color = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M3 12h18" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
  </Svg>
);

export const BookIcon = ({ size = 22, color = COLORS.blue, strokeWidth = 1.9 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h13" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const RepeatIcon = ({ size = 22, color = COLORS.red }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 9a8 8 0 0 1 14-3.5M20 15a8 8 0 0 1-14 3.5M18 2v4h-4M6 22v-4h4" stroke={color} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const FileIcon = ({ size = 34, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 4h11l3 3v13H5V4z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
    <Path d="M8 9h8M8 13h8M8 17h5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const MouseIcon = ({ size = 34, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="6" y="3" width="12" height="18" rx="6" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M12 7v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const ShirtIcon = ({ size = 34, color = COLORS.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8h16l-1.5 12h-13L4 8zM8 8a4 4 0 0 1 8 0" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const BuildingIcon = ({ size = 19, color = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" stroke={color} strokeWidth={1.9} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const PhysicsIcon = ({ size = 18, color = COLORS.purple }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 3h12v4l-4 5 4 5v4H6v-4l4-5-4-5V3z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

export const CoinIcon = ({ size = 24, color = COLORS.gold }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth={2.2} />
    <Path d="M12 7.5v9M9.5 9.8c0-1 1.1-1.8 2.5-1.8s2.5.8 2.5 1.8-1 1.5-2.5 1.9-2.5.9-2.5 1.9 1.1 1.8 2.5 1.8 2.5-.8 2.5-1.8" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </Svg>
);

export const ProfileBadgeIcon = ({ size = 18, color = COLORS.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l1.2 2.8 3 .3-2.3 2 .7 3-2.6-1.6L9.4 11l.7-3-2.3-2 3-.3L12 3z" fill="none" stroke={color} strokeWidth={1.6} />
    <Path d="M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </Svg>
);

export const LogoutIcon = ({ size = 18, color = COLORS.textSecondary, strokeWidth = 2 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 8l4 4-4 4M20 12H9" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DotsIcon = ({ size = 18, color = COLORS.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="5" cy="12" r="1.9" fill={color} />
    <Circle cx="12" cy="12" r="1.9" fill={color} />
    <Circle cx="19" cy="12" r="1.9" fill={color} />
  </Svg>
);

export const QrSample = ({ size = 70, dark = COLORS.text, light = COLORS.white }) => (
  <Svg width={size} height={size} viewBox="0 0 70 70">
    <Rect x="0" y="0" width="20" height="20" fill={dark} />
    <Rect x="5" y="5" width="10" height="10" fill={light} />
    <Rect x="50" y="0" width="20" height="20" fill={dark} />
    <Rect x="55" y="5" width="10" height="10" fill={light} />
    <Rect x="0" y="50" width="20" height="20" fill={dark} />
    <Rect x="5" y="55" width="10" height="10" fill={light} />
    <Rect x="26" y="4" width="6" height="6" fill={dark} />
    <Rect x="38" y="10" width="6" height="6" fill={dark} />
    <Rect x="26" y="26" width="6" height="6" fill={dark} />
    <Rect x="38" y="32" width="6" height="6" fill={dark} />
    <Rect x="50" y="26" width="6" height="6" fill={dark} />
    <Rect x="62" y="38" width="6" height="6" fill={dark} />
    <Rect x="26" y="44" width="6" height="6" fill={dark} />
    <Rect x="32" y="56" width="6" height="6" fill={dark} />
    <Rect x="44" y="50" width="6" height="6" fill={dark} />
    <Rect x="56" y="56" width="6" height="6" fill={dark} />
    <Rect x="44" y="62" width="6" height="6" fill={dark} />
  </Svg>
);
