/**
 * Módulo de Vistas, Renderizado Dinámico y Lógica de Negocio
 */
const UIModule = (() => {
  // Sanitización XSS
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  };

  // Abrir / Cerrar Modal Global
  const openModal = (title, htmlContent) => {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = htmlContent;
    document.getElementById('modal-container').classList.remove('hidden');
  };

  const closeModal = () => {
    document.getElementById('modal-container').classList.add('hidden');
  };

  // Generación de Menú según Rol
  const renderSidebar = () => {
    const user = AuthModule.getCurrentUser();
    const container = document.getElementById('sidebar-nav');
    if (!user || !container) return;

    const items = [
      { id: 'panel', label: 'Panel', icon: '📊', roles: ['admin'] },
      { id: 'mesas', label: 'Mesas', icon: '🪑', roles: ['admin', 'mesero'] },
      { id: 'reservas', label: 'Reservas', icon: '📅', roles: ['admin', 'mesero'] },
      { id: 'pedidos', label: 'Pedidos / Platos', icon: '🍽️', roles: ['admin', 'mesero'] },
      { id: 'cocina', label: 'Cocina', icon: '👨‍🍳', roles: ['cocina'] },
      { id: 'despachos', label: 'Despachos', icon: '🛵', roles: ['admin', 'mesero', 'despacho'] },
      { id: 'usuarios', label: 'Usuarios', icon: '👥', roles: ['admin'] }
    ];

    container.innerHTML = items
      .filter(i => i.roles.includes(user.role))
      .map(i => `
        <a class="nav-item" data-view="${i.id}">
          <span>${i.icon}</span> <span>${i.label}</span>
        </a>
      `).join('');
  };

  // VISTA: PANEL PRINCIPAL CON ESTADÍSTICAS
  const renderPanel = () => {
    const db = StorageModule.getData();
    const hoyStr = new Date().toISOString().split('T')[0];

    const resHoy = db.reservas.filter(r => r.fecha === hoyStr).length;
    const platosPendientes = db.pedidos.flatMap(p => p.platos).filter(pl => pl.estado === 'pendiente').length;
    const despachosActivos = db.despachos.filter(d => d.estado !== 'entregado').length;
    const mesasOcupadas = db.mesas.filter(m => m.estado === 'ocupada').length;
    const mesasReservadas = db.mesas.filter(m => m.estado === 'reservada').length;

    return `
      <p style="margin-bottom: 20px; color: var(--text-muted);">Resumen general del restaurante — ${new Date().toLocaleDateString('es-ES')}</p>
      
      <div class="stats-grid">
        <div class="stat-card"><span class="stat-icon">📅</span><span class="stat-value">${resHoy}</span><span class="stat-label">Reservas hoy</span></div>
        <div class="stat-card"><span class="stat-icon">🍽️</span><span class="stat-value">${platosPendientes}</span><span class="stat-label">Platos pendientes</span></div>
        <div class="stat-card"><span class="stat-icon">🛵</span><span class="stat-value">${despachosActivos}</span><span class="stat-label">Despachos activos</span></div>
        <div class="stat-card"><span class="stat-icon">🪑</span><span class="stat-value">${mesasOcupadas}</span><span class="stat-label">Mesas ocupadas</span></div>
        <div class="stat-card"><span class="stat-icon">📋</span><span class="stat-value">${mesasReservadas}</span><span class="stat-label">Mesas reservadas</span></div>
      </div>

      <div class="table-container" style="padding: 20px;">
        <h3 style="margin-bottom: 15px; color: var(--primary);">Reservas programadas para hoy</h3>
        ${db.reservas.filter(r => r.fecha === hoyStr).length === 0 
          ? '<p style="text-align:center; padding:30px; color:#888;">No hay reservas registradas para el día de hoy.</p>' 
          : `<table class="data-table">
              <thead><tr><th>Cliente</th><th>Mesa</th><th>Hora</th><th>Personas</th></tr></thead>
              <tbody>
                ${db.reservas.filter(r => r.fecha === hoyStr).map(r => {
                  const m = db.mesas.find(x => x.id === r.mesaId);
                  return `<tr><td>${sanitize(r.cliente)}</td><td>Mesa ${m ? m.numero : '-'}</td><td>${r.hora}</td><td>${r.personas}</td></tr>`;
                }).join('')}
              </tbody>
            </table>`
        }
      </div>
    `;
  };

  // VISTA: MESAS (VISUAL CON COLORES DE ESTADO)
  const renderMesas = () => {
    const db = StorageModule.getData();
    const user = AuthModule.getCurrentUser();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <p style="color:var(--text-muted);">Estado visual de mesas del restaurante</p>
        ${user.role === 'admin' ? `<button id="btn-add-mesa" class="btn btn-primary">+ Nueva mesa</button>` : ''}
      </div>

      <div class="tables-grid">
        ${db.mesas.map(m => `
          <div class="table-card ${m.estado}">
            <h3>Mesa ${m.numero}</h3>
            <p>${m.capacidad} personas · ${sanitize(m.zona)}</p>
            <span class="badge">${m.estado.toUpperCase()}</span>
          </div>
        `).join('')}
      </div>

      <div class="table-container" style="padding: 20px;">
        <h3 style="margin-bottom: 15px; color: var(--primary);">Gestión de Mesas</h3>
        <table class="data-table">
          <thead><tr><th>#</th><th>Capacidad</th><th>Zona</th><th>Estado</th>${user.role === 'admin' ? '<th>Acciones</th>' : ''}</tr></thead>
          <tbody>
            ${db.mesas.map(m => `
              <tr>
                <td>Mesa ${m.numero}</td>
                <td>${m.capacidad} pers.</td>
                <td>${sanitize(m.zona)}</td>
                <td><span class="badge" style="background:#eee; color:#333;">${m.estado}</span></td>
                ${user.role === 'admin' ? `<td><button class="btn btn-danger btn-sm-delete-mesa" data-id="${m.id}">Eliminar</button></td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // VISTA: RESERVAS
  const renderReservas = () => {
    const db = StorageModule.getData();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <p style="color:var(--text-muted);">Registro y programación de reservas</p>
        <button id="btn-add-reserva" class="btn btn-primary">+ Nueva reserva</button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Cliente</th><th>Teléfono</th><th>Mesa</th><th>Fecha</th><th>Hora</th><th>Personas</th><th>Notas</th></tr>
          </thead>
          <tbody>
            ${db.reservas.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:20px;">No hay reservas creadas.</td></tr>' : ''}
            ${db.reservas.map(r => {
              const m = db.mesas.find(x => x.id === r.mesaId);
              return `
                <tr>
                  <td><strong>${sanitize(r.cliente)}</strong></td>
                  <td>${sanitize(r.telefono)}</td>
                  <td>Mesa ${m ? m.numero : '-'} (${sanitize(m ? m.zona : '')})</td>
                  <td>${r.fecha}</td>
                  <td>${r.hora}</td>
                  <td>${r.personas}</td>
                  <td>${sanitize(r.notas || '-')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // VISTA: PEDIDOS / PLATOS
  const renderPedidos = () => {
    const db = StorageModule.getData();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <p style="color:var(--text-muted);">Registro de comandas por mesa</p>
        <button id="btn-add-pedido" class="btn btn-primary">+ Nuevo pedido</button>
      </div>

      <div class="cards-list">
        ${db.pedidos.length === 0 ? '<p style="color:#888;">No hay pedidos abiertos.</p>' : ''}
        ${db.pedidos.map(p => {
          const m = db.mesas.find(x => x.id === p.mesaId);
          return `
            <div class="order-card">
              <div class="order-header">
                <h4>Pedido Mesa ${m ? m.numero : '-'}</h4>
                <span class="badge">${p.estado}</span>
              </div>
              <div class="order-body">
                ${p.platos.map(pl => `
                  <div class="dish-item">
                    <span>${pl.cantidad}x ${sanitize(pl.nombre)}</span>
                    <span class="badge" style="font-size:0.68rem;">${pl.estado}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  // VISTA: COCINA
  const renderCocina = () => {
    const db = StorageModule.getData();
    let pendingDishes = [];

    db.pedidos.forEach(p => {
      p.platos.forEach((pl, idx) => {
        if (pl.estado === 'pendiente' || pl.estado === 'en_preparacion') {
          pendingDishes.push({ pedidoId: p.id, mesaId: p.mesaId, platoIndex: idx, ...pl });
        }
      });
    });

    return `
      <p style="color:var(--text-muted); margin-bottom:20px;">Cola de preparación de comanda</p>
      <div class="cards-list">
        ${pendingDishes.length === 0 ? '<p style="color:#888;">No hay platos pendientes en cocina 🎉</p>' : ''}
        ${pendingDishes.map(item => {
          const m = db.mesas.find(x => x.id === item.mesaId);
          return `
            <div class="order-card">
              <div class="order-header">
                <h4>Mesa ${m ? m.numero : '-'}</h4>
                <span class="badge">${item.estado}</span>
              </div>
              <p style="font-size:1.1rem; font-weight:600; margin-bottom:15px;">${item.cantidad}x ${sanitize(item.nombre)}</p>
              ${item.estado === 'pendiente' 
                ? `<button class="btn btn-primary btn-block btn-change-dish" data-pedido="${item.pedidoId}" data-index="${item.platoIndex}" data-next="en_preparacion">Iniciar preparación</button>`
                : `<button class="btn btn-success btn-block btn-change-dish" data-pedido="${item.pedidoId}" data-index="${item.platoIndex}" data-next="listo">Marcar como listo</button>`
              }
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  // VISTA: DESPACHOS
  const renderDespachos = () => {
    const db = StorageModule.getData();

    return `
      <p style="color:var(--text-muted); margin-bottom:20px;">Control de entregas a mesa</p>
      <div class="cards-list">
        ${db.despachos.length === 0 ? '<p style="color:#888;">No hay despachos activos en este momento.</p>' : ''}
        ${db.despachos.map(d => {
          const m = db.mesas.find(x => x.id === d.mesaId);
          return `
            <div class="order-card">
              <div class="order-header">
                <h4>Entrega Mesa ${m ? m.numero : '-'}</h4>
                <span class="badge">${d.estado}</span>
              </div>
              <p style="font-size:0.85rem; color:#666; margin-bottom:12px;">Items listos: ${d.items.length}</p>
              ${d.estado === 'pendiente' ? `<button class="btn btn-primary btn-block btn-despacho-step" data-id="${d.id}" data-next="en_ruta">Marcar En Ruta</button>` : ''}
              ${d.estado === 'en_ruta' ? `<button class="btn btn-success btn-block btn-despacho-step" data-id="${d.id}" data-next="entregado">Marcar Entregado</button>` : ''}
              ${d.estado === 'entregado' ? `<p style="color:var(--status-disp-text); font-weight:600; text-align:center;">✓ Entregado con éxito</p>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  // VISTA: USUARIOS
  const renderUsuarios = () => {
    const db = StorageModule.getData();

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <p style="color:var(--text-muted);">Cuentas registradas y mantenimiento</p>
        <button id="btn-reset-demo" class="btn btn-danger">Resetear datos demo</button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th></tr></thead>
          <tbody>
            ${db.users.map(u => `
              <tr>
                <td><strong>${sanitize(u.name)}</strong></td>
                <td><code>${sanitize(u.username)}</code></td>
                <td><span class="badge">${u.role.toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // CARGADOR CENTRAL DE VISTAS
  const loadView = (viewName) => {
    if (!AuthModule.hasPermission(viewName)) {
      document.getElementById('view-content').innerHTML = `<h3 style="color:var(--primary);">Acceso restringido para tu rol.</h3>`;
      return;
    }

    document.getElementById('current-view-title').textContent = viewName.toUpperCase();
    const content = document.getElementById('view-content');

    switch (viewName) {
      case 'panel': content.innerHTML = renderPanel(); break;
      case 'mesas': content.innerHTML = renderMesas(); break;
      case 'reservas': content.innerHTML = renderReservas(); break;
      case 'pedidos': content.innerHTML = renderPedidos(); break;
      case 'cocina': content.innerHTML = renderCocina(); break;
      case 'despachos': content.innerHTML = renderDespachos(); break;
      case 'usuarios': content.innerHTML = renderUsuarios(); attachUserEvents(); break;
      default: content.innerHTML = renderPanel();
    }

    attachViewEvents(viewName);
  };

  // EVENTOS DINÁMICOS DE VISTAS
  const attachViewEvents = (viewName) => {
    const db = StorageModule.getData();

    // Nueva Reserva
    document.getElementById('btn-add-reserva')?.addEventListener('click', () => {
      const modalHTML = `
        <form id="form-nueva-reserva">
          <div class="form-group"><label>Cliente</label><input type="text" id="res-cliente" required></div>
          <div class="form-group"><label>Teléfono</label><input type="text" id="res-tel" required></div>
          <div class="form-group">
            <label>Mesa</label>
            <select id="res-mesa">${db.mesas.map(m => `<option value="${m.id}">Mesa ${m.numero} (${m.capacidad} pers - ${m.zona})</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Fecha</label><input type="date" id="res-fecha" required value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label>Hora</label><input type="time" id="res-hora" required value="19:00"></div>
          <div class="form-group"><label>Personas</label><input type="number" id="res-personas" min="1" value="2" required></div>
          <div class="form-group"><label>Notas</label><textarea id="res-notas" rows="2"></textarea></div>
          <button type="submit" class="btn btn-primary btn-block">Guardar Reserva</button>
        </form>
      `;
      openModal('Nueva Reserva', modalHTML);

      document.getElementById('form-nueva-reserva').addEventListener('submit', (e) => {
        e.preventDefault();
        const nueva = {
          id: 'res_' + Date.now(),
          cliente: document.getElementById('res-cliente').value,
          telefono: document.getElementById('res-tel').value,
          mesaId: document.getElementById('res-mesa').value,
          fecha: document.getElementById('res-fecha').value,
          hora: document.getElementById('res-hora').value,
          personas: parseInt(document.getElementById('res-personas').value),
          notas: document.getElementById('res-notas').value
        };

        db.reservas.push(nueva);
        // Cambiar estado de mesa a reservada
        const m = db.mesas.find(x => x.id === nueva.mesaId);
        if (m) m.estado = 'reservada';

        StorageModule.saveData(db);
        closeModal();
        loadView('reservas');
      });
    });

    // Nuevo Pedido
    document.getElementById('btn-add-pedido')?.addEventListener('click', () => {
      const modalHTML = `
        <form id="form-nuevo-pedido">
          <div class="form-group">
            <label>Mesa</label>
            <select id="ped-mesa">${db.mesas.map(m => `<option value="${m.id}">Mesa ${m.numero} - ${m.estado}</option>`).join('')}</select>
          </div>
          <div class="form-group">
            <label>Plato</label>
            <select id="ped-plato">${db.platos.map(p => `<option value="${p.id}">${p.nombre} - S/${p.precio}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Cantidad</label><input type="number" id="ped-cant" min="1" value="1"></div>
          <button type="submit" class="btn btn-primary btn-block">Registrar Pedido</button>
        </form>
      `;
      openModal('Nuevo Pedido', modalHTML);

      document.getElementById('form-nuevo-pedido').addEventListener('submit', (e) => {
        e.preventDefault();
        const mesaId = document.getElementById('ped-mesa').value;
        const platoId = document.getElementById('ped-plato').value;
        const cant = parseInt(document.getElementById('ped-cant').value);
        const platoObj = db.platos.find(p => p.id === platoId);

        let pedido = db.pedidos.find(p => p.mesaId === mesaId && p.estado === 'abierto');
        if (!pedido) {
          pedido = { id: 'ped_' + Date.now(), mesaId, estado: 'abierto', platos: [] };
          db.pedidos.push(pedido);
        }

        pedido.platos.push({ platoId, nombre: platoObj.nombre, cantidad: cant, estado: 'pendiente' });

        // Marcar mesa como ocupada
        const m = db.mesas.find(x => x.id === mesaId);
        if (m) m.estado = 'ocupada';

        StorageModule.saveData(db);
        closeModal();
        loadView('pedidos');
      });
    });

    // Acciones de Cocina
    document.querySelectorAll('.btn-change-dish').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pId = e.target.getAttribute('data-pedido');
        const idx = parseInt(e.target.getAttribute('data-index'));
        const next = e.target.getAttribute('data-next');

        const ped = db.pedidos.find(p => p.id === pId);
        if (ped && ped.platos[idx]) {
          ped.platos[idx].estado = next;

          // Si todos los platos están listos, genera despacho
          const todosListos = ped.platos.every(pl => pl.estado === 'listo');
          if (todosListos) {
            ped.estado = 'listo';
            db.despachos.push({
              id: 'desp_' + Date.now(),
              pedidoId: ped.id,
              mesaId: ped.mesaId,
              items: ped.platos,
              estado: 'pendiente'
            });
          }

          StorageModule.saveData(db);
          loadView('cocina');
        }
      });
    });

    // Acciones de Despacho
    document.querySelectorAll('.btn-despacho-step').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dId = e.target.getAttribute('data-id');
        const next = e.target.getAttribute('data-next');

        const desp = db.despachos.find(d => d.id === dId);
        if (desp) {
          desp.estado = next;
          StorageModule.saveData(db);
          loadView('despachos');
        }
      });
    });
  };

  const attachUserEvents = () => {
    document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
      if (confirm('¿Estás seguro de restablecer la base de datos a su estado inicial demo?')) {
        await StorageModule.resetDemoData();
        alert('Datos reseteados correctamente.');
        location.reload();
      }
    });
  };

  return { renderSidebar, loadView, closeModal };
})();