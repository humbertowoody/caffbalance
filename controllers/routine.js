const moment = require('moment');
const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');

/**
 * GET /routine/:index
 * Get today's routine
 */
module.exports.todayRoutine = (req, res, next) => Routine
  .findOne({
    day: {
      $gte: moment().startOf('day').toDate(),
      $lte: moment().endOf('day').toDate(),
    }
  })
  .populate('exercises')
  .exec()
  .then((routine) => {
    if (!routine) {
      req.flash('errors', { msg: 'No hay ninguna rutina programada aún para el día de hoy, intenta de nuevo más tarde' });
      return res.redirect('/');
    }
    if (routine.exercises
        && (req.params.index < 0 || req.params.index >= routine.exercises.length)
    ) {
      req.flash('errors', 'Lo sentimos, ese ejercicio no existe');
      return res.redirect('/routine/0');
    }
    return res.render('routines/dailyRoutine', {
      title: 'Rutina del día',
      routine,
      index: req.params.index,
    });
  })
  .catch(err => next(err));

/**
 * GET /routines
 * Show all the routines in storage
 */
module.exports.getRoutines = (req, res, next) => {
  Routine.find({})
    .exec()
    .then(routines => res.render('routines/index', {
      title: 'Rutinas',
      routines,
    }))
    .catch(err => next(err));
};

/**
 * GET /routines/:id
 * Show a preview of a specific routine.
 */
module.exports.getRoutine = (req, res, next) => {
  Routine.findById(req.params.id)
    .populate('exercises')
    .exec()
    .then((routine) => {
      if (!routine) {
        req.flash('errors', { msg: 'La rutina que buscas no existe.' });
        return res.redirect('/routines');
      }
      if (routine.exercises
        && (req.params.index < 0 || req.params.index >= routine.exercises.length)
      ) {
        req.flash('errors', 'Lo sentimos, ese ejercicio no está registrado para la rutina actual.');
        return res.redirect(`/routines/${routine._id}/0`);
      }
      return res.render('routines/show', {
        title: 'Rutinas',
        routine,
        index: req.params.index,
      });
    })
    .catch(err => next(err));
};

/**
 * GET /routines/create
 * Show the form for creating a new Routine
 */
module.exports.createRoutine = (req, res, next) => {
  Exercise.find({})
    .exec()
    .then(exercises => res.render('routines/new', {
      title: 'Añadir Rutina',
      exercises,
    }))
    .catch(err => next(err));
};

/**
 * POST /routines/store
 * Store a new routine in storage
 */
module.exports.storeRoutine = (req, res, next) => {
  // Validation
  req.assert('title', 'El título de la rutina es necesario').notEmpty();
  req.assert('description', 'La descripción de la rutina es necesaria').notEmpty();
  req.assert('day', 'La fecha de la rutina es necesaria').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/routines/create');
  }

  return Routine.findOne({
    day: {
      $gte: moment(req.body.day).startOf('day'),
      $lte: moment(req.body.day).endOf('day'),
    }
  }).exec()
    .then((routine) => {
      if (routine) {
        req.flash('errors', { msg: 'La fecha que seleccionaste ya se encuentra ocupada, selecciona otra distinta.' });
        return res.redirect('/routines/create');
      }
      req.body.day = moment(req.body.day).startOf('day').format();
      const newRoutine = new Routine(req.body);
      return newRoutine.save((err) => {
        if (err) { return next(err); }
        req.flash('success', { msg: `¡La rutina para el ${moment(newRoutine.day).format('YYYY-MM-DD')} se ha añadido exitosamente!` });
        return res.redirect('/routines');
      });
    })
    .catch(err => next(err));
};

/**
 * GET /routines/:id/edit
 * Get the form for editing a routine
 */
module.exports.editRoutine = (req, res, next) => Routine.findById(req.params.id)
  .exec()
  .then((routine) => {
    if (!routine) {
      req.flash('error', { msg: 'La rutina que ingresaste no existe' });
      return res.redirect('/routines');
    }
    Exercise.find({})
      .exec()
      .then(exercises => res.render('routines/edit', {
        title: 'Editar Rutina',
        routine,
        exercises,
      }))
      .catch((err) => { throw err; });
  })
  .catch(err => next(err));

/**
 * PUT /routines/:id/update
 * Update a resource in storage
 */
module.exports.updateRoutine = (req, res, next) => {
  // Validation
  req.assert('title', 'El título de la rutina es necesario').notEmpty();
  req.assert('description', 'La descripción de la rutina es necesaria').notEmpty();
  req.assert('day', 'La fecha de la rutina es necesaria').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/routines/create');
  }

  return Routine.findOne({
    day: {
      $gte: moment(req.body.day).startOf('day'),
      $lte: moment(req.body.day).endOf('day'),
    },
    _id: { $ne: req.params.id },
  }).exec()
    .then((routine) => {
      if (routine) {
        req.flash('errors', { msg: 'La fecha que seleccionaste ya se encuentra ocupada, selecciona otra distinta.' });
        return res.redirect(`/routines/${req.params.id}/edit`);
      }
      req.body.day = moment(req.body.day).startOf('day').format();
      Routine.findByIdAndUpdate(req.params.id, req.body)
        .exec()
        .then((routine) => {
          if (!routine) {
            req.flash('errors', { msg: 'La rutina no existe' });
            return res.redirect('/routines');
          }
          req.flash('success', { msg: '¡La rutina ha sido actualizada correctamente!' });
          return res.redirect('/routines');
        })
        .catch((err) => { throw err; });
    })
    .catch(err => next(err));
};

/**
 * GET /routines/:id/delete
 * Delete a resource from storage
 */
module.exports.deleteRoutine = (req, res, next) => {
  Routine.findByIdAndRemove(req.params.id)
    .exec()
    .then((routine) => {
      if (!routine) {
        req.flash('errors', { msg: 'La rutina no existe' });
        return res.redirect('/routines');
      }
      req.flash('success', { msg: 'Rutina eliminada correctamente' });
      return res.redirect('/routines');
    })
    .catch(err => next(err));
};
