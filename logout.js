window.logout = async () => {
  // Limpiar sesión local
  localStorage.removeItem('user');
  sessionStorage.clear();

  try {
    // Usar IPC para que el main process maneje el logout
    await window.api.logout();
  } catch (err) {
    console.error('Error en logout:', err);
    // Fallback si IPC falla
    window.location.href = './index.html';
  }
};
