const { UserInputError, AuthenticationError } = require('apollo-server');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();
const Author = require('../models/author');
const Book = require('../models/book');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 
const { encodeCursor, decodeCusor } = require('../utils');


const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorsCount: () => {
      return Author.collection.countDocuments();
    },
    book: async (_, args) => {
      const book = await Book.findOne({title: args.title})
      return book;
    },
    books: async(root, args) => {
      let books = await Book.find({}).sort({createdAt: 1}).skip(args.page * args.limit).limit(args.limit + 1);
     
      let hasMorePages = (books.length <= args.limit) ? false : true;

      if (hasMorePages) {
        books.pop();
      }

      return {
        hasMorePages: hasMorePages,
        books: books
      }
      
    },
    author: async(root, args) => {
      const author = await Author.findOne({_id: args.id});
      return author;
    },
    authors: async (root, args) => {
      // args param object, similar to req in express, holds request values sent with the request
      let author;
      //checkin if request has the cursor string for the pagination, can be passed as params or query strings in REST
      if (args.cursor) {
        // find all authors, sort in ascending order because the find query will be searching for where the createdAt
        // field is greater than the cursor, so it uses the cursor to find where to continue to show result. 
        // But if you sort in decending order you look for where the result is less than 
        // await Author.find({}).sort({created_at: -1}).where({createdAt: { $lt: args.cursor} }).limit(args.limit +1)
        // the set limit is to show number of data to return. The set limit has to be increased
        // by one so you can can know when there are more pages to fetch... Will understand more below
        author = await Author.find({}).sort({created_at: 1}).where({createdAt: { $gt: args.cursor} }).limit(args.limit +1);
        // hasMorePages determines if there are more pages to fetch, by checking if the result is less than or equal to
        // to the limit i.e, the set limit minus one, remember the limit is increased by one, this is because if
        // you do not get the result equal to the limit plus 1, then there are no more pages or data left
        const hasMorePages = (author.length <= args.limit) ? false : true;
        // the result is popped to reduce the result back to the intended, if hasmore pages is true limit so the cursor can be determined, the
        //  cursor is the "createdAt" field in the last item in the array.
        if (hasMorePages) {
          author.pop();
        }
        //Getting the last Item in the array, if the result wasn't popped the last Item in the array would disrupt the 
        // next request and would make it hard for the hasmorepages variable to determine if it is true or false
        const cursor = author[author.length - 1].createdAt;
        
        //this is returned for the front end, because the cursor will be sent in the next request and 
        //the for the frontend to know when to stop requesting for more pages or data
        return {
          cursor: cursor,
          hasMorePages: hasMorePages,
          author: author
        }
      }

      // This part of the code runs at the beginning before the request comes with a cursor, you can decide to set 
      // limit in the backend permanently but increment by one
      author = await Author.find({}).sort({createdAt: 1}).limit((args.limit + 1));
      const hasMorePages = (author.length <= args.limit) ? false : true;
      if (hasMorePages) {
        author.pop();
      }
      const cursor = author[author.length - 1].createdAt;
      return {
        cursor: cursor,
        hasMorePages: hasMorePages,
        author: author
      }
    },
    booksSearch: async(root, args) => {
      if (!args.author && args.genre) {
        let book = await Book.find({genres: {$in: [args.genre]}}).sort({createdAt: 1});
        if (book.length < 1) {
          return null
        }
        return {book};
      }
      
      if (args.author && !args.genre) {
        let book = await Book.find({author: args.author}).sort({createdAt: 1});

        if (book.length < 1) {
          return null
        }
        return {book};
      }
      
      if (args.author && args.genre) {
        let book = await Book.find({
          genres: {$in: [args.genre]},
          author: args.author
        }).sort({createdAt: 1});
        if (book.length < 1) {
          return null
        }
        return {book};
      }
    },
    me: (_root, _args, context) => {
      return context.currentUser;
    }
  },
  Book:  {
    author: async(root) => {
      const author = await Author.find({_id: root.authorId})
      return author;
    }
    
  },
  Author: {
    books: async(root) => {
      const book = await Book.find({_id: {$in: [...root.books]}});
      return book;
    }
  },

  Mutation: {
    createUser: async (_root, args) => {
      const checkExistingUser = await User.findOne({username: args.username})
      if (checkExistingUser) {
        throw new UserInputError(`username ${args.username} already exists`, {
          invalidArgs: args.username,
        })
      }
      const saltRounds = process.env.SALT_ROUNDS;
      const password = await bcrypt.hash(args.password, Number(saltRounds))
      const user = new User({
        username: args.username,
        password: password,
        favoriteGenre: args.favoriteGenre
      })
  
      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (_root, args) => {
      const user = await User.findOne({ username: args.username })
      if ( !user ) {
        throw new UserInputError("Invalid username or password");
      }
      
      const password = await bcrypt.compare(args.password, user.password);
      if ( !password ) {
        throw new UserInputError("Invalid username or password");
      }
  
      const userForToken = {
        username: user.username,
        id: user._id,
      }
  
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },
    addBook: async (_root, args, context) => {
      if (!context.currentUser) {
        throw new AuthenticationError('You are not authorized to perform task');
      }
      if (await Book.findOne({title: args.title, author: args.author})) {
        throw new UserInputError('Sorry! book already exists', {
          invalidArgs: args.name,
        })
      } else if (args.author.length < 5) {
        throw new UserInputError('Author name must be up to 5 characters', {
          invalidArgs: args.name,
        })
      }
      if (args.genres.length < 1) {
        throw new UserInputError('One or more genre is required!', {
          incompleteRequest: 'args.genres',
        })
      }
      let authorId;
      let savedBook;
      if (authorId = await Author.findOne({name: args.author})) {
        try {
          let newBook = new Book({...args, authorId: authorId.id});
          savedBook = await newBook.save();
          await Author.findByIdAndUpdate(authorId._id, {$push: {"books": savedBook._id}}, { "new": true, "upsert": true })
          await pubsub.publish('BOOK_ADDED', { bookAdded: savedBook });
          return savedBook;
        } catch (error) {
          throw new Error('Unable Add book');
        }
      } 

      try {
        let newAuthor = new Author({name: args.author});
        authorId = await newAuthor.save();
        
        let newBook = new Book({...args, authorId: authorId.id});
        savedBook = await newBook.save();
        await Author.findByIdAndUpdate(authorId._id, {$push: {"books": savedBook._id}}, { "new": true, "upsert": true })
        await pubsub.publish('BOOK_ADDED', { bookAdded: savedBook });
        return savedBook;  
      } catch (error) {
        throw new Error('Unable Add book');
      }
      
    },
    editAuthor: async(_root, args, context) => {
      if (!context.currentUser) {
        throw new AuthenticationError('You are not authorized to perform task');
      }
      const oldAuthor = await Author.findOne({name: args.name});
      if (oldAuthor) {
        const newAuthor = {...args};
        return Author.findByIdAndUpdate(oldAuthor._id, newAuthor, { new: true });
      }   
      return null;
    }
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
    },
  },
}

module.exports = resolvers;