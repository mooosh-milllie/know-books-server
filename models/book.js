const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 2
  },
  published: {
    type: Number,
  },
  author: {
    type: String,
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author'
  },
  genres: [
    { type: String}
  ],
},
{
  timestamps: true
}
)
const Book = mongoose.model('Book', schema);

module.exports = Book;