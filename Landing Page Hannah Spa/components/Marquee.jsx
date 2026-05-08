/* global React */
function Marquee() {
  const items = [
    ['Trị liệu thân thể', 'Body Therapy'],
    ['Chăm sóc da', 'Skin Ritual'],
    ['Tinh dầu thiên nhiên', 'Botanical Oils'],
    ['Đá nóng Himalaya', 'Hot Stone'],
    ['Gói đôi', 'Couple Retreat'],
    ['Tư vấn da', 'Skin Consult'],
  ];
  const repeated = [...items, ...items];
  return (
    <div className="marquee" data-screen-label="Marquee">
      <div className="marquee-track">
        {repeated.map(([vi, en], i) => (
          <div className="marquee-item" key={i}>
            <span>{vi}</span>
            <em>{en}</em>
            <span className="star">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Marquee = Marquee;
