const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: String,
  description: String,
  video: {
    mp4: String,
    webm: String,
    ogg: String,
  },
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
