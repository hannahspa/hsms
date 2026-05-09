import { useState } from 'react'
import { COLORS } from '../../constants/colors'
import { todayISO , getNowVN} from '../../lib/utils'

export default function DatePicker({ open, selectedDate, onClose, onConfirm }) {
  if (!open) return null;

  const[viewDate, setViewDate] = useState(new Date(selectedDate || getNowVN()));
  const[tempDate, setTempDate] = useState(selectedDate || todayISO());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days =[];
  for (let i = 0; i < offset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelectDay = (day) => {
    if (!day) return;
    const newD = new Date(year, month, day);
    newD.setMinutes(newD.getMinutes() - newD.getTimezoneOffset());
    const iso = newD.toISOString().split('T')[0];
    setTempDate(iso);
    onConfirm(iso);
  };

  const handleChonHnay = () => {
    const d = getNowVN();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const iso = d.toISOString().split('T')[0];
    setTempDate(iso);
    onConfirm(iso);
  };

  const handleChonHqua = () => {
    const d = getNowVN();
    d.setDate(d.getDate() - 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const iso = d.toISOString().split('T')[0];
    setTempDate(iso);
    onConfirm(iso);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: COLORS.card, width: '90%', maxWidth: '360px', borderRadius: '24px', padding: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', animation: 'popIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={handlePrevMonth} style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>‹</button>
          <div style={{ fontWeight: '700', fontSize: '16px', color: COLORS.text }}>Tháng {month + 1} / {year}</div>
          <button onClick={handleNextMonth} style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${COLORS.border}`, background: 'transparent', cursor: 'pointer', fontSize: '16px', color: COLORS.textSub }}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '10px', fontSize: '12px', fontWeight: '600', color: COLORS.textMute }}>
          <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {days.map((day, idx) => {
            const isSelected = day && tempDate === `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            return (
              <button key={idx} onClick={() => handleSelectDay(day)} disabled={!day}
                style={{ height: '36px', borderRadius: '10px', border: 'none', background: isSelected ? COLORS.grad : 'transparent', color: isSelected ? 'white' : (day ? COLORS.text : 'transparent'), fontWeight: isSelected ? '700' : '500', fontSize: '14px', cursor: day ? 'pointer' : 'default' }}>
                {day || ''}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '24px' }}>
          <button onClick={handleChonHqua} style={{ padding: '12px 0', borderRadius: '12px', border: `1px solid ${COLORS.border}`, background: 'transparent', color: COLORS.textSub, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Hôm qua</button>
          <button onClick={handleChonHnay} style={{ padding: '12px 0', borderRadius: '12px', border: `1px solid ${COLORS.border}`, background: 'transparent', color: COLORS.textSub, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Hôm nay</button>
          <button onClick={() => onConfirm(tempDate)} style={{ padding: '12px 0', borderRadius: '12px', border: 'none', background: COLORS.grad, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(160,113,79,0.3)' }}>Xong ✓</button>
        </div>
      </div>
    </div>
  )
}