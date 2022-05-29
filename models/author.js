const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 4
  },
  born: {
    type: Number,
  },
  books: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'Book'
    }
  ]
},
{
  timestamps: true
})

const Author = mongoose.model('Author', schema);

module.exports = Author;