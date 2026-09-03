/**
 * Módulo de Autenticación, Hashing y Políticas de Roles
 */
const AuthModule = (() => {
  let activeUser = null;

  const login = async (username, password) => {
    const db = StorageModule.getData();
    if (!db) return { success: false, message: 'Error en la base de datos' };

    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (!user) return { success: false, message: 'Usuario o contraseña inválidos' };

    const computedHash = await StorageModule.hashWithSalt(password, user.salt);
    if (computedHash === user.passwordHash) {
      activeUser = { id: user.id, username: user.username, role: user.role, name: user.name };
      
      // Guardar sesión protegida
      const sessionData = btoa(JSON.stringify(activeUser));
      localStorage.setItem(StorageModule.SESSION_KEY, sessionData);

      return { success: true, user: activeUser };
    }

    return { success: false, message: 'Usuario o contraseña inválidos' };
  };

  const logout = () => {
    activeUser = null;
    localStorage.removeItem(StorageModule.SESSION_KEY);
  };

  const getCurrentUser = () => {
    if (!activeUser) {
      const raw = localStorage.getItem(StorageModule.SESSION_KEY);
      if (raw) {
        try { activeUser = JSON.parse(atob(raw)); } catch (e) { activeUser = null; }
      }
    }
    return activeUser;
  };

  const hasPermission = (viewName) => {
    const user = getCurrentUser();
    if (!user) return false;

    const matrix = {
      admin: ['panel', 'mesas', 'reservas', 'pedidos', 'despachos', 'usuarios'],
      mesero: ['mesas', 'reservas', 'pedidos', 'despachos'],
      cocina: ['cocina'],
      despacho: ['despachos']
    };

    return matrix[user.role] ? matrix[user.role].includes(viewName) : false;
  };

  return { login, logout, getCurrentUser, hasPermission };
})();