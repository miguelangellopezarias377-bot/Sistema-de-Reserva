/**
 * Controlador Principal y Bootstrap de Eventos Globales
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Inicialización Segura
  await StorageModule.initStorage();

  const loginContainer = document.getElementById('login-container');
  const appContainer = document.getElementById('app-container');
  const loginForm = document.getElementById('login-form');
  const btnLogout = document.getElementById('btn-logout');

  // Menú Responsivo Móvil
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');

  const toggleMobileSidebar = (open) => {
    if (open) {
      sidebar.classList.add('open');
      overlay.classList.add('active');
    } else {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    }
  };

  mobileBtn?.addEventListener('click', () => toggleMobileSidebar(true));
  closeSidebarBtn?.addEventListener('click', () => toggleMobileSidebar(false));
  overlay?.addEventListener('click', () => toggleMobileSidebar(false));

  // Control de Sesión Activa
  const checkSession = () => {
    const user = AuthModule.getCurrentUser();
    if (user) {
      loginContainer.classList.add('hidden');
      appContainer.classList.remove('hidden');

      document.getElementById('user-display-name').textContent = user.name;
      document.getElementById('user-role-badge').textContent = user.role.toUpperCase();

      UIModule.renderSidebar();

      // Rutas por defecto según Rol
      const defaultView = user.role === 'cocina' ? 'cocina' : (user.role === 'despacho' ? 'despachos' : 'panel');
      UIModule.loadView(defaultView);
    } else {
      loginContainer.classList.remove('hidden');
      appContainer.classList.add('hidden');
    }
  };

  // Evento Submit de Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    const res = await AuthModule.login(userVal, passVal);
    if (res.success) {
      errorEl.classList.add('hidden');
      checkSession();
    } else {
      errorEl.textContent = res.message;
      errorEl.classList.remove('hidden');
    }
  });

  // Logout
  btnLogout.addEventListener('click', () => {
    AuthModule.logout();
    checkSession();
  });

  // Navegación por Menú Lateral
  document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (item) {
      const view = item.getAttribute('data-view');
      UIModule.loadView(view);
      toggleMobileSidebar(false);
    }
  });

  // Modal Close
  document.getElementById('modal-close-btn').addEventListener('click', UIModule.closeModal);

  // Inicialización
  checkSession();
});