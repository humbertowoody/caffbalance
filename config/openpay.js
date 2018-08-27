const OpenPay = require('openpay');

const openpay = new OpenPay(process.env.OPENPAY_MERCHANT_ID, process.env.OPENPAY_PRIVATE_KEY);

/**
 * Active subscription status validation middleware.
 */
module.exports.subscriptionActive = (req, res, next) => {
  if (!req.user) {
    req.flash('errors', { msg: 'Porfavor, inicia sesión.' });
    return res.redirect('/login');
  }
  if (!req.user.payment || !req.user.payment.customerId) {
    req.flash('errors', { msg: 'Porfavor, registra un método de pago.' });
    return res.redirect('/billing');
  }
  openpay.customers.subscriptions.get(req.user.payment.customerId, process.env.OPENPAY_SUBSCRIPTION_ID, (error, subscription) => {
    if (error) {
      req.flash('errors', { msg: 'Ha ocurrido un error al conectar con nuestro servidor de pagos. Intenta de nuevo más tarde.' });
      console.log('[CaffBalance] Error: ', error);
      return res.redirect('/');
    }
    if (subscription.status === 'trial' || subscription.status === 'active') {
      return next();
    }
    req.flash('errors', { msg: 'Ha ocurrido un error con el método de pago, revisa tus datos e intenta nuevamente.' });
    return res.redirect('/billing');
  });
};

/**
 * Get the user's subscription status.
 * @param {User} user A user object to search for the subscription.
 * @param {function} cb A callback function (err, subscription)
 */
exports.getSubcription = (user, cb) => {
  if (!user.payment || !user.payment.customerId || !user.payment.subscriptionId) {
    return cb({ description: 'Porfavor, registra tus datos de pago' });
  }
  openpay.customers.subscriptions.get(user.payment.customerId, user.payment.subscriptionId, (error, subscription) => {
    if (error) {
      cb(error);
    } else {
      cb(null, subscription);
    }
  });
};

/**
 * Create a Client on OpenPay.
 * @param {User} user The user object to get info for the client.
 */
exports.addClient = (user, cb) => {
  if (user.payment && user.payment.customerId) {
    cb(null, user.payment.customerId);
  } else {
    const customer = {
      name: user.profile.fname,
      last_name: user.profile.lname,
      email: user.email,
      address: {
        city: user.address.city || '',
        state: user.address.state || '',
        line1: user.address.line1 || '',
        postal_code: user.address.postalCode || '',
        country_code: 'MX',
      },
      phone_number: user.profile.phone,
    };
    openpay.customers.create(customer, (error, body) => {
      if (error) {
        return cb(error);
      }
      cb(null, body);
    });
  }
};

/**
 * Update a Client on OpenPay.
 * @param {User} user The user object to get info for the update.
 */
exports.updateClient = (user, cb) => {
  if (!user.payment || !user.payment.customerId) {
    return cb({ description: 'El usuario no ha sido dado de alta' });
  }
  const customer = {
    name: user.profile.fname,
    last_name: user.profile.lname,
    email: user.email,
    address: {
      city: user.address.city || '',
      state: user.address.state || '',
      line1: user.address.line1 || '',
      postal_code: user.address.postalCode || '',
      country_code: 'MX',
    },
    phone_number: user.profile.phone,
  };
  openpay.customers.update(user.payment.customerId, customer, (err, body) => {
    if (err) {
      return cb(err);
    }
    return cb(null, body);
  });
};

/**
 * Add subscription to Client.
 * @param {User} user The user object to add the subscription.
 * @param {String} token_id The token_id of the Card to use.
 * @param {Callback} cb The callback with (err, body) format.
 */
exports.addSubscription = (user, tokenId, cb) => {
  if (!user.payment || !user.payment.customerId) {
    return cb({ description: 'Tu cuenta no está asociada aún con el servidor de pagos.' });
  }
  const payload = {
    plan_id: process.env.OPENPAY_SUBSCRIPTION_ID,
    source_id: tokenId,
  };
  openpay.customers.subscriptions.create(user.payment.customerId, payload, (err, subscription) => {
    if (err) {
      cb(err);
    } else {
      cb(null, subscription);
    }
  });
};

/**
 * Update Subscription
 */


/**
 * Delete Suscription.
 */
exports.deleteSuscription = (user, cb) => {
  if (!user.payment || !user.payment.customerId) {
    return cb({ description: 'No es posible eliminar la subscripción porque no cuentas con una.' });
  }
  openpay.customers.subscriptions.delete(user.payment.customerId, process.env.OPENPAY_SUBSCRIPTION_ID, (err) => {
    if (err) {
      cb(err);
    } else {
      cb(null);
    }
  });
};
