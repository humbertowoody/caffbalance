const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
  title: String,
  description: String,
  day: Date,
  exercises: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exercise',
  }],
}, { timestamps: true });

const Routine = mongoose.model('Routine', routineSchema);

module.exports = Routine;
