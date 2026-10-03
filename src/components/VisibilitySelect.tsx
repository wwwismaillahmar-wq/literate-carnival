'use client';

type Props = {
  value: 'public' | 'friends' | 'private';
  onChange: (value: 'public' | 'friends' | 'private') => void;
};

export default function VisibilitySelect({ value, onChange }: Props) {
  return (
    <label>
      مستوى الظهور
      <select value={value} onChange={(event) => onChange(event.target.value as Props['value'])}>
        <option value="public">عام — بعد المراجعة</option>
        <option value="friends">الأصدقاء — بعد المراجعة</option>
        <option value="private">خاص — لي فقط</option>
      </select>
    </label>
  );
}
