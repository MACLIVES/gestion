// ---------------------------------------------------------------
// MACLIVE · js/parte-formulario.js — Formulario del parte (nuevo/editar): materiales, checklist, gas, fotos, firma y borrador local
// ---------------------------------------------------------------
'use strict';

// Formulario de parte (nuevo / editar)
async function viewParteForm(v, id, params) {
  let p = { fecha: today(), tipo: 'correctivo', desplazamiento: true, resuelto: true, checklist: [], tecnico_id: S.me.id };
  let materiales = [], fotos = [];
  let revision = null;

  if (id) {
    p = await q(sb.from('partes').select('*').eq('id', id).single());
    if (!isOficina() && !['borrador', 'firmado'].includes(p.estado)) { location.hash = '#/parte/' + id; return; }
    [materiales, fotos] = await Promise.all([
      q(sb.from('partes_materiales').select('*').eq('parte_id', id)),
      q(sb.from('partes_fotos').select('*').eq('parte_id', id).order('creado_en'))
    ]);
  } else if (params.get('aviso')) {
    const a = await q(sb.from('avisos').select('id,numero,titulo,cliente_id,instalacion_id,equipo_id,tipo,tecnico_id').eq('id', params.get('aviso')).single());
    Object.assign(p, { aviso_id: a.id, cliente_id: a.cliente_id, instalacion_id: a.instalacion_id, equipo_id: a.equipo_id, tipo: a.tipo === 'instalacion' ? 'instalacion' : 'correctivo', tecnico_id: (isOficina() && a.tecnico_id) || S.me.id });
    p._avisoTxt = `${a.numero} · ${a.titulo}`;
  } else if (params.get('revision')) {
    revision = await q(sb.from('revisiones').select('id,fecha_prevista,tecnico_id,contratos(id,cliente_id,instalacion_id,checklist,referencia)').eq('id', params.get('revision')).single());
    const c = revision.contratos;
    Object.assign(p, { revision_id: revision.id, tecnico_id: (isOficina() && revision.tecnico_id) || S.me.id, cliente_id: c.cliente_id, instalacion_id: c.instalacion_id, tipo: 'preventivo', checklist: (c.checklist || []).map(item => ({ item, ok: false })) });
  }

  // Borrador local (por si se pierde la cobertura)
  const draftKey = 'maclive-parte-' + (id || params.toString() || 'nuevo');
  const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');

  const [clientes, tecnicos] = await Promise.all([clientesList(), isOficina() ? tecnicosList() : []]);
  const [inst, eqs] = await Promise.all([instalacionesDe(p.cliente_id), equiposDe(p.instalacion_id)]);
  const firmaUrl = p.firma_url ? await signedUrl(p.firma_url) : null;
  const fotoUrls = await signedUrls(fotos.map(f => f.ruta));
  const newPhotos = []; // {blob, url}

  v.innerHTML = `<a class="back" href="${id ? '#/parte/' + id : 'javascript:history.back()'}">← Volver</a>
    <div class="page-head"><h1>${id ? 'Editar parte ' + esc(p.numero) : 'Nuevo parte de trabajo'}</h1></div>
    ${draft ? '<div class="notice" id="draftN">Hay datos sin guardar de este parte en el móvil. <a href="#" id="draftLoad">Recuperarlos</a> · <a href="#" id="draftDel">Descartar</a></div>' : ''}
    <form id="fp">
      <div class="card"><h2>Cliente y equipo</h2>
        ${p._avisoTxt ? `<div class="notice">Vinculado al aviso <b>${esc(p._avisoTxt)}</b></div>` : ''}
        ${revision ? `<div class="notice">Revisión preventiva prevista el <b>${fDate(revision.fecha_prevista)}</b>${revision.contratos.referencia ? ' · ' + esc(revision.contratos.referencia) : ''}</div>` : ''}
        <div class="field"><label>Cliente *</label><select name="cliente_id" required>${optsRows(clientes, p.cliente_id, '— Cliente —')}</select></div>
        <div class="row"><div class="field"><label>Instalación</label><select name="instalacion_id">${optsRows(inst, p.instalacion_id, '— Instalación —')}</select></div>
          <div class="field"><label>Equipo</label><select name="equipo_id">${optsRows(eqs, p.equipo_id, '— Equipo (opcional) —', equipoLabel)}</select></div></div>
        <div class="small"><a href="#" id="neq">+ Equipo que no está dado de alta</a></div>
      </div>

      <div class="card"><h2>Trabajo</h2>
        <div class="row">
          <div class="field"><label>Tipo</label><select name="tipo">${opts(TIPOS_PARTE, p.tipo)}</select></div>
          <div class="field"><label>Fecha</label><input type="date" name="fecha" value="${esc(p.fecha)}" required></div>
          ${isOficina() ? `<div class="field"><label>Técnico</label><select name="tecnico_id" required>${optsRows(tecnicos, p.tecnico_id)}</select></div>` : ''}
        </div>
        <div class="row row-3">
          <div class="field"><label>Hora inicio</label><input type="time" name="hora_inicio" value="${esc((p.hora_inicio || '').slice(0, 5))}"></div>
          <div class="field"><label>Hora fin</label><input type="time" name="hora_fin" value="${esc((p.hora_fin || '').slice(0, 5))}"></div>
          <div class="field"><label>Horas</label><input type="number" step="0.25" min="0" name="horas" value="${p.horas ?? ''}" placeholder="auto"></div>
        </div>
        <label class="check"><input type="checkbox" name="desplazamiento" ${p.desplazamiento ? 'checked' : ''}>Desplazamiento</label>
        <div class="field"><label>Trabajo realizado *</label><textarea name="trabajo_realizado" required placeholder="Diagnóstico y reparación…">${esc(p.trabajo_realizado)}</textarea></div>
        <div class="field"><label>Observaciones / recomendaciones</label><textarea name="observaciones">${esc(p.observaciones)}</textarea></div>
        <label class="check"><input type="checkbox" name="resuelto" ${p.resuelto ? 'checked' : ''}>Avería resuelta (si no, el aviso queda "pendiente de material")</label>
      </div>

      <div class="card" id="ckCard" ${p.checklist?.length ? '' : 'style="display:none"'}><h2>Checklist de mantenimiento</h2><div id="ck"></div></div>

      <div class="card"><h2>Gas refrigerante</h2><div class="row row-gas">
        <div class="field"><label>Tipo</label><select name="gas_tipo">${optsArr(REFRIGERANTES, p.gas_tipo, '— Ninguno —')}</select></div>
        <div class="field"><label>Cargado (kg)</label><input type="number" step="0.01" min="0" name="gas_kg_cargado" value="${p.gas_kg_cargado ?? ''}"></div>
        <div class="field"><label>Recuperado (kg)</label><input type="number" step="0.01" min="0" name="gas_kg_recuperado" value="${p.gas_kg_recuperado ?? ''}"></div>
      </div></div>

      <div class="card"><div class="card-head"><h2>Materiales</h2><button type="button" class="btn-sm btn-ghost" id="addMat">+ Añadir</button></div>
        <div class="mat-row small muted" style="margin-bottom:2px"><span>Descripción</span><span>Cant.</span><span>Ud.</span><span></span></div>
        <div id="mats"></div></div>

      <div class="card"><div class="card-head"><h2>Fotos</h2>
        <label class="btn btn-sm btn-ghost" style="margin:0">📷 Añadir fotos<input type="file" id="fotoIn" accept="image/*" capture="environment" multiple hidden></label></div>
        <div class="photos" id="photos"></div></div>

      <div class="card"><h2>Conformidad del cliente</h2>
        <div class="row"><div class="field"><label>Nombre de quien firma</label><input name="firma_nombre" value="${esc(p.firma_nombre)}"></div>
          <div class="field"><label>DNI (opcional)</label><input name="firma_dni" value="${esc(p.firma_dni)}"></div></div>
        ${firmaUrl ? `<div id="firmaPrev"><img class="sig-img" src="${firmaUrl}" alt="Firma"><div><button type="button" class="btn-sm btn-ghost" id="refirmar">Volver a firmar</button></div></div>` : ''}
        <div id="sigWrap" ${firmaUrl ? 'class="hidden"' : ''}><div class="sig-box"><canvas id="sig"></canvas><div class="hint">Firma aquí con el dedo</div></div>
          <div class="actions" style="justify-content:flex-start;margin-top:6px"><button type="button" class="btn-sm btn-ghost" id="sigClear">Borrar firma</button></div></div>
      </div>

      <div class="actions no-print sticky-actions">
        <button type="button" class="btn-ghost" id="saveDraft">Guardar borrador</button>
        <button type="submit" class="btn-ok">✓ Firmar y cerrar parte</button>
      </div>
    </form>`;

  const f = $('#fp');
  bindCascade(f, saveLocal);
  const calcHoras = () => {
    const a = f.elements.hora_inicio.value, b = f.elements.hora_fin.value;
    if (!a || !b) return;
    const [ah, am] = a.split(':').map(Number), [bh, bm] = b.split(':').map(Number);
    let h = (bh * 60 + bm - ah * 60 - am) / 60; if (h < 0) h += 24;
    f.elements.horas.value = Math.round(h * 100) / 100;
  };
  f.elements.hora_inicio.addEventListener('change', calcHoras);
  f.elements.hora_fin.addEventListener('change', calcHoras);

  // --- checklist
  let checklist = (p.checklist || []).map(x => ({ ...x }));
  const renderCk = () => {
    $('#ckCard').style.display = checklist.length ? '' : 'none';
    $('#ck').innerHTML = checklist.map((c, i) => `<label class="check"><input type="checkbox" data-ck="${i}" ${c.ok ? 'checked' : ''}>${esc(c.item)}</label>`).join('');
    $$('[data-ck]').forEach(cb => cb.onchange = () => { checklist[cb.dataset.ck].ok = cb.checked; saveLocal(); });
  };
  renderCk();

  // --- materiales
  const renderMats = () => {
    $('#mats').innerHTML = materiales.map((m, i) => `<div class="mat-row">
      <input data-m="${i}" data-k="descripcion" value="${esc(m.descripcion)}" placeholder="Ej.: Condensador 35µF">
      <input data-m="${i}" data-k="cantidad" type="number" step="0.01" min="0" value="${m.cantidad ?? 1}">
      <input data-m="${i}" data-k="unidad" value="${esc(m.unidad || 'ud')}">
      <button type="button" class="btn-danger" data-del="${i}" aria-label="Quitar">×</button></div>`).join('') || '<div class="empty small">Sin materiales</div>';
    $$('#mats input').forEach(inp => inp.oninput = () => { materiales[inp.dataset.m][inp.dataset.k] = inp.value; saveLocal(); });
    $$('#mats [data-del]').forEach(b => b.onclick = () => { materiales.splice(b.dataset.del, 1); renderMats(); saveLocal(); });
  };
  renderMats();
  $('#addMat').onclick = () => { materiales.push({ descripcion: '', cantidad: 1, unidad: 'ud' }); renderMats(); $$('#mats input[data-k=descripcion]').pop()?.focus(); };

  // --- fotos
  const removedFotos = [];
  const renderPhotos = () => {
    $('#photos').innerHTML = fotos.map((ph, i) => `<div class="ph"><img src="${fotoUrls[i] || ''}" alt="Foto"><button type="button" data-rf="${i}">×</button></div>`).join('')
      + newPhotos.map((ph, i) => `<div class="ph"><img src="${ph.url}" alt="Foto nueva"><button type="button" data-rn="${i}">×</button></div>`).join('')
      || '<div class="empty small">Sin fotos</div>';
    $$('[data-rf]').forEach(b => b.onclick = () => { removedFotos.push(fotos[b.dataset.rf]); fotos.splice(b.dataset.rf, 1); fotoUrls.splice(b.dataset.rf, 1); renderPhotos(); });
    $$('[data-rn]').forEach(b => b.onclick = () => { newPhotos.splice(b.dataset.rn, 1); renderPhotos(); });
  };
  renderPhotos();
  $('#fotoIn').onchange = async e => {
    for (const file of e.target.files) {
      try { const blob = await compressImage(file); newPhotos.push({ blob, url: URL.createObjectURL(blob) }); } catch (err) { fail(err); }
    }
    e.target.value = ''; renderPhotos();
  };

  // --- firma
  const sig = signaturePad($('#sig'));
  $('#sigClear').onclick = () => sig.clear();
  if ($('#refirmar')) $('#refirmar').onclick = () => { $('#firmaPrev').remove(); $('#sigWrap').classList.remove('hidden'); sig.resize(); };

  // --- equipo nuevo desde obra
  $('#neq').onclick = e => {
    e.preventDefault();
    const instId = f.elements.instalacion_id.value;
    if (!instId) return toast('Elige primero la instalación', true);
    equipoForm({ instalacion_id: instId }, async eqNew => {
      f.elements.equipo_id.innerHTML = optsRows(await equiposDe(instId), eqNew.id, '— Equipo (opcional) —', equipoLabel);
    });
  };

  // --- borrador local
  function snapshot() { return { form: formData(f), materiales, checklist }; }
  function saveLocal() { try { localStorage.setItem(draftKey, JSON.stringify(snapshot())); } catch (_) {} }
  f.addEventListener('input', saveLocal);
  if (draft) {
    $('#draftLoad').onclick = async e => {
      e.preventDefault();
      const d = draft.form;
      if (d.cliente_id && d.cliente_id !== f.elements.cliente_id.value) {
        f.elements.cliente_id.value = d.cliente_id;
        f.elements.instalacion_id.innerHTML = optsRows(await instalacionesDe(d.cliente_id), d.instalacion_id, '— Instalación —');
      }
      if (d.instalacion_id) f.elements.equipo_id.innerHTML = optsRows(await equiposDe(d.instalacion_id), d.equipo_id, '— Equipo (opcional) —', equipoLabel);
      for (const [k, val] of Object.entries(d)) {
        const el = f.elements[k]; if (!el || ['cliente_id'].includes(k)) continue;
        if (el.type === 'checkbox') el.checked = !!val; else el.value = val ?? '';
      }
      materiales = draft.materiales || []; checklist = draft.checklist || checklist;
      renderMats(); renderCk(); $('#draftN').remove(); toast('Datos recuperados');
    };
    $('#draftDel').onclick = e => { e.preventDefault(); localStorage.removeItem(draftKey); $('#draftN').remove(); };
  }

  // --- guardar
  async function save(firmar) {
    if (!f.reportValidity()) return;
    const d = formData(f);
    if (!isOficina()) d.tecnico_id = S.me.id;
    const firmaPrevia = !!p.firma_url && $('#sigWrap').classList.contains('hidden');
    if (firmar && sig.isEmpty() && !firmaPrevia) return toast('Falta la firma del cliente', true);
    if (firmar && !d.firma_nombre) return toast('Indica el nombre de quien firma', true);
    Object.assign(d, {
      aviso_id: p.aviso_id || null, revision_id: p.revision_id || null,
      checklist,
      // editar sin firmar conserva el estado actual (un parte firmado sigue firmado)
      estado: firmar && !['validado', 'facturado'].includes(p.estado) ? 'firmado' : (p.estado || 'borrador')
    });
    const btns = $$('#fp .actions button'); btns.forEach(b => (b.disabled = true));
    try {
      // 1. parte (si hay firma nueva, se guarda primero sin estado firmado para no disparar cierres antes de tiempo)
      const estadoFinal = d.estado;
      if (firmar) d.estado = p.estado && p.estado !== 'borrador' ? p.estado : 'borrador';
      const saved = id ? await q(sb.from('partes').update(d).eq('id', id).select().single())
        : await q(sb.from('partes').insert(d).select().single());
      const pid = saved.id;
      // 2. materiales
      await q(sb.from('partes_materiales').delete().eq('parte_id', pid));
      const mats = materiales.filter(m => (m.descripcion || '').trim()).map(m => ({ parte_id: pid, descripcion: m.descripcion.trim(), cantidad: Number(m.cantidad) || 1, unidad: m.unidad || 'ud' }));
      if (mats.length) await q(sb.from('partes_materiales').insert(mats));
      // 3. fotos
      for (const ph of removedFotos) {
        await q(sb.from('partes_fotos').delete().eq('id', ph.id));
        await sb.storage.from(BUCKET).remove([ph.ruta]);
      }
      for (const ph of newPhotos) {
        const ruta = `${pid}/foto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        await q(sb.storage.from(BUCKET).upload(ruta, ph.blob, { contentType: 'image/jpeg' }));
        await q(sb.from('partes_fotos').insert({ parte_id: pid, ruta }));
      }
      // 4. firma
      const upd = {};
      if (!sig.isEmpty()) {
        const ruta = `${pid}/firma-${Date.now()}.png`;
        await q(sb.storage.from(BUCKET).upload(ruta, await sig.toBlob(), { contentType: 'image/png' }));
        upd.firma_url = ruta;
      }
      if (estadoFinal !== saved.estado) upd.estado = estadoFinal;
      if (Object.keys(upd).length) await q(sb.from('partes').update(upd).eq('id', pid));

      localStorage.removeItem(draftKey);
      toast(firmar ? 'Parte firmado y cerrado ✓' : 'Borrador guardado');
      location.hash = '#/parte/' + pid;
    } catch (err) {
      saveLocal(); fail(err);
      btns.forEach(b => (b.disabled = false));
    }
  }
  $('#saveDraft').onclick = () => save(false);
  f.onsubmit = e => { e.preventDefault(); save(true); };
}
