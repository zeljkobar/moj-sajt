const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');

// Middleware za provjeru pretplatnog statusa
const subscriptionMiddleware = async (req, res, next) => {
  try {
    // Provjeri da li je korisnik autentifikovan
    if (!req.session || !req.session.user) {
      return next(); // Prepušta auth middleware-u da se pozabavi ovim
    }

    const userId = req.session.user.id;

    // Dohvati status pretplate korisnika
    const userQuery = `
      SELECT
        subscription_status,
        trial_end_date,
        subscription_end_date,
        created_by_admin
      FROM users
      WHERE id = ?
    `;

    const users = await executeQuery(userQuery, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ msg: 'Korisnik nije pronađen' });
    }

    const user = users[0];
    req.user = { ...req.session.user, ...user };

    // Provjeri status pretplate
    const subscriptionStatus = await checkSubscriptionStatus(user);

    console.log(
      `[DEBUG] User: ${user.username}, DB Status: ${user.subscription_status}, Calculated Status: ${subscriptionStatus}`
    );

    // Ako je gratis ili kreiran od admin-a, dozvoli pristup
    if (user.subscription_status === 'gratis' || user.created_by_admin) {
      req.subscriptionStatus = 'active';
      return next();
    }

    // Za ostale status-e, provjeri uslove
    switch (subscriptionStatus) {
      case 'active':
        req.subscriptionStatus = 'active';
        return next();

      case 'trial_expired':
        console.log(
          `[DEBUG] Calling handleTrialExpired for user: ${user.username}`
        );
        await handleTrialExpired(req, res, user);
        return;

      case 'subscription_expired':
        console.log(
          `[DEBUG] Calling handleSubscriptionExpired for user: ${user.username}`
        );
        await handleSubscriptionExpired(req, res, user);
        return;

      case 'suspended':
        console.log(
          `[DEBUG] Calling handleSuspended for user: ${user.username}`
        );
        await handleSuspended(req, res, user);
        return;

      default:
        req.subscriptionStatus = 'trial';
        return next();
    }
  } catch (error) {
    console.error('Greška u subscription middleware-u:', error);
    return res.status(500).json({ msg: 'Interna greška servera' });
  }
};

// Funkcija za provjeru statusa pretplate
async function checkSubscriptionStatus(user) {
  const now = new Date();

  switch (user.subscription_status) {
    case 'trial':
      if (user.trial_end_date && new Date(user.trial_end_date) < now) {
        return 'trial_expired';
      }
      return 'trial';

    case 'active':
      if (
        user.subscription_end_date &&
        new Date(user.subscription_end_date) < now
      ) {
        return 'subscription_expired';
      }
      return 'active';

    case 'expired':
      return 'subscription_expired';

    case 'suspended':
      return 'suspended';

    case 'gratis':
      return 'active';

    default:
      return 'trial';
  }
}

// Handler za istekli trial period
async function handleTrialExpired(req, res, user) {
  // Označi kao expired u bazi
  await executeQuery('UPDATE users SET subscription_status = ? WHERE id = ?', [
    'expired',
    user.id,
  ]);

  // Za API pozive, vrati JSON
  if (isApiRequest(req)) {
    return res.status(402).json({
      msg: 'Probni period je istekao',
      action: 'upgrade_required',
      redirect: '/pretplata',
    });
  }

  // Za browser zahtjeve, prikaži account-suspended stranicu
  const suspendedPath = path.join(
    __dirname,
    '..',
    '..',
    'public',
    'account-suspended.html'
  );

  if (fs.existsSync(suspendedPath)) {
    // Add query parameter to distinguish trial expiry
    return res.redirect('/account-suspended?reason=trial_expired');
  }

  // Fallback redirect ako stranica ne postoji
  return res.redirect('/pretplata?reason=trial_expired');
}

// Handler za istekla pretplata
async function handleSubscriptionExpired(req, res, user) {
  // Za API pozive, vrati JSON
  if (isApiRequest(req)) {
    return res.status(402).json({
      msg: 'Pretplata je istekla',
      action: 'renewal_required',
      redirect: '/pretplata',
    });
  }

  // Za browser zahtjeve, prikaži account-suspended stranicu
  const suspendedPath = path.join(
    __dirname,
    '..',
    '..',
    'public',
    'account-suspended.html'
  );

  if (fs.existsSync(suspendedPath)) {
    // Add query parameter to distinguish subscription expiry
    return res.redirect('/account-suspended?reason=subscription_expired');
  }

  // Fallback redirect ako stranica ne postoji
  return res.redirect('/pretplata?reason=subscription_expired');
}

