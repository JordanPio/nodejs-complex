This Project is a Blog Posting APP with a live chat feature built using the Javascript, Node.js, Express and MongoDB.

## Live Demo

[https://complexapp01.herokuapp.com/]

## The project was built with intent to learn and test the following

- JS functions, objects, arrays, higher-order functions, etc
- Node.js and Express Framework
- MongoDB and CRUD operations
- Lookup in MongoDB
- The MVC - Model View Controller framework
- Setup Routers
- Hashing User Passwords for Protection
- Understanding Sessions
- Async Functions
- User Registration & User-Generated content
- Authentiction feature (Both stateful with sessions and stateless with JSON Web Tokens)
- Live Search Feature
- Sanitizing user generated HTML
- Live chat feature (Socket.IO)
- Cross-site Request Forgery(CSRF) security using CSRF Token
- Build an API - allowing connections from non-web environments to the app and the use of JSON Web Tokens
- The Heroku platform for web deployment
- GitHub

## Available Scripts

In the project directory, you can run:

### `npm install`

Download and install same versions of packages which were used and tested with the app.<br />
Make sure you are in the root of project folder before typing the command

### `npm watch`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

If you are running on Windows replace the "watch" inside package.json with the following.
"watch": "start nodemon db --ignore frontend-js --ignore public/ && start webpack --watch"

You will need to create your own .env file inside the root of project folder and setup a connection with your own MongoDB as well as JWT Token and sendgrid Key

CONNECTIONSTRING=
PORT=3000
JWTSECRET=
SENDGRIDAPIKEY=