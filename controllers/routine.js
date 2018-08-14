const moment = require('moment');
const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');

/**
 * GET /routine/:index
 * Get today's routine
 */
module.exports.todayRoutine = (req, res, next) => Routine
  .findOne({
    date: {
      $gte: moment().startOf('day'),
      $lt: moment().endOf('day'),
    }
  })
  .populate('exercises')
  .exec()
  .then((routine) => {
    if (!routine) {
      req.flash('errors', { msg: 'No hay ninguna rutina programada aún para el día de hoy, intenta de nuevo más tarde' });
      return res.redirect('/');
    }
    if (routine.exercises && (req.params.index < 0 || req.params.index >= routine.exercises.length)) {
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
    date: {
      $gte: moment(req.body.day).startOf('day'),
      $lt: moment(req.body.day).endOf('day'),
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
module.exports.updateRoutine = (req, res, next) => {};

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
