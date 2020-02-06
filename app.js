const express = require("express");
//nice contextual clue. this variable can't change. different than Let.

//enable sessions
const session = require("express-session");
//package that allows to store session data on database
const MongoStore = require("connect-mongo")(session);

const flash = require("connect-flash");

const markdown = require("marked");
const csrf = require("csurf");
const app = express();
const sanitizeHTML = require("sanitize-html");

// the two lines of code below were moved here since they were required by API
app.use(express.urlencoded({ extended: false }));
//boiler plate code - tells express to add the user submit data to the request object so we can access through request.body
app.use(express.json());
//send json data

// setup api router call
// add API before any following code otherwise the API will use everything that has app.use before it is called

app.use("/api", require("./router-api"));

let sessionOptions = session({
  secret: "JavaScript is so cool",
  //store let you overwrite store data in memory and instead do it on a database
  store: new MongoStore({ client: require("./db") }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }
});

app.use(sessionOptions);
app.use(flash());

app.use(function(req, res, next) {
  //make our markdown function available from within ejs templates
  res.locals.filterUserHTML = function(content) {
    return sanitizeHTML(markdown(content), {
      allowedTags: [
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "strong",
        "bold",
        "i",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6"
      ],
      allowedAttributes: {}
    });
  };

  //make all error and success flash msg available from all templates
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");

  //make current user id available on the req object VERY IMPORTANT
  if (req.session.user) {
    req.visitorId = req.session.user._id;
  } else {
    req.visitorId = 0;
  }

  // make user session data available from within view templates VERY IMPORTANT
  res.locals.user = req.session.user;
  next();
});

const router = require("./router");

app.use(express.static("public"));
//make public folder available

app.set("views", "views");
//first argument 'views' doesnt change but the second is because WE NAME our folder Views(this is the folder name)
app.set("view engine", "ejs");
//here we set out template engine, this time we are using EJS. each engine has its syntax and capabilities
//we also need to install ejs library

app.use(csrf());

// middleware that let the csrf token available with our templates

app.use(function(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/", router);

app.use(function(err, req, res, next) {
  if (err) {
    if (err.code == "EBADCSRFTOKEN") {
      req.flash("errors", "Cross site request forgery detected.");
      req.session.save(() => res.redirect("/"));
    } else {
      res.render("404");
    }
  }
});

const server = require("http").createServer(app);

const io = require("socket.io")(server);

// make express session data available to socket.
// this was found by searching how to integrate session data to express socket feature

io.use(function(socket, next) {
  sessionOptions(socket.request, socket.request.res, next);
});

io.on("connection", function(socket) {
  // the only way we knowledge a chat msg sent if they browser is logged in
  if (socket.request.session.user) {
    let user = socket.request.session.user;

    socket.emit("welcome", {
      username: user.username,
      avatar: user.avatar
    });
    // we are receiving the messages in this line of code
    socket.on("chatMessageFromBrowser", function(data) {
      // broadcast to all users - this is changed since the user sending doesnt need to receive the message back

      // io.emit("chatMessageFromServer", {
      //   message: data.message,
      //   username: user.username,
      //   avatar: user.avatar

      // this will emit the event to every browser except the one that sent it
      socket.broadcast.emit("chatMessageFromServer", {
        message: sanitizeHTML(data.message, {
          allowedTags: [],
          allowedAttributes: {}
        }),
        username: user.username,
        avatar: user.avatar
      });
    });
  }
});

module.exports = server;
