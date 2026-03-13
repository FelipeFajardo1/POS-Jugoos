let factura = [];
let seccionActual = null;
let domicilioActivo = false;
let desechableActivo = false;
let modalBase = null;
let modalBaseProducto = null;
let modalFrutas = null;
let modalFrutasProducto = null;
let frutasSeleccionadas = [];
let frutasRequeridas = 0;
let modalParfait = null;
let modalParfaitProducto = null;
let parfaitSeleccionadas = [];

const FRUTAS_DISPONIBLES = [
  'BANANO', 'PIÑA', 'SANDIA', 'FRESA', 'MELON', 'MORA', 'PAPAYA', 'MARACUYA',
  'KIWI', 'LULO', 'LIMON', 'NARANJA', 'MANZA VERDE', 'GUANABANA', 'ARANDANO', 'UVA', 'MANDARINA', 'MANGO'
];

const FRUTAS_PARFAIT = [
  'BANANO', 'MANGO', 'PIÑA', 'MELON', 'PAPAYA', 'MANZANA VERDE', 'MANZANA ROJA'
];

window.addEventListener('DOMContentLoaded', async () => {
  // Seguridad básica
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || user.rol !== 'EMPLEADO') {
    window.location.replace('../index.html');
    return;
  }

  // Cargar secciones al iniciar
  await cargarSecciones();

  // Botones especiales
  document.getElementById('btnDomicilio').addEventListener('click', toggleDomicilio);
  document.getElementById('btnDesechable').addEventListener('click', toggleDesechable);

  // Modal selección base Pura Vida
  initModalBase();
  // Modal selección frutas
  initModalFrutas();
  // Modal selección frutas parfait
  initModalParfait();

  // Botón cobrar
  document
    .getElementById('cobrarBtn')
    .addEventListener('click', cobrarVenta);
});

/**
 * Cargar secciones y mostrar botones con imágenes
 */
async function cargarSecciones() {
  try {
    const secciones = await window.productos.obtenerSecciones();
    const contenedor = document.getElementById('secciones');
    contenedor.innerHTML = '';

    if (!secciones || secciones.length === 0) {
      contenedor.innerHTML = '<p>No hay secciones disponibles</p>';
      return;
    }

    secciones.forEach(sec => {
      const btn = document.createElement('button');
      btn.classList.add('seccion-btn');
      btn.innerHTML = `
        <span class="seccion-icon">${sec.imagen || '🛍️'}</span>
        <span class="seccion-nombre">${sec.nombre}</span>
      `;
      btn.onclick = () => cargarProductos(sec.id, sec.nombre);
      contenedor.appendChild(btn);
    });
  } catch (err) {
    console.error('Error cargando secciones:', err);
  }
}

/**
 * Cargar productos por sección
 */
