const Exercise = require('../models/Exercise');

// GET /exercises
module.exports.getExercises = (req, res) => {};

// GET /exercises/:id/edit
module.exports.editExercise = (req, res, next) => {
  return Exercise
    .findById(req.params.id)
    .exec()
    .then((exercise) => {
      if (!exercise) {
        req.flash('errors', { msg: 'The exercise cannot be found.' });
        res.redirect('/exercises');
      }
    })
    .catch(err => next(err));
};

// GET /exercises/create
module.exports.createExercise = (req, res) => {};

// PUT /exercises/:id/update
module.exports.updateExercise = (req, res) => {};

// PUT /exercises/store
module.exports.storeExercise = (req, res) => {};
