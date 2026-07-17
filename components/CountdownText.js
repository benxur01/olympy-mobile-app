/**
 * 1 Hz countdown — faqat shu kichik komponent re-render bo'ladi
 * (ota-ona Home/Proctoring butun daraxti emas).
 */
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

export default function CountdownText({
  targetTs,
  format,
  style,
  intervalMs = 1000,
  onExpire,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const secsLeft = targetTs != null ? Math.max(0, Math.floor((targetTs - now) / 1000)) : 0;

  useEffect(() => {
    if (targetTs != null && secsLeft <= 0 && typeof onExpire === 'function') {
      onExpire();
    }
  }, [secsLeft, targetTs, onExpire]);

  const text =
    typeof format === 'function' ? format(secsLeft, now) : String(secsLeft);

  return <Text style={style}>{text}</Text>;
}
