import {site} from '@/lib/config';
export function Footer(){return <footer className="section dark" style={{padding:'40px 0'}}><div className="wrap" style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}><div><strong className="gold">{site.name}</strong><div className="muted">{site.tagline}</div></div><div className="muted">© 2026 ASLAN MODELLING</div></div></footer>}
