const Exercise = require('../models/Exercise');

// GET /exercises
module.exports.getExercises = (req, res, next) => Exercise.find({})
  .exec()
  .then(exercises => res.render('exercises/index', {
    title: 'Ejercicios',
    exercises,
  }))
  .catch(err => next(err));

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

  const errors = req.validationErrors() ? req.validationErrors() : [];

  if (!(req.files['video.mp4'] && req.files['video.webm'] && req.files['video.ogg'])) {
    errors.push({ msg: 'Los videos del ejercicio son necesarios' });
  }

  if (errors.length > 0) {
    req.flash('errors', errors);
    return res.redirect('/exercises/create');
  }

  return Exercise.findOne({ title: req.body.title })
    .exec()
    .then((exercise) => {
      if (!exercise) {
        const newExercise = new Exercise({
          title: req.body.title,
          description: req.body.description,
          video: {
            mp4: req.files['video.mp4'][0].filename,
            webm: req.files['video.webm'][0].filename,
            ogg: req.files['video.ogg'][0].filename,
          },
        });
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
  const update = req.body;

  if (req.files['video.mp4']) {
    update.video.mp4 = req.files['video.mp4'][0].filename;
  }

  if (req.files['video.webm']) {
    update.video.webm = req.files['video.webm'][0].filename;
  }

  if (req.files['video.ogg']) {
    update.video.ogg = req.files['video.ogg'][0].filename;
  }

  return Exercise.findByIdAndUpdate(req.params.id, update, { new: true })
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
