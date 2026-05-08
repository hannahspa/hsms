/* global React */
function Team() {
  const team = [
    { name: 'Hannah Nguyễn', role: 'Founder · Master Therapist', exp: '18 năm', spec: 'Skin diagnosis · Kobido' },
    { name: 'Thảo Mai', role: 'Lead Body Therapist', exp: '12 năm', spec: 'Deep tissue · Lymphatic' },
    { name: 'Mỹ Linh', role: 'Aromatherapy Specialist', exp: '9 năm', spec: 'Botanical blending' },
    { name: 'Quỳnh Anh', role: 'Skin Consultant', exp: '7 năm', spec: 'Visia · Acne protocol' },
  ];
  return (
    <section id="team" className="hs-team" data-screen-label="06 Team">
      <div className="container">
        <div className="hs-team-head">
          <div className="eyebrow"><span className="dot"></span>Đội ngũ · The hands</div>
          <h2 className="h-section" style={{marginTop: 24}}>
            Bốn đôi tay,<br/><em>một niềm tin</em> chung.
          </h2>
        </div>
        <div className="hs-team-grid">
          {team.map((p, i) => (
            <div className="hs-member" key={p.name}>
              <div className="hs-member-img ph">
                <span className="ph-label">Portrait · {p.name}</span>
              </div>
              <div className="hs-member-no">0{i+1}</div>
              <h3 className="hs-member-name">{p.name}</h3>
              <div className="hs-member-role">{p.role}</div>
              <div className="hs-member-meta">
                <span><em>{p.exp}</em> kinh nghiệm</span>
                <span>{p.spec}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .hs-team { background: var(--bg); }
        .hs-team-head { margin-bottom: 70px; }
        .hs-team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .hs-member { position: relative; }
        .hs-member-img {
          aspect-ratio: 3/4;
          border-radius: 4px;
          transition: transform .5s cubic-bezier(.2,.8,.2,1);
        }
        .hs-member:hover .hs-member-img { transform: translateY(-6px); }
        .hs-member-no {
          font-family: var(--display);
          font-size: 16px;
          color: var(--terracotta);
          margin-top: 20px;
        }
        .hs-member-name {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 400;
          margin-top: 6px;
          line-height: 1.1;
        }
        .hs-member-role {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin-top: 6px;
        }
        .hs-member-meta {
          display: flex; flex-direction: column;
          gap: 6px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
          font-size: 13px;
          color: var(--ink-soft);
        }
        .hs-member-meta em {
          font-family: var(--serif);
          font-style: normal;
          color: var(--ink);
          font-size: 18px;
        }
        @media (max-width: 980px) {
          .hs-team-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </section>
  );
}
window.Team = Team;
