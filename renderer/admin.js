window.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));

  // 🔐 Protección de ruta
  if (!user || user.rol !== 'ADMIN') {
    window.location.replace('../index.html');
    return;
  }

  const adminNombre = document.getElementById('adminNombre');
  if (adminNombre) adminNombre.textContent = `Admin: ${user.usuario}`;

  const listaSecciones = document.getElementById('listaSecciones');
  const listaProductos = document.getElementById('listaProductos');
  const infoSeccion = document.getElementById('infoSeccion');
  const tituloProductos = document.getElementById('tituloProductos');
  const seccionNombre = document.getElementById('seccionNombre');
  const seccionIcono = document.getElementById('seccionIcono');
  const btnCrearSeccion = document.getElementById('btnCrearSeccion');
  const prodNombre = document.getElementById('prodNombre');
  const prodPrecio = document.getElementById('prodPrecio');
  const prodImagen = document.getElementById('prodImagen');
  const btnCrearProducto = document.getElementById('btnCrearProducto');
  const btnSeleccionarImagen = document.getElementById('btnSeleccionarImagen');
  const imgNombreSeleccionado = document.getElementById('imgNombreSeleccionado');

  const selAnio = document.getElementById('selAnio');
  const selMes = document.getElementById('selMes');
  const selDia = document.getElementById('selDia');
  const listaJornadas = document.getElementById('listaJornadas');

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  let secciones = [];
  let seccionSeleccionada = null;

  function renderSecciones() {
    if (!listaSecciones) return;
    listaSecciones.innerHTML = '';
    secciones.forEach((sec) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const left = document.createElement('div');
      left.innerHTML = `${sec.imagen || ''} <strong>${sec.nombre}</strong> ` +
        `<span class="badge ${sec.activo ? 'activo' : 'inactivo'}">${sec.activo ? 'Activo' : 'Inactivo'}</span>`;
      const actions = document.createElement('div');

      const btnSelect = document.createElement('button');
      btnSelect.className = 'btn btn-ghost';
      btnSelect.textContent = 'Ver';
      btnSelect.addEventListener('click', () => seleccionarSeccion(sec.id));

      const btnToggle = document.createElement('button');
      btnToggle.className = 'btn btn-secondary';
      btnToggle.textContent = sec.activo ? 'Desactivar' : 'Activar';
      btnToggle.addEventListener('click', () => toggleSeccion(sec));

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-danger';
      btnDelete.textContent = 'Eliminar';
      btnDelete.addEventListener('click', () => eliminarSeccion(sec));

      actions.append(btnSelect, btnToggle, btnDelete);
      row.append(left, actions);
      listaSecciones.appendChild(row);
    });
  }

  async function cargarSecciones() {
    try {
      secciones = await window.adminApi.listarSecciones();
      renderSecciones();
      if (secciones.length) {
        const existeSeleccion = secciones.find((s) => s.id === seccionSeleccionada?.id);
        seleccionarSeccion(existeSeleccion ? seccionSeleccionada.id : secciones[0].id);
      } else {
        seccionSeleccionada = null;
        renderProductos([]);
      }
    } catch (err) {
      alert('Error cargando secciones');
      console.error(err);
    }
  }

  function renderProductos(productos) {
    if (tituloProductos) tituloProductos.textContent = 'Productos';
    if (infoSeccion) infoSeccion.textContent = seccionSeleccionada ? 'Sección actual' : 'Seleccione una sección';
    if (!listaProductos) return;
    listaProductos.innerHTML = '';
    productos.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';
      
      // Thumbnail de imagen
      const imgThumb = document.createElement('div');
      imgThumb.style.width = '36px';
      imgThumb.style.height = '36px';
      imgThumb.style.borderRadius = '6px';
      imgThumb.style.overflow = 'hidden';
      imgThumb.style.background = '#f0f0f0';
      imgThumb.style.display = 'flex';
      imgThumb.style.alignItems = 'center';
      imgThumb.style.justifyContent = 'center';
      imgThumb.style.flexShrink = '0';
      if (p.imagen) {
        const img = document.createElement('img');
        img.src = `../assets/productos/${p.imagen}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = () => { imgThumb.textContent = '📦'; };
        imgThumb.appendChild(img);
      } else {
        imgThumb.textContent = '📦';
        imgThumb.style.fontSize = '18px';
      }
      
      const info = document.createElement('span');
      info.innerHTML = `<strong>${p.nombre}</strong> - $${Number(p.precio).toLocaleString('es-CO')} ` +
        `<span class="badge ${p.activo ? 'activo' : 'inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span>`;
      
      left.append(imgThumb, info);
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.alignItems = 'center';
      actions.style.gap = '4px';

      // Botón cambiar imagen
      const btnImagen = document.createElement('button');
      btnImagen.className = 'btn btn-ghost';
      btnImagen.textContent = '📷';
      btnImagen.title = 'Cambiar imagen';
      btnImagen.addEventListener('click', () => cambiarImagenProducto(p));

      const inputPrecio = document.createElement('input');
      inputPrecio.type = 'number';
      inputPrecio.step = '1';
      inputPrecio.min = '0';
      inputPrecio.value = Math.round(Number(p.precio));
      inputPrecio.className = 'price-input';

      const btnGuardar = document.createElement('button');
      btnGuardar.className = 'btn btn-primary';
      btnGuardar.textContent = 'Guardar';
      btnGuardar.addEventListener('click', () => editarPrecioInline(p, inputPrecio));

      const btnToggle = document.createElement('button');
      btnToggle.className = 'btn btn-secondary';
      btnToggle.textContent = p.activo ? 'Desactivar' : 'Activar';
      btnToggle.addEventListener('click', () => toggleProducto(p));

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-danger';
      btnDelete.textContent = 'Eliminar';
      btnDelete.addEventListener('click', () => eliminarProducto(p));

      actions.append(btnImagen, inputPrecio, btnGuardar, btnToggle, btnDelete);
      row.append(left, actions);
      listaProductos.appendChild(row);
    });
  }

  async function seleccionarSeccion(id) {
    seccionSeleccionada = secciones.find((s) => s.id === id) || null;
    if (tituloProductos) tituloProductos.textContent = seccionSeleccionada ? `Productos de ${seccionSeleccionada.nombre}` : 'Productos';
    if (infoSeccion) infoSeccion.textContent = seccionSeleccionada ? (seccionSeleccionada.activo ? 'Activa' : 'Inactiva') : 'Seleccione una sección';
    if (!seccionSeleccionada) return renderProductos([]);
    try {
      const productos = await window.adminApi.listarProductos(seccionSeleccionada.id);
      renderProductos(productos);
    } catch (err) {
      alert('Error cargando productos');
      console.error(err);
    }
  }

  async function toggleSeccion(sec) {
    try {
      const res = await window.adminApi.actualizarSeccion({ id: sec.id, activo: sec.activo ? 0 : 1 });
      if (!res?.success) throw new Error(res?.message || '');
      await cargarSecciones();
    } catch (err) {
      alert('No se pudo actualizar la sección');
      console.error(err);
    }
  }

  async function eliminarSeccion(sec) {
    if (!confirm('Esto eliminará la sección y sus productos. ¿Continuar?')) return;
    try {
      const res = await window.adminApi.eliminarSeccion(sec.id);
      if (!res?.success) throw new Error(res?.message || '');
      await cargarSecciones();
    } catch (err) {
      alert('No se pudo eliminar la sección');
      console.error(err);
    }
  }

  async function crearSeccion() {
    const nombre = seccionNombre.value.trim();
    const imagen = seccionIcono.value.trim();
    if (!nombre) return alert('Ingrese nombre de sección');
    try {
      const res = await window.adminApi.crearSeccion({ nombre, imagen });
      if (!res?.success) throw new Error(res?.message || '');
      seccionNombre.value = '';
      seccionIcono.value = '';
      await cargarSecciones();
    } catch (err) {
      alert('No se pudo crear la sección');
      console.error(err);
    }
  }

  async function crearProducto() {
    if (!seccionSeleccionada) return alert('Seleccione una sección primero');
    const nombre = prodNombre.value.trim();
    const precio = parseFloat(prodPrecio.value || '0');
    const imagen = prodImagen.value.trim();
    if (!nombre) return alert('Ingrese nombre de producto');
    if (Number.isNaN(precio) || precio < 0) return alert('Precio inválido');
    try {
      const res = await window.adminApi.crearProducto({
        nombre,
        precio,
        seccion_id: seccionSeleccionada.id,
        activo: 1,
        imagen,
      });
      if (!res?.success) throw new Error(res?.message || '');
      prodNombre.value = '';
      prodPrecio.value = '';
      prodImagen.value = '';
      if (imgNombreSeleccionado) imgNombreSeleccionado.textContent = '';
      await seleccionarSeccion(seccionSeleccionada.id);
    } catch (err) {
      alert('No se pudo crear el producto');
      console.error(err);
    }
  }

  async function seleccionarImagen() {
    try {
      const res = await window.adminApi.subirImagen();
      if (res.canceled) return;
      if (!res.success) {
        alert(res.message || 'Error al subir imagen');
        return;
      }
      prodImagen.value = res.fileName;
      if (imgNombreSeleccionado) imgNombreSeleccionado.textContent = '✅ ' + res.fileName;
    } catch (err) {
      alert('Error al seleccionar imagen');
      console.error(err);
    }
  }

  async function cambiarImagenProducto(prod) {
    try {
      const res = await window.adminApi.subirImagen();
      if (res.canceled) return;
      if (!res.success) {
        alert(res.message || 'Error al subir imagen');
        return;
      }
      const updateRes = await window.adminApi.actualizarImagen({ id: prod.id, imagen: res.fileName });
      if (!updateRes?.success) throw new Error(updateRes?.message || '');
      await seleccionarSeccion(seccionSeleccionada.id);
    } catch (err) {
      alert('Error al cambiar imagen');
      console.error(err);
    }
  }

  async function editarPrecioInline(prod, inputEl) {
    const val = parseFloat(inputEl.value);
    if (Number.isNaN(val) || val < 0) {
      alert('Precio inválido');
      return;
    }
    inputEl.disabled = true;
    try {
      const res = await window.adminApi.actualizarPrecio({ id: prod.id, precio: val });
      if (!res?.success) throw new Error(res?.message || '');
      await seleccionarSeccion(seccionSeleccionada.id);
    } catch (err) {
      alert('No se pudo actualizar el precio');
      console.error(err);
    } finally {
      inputEl.disabled = false;
    }
  }

  async function toggleProducto(prod) {
    try {
      const res = await window.adminApi.actualizarEstado({ id: prod.id, activo: prod.activo ? 0 : 1 });
      if (!res?.success) throw new Error(res?.message || '');
      await seleccionarSeccion(seccionSeleccionada.id);
    } catch (err) {
      alert('No se pudo actualizar el estado');
      console.error(err);
    }
  }

  async function eliminarProducto(prod) {
    if (!confirm('Eliminar producto?')) return;
    try {
      const res = await window.adminApi.eliminarProducto(prod.id);
      if (!res?.success) throw new Error(res?.message || '');
      await seleccionarSeccion(seccionSeleccionada.id);
    } catch (err) {
      alert('No se pudo eliminar el producto');
      console.error(err);
    }
  }

  async function cargarAnios() {
    try {
      const anios = await window.adminApi.listarAnios();
      renderSelect(selAnio, anios.map((a) => a.anio), 'Año');
      renderSelect(selMes, [], 'Mes');
      renderSelect(selDia, [], 'Día');
      listaJornadas.innerHTML = '';
    } catch (err) {
      alert('No se pudieron cargar los años');
      console.error(err);
    }
  }

  async function cargarMeses(anio) {
    if (!anio) return renderSelect(selMes, [], 'Mes');
    try {
      const meses = await window.adminApi.listarMeses(anio);
      renderSelect(selMes, meses.map((m) => m.mes), 'Mes');
      renderSelect(selDia, [], 'Día');
      listaJornadas.innerHTML = '';
    } catch (err) {
      alert('No se pudieron cargar los meses');
      console.error(err);
    }
  }

  async function cargarDias(anio, mes) {
    if (!anio || !mes) return renderSelect(selDia, [], 'Día');
    try {
      const dias = await window.adminApi.listarDias({ anio, mes });
      renderSelect(selDia, dias.map((d) => d.dia), 'Día');
      listaJornadas.innerHTML = '';
    } catch (err) {
      alert('No se pudieron cargar los días');
      console.error(err);
    }
  }

  async function cargarJornadas(anio, mes, dia) {
    if (!anio || !mes || !dia) {
      listaJornadas.innerHTML = '';
      return;
    }
    try {
      const jornadas = await window.adminApi.listarJornadasPorDia({ anio, mes, dia });
      listaJornadas.innerHTML = '';
      if (!jornadas.length) {
        listaJornadas.textContent = 'Sin jornadas';
        return;
      }
      jornadas.forEach((j) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        const fecha = j.fecha_apertura ? j.fecha_apertura.split(' ')[0] : `${anio}-${mes}-${dia}`;
        row.innerHTML = `<div><strong>${fecha}</strong><br/><span class="muted">Estado: ${j.estado || 'N/A'}</span></div>` +
          `<div><div>Monto inicial: $${Number(j.monto_inicial || 0).toLocaleString('es-CO')}</div>` +
          `<div>Monto final: $${Number(j.total_ventas+j.monto_inicial || 0).toLocaleString('es-CO')}</div>` +
          `<div>Ganancia: $${Number(j.ganancia || 0).toLocaleString('es-CO')}</div></div>`;
        listaJornadas.appendChild(row);
      });
    } catch (err) {
      alert('No se pudieron cargar las jornadas');
      console.error(err);
    }
  }

  function renderSelect(selectEl, items, label) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = label;
    selectEl.appendChild(opt);
    items.forEach((v) => {
      const option = document.createElement('option');
      option.value = v;
      option.textContent = v;
      selectEl.appendChild(option);
    });
  }

  // =====================
  // IMÁGENES DE BASES (colapsable)
  // =====================
  const listaBases = document.getElementById('listaBases');
  const toggleBasesHeader = document.getElementById('toggleBasesHeader');
  const toggleBasesIcon = document.getElementById('toggleBasesIcon');
  let basesVisible = false;

  if (toggleBasesHeader) {
    toggleBasesHeader.addEventListener('click', () => {
      basesVisible = !basesVisible;
      if (listaBases) listaBases.style.display = basesVisible ? 'block' : 'none';
      if (toggleBasesIcon) toggleBasesIcon.textContent = basesVisible ? '▼' : '▶';
      toggleBasesHeader.querySelector('.muted').textContent = basesVisible ? 'Click para cerrar' : 'Click para expandir';
    });
  }

  async function cargarBases() {
    try {
      const bases = await window.adminApi.listarBases();
      renderBases(bases);
    } catch (err) {
      console.error('Error cargando bases:', err);
    }
  }

  function renderBases(bases) {
    if (!listaBases) return;
    listaBases.innerHTML = '';
    bases.forEach((b) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '10px';

      // Thumbnail
      const imgThumb = document.createElement('div');
      imgThumb.style.width = '50px';
      imgThumb.style.height = '50px';
      imgThumb.style.borderRadius = '8px';
      imgThumb.style.overflow = 'hidden';
      imgThumb.style.background = '#f0f0f0';
      imgThumb.style.display = 'flex';
      imgThumb.style.alignItems = 'center';
      imgThumb.style.justifyContent = 'center';
      imgThumb.style.flexShrink = '0';
      
      if (b.imagen) {
        const img = document.createElement('img');
        img.src = `../assets/productos/${b.imagen}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = () => { imgThumb.textContent = '🥤'; };
        imgThumb.appendChild(img);
      } else {
        imgThumb.textContent = '🥤';
        imgThumb.style.fontSize = '24px';
      }

      const info = document.createElement('span');
      info.innerHTML = `<strong>BASE ${b.nombre}</strong>`;
      info.style.flex = '1';

      const btnImagen = document.createElement('button');
      btnImagen.className = 'btn btn-primary';
      btnImagen.textContent = '📷 Cambiar imagen';
      btnImagen.addEventListener('click', () => cambiarImagenBase(b));

      row.append(imgThumb, info, btnImagen);
      listaBases.appendChild(row);
    });
  }

  async function cambiarImagenBase(base) {
    try {
      const res = await window.adminApi.subirImagen();
      if (res.canceled) return;
      if (!res.success) {
        alert(res.message || 'Error al subir imagen');
        return;
      }
      const updateRes = await window.adminApi.actualizarImagenBase({ id: base.id, imagen: res.fileName });
      if (!updateRes?.success) throw new Error(updateRes?.message || '');
      await cargarBases();
    } catch (err) {
      alert('Error al cambiar imagen de base');
      console.error(err);
    }
  }

  // Eventos
  if (btnCrearSeccion) btnCrearSeccion.addEventListener('click', crearSeccion);
  if (btnCrearProducto) btnCrearProducto.addEventListener('click', crearProducto);
  if (btnSeleccionarImagen) btnSeleccionarImagen.addEventListener('click', seleccionarImagen);
  if (selAnio) selAnio.addEventListener('change', (e) => cargarMeses(e.target.value));
  if (selMes) selMes.addEventListener('change', (e) => cargarDias(selAnio.value, e.target.value));
  if (selDia) selDia.addEventListener('change', (e) => cargarJornadas(selAnio.value, selMes.value, e.target.value));

  // Inicializar
  cargarSecciones();
  cargarAnios();
  cargarBases();
});
