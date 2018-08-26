const Exercise = require('../models/Exercise');

// GET /exercises
module.exports.getExercises = (req, res, next) => Exercise.find({})
  .exec()
  .then(exercises => res.render('exercises/index', {
    title: 'Ejercicios',
    exercises,
  }))
  .catch(err => next(err));

/**
 * GET /exercises/:id
 * Show a specific exercise.
 */
module.exports.showExercise = (req, res, next) => {
  Exercise.findById(req.params.id)
    .exec()
    .then((exercise) => {
      if (!exercise) {
        req.flash('errors', { msg: 'El ejercicio que deseas no existe.' });
        return res.redirect('/exercises');
      }
      return res.render('exercises/show', {
        title: 'Ejercicios',
        exercise,
      });
    })
    .catch(err => next(err));
};

// GET /exercises/:id/edit
module.exports.editExercise = (req, res, next) => Exercise
  .findById(req.params.id)
  .exec()
  .then((exercise) => {
    if (!exercise) {
      req.flash('errors', { msg: 'El ejercicio no existe.' });
      return res.redirect('/exercises');
    }
    return res.render('exercises/edit', {
      title: 'Editar Ejercicio',
      exercise,
    });
  })
  .catch(err => next(err));

// GET /exercises/create
module.exports.createExercise = (req, res) => {
  res.render('exercises/new', {
    title: 'Añadir Ejercicio',
  });
};

/**
 * POST /exercises/store
 * Save a new exercise to storage
 */
module.exports.storeExercise = (req, res, next) => {
  // Validation
  req.assert('title', 'El título es obligatorio').notEmpty();
  req.assert('description', 'La descripción es obligatoria').notEmpty();
  req.assert('video.mp4', 'La liga del video en formato MP4 es requerida').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/exercises/create');
  }

  return Exercise.findOne({ title: req.body.title })
    .exec()
    .then((exercise) => {
      if (!exercise) {
        const newExercise = new Exercise(req.body);
        return newExercise.save((err) => {
          if (err) { next(err); }
          req.flash('success', { msg: '¡Ejercicio guardado correctamente!' });
          return res.redirect('/exercises');
        });
      }
      req.flash('errors', { msg: 'El título del ejercicio ya ha sido utilizado' });
      return res.redirect('/exercises/create');
    })
    .catch(err => next(err));
};

// PUT /exercises/:id/update
module.exports.updateExercise = (req, res, next) => {
  // Validation
  req.assert('title', 'El título es obligatorio').notEmpty();
  req.assert('description', 'La descripción es obligatoria').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/exercises/create');
  }

  return Exercise.findByIdAndUpdate(req.params.id, req.body)
    .exec()
    .then((exercise) => {
      if (!exercise) {
        req.flash('errors', { msg: 'El ejercicio no existe' });
        return res.redirect('/exercises');
      }
      req.flash('success', { msg: '¡Ejercicio correctamente actualizado!' });
      return res.redirect('/exercises');
    })
    .catch(err => next(err));
};

/**
 * GET /exercises/:id/delete
 * Delete an exercise from storage
 */
module.exports.deleteExercise = (req, res, next) => {
  Exercise.findByIdAndRemove(req.params.id)
    .exec()
    .then((exercise) => {
      if (!exercise) {
        req.flash('errors', { msg: 'El ejercicio no existe' });
      } else {
        req.flash('success', { msg: '¡El ejercicio fue eliminado correctamente!' });
      }
      return res.redirect('/exercises');
    })
    .catch(err => next(err));
};