async function cargarProductos(seccionId, nombreSeccion) {
  try {
    seccionActual = nombreSeccion;
    const productos = await window.productos.obtenerProductos(seccionId);
    const contenedor = document.getElementById('listaProductos');
    contenedor.innerHTML = '';

    if (!productos || productos.length === 0) {
      contenedor.innerHTML = '<div class="sin-productos">No hay productos en esta sección</div>';
      return;
    }

    const productos16 = productos.filter((p) => /16\s*Oz/i.test(p.nombre));
    const productos22 = productos.filter((p) => /22\s*Oz/i.test(p.nombre));
    const otros = productos.filter((p) => !/16\s*Oz|22\s*Oz/i.test(p.nombre));

    const renderGrupo = (titulo, lista) => {
      if (!lista.length) return;
      const bloque = document.createElement('div');
      bloque.className = 'grupo-productos';
      const h3 = document.createElement('h3');
      h3.className = 'grupo-titulo';
      h3.textContent = titulo;
      bloque.appendChild(h3);

      const grid = document.createElement('div');
      grid.className = 'grid-productos';
      const bases = lista.filter((p) => /^BASE/i.test(p.nombre)).sort((a, b) => a.precio - b.precio);
      const normales = lista.filter((p) => !/^BASE/i.test(p.nombre));

      const renderCard = async (p, isBase = false) => {
        const div = document.createElement('div');
        div.className = `producto${isBase ? ' producto-base' : ''}`;
        
        // Imagen del producto - para bases usar imagen compartida
        let imgSrc = null;
        if (isBase) {
          // Extraer tipo de base: "BASE AGUA 16 Oz" -> "AGUA"
          const match = p.nombre.match(/^BASE\s+(\w+)/i);
          if (match) {
            const tipoBase = match[1].toUpperCase();
            const imgBase = await window.imagenes.obtenerImagenBase(tipoBase);
            if (imgBase) {
              imgSrc = `../assets/productos/${imgBase}`;
            }
          }
        } else if (p.imagen) {
          imgSrc = `../assets/productos/${p.imagen}`;
        }
        
        const imgHTML = imgSrc ? `<img src="${imgSrc}" class="producto-img" onerror="this.style.display='none'" />` : '';
        
        div.innerHTML = `
          ${imgHTML}
          <strong>${p.nombre}</strong>
          <div class="precio">$${p.precio.toLocaleString('es-CO')}</div>
        `;
        div.onclick = () => agregarProducto(p);
        grid.appendChild(div);
      };

      normales.forEach((p) => renderCard(p, false));
      bases.forEach((p) => renderCard(p, true));
      bloque.appendChild(grid);
      contenedor.appendChild(bloque);
    };

    // Agrupación especial para PA ACOMPAÑAR
    if (/PA ACOMPA/i.test(nombreSeccion)) {
      const sandwiches = productos.filter((p) => /SANDWICH/i.test(p.nombre));
      const snacks = productos.filter((p) => !/SANDWICH/i.test(p.nombre));
      renderGrupo('Snacks', snacks);
      renderGrupo('Sandwiches 🥪', sandwiches);
    // Agrupación especial para NUEVO PREMIUM
    } else if (/NUEVO PREMIUM/i.test(nombreSeccion)) {
      const nevados = productos.filter((p) => /NEVADO/i.test(p.nombre));
      const bowls = productos.filter((p) => /BOWL/i.test(p.nombre));
      const sodas = productos.filter((p) => /SODA/i.test(p.nombre));
      const otrosPremium = productos.filter((p) => !/NEVADO|BOWL|SODA/i.test(p.nombre));
      renderGrupo('Premium ✨', otrosPremium);
      renderGrupo('Nevados 🍦', nevados);
      renderGrupo('Sodas 🥤', sodas);
      renderGrupo('Bowls 🥣', bowls);
    } else {
      renderGrupo('16 Oz', productos16);
      renderGrupo('22 Oz', productos22);
      renderGrupo('Otros', otros);
    }
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

/**
 * Agregar producto a factura
 */
function agregarProducto(producto) {
  let nombreFactura = producto.nombre;

  if (/PURA VIDA/i.test(producto.nombre)) {
    modalBaseProducto = producto;
    abrirModalBase();
    return;
  }

  const matchFrutas = producto.nombre.match(/^(\d+)\s*FRUTA/i);
  if (matchFrutas) {
    frutasRequeridas = parseInt(matchFrutas[1], 10) || 1;
    modalFrutasProducto = producto;
    frutasSeleccionadas = [];
    abrirModalFrutas();
    return;
  }

  if (/PARFAIT/i.test(producto.nombre)) {
    modalParfaitProducto = producto;
    parfaitSeleccionadas = [];
    abrirModalParfait();
    return;
  }

  // Ya no agrupamos los productos automáticamente. 
  // Siempre agregamos como un ítem nuevo (a menos que usen los botones + / - visualmente)
  factura.push({
    id: producto.id,
    nombre: nombreFactura,
    precio: producto.precio,
    cantidad: 1,
    uuid: Date.now() + Math.random() // Unique ID
  });

  renderFactura();
}

function agregarProductoConBase(producto, baseElegida) {
  const nombreFactura = `${producto.nombre} (${baseElegida})`;

  factura.push({
    id: producto.id,
    nombre: nombreFactura,
    precio: producto.precio,
    cantidad: 1,
    uuid: Date.now() + Math.random() // Unique ID
  });

  renderFactura();
}

function initModalBase() {
  const overlay = document.createElement('div');
  overlay.id = 'modalBase';
  overlay.className = 'modal-base hidden';
  overlay.innerHTML = `
    <div class="modal-base-content">
      <h3>Elige la base</h3>
      <div class="modal-base-buttons">
        <button id="btnBaseNaranja" class="btn-base naranja">Naranja</button>
        <button id="btnBasePapaya" class="btn-base papaya">Papaya</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  modalBase = overlay;

  document.getElementById('btnBaseNaranja').addEventListener('click', () => {
    if (modalBaseProducto) agregarProductoConBase(modalBaseProducto, 'Naranja');
    cerrarModalBase();
  });
  document.getElementById('btnBasePapaya').addEventListener('click', () => {
    if (modalBaseProducto) agregarProductoConBase(modalBaseProducto, 'Papaya');
    cerrarModalBase();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarModalBase();
  });
}

function initModalFrutas() {
  const overlay = document.createElement('div');
  overlay.id = 'modalFrutas';
  overlay.className = 'modal-frutas hidden';
  overlay.innerHTML = `
    <div class="modal-frutas-content">
      <h3>Elige las frutas</h3>
      <p id="frutasIndicador" class="frutas-indicador"></p>
      <div class="modal-frutas-grid" id="frutasGrid"></div>
      <div class="modal-frutas-actions">
        <button id="btnCancelarFrutas" class="btn-base papaya">Cancelar</button>
        <button id="btnConfirmarFrutas" class="btn-base naranja" disabled>Agregar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  modalFrutas = overlay;

  const grid = document.getElementById('frutasGrid');
  FRUTAS_DISPONIBLES.forEach((f) => {
    const btn = document.createElement('button');
    btn.className = 'btn-fruta';
    btn.textContent = f;
    btn.addEventListener('click', () => toggleFruta(f, btn));
    grid.appendChild(btn);
  });

  document.getElementById('btnCancelarFrutas').addEventListener('click', () => {
    cerrarModalFrutas();
  });

  document.getElementById('btnConfirmarFrutas').addEventListener('click', () => {
    if (frutasSeleccionadas.length === frutasRequeridas && modalFrutasProducto) {
      const nombreFactura = `${modalFrutasProducto.nombre} (${frutasSeleccionadas.join(', ')})`;
      const item = factura.find(p => p.id === modalFrutasProducto.id && p.nombre === nombreFactura);
      // Evitar que se sumen:
      factura.push({
        id: modalFrutasProducto.id,
        nombre: nombreFactura,
        precio: modalFrutasProducto.precio,
        cantidad: 1,
        uuid: Date.now() + Math.random() // Unique ID to avoid grouping
      });
      renderFactura();
    }
    cerrarModalFrutas();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarModalFrutas();
  });
}

function toggleFruta(fruta, btn) {
  const idx = frutasSeleccionadas.indexOf(fruta);
  if (idx >= 0) {
    frutasSeleccionadas.splice(idx, 1);
    btn.classList.remove('sel');
  } else {
    if (frutasSeleccionadas.length >= frutasRequeridas) return;
    frutasSeleccionadas.push(fruta);
    btn.classList.add('sel');
  }
  actualizarIndicadorFrutas();
}

function actualizarIndicadorFrutas() {
  const indicador = document.getElementById('frutasIndicador');
  const btnConfirmar = document.getElementById('btnConfirmarFrutas');
  indicador.textContent = `Selecciona ${frutasSeleccionadas.length}/${frutasRequeridas} frutas`;
  btnConfirmar.disabled = frutasSeleccionadas.length !== frutasRequeridas;
}

function abrirModalFrutas() {
  if (!modalFrutas) return;
  // reset selección visual
  frutasSeleccionadas = [];
  document.querySelectorAll('.btn-fruta').forEach((b) => b.classList.remove('sel'));
  actualizarIndicadorFrutas();
  modalFrutas.classList.remove('hidden');
}

function cerrarModalFrutas() {
  modalFrutasProducto = null;
  frutasSeleccionadas = [];
  if (modalFrutas) modalFrutas.classList.add('hidden');
}

/**
 * Modal Parfait
 */
function initModalParfait() {
  const overlay = document.createElement('div');
  overlay.id = 'modalParfaitOverlay';
  overlay.className = 'modal-frutas hidden';

  const content = document.createElement('div');
  content.className = 'modal-frutas-content';

  const titulo = document.createElement('h3');
  titulo.textContent = 'Selecciona frutas para el Parfait';
  content.appendChild(titulo);

  const indicador = document.createElement('p');
  indicador.id = 'parfaitIndicador';
  indicador.className = 'frutas-indicador';
  indicador.textContent = 'Selecciona 0/2 frutas';
  content.appendChild(indicador);

  const grid = document.createElement('div');
  grid.className = 'modal-frutas-grid';
  FRUTAS_PARFAIT.forEach((fruta) => {
    const btn = document.createElement('button');
    btn.className = 'btn-fruta';
    btn.textContent = fruta;
    btn.onclick = () => toggleParfait(fruta, btn);
    grid.appendChild(btn);
  });
  content.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'modal-frutas-actions';

  const btnCancelar = document.createElement('button');
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.className = 'btn-base papaya';
  btnCancelar.onclick = () => cerrarModalParfait();
  actions.appendChild(btnCancelar);

  const btnConfirmar = document.createElement('button');
  btnConfirmar.id = 'btnConfirmarParfait';
  btnConfirmar.textContent = 'Agregar';
  btnConfirmar.className = 'btn-base naranja';
  btnConfirmar.disabled = true;
  actions.appendChild(btnConfirmar);
  content.appendChild(actions);

  overlay.appendChild(content);
  document.body.appendChild(overlay);
  modalParfait = overlay;

  btnConfirmar.addEventListener('click', () => {
    if (parfaitSeleccionadas.length === 2 && modalParfaitProducto) {
      const descripcion = parfaitSeleccionadas.join(' + ');
      const nombreFactura = `${modalParfaitProducto.nombre} (${descripcion})`;
      const item = factura.find(p => p.id === modalParfaitProducto.id && p.nombre === nombreFactura);
      factura.push({
        id: modalParfaitProducto.id,
        nombre: nombreFactura,
        precio: modalParfaitProducto.precio,
        cantidad: 1,
        uuid: Date.now() + Math.random() // Unique ID to avoid grouping
      });
      renderFactura();
    }
    cerrarModalParfait();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarModalParfait();
  });
}

function toggleParfait(fruta, btn) {
  const idx = parfaitSeleccionadas.indexOf(fruta);
  if (idx >= 0) {
    parfaitSeleccionadas.splice(idx, 1);
    btn.classList.remove('sel');
  } else {
    if (parfaitSeleccionadas.length >= 2) return;
    parfaitSeleccionadas.push(fruta);
    btn.classList.add('sel');
  }
  actualizarIndicadorParfait();
}

function actualizarIndicadorParfait() {
  const indicador = document.getElementById('parfaitIndicador');
  const btnConfirmar = document.getElementById('btnConfirmarParfait');
  indicador.textContent = `Selecciona ${parfaitSeleccionadas.length}/2 frutas`;
  btnConfirmar.disabled = parfaitSeleccionadas.length !== 2;
}

function abrirModalParfait() {
  if (!modalParfait) return;
  parfaitSeleccionadas = [];
  modalParfait.querySelectorAll('.btn-fruta').forEach((b) => b.classList.remove('sel'));
  actualizarIndicadorParfait();
  modalParfait.classList.remove('hidden');
}

function cerrarModalParfait() {
  modalParfaitProducto = null;
  parfaitSeleccionadas = [];
  if (modalParfait) modalParfait.classList.add('hidden');
}

function abrirModalBase() {
  if (modalBase) {
    modalBase.classList.remove('hidden');
  }
}

function cerrarModalBase() {
  modalBaseProducto = null;
  if (modalBase) {
    modalBase.classList.add('hidden');
  }
}

/**
 * Toggle domicilio
 */
function toggleDomicilio() {
  domicilioActivo = !domicilioActivo;
  const btn = document.getElementById('btnDomicilio');
  btn.classList.toggle('activo', domicilioActivo);
  renderFactura();
}

/**
 * Toggle desechable
 */
function toggleDesechable() {
  desechableActivo = !desechableActivo;
  const btn = document.getElementById('btnDesechable');
  btn.classList.toggle('activo', desechableActivo);
  renderFactura();
}

/**
 * Pintar factura con edición de cantidad
 */
function renderFactura() {
  const contenedor = document.getElementById('factura');
  contenedor.innerHTML = '';

  let total = 0;

  factura.forEach((p, index) => {
    total += p.precio * p.cantidad;

    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-factura';
    itemDiv.innerHTML = `
      <div class="item-header">
        <strong>${p.nombre}</strong>
        <button class="btn-eliminar" onclick="eliminarProducto(${index})">✕</button>
      </div>
      <div class="item-details">
        <div class="cantidad-control">
          <label>Cantidad:</label>
          <div class="cantidad-input-group">
            <button class="btn-cantidad btn-menos" onclick="decrementarCantidad(${index})">−</button>
            <span class="input-cantidad">${p.cantidad}</span>
            <button class="btn-cantidad btn-mas" onclick="incrementarCantidad(${index})">+</button>
          </div>
        </div>
        </div>
        <div class="precio-item">
          <span>Precio: $${p.precio.toLocaleString('es-CO')}</span>
          <span class="subtotal">Subtotal: $${(p.precio * p.cantidad).toLocaleString('es-CO')}</span>
        </div>
      </div>
    `;
    contenedor.appendChild(itemDiv);
  });

  // Agregar cargos adicionales a la factura visual
  if (domicilioActivo) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-factura item-cargo';
    itemDiv.innerHTML = `
      <div class="item-header">
        <strong>🛵 Domicilio</strong>
      </div>
      <div class="precio-item">
        <span class="subtotal">+$4.000</span>
      </div>
    `;
    contenedor.appendChild(itemDiv);
    total += 4000;
  }
  
  if (desechableActivo) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-factura item-cargo';
    itemDiv.innerHTML = `
      <div class="item-header">
        <strong>🥤 Desechable</strong>
      </div>
      <div class="precio-item">
        <span class="subtotal">+$1.000</span>
      </div>
    `;
    contenedor.appendChild(itemDiv);
    total += 1000;
  }

  document.getElementById('total').innerText = total.toLocaleString('es-CO');
}

