const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 5,
    unique: true
  },
  password: {
    type: String,
    minlength: 6,
    required: true
  },
  favoriteGenre: {
    type: String,
    required: true,
    minlength: 5
  }
},
{
  timestamps: true
})

const User = mongoose.model('User', userSchema);

module.exports = User;