const { promisify } = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const openPayConfig = require('../config/openpay');
const User = require('../models/User');

const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'El correo electrónico no es válido').isEmail();
  req.assert('password', 'La contraseña es requerida').notEmpty();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: '¡Bienvenido de nuevo!' });
      res.redirect(req.session.returnTo || '/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : No se pudo destruir la sesión.', err);
    req.user = null;
    res.redirect('/');
  });
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'El Correo Electrónico no es válido').isEmail();
  req.assert('password', 'La contraseña debe tener al menos 4 caracteres').len(4);
  req.assert('confirmPassword', 'Las contraseñas no coinciden').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Una cuenta con ese correo ya existe.' });
      return res.redirect('/signup');
    }
    user.save((err) => {
      if (err) { return next(err); }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        res.redirect('/');
      });
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Porfavor ingresa un correo electrónico válido.').isEmail();
  req.assert('fname', 'Porfavor introduce tu(s) nombre(s').notEmpty();
  req.assert('lname', 'Porfavor introduce tu(s) apellido(s)').notEmpty();
  req.assert('phone', 'Porfavor introduce tu teléfono').notEmpty();
  req.assert('city', 'Porfavor introduce una ciudad').notEmpty();
  req.assert('state', 'Porfavor introduce un estado').notEmpty();
  req.assert('line1', 'Porfavor introduce tu calle y número').notEmpty();
  req.assert('postalCode', 'Porfavor introduce tu código postal').notEmpty();

  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.profile.fname = req.body.fname || '';
    user.profile.lname = req.body.lname || '';
    user.profile.gender = req.body.gender || '';
    user.profile.phone = req.body.phone || '';
    user.address.city = req.body.city || '';
    user.address.state = req.body.state || '';
    user.address.line1 = req.body.line1 || '';
    user.address.postalCode = req.body.postalCode || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'El correo electrónico que ingresaste ya pertenece a otra cuenta.' });
          return res.redirect('/account');
        }
        return next(err);
      }
      openPayConfig.updateClient(user, (err, body) => {
        if (err) {
          if (err.msg) {
            openPayConfig.addClient(user, (nErr, id) => {
              if (!nErr) {
                user.payment.customerId = id;
                user.save((err) => {
                  if (err) {
                    next(err);
                  }
                  req.flash('success', { msg: 'Tu información ha sido actualizada' });
                  return res.redirect('/account');
                });
              }
            });
          }
          req.flash('errors', { msg: 'Ha ocurrido un error actualizando tus datos con nuestro servidor de pagos. Intenta de nuevo.' });
          return res.redirect('/account');
        }
        console.log('[CaffBalance] Client Updated Successfully on OpenPay: ', body);
        req.flash('success', { msg: 'Tu información de perfil ha sido actualizada correctamente.' });
        res.redirect('/account');
      });
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'La contraseña debe tener al menos 4 caracteres').len(4);
  req.assert('confirmPassword', 'Las contraseñas no coinciden').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'La contraseña ha sido actualizada.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Tu cuenta ha sido eliminada.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const { provider } = req.params;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(token => token.kind !== provider);
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${provider} account has been unlinked.` });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'El token para restablecer la contraseña es inválido o a expirado.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'La contraseña debe tener al menos 4 caracteres.').len(4);
  req.assert('confirm', 'Las contraseñas deben coincidir.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'El token para restablecer la contraseña es inválido o ha expirado.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    const transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'noreply@caffbalance.com',
      subject: 'Tu contraseña en Caff Balance ha sido cambiada',
      text: `Hola,\n\n Esta es una confirmación de que la contraseña para la cuenta de ${user.email} ha sido cambiada exitosamente.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Éxito! La contraseña ha sido actualizada.' });
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => { if (!res.finished) res.redirect('/'); })
    .catch(err => next(err));
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Porfavor, introduce una dirección válida de correo electrónico.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  const createRandomToken = randomBytesAsync(16)
    .then(buf => buf.toString('hex'));

  const setRandomToken = token =>
    User
      .findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'No existe ninguna cuenta asociada a ese correo electrónico.' });
        } else {
          user.passwordResetToken = token;
          user.passwordResetExpires = Date.now() + 3600000; // 1 hour
          user = user.save();
        }
        return user;
      });

  const sendForgotPasswordEmail = (user) => {
    if (!user) { return; }
    const token = user.passwordResetToken;
    const transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'noreply@caffbalance.com',
      subject: 'Restablecer tu contraseña en Caff Balance',
      text: `Estás recibiendo este correo electrónico porque tú (o alguien más) ha solicitado que se restablezca la contraseña de tu cuenta.\n\n
        Porfavor haz click en el siguiente link, o pega el enlace en tu navegador para completar el proceso:\n\n
        http://${req.headers.host}/reset/${token}\n\n
        Si tu NO solicitaste esto, porfavor ignora este mensaje y tu contraseña permanecerá intacta.\n\n
        Saludos,\nCaff Balance.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('info', { msg: `Un correo electrónico ha sido enviado a ${user.email} con instrucciones para seguir adelante.` });
      });
  };

  createRandomToken
    .then(setRandomToken)
    .then(sendForgotPasswordEmail)
    .then(() => res.redirect('/forgot'))
    .catch(next);
};

/**
 * GET /billing
 * Billing page with payments info.
 */
exports.getBilling = (req, res, next) => {
  openPayConfig.getSubcription(req.user, (err, subscription) => {
    if (err) {
      req.flash('errors', { msg: err.description ? err.description : 'Ha ocurrido un error obteniendo datos del servidor bancario' });
    }
    res.render('account/billing', {
      title: 'Pagos',
      user: req.user,
      subscription,
    });
  });
};

/**
 * GET /add-payment
 * Get the add payment page.
 */
exports.getAddPayment = (req, res) => {
  res.render('account/addPayment', {
    title: 'Agregar Pago',
    appId: process.env.OPENPAY_MERCHANT_ID || '',
    appPK: process.env.OPENPAY_PUBLIC_KEY || '',
  });
};

/**
 * POST /process-payment
 * Process the payment data.
 */
exports.postPayment = (req, res, next) => {
  // Validation
  req.assert('deviceId').notEmpty();
  req.assert('token_id').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', { msg: 'Ha ocurrido un error. Intenta de nuevo más tarde.' });
    return res.redirect('/add-payment');
  }

  openPayConfig.addSubscription(req.user, req.body.token_id, (err, subscription) => {
    if (err) {
      req.flash('errors', { msg: err.description ? err.description : 'Ha ocurrido un error procesando tu pago, intenta de nuevo.' });
      return res.redirect('/add-payment');
    }
    req.user.payment.subscriptionId = subscription.id;
    req.user.save((err) => {
      if (err) {
        next(err);
      }
      req.flash('success', { msg: '¡Todo en orden! Ahora puedes comenzar a usar Caff Balance' });
      return res.redirect('/');
    });
  });
};


/**
 * GET /delete-subscription
 */
exports.deleteSubscription = (req, res, next) => {
  openPayConfig.deleteSuscription(req.user, (err) => {
    if (err) {
      req.flash('errors', { msg: 'Ha ocurrido un problema cancelando la subscripción. Intenta de nuevo más tarde' });
    } else {
      req.flash('success', { msg: 'Se ha cancelado tu subscripción correctamente, te vamos a extrañar' });
    }
    return res.redirect('/billing');
  });
};
