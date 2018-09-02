# Protecc Backend #

A Node.js + Express RESTful and Socket.io API, served as a Docker image in a Kubernetes cluster.

## Documentation ##

You can find API documentation for this API [here](https://docs.protecc.us.com) :)

## Libraries Used ##

- bcrypt: password security
- body-parser: parsing http request bodies
- compression: gzip compression for optimizing application size
- express: minimalist web framework for Node.js
- express-session: handling authentication tokens and user sessions
- mongoose: interface for mongodb database
- passport: helper library for OAuth
- request: i honestly dont know why we have this
- socket.io: interface for websocket connections

## Pipeline Steps ##

1. Changes are pushed to Bitbucket repository
2. Bitbucket webhook triggers a Jenkins CI build on build server
3. Build server pulls the changes recompiles the app into a Docker image
4. Build server pushes Docker image to private Docker registry server
5. Build server triggers a rolling update in the Kubernetes master

Copyright © 2018 Terrance Li, Andrew Liu, Nathan Yan
