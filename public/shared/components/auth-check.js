/**
 * Auth Check Utility - Shared authentication checker
 * Summa Summarum platform
 */

class AuthCheck {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<Object|null>} User data if authenticated, null otherwise
   */
  async checkAuthentication() {
    try {
      const response = await fetch('/api/users/current', {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      this.currentUser = await response.json();
      return this.currentUser;
    } catch (error) {
      console.error('Greška pri provjeri autentifikacije:', error);
      return null;
    }
  }

  /**
   * Check if user has specific role
   * @param {string} requiredRole - Required role to check
   * @returns {boolean} True if user has the role
   */
  hasRole(requiredRole) {
    return this.currentUser && this.currentUser.role === requiredRole;
  }

  /**
   * Redirect to login if not authenticated
   * @param {string} redirectUrl - URL to redirect after login
   */
  async requireAuth(redirectUrl = null) {
    const user = await this.checkAuthentication();
    if (!user) {
      const redirect = redirectUrl || window.location.href;
      window.location.href = `/shared/login.html?redirect=${encodeURIComponent(
        redirect
      )}`;
      return false;
    }
    return true;
  }

  /**
   * Require specific role and redirect if not authorized
   * @param {string} requiredRole - Required role
   * @param {string} redirectUrl - URL to redirect if unauthorized
   */
  async requireRole(requiredRole, redirectUrl = '/shared/dashboard.html') {
    const user = await this.checkAuthentication();
    if (!user) {
      await this.requireAuth();
      return false;
    }

    if (!this.hasRole(requiredRole)) {
      window.location.href = redirectUrl;
      return false;
    }

    return true;
  }

  /**
   * Get current authenticated user
   * @returns {Object|null} Current user data
   */
  getCurrentUser() {
    return this.currentUser;
  }
}

// Create global instance
window.authCheck = new AuthCheck();