// Handler za suspendovanog korisnika
async function handleSuspended(req, res, user) {
  // Za API pozive, vrati JSON
  if (isApiRequest(req)) {
    return res.status(403).json({
      msg: 'Vaš račun je suspendovan',
      action: 'contact_support',
    });
  }

  // Za browser zahtjeve, prikaži stranicu sa porukom
  const suspendedPath = path.join(
    __dirname,
    '..',
    '..',
    'public',
    'account-suspended.html'
  );

  if (fs.existsSync(suspendedPath)) {
    return res.status(200).sendFile(suspendedPath);
  }

  // Fallback poruka
  return res.status(403).send(`
    <!DOCTYPE html>
    <html lang="sr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Račun suspendovan | Summa Summarum</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
      <div class="container mt-5">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <div class="card shadow">
              <div class="card-body text-center">
                <h2 class="text-warning mb-3">⚠️ Račun suspendovan</h2>
                <p class="mb-4">Vaš račun je privremeno suspendovan od strane administratora.</p>
                <p>Za više informacija kontaktirajte podršku:</p>
                <a href="mailto:podrska@summasummarum.me" class="btn btn-primary">Kontaktirajte podršku</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
}

// Pomoćna funkcija za provjeru da li je API zahtjev
function isApiRequest(req) {
  return (
    req.path.startsWith('/api/') ||
    req.headers['content-type'] === 'application/json' ||
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    (req.headers.accept && req.headers.accept.includes('application/json'))
  );
}

// Middleware samo za provjeru bez blokiranja (za dashboard itd.)
const subscriptionCheckMiddleware = async (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      req.subscriptionStatus = 'not_logged_in';
      return next();
    }

    const userId = req.session.user.id;
    const userQuery = `
      SELECT
        subscription_status,
        trial_end_date,
        subscription_end_date,
        created_by_admin
      FROM users
      WHERE id = ?
    `;

    const users = await executeQuery(userQuery, [userId]);
    req.user = { ...req.session.user, ...user };
    req.subscriptionStatus = await checkSubscriptionStatus(user);

    next();
  } catch (error) {
    console.error('Greška u subscription check middleware-u:', error);
    req.subscriptionStatus = 'error';
    next();
  }
};

/**
 * Middleware koji zahteva aktivnu pretplatu
 * Koristi se za premium funkcionalnosti
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    // Admin uvek ima pristup
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Prijava je potrebna' });
    }

    const userId = req.session.user.id;
    const users = await executeQuery(
      'SELECT subscription_status, created_by_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    const user = users[0];
    const status = await checkSubscriptionStatus(user);

    if (['active', 'gratis'].includes(status) || user.created_by_admin) {
      return next();
    } else {
      return res.status(403).json({
        error: 'Aktivna pretplata je potrebna',
        current_status: status,
        message: 'Ova funkcionalnost zahteva aktivnu pretplatu.',
      });
    }
  } catch (error) {
    console.error('Greška u requireActiveSubscription middleware:', error);
    return res.status(500).json({ error: 'Greška pri proveri pretplate' });
  }
};

/**
 * Middleware koji zahteva trial ili bolji status
 * Koristi se za basic funkcionalnosti
 */
const requireTrialOrBetter = async (req, res, next) => {
  try {
    // Admin uvek ima pristup
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Prijava je potrebna' });
    }

    const userId = req.session.user.id;
    const users = await executeQuery(
      'SELECT subscription_status, created_by_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    const user = users[0];
    const status = await checkSubscriptionStatus(user);

    if (
      ['active', 'trial_active', 'gratis'].includes(status) ||
      user.created_by_admin
    ) {
      return next();
    } else {
      return res.status(403).json({
        error: 'Pretplata je potrebna',
        current_status: status,
        message:
          'Ova funkcionalnost zahteva aktivnu pretplatu ili probni period.',
      });
    }
  } catch (error) {
    console.error('Greška u requireTrialOrBetter middleware:', error);
    return res.status(500).json({ error: 'Greška pri proveri pretplate' });
  }
};

/**
 * Pomoćna funkcija za dobijanje detaljnih informacija o pretplati
 */
const getSubscriptionInfo = async userId => {
  try {
    const [users] = await executeQuery(
      `SELECT 
        subscription_status, 
        trial_end_date, 
        subscription_end_date,
        last_payment,
        created_by_admin
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const now = new Date();

    let daysRemaining = null;
    let statusInfo = {};

    switch (user.subscription_status) {
      case 'trial':
        if (user.trial_end_date) {
          const trialEnd = new Date(user.trial_end_date);
          daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          statusInfo = {
            type: 'trial',
            end_date: user.trial_end_date,
            days_remaining: Math.max(0, daysRemaining),
            expired: daysRemaining <= 0,
          };
        }
        break;

      case 'active':
        if (user.subscription_end_date) {
          const subscriptionEnd = new Date(user.subscription_end_date);
          daysRemaining = Math.ceil(
            (subscriptionEnd - now) / (1000 * 60 * 60 * 24)
          );
          statusInfo = {
            type: 'active',
            end_date: user.subscription_end_date,
            days_remaining: Math.max(0, daysRemaining),
            expired: daysRemaining <= 0,
          };
        }
        break;

      case 'gratis':
        statusInfo = {
          type: 'gratis',
          unlimited: true,
          days_remaining: null,
          expired: false,
        };
        break;

      case 'expired':
        statusInfo = {
          type: 'expired',
          end_date: user.subscription_end_date || user.trial_end_date,
          days_remaining: 0,
          expired: true,
        };
        break;

      case 'suspended':
        statusInfo = {
          type: 'suspended',
          suspended: true,
          days_remaining: 0,
          expired: false,
        };
        break;
    }

    return {
      status: user.subscription_status,
      last_payment: user.last_payment,
      created_by_admin: user.created_by_admin,
      actual_status: await checkSubscriptionStatus(user),
      ...statusInfo,
    };
  } catch (error) {
    console.error('Greška pri dobijanju info o pretplati:', error);
    return null;
  }
};

module.exports = {
  subscriptionMiddleware,
  subscriptionCheckMiddleware,
  checkSubscriptionStatus,
  requireActiveSubscription,
  requireTrialOrBetter,
  getSubscriptionInfo,
};
