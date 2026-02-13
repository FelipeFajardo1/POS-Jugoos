window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.login-btn');
  const usuarioInput = document.getElementById('usuario');
  const passwordInput = document.getElementById('password');

  // Limpiar y resetear inputs
  if (usuarioInput) {
    usuarioInput.value = '';
    usuarioInput.disabled = false;
  }
  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.disabled = false;
  }

  if (!btn) return;

  // Solo agregar listener si no existe (prevenir duplicados)
  const handleLogin = async (e) => {
    e.preventDefault();
    
    const usuario = usuarioInput.value.trim();
    const password = passwordInput.value.trim();

    if (!usuario || !password) {
      alert('Complete todos los campos');
      return;
    }

    if (!window.api || !window.api.login) {
      alert('Sistema no listo, intente de nuevo');
      return;
    }

    // Deshabilitar mientras se procesa
    btn.disabled = true;
    usuarioInput.disabled = true;
    passwordInput.disabled = true;

    try {
      const response = await window.api.login({ usuario, password });

      if (!response.success) {
        alert(response.message);
        btn.disabled = false;
        usuarioInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }

      // Guardar sesión completa
      localStorage.setItem('user', JSON.stringify(response.user));

      // El backend decide la vista
      window.location.replace(`views/${response.vista}`);
    } catch (err) {
      console.error(err);
      alert('Error inesperado al iniciar sesión');
      btn.disabled = false;
      usuarioInput.disabled = false;
      passwordInput.disabled = false;
    }
  };

  btn.removeEventListener('click', handleLogin);
  btn.addEventListener('click', handleLogin);
});
