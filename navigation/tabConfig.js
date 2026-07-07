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
  { key: 'Asosiy', label: 'Asosiy', icon: (color) => <HomeIcon size={23} color={color} /> },
  { key: 'Tadbirlar', label: 'Tadbirlar', icon: (color) => <CalendarIcon size={23} color={color} /> },
  { key: 'Mashq', label: 'Mashq', icon: (color) => <TargetIcon size={23} color={color} /> },
  { key: 'Natijalar', label: 'Natijalar', icon: (color) => <BarsIcon size={23} color={color} /> },
  { key: 'Profil', label: 'Profil', icon: (color) => <UserIcon size={23} color={color} /> },
];

export const TEACHER_TABS = [
  { key: 'TAsosiy', label: 'Asosiy', icon: (color) => <HomeIcon size={23} color={color} /> },
  { key: 'Arizalar', label: 'Arizalar', dot: true, icon: (color) => <InboxIcon size={23} color={color} /> },
  { key: 'Oquvchilar', label: "O'quvchilar", icon: (color) => <UsersIcon size={23} color={color} /> },
  { key: 'Savollar', label: 'Savollar', icon: (color) => <QuestionCircleIcon size={23} color={color} /> },
  { key: 'Baholash', label: 'Natijalar', icon: (color) => <BarsIcon size={23} color={color} /> },
];

// Menejer paneli tab'lari — o'qituvchidan kengroq: markaz statistikasi (Asosiy),
// arizalar, o'quvchi boshqaruvi, natijalar/analitika va jonli nazorat.
export const MANAGER_TABS = [
  { key: 'MAsosiy', label: 'Asosiy', icon: (color) => <HomeIcon size={23} color={color} /> },
  { key: 'MArizalar', label: 'Arizalar', dot: true, icon: (color) => <InboxIcon size={23} color={color} /> },
  { key: 'MOquvchilar', label: "O'quvchilar", icon: (color) => <UsersIcon size={23} color={color} /> },
  { key: 'MNatijalar', label: 'Natijalar', icon: (color) => <BarsIcon size={23} color={color} /> },
  { key: 'MNazorat', label: 'Nazorat', icon: (color) => <EyeIcon size={23} color={color} /> },
];
