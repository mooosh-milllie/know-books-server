const { ApolloServer } = require('apollo-server-express')
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const express = require('express');
const {createServer} = require('http');
const cors = require('cors');
const { execute, subscribe } = require('graphql');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { SubscriptionServer } = require('subscriptions-transport-ws');

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const typeDefs = require('./gqlprops/type');
const User = require('./models/user');
const resolvers = require('./gqlprops/resolvers');


mongoose.connect(process.env.MONGODB_URI)
  .then( async() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  });
mongoose.set('debug', true);

const start = async () => {
  const app = express();
  var corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  }

  app.use(cors(corsOptions));
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  })
  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const auth = req ? req.headers.authorization : null
      if (auth && auth.toLowerCase().startsWith('bearer ')) {
        const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET);
        const currentUser = await User.findById(decodedToken.id);
        return { currentUser }
      }
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart()
        {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          }
        },
      },
    ],
  })
  
  await server.start();

  server.applyMiddleware({
    app,
    path: '/',
  })

  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () =>
    console.log(`Server is now running on http://localhost:${PORT}`)
  )
}

start();