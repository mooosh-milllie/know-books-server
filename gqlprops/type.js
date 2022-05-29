const { gql } = require("apollo-server-core");

const typeDefs = gql`
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }
  type Token {
    value: String!
  }
  type Book {
    title: String!
    published: Int!
    author: [Author!]!
    genres: [String!]!
    id: ID!
  }
  type Author {
    id: ID!
    name: String!
    born: String
    books: [Book!]!
  }
  type Authors {
    cursor: String!
    hasMorePages: Boolean!
    author: [Author!]!
  }
  type BooksSearch {
    cursor: String!
    book: [Book!]!
  }
  type Books {
    hasMorePages: Boolean!
    books: [Book!]!
  }
  type Query {
    bookCount: Int!
    authorsCount: Int!
    book(title: String!): Book
    books(page: Int!, limit: Int!): Books
    author(id: String!): Author
    authors(cursor: String, limit: Int!): Authors
    booksSearch(author: String, genre: String, cursor: String): BooksSearch
    me: User
  }
  type Mutation {
    createUser(
      username: String!
      password: String!
      favoriteGenre: String!
    ): User
    
    login(
      username: String!
      password: String!
    ): Token

    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book

    editAuthor(
      name: String!
      born: Int!
    ): Author
  }

  type Subscription {
    bookAdded: Book!
  }
`;

module.exports = typeDefs;