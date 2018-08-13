const moment = require('moment');
const Routine = require('../models/Routine');

module.exports.todayRoutine = (req, res, next) => Routine
  .findOne({
    date: {
      $gte: moment().startOf('Day').format(),
      $lte: moment().endOf('Day').format(),
    }
  })
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
