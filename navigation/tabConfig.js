import React from 'react';
import {
  HomeIcon,
  CalendarIcon,
  TargetIcon,
  BarsIcon,
  UserIcon,
  UsersIcon,
  QuestionCircleIcon,
  InboxIcon,
  EyeIcon,
} from '../components/icons/Icons';

export const STUDENT_TABS = [
  { key: 'Asosiy', label: 'Asosiy', icon: (color, active) => <HomeIcon size={23} color={color} filled={active} /> },
  { key: 'Tadbirlar', label: 'Tadbirlar', icon: (color, active) => <CalendarIcon size={23} color={color} filled={active} /> },
  { key: 'Mashq', label: 'Mashq', icon: (color, active) => <TargetIcon size={23} color={color} filled={active} /> },
  { key: 'Natijalar', label: 'Natijalar', icon: (color) => <BarsIcon size={23} color={color} /> },
  { key: 'Profil', label: 'Profil', icon: (color, active) => <UserIcon size={23} color={color} filled={active} /> },
];

export const TEACHER_TABS = [
  { key: 'TAsosiy', label: 'Asosiy', icon: (color, active) => <HomeIcon size={23} color={color} filled={active} /> },
  { key: 'Arizalar', label: 'Arizalar', dot: true, icon: (color, active) => <InboxIcon size={23} color={color} filled={active} /> },
  { key: 'Oquvchilar', label: "O'quvchilar", icon: (color, active) => <UsersIcon size={23} color={color} filled={active} /> },
  { key: 'Savollar', label: 'Savollar', icon: (color, active) => <QuestionCircleIcon size={23} color={color} filled={active} /> },
  { key: 'Baholash', label: 'Baholash', icon: (color) => <BarsIcon size={23} color={color} /> },
];

// Menejer paneli tab'lari — o'qituvchidan kengroq: markaz statistikasi (Asosiy),
// arizalar, o'quvchi boshqaruvi, natijalar/analitika va jonli nazorat.
export const MANAGER_TABS = [
  { key: 'MAsosiy', label: 'Asosiy', icon: (color, active) => <HomeIcon size={23} color={color} filled={active} /> },
  { key: 'MArizalar', label: 'Arizalar', dot: true, icon: (color, active) => <InboxIcon size={23} color={color} filled={active} /> },
  { key: 'MOquvchilar', label: "O'quvchilar", icon: (color, active) => <UsersIcon size={23} color={color} filled={active} /> },
  { key: 'MNatijalar', label: 'Natijalar', icon: (color) => <BarsIcon size={23} color={color} /> },
  { key: 'MNazorat', label: 'Nazorat', icon: (color, active) => <EyeIcon size={23} color={color} filled={active} /> },
];
