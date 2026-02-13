const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (data) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  cerrarApp: () => ipcRenderer.invoke('cerrar-aplicacion'),
});

contextBridge.exposeInMainWorld('caja', {
  jornadaActiva: () => ipcRenderer.invoke('jornada-activa'),
  abrirJornada: (data) => ipcRenderer.invoke('abrir-jornada', data),
  cerrarJornada: () => ipcRenderer.invoke('cerrar-jornada'),
  obtenerVentasJornada: () => ipcRenderer.invoke('obtener-ventas-jornada'),
});

contextBridge.exposeInMainWorld('productos', {
  obtenerSecciones: () => ipcRenderer.invoke('obtener-secciones'),
  obtenerProductos: (seccionId) => ipcRenderer.invoke('obtener-productos', seccionId),
});

contextBridge.exposeInMainWorld('ventas', {
  registrar: (items) => ipcRenderer.invoke('registrar-venta', items),
});

contextBridge.exposeInMainWorld('adminApi', {
  // Secciones
  listarSecciones: () => ipcRenderer.invoke('admin-secciones-listar'),
  crearSeccion: (data) => ipcRenderer.invoke('admin-seccion-crear', data),
  actualizarSeccion: (data) => ipcRenderer.invoke('admin-seccion-actualizar', data),
  eliminarSeccion: (id) => ipcRenderer.invoke('admin-seccion-eliminar', id),

  // Productos
  listarProductos: (seccionId) => ipcRenderer.invoke('admin-productos-listar', seccionId),
  crearProducto: (data) => ipcRenderer.invoke('admin-producto-crear', data),
  actualizarPrecio: (data) => ipcRenderer.invoke('admin-producto-actualizar-precio', data),
  actualizarEstado: (data) => ipcRenderer.invoke('admin-producto-actualizar-estado', data),
  eliminarProducto: (id) => ipcRenderer.invoke('admin-producto-eliminar', id),
  subirImagen: () => ipcRenderer.invoke('admin-subir-imagen'),
  actualizarImagen: (data) => ipcRenderer.invoke('admin-producto-actualizar-imagen', data),

  // Imágenes de bases compartidas
  listarBases: () => ipcRenderer.invoke('admin-bases-listar'),
  actualizarImagenBase: (data) => ipcRenderer.invoke('admin-base-actualizar-imagen', data),

  // Jornadas histórico
  listarAnios: () => ipcRenderer.invoke('admin-jornadas-anios'),
  listarMeses: (anio) => ipcRenderer.invoke('admin-jornadas-meses', anio),
  listarDias: (params) => ipcRenderer.invoke('admin-jornadas-dias', params),
  listarJornadasPorDia: (params) => ipcRenderer.invoke('admin-jornadas-por-dia', params),
});

contextBridge.exposeInMainWorld('imagenes', {
  obtenerImagenBase: (nombre) => ipcRenderer.invoke('obtener-imagen-base', nombre),
});
