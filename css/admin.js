/* =========================================================================
   ADMIN.CSS — Dashboard administrativo
   ========================================================================= */
.layout { display: grid; grid-template-columns: 250px 1fr; min-height: 100vh; }

/* ---------- Sidebar ---------- */
.sidebar {
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.side-brand { font-size: 1.3rem; padding: 6px 10px 20px; display: flex; align-items: center; gap: 10px; }
.side-brand .brand-logo { width: 40px; height: 40px; object-fit: contain; border-radius: 8px; }
.side-brand strong { color: var(--gold); }
.side-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.side-link {
  display: block;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.side-link:hover { background: var(--surface); color: var(--text); }
.side-link.active { background: var(--surface); color: var(--gold); }
.side-logout { margin-top: 10px; }

/* ---------- Contenido ---------- */
.content { padding: 24px 30px; overflow-x: hidden; min-width: 0; }
.content-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.content-head h1 { font-size: 1.7rem; }
.head-title { display: flex; align-items: center; gap: 12px; }
.content-user { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 40px; height: 40px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}

/* ---------- Métricas ---------- */
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 22px; }
.metric { padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.metric-label { font-size: 0.82rem; color: var(--text-muted); }
.metric-value { font-size: 1.9rem; font-weight: 700; }
.metric-foot { font-size: 0.75rem; }

/* ---------- Gráficos ---------- */
.charts { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
.chart-box { padding: 20px; }
.chart-box h3 { margin-bottom: 14px; font-size: 1.05rem; }
.chart-box canvas { max-height: 300px; }

/* ---------- Toolbar y tablas ---------- */
.view-toolbar { display: flex; gap: 12px; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; }
.view-toolbar input { max-width: 340px; }
.table-wrap { overflow-x: auto; }
.tabla { width: 100%; border-collapse: collapse; }
.tabla th, .tabla td { padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.92rem; }
.tabla th { color: var(--text-muted); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.5px; }
.tabla tbody tr:hover { background: var(--bg-elevated); }
.acciones { display: flex; gap: 6px; }
.icon-btn {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  border-radius: 7px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.8rem;
}
.icon-btn:hover { border-color: var(--gold); color: var(--gold); }
.icon-btn.del:hover { border-color: var(--red); color: var(--red); }
.pill { padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.pill.ok { background: rgba(46, 204, 113, 0.15); color: var(--green); }
.pill.low { background: rgba(212, 175, 55, 0.15); color: var(--gold); }
.pill.out { background: rgba(231, 76, 60, 0.15); color: var(--red); }
.pill.rol { background: rgba(59, 130, 246, 0.15); color: #7db0ff; }
.venta-det > summary {
  cursor: pointer;
  color: var(--gold);
  font-size: 0.85rem;
  list-style: none;
}
.venta-det > summary::-webkit-details-marker { display: none; }
.venta-det > summary::before { content: '\25B8'; margin-right: 6px; display: inline-block; transition: transform 0.2s; }
.venta-det[open] > summary::before { transform: rotate(90deg); }
.det-list { list-style: none; margin: 8px 0 4px; padding: 0; }
.det-list li { display: flex; justify-content: space-between; gap: 14px; padding: 3px 0; font-size: 0.85rem; }
.det-cant { color: var(--gold); font-weight: 600; }

.row-anulada { background: rgba(231, 76, 60, 0.06); }
.row-anulada td { text-decoration: line-through; text-decoration-color: rgba(231, 76, 60, 0.5); }
.row-anulada td:last-child, .row-anulada .pill { text-decoration: none; }

/* ---------- Usuarios ---------- */
.usuarios-grid { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
.panel { padding: 22px; }
.panel h3 { margin-bottom: 4px; }
.small { font-size: 0.82rem; margin-bottom: 16px; }

/* ---------- Modal ---------- */
.modal {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px;
  animation: fade 0.2s ease;
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.modal-card { width: 100%; max-width: 520px; padding: 24px; max-height: 92vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.2rem; cursor: pointer; }
.modal-close:hover { color: var(--red); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

/* ---------- Finanzas ---------- */
.fin-toolbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.fin-range { display: flex; gap: 12px; align-items: flex-end; }
.fin-range .field { margin-bottom: 0; }
.fin-presets { display: flex; gap: 8px; }
.chip { padding: 8px 14px; font-size: 0.82rem; }
.fin-metrics { grid-template-columns: repeat(3, 1fr); margin-bottom: 22px; }
.metric-hero { background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(123,30,43,0.16)); border-color: var(--gold); }
.metric-hero .metric-value { color: var(--gold); }

/* ---------- Upload de imagen ---------- */
.upload-row { display: flex; gap: 14px; align-items: flex-start; }
.img-preview {
  width: 90px; height: 90px;
  flex-shrink: 0;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 1.6rem;
  overflow: hidden;
}
.img-preview img { width: 100%; height: 100%; object-fit: cover; }
.upload-controls { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.file-btn { cursor: pointer; align-self: flex-start; }
.checkbox-field .inline { display: flex; align-items: center; gap: 8px; color: var(--text); cursor: pointer; }

@media (max-width: 1000px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .fin-metrics { grid-template-columns: repeat(2, 1fr); }
  .charts { grid-template-columns: 1fr; }
  .usuarios-grid { grid-template-columns: 1fr; }
}
/* Menú flotante tipo iPhone (barra inferior) en tablet/móvil */
@media (max-width: 820px) {
  .layout { grid-template-columns: 1fr; }
  .content { padding-bottom: 140px; }

  .sidebar {
    position: fixed;
    left: 12px; right: 12px; bottom: 12px;
    top: auto;
    height: auto;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    padding: 8px;
    background: rgba(21, 25, 34, 0.92);
    backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: 22px;
    box-shadow: 0 12px 34px rgba(0, 0, 0, 0.55);
    z-index: 100;
  }
  .side-brand { display: none; }

  .side-nav {
    flex-direction: row;
    flex: 1;
    gap: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .side-nav::-webkit-scrollbar { display: none; }

  .side-link {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 62px;
    padding: 8px 6px;
    font-size: 0.62rem;
    line-height: 1.1;
    text-align: center;
    border-radius: 14px;
  }
  .side-link i { font-size: 1.15rem; }

  .side-logout {
    flex: 0 0 auto;
    width: auto;
    margin: 0;
    padding: 10px 12px;
    border-radius: 14px;
    font-size: 0;              /* oculta el texto, deja el ícono */
  }
  .side-logout i { font-size: 1.15rem; margin: 0; }
}
@media (max-width: 600px) {
  .content { padding: 16px 14px 140px; }
  .content-head h1 { font-size: 1.35rem; }
  .metrics, .fin-metrics { grid-template-columns: 1fr; }
  .metric-value { font-size: 1.6rem; }
  .btn, .btn-block { white-space: normal; }   /* etiquetas largas envuelven */
  .panel, .card { min-width: 0; }

  .fin-toolbar { align-items: stretch; }
  .fin-range { flex-wrap: wrap; }
  .fin-range .field { flex: 1; min-width: 130px; }
  .fin-range .btn { flex: 1 0 100%; }
  .fin-presets { flex-wrap: wrap; }

  .view-toolbar input { max-width: none; width: 100%; }
  .grid2 { grid-template-columns: 1fr; }
  .modal-card { padding: 18px; }
  .upload-row { flex-direction: column; align-items: stretch; }
  .img-preview { width: 100%; height: 150px; }

  .tabla th, .tabla td { padding: 10px 12px; font-size: 0.85rem; }
}