/**
 * Incrementar cantidad
 */
function incrementarCantidad(index) {
  factura[index].cantidad++;
  renderFactura();
}

/**
 * Decrementar cantidad
 */
function decrementarCantidad(index) {
  if (factura[index].cantidad > 1) {
    factura[index].cantidad--;
    renderFactura();
  }
}

/**
 * Eliminar producto de factura
 */
function eliminarProducto(index) {
  factura.splice(index, 1);
  renderFactura();
}

/**
 * Cobrar venta
 */
async function cobrarVenta() {
  if (factura.length === 0) {
    alert('No hay productos en la factura');
    return;
  }

  let itemsParaRegistrar = [...factura];

  if (domicilioActivo) {
    itemsParaRegistrar.push({ id: null, nombre: 'Domicilio', precio: 4000, cantidad: 1 });
  }
  if (desechableActivo) {
    itemsParaRegistrar.push({ id: null, nombre: 'Desechable', precio: 1000, cantidad: 1 });
  }

  try {
    const res = await window.ventas.registrar({ items: itemsParaRegistrar });

    if (!res.success) {
      alert(res.message || 'Error al registrar venta');
      return;
    }

    // Enviar a imprimir (no bloquea si falla, solo intentará imprimir al default)
    try {
      const printRes = await window.ventas.imprimirFactura({
        items: itemsParaRegistrar, // enviamos con recargos
        total: res.total,
        ventaId: res.ventaId
      });
      if (!printRes.success) {
        console.warn('Alerta de impresión:', printRes.message);
      }
    } catch (printErr) {
      console.error('Error al intentar imprimir:', printErr);
    }

    alert(`Venta registrada correctamente\nTotal: $${res.total.toLocaleString('es-CO')}`);

    // Limpiar factura
    factura = [];

    // Resetear domicilio y desechable
    if (domicilioActivo) {
      domicilioActivo = false;
      document.getElementById('btnDomicilio').classList.remove('activo');
    }
    if (desechableActivo) {
      desechableActivo = false;
      document.getElementById('btnDesechable').classList.remove('activo');
    }

    renderFactura();
  } catch (err) {
    console.error(err);
    alert('Error al cobrar venta');
  }
}
