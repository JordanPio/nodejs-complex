//export multiple functions related to user.

const User = require("../models/User");
//ATTENTION TO ../ the 2 dots make u move to a folder up. since we are in a subfolder so we can get back to root folder and access the other file

const Post = require("../models/Post");
const Follow = require("../models/Follow");

// make token for API available
const jwt = require("jsonwebtoken");

exports.apiGetPostsByUsername = async function(req, res) {
  try {
    let authorDoc = await User.findByUsername(req.params.username);
    let posts = await Post.findByAuthorId(authorDoc._id);
    res.json(posts);
  } catch {
    res.json("Sorry, invalid user requested.");
  }
};

exports.apiMustBeLoggedIn = function(req, res, next) {
  try {
    req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET);
    next();
  } catch {
    res.json("Sorry you must provide a valid token.");
  }
};

exports.doesUsernameExist = function(req, res) {
  User.findByUsername(req.body.username)
    .then(function() {
      res.json(true);
    })
    .catch(function() {
      res.json(false);
    });
};

exports.doesEmailExist = async function(req, res) {
  let emailBool = await User.doesEmailExist(req.body.email);
  res.json(emailBool);
};

exports.sharedProfileData = async function(req, res, next) {
  let isVisitorsProfile = false;
  let isFollowing = false;
  if (req.session.user) {
    isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);
    // as the method below will need to visit the databse it will take some time to complete and therefore async
    isFollowing = await Follow.isVisitorFollowing(
      req.profileUser._id,
      req.visitorId
    );
  }
  req.isVisitorsProfile = isVisitorsProfile;
  req.isFollowing = isFollowing;

  // retrieve post, follower, and following counts
  let postCountPromise = Post.countPostsByAuthor(req.profileUser._id);
  let followerCountPromise = Follow.countFollowersById(req.profileUser._id);
  let followingCountPromise = Follow.countFollowingById(req.profileUser._id);

  let [postCount, followerCount, followingCount] = await Promise.all([
    postCountPromise,
    followerCountPromise,
    followingCountPromise
  ]);

  // last we add all these variables to the request object

  req.postCount = postCount;
  req.followerCount = followerCount;
  req.followingCount = followingCount;

  next();
};

exports.mustBeLoggedIn = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash("errors", "You must be logged in to perform that action");
    req.session.save(function() {
      res.redirect("/");
    });
  }
};

//since we dont know how long it would take for the database to answer we can use a callback function
//this is setup by passing a function as an argument inside user.login method
//when using  promise to handle this situation the .then(what to do if promise is succesful) .catch(if the promise failed)
exports.login = function(req, res) {
  let user = new User(req.body);
  user
    .login()
    .then(function(result) {
      req.session.user = {
        avatar: user.avatar,
        username: user.data.username,
        _id: user.data._id
      };
      //we need to wait the user data to be updated in the database before we can redirect the user so we will need to use callback or Promises
      req.session.save(function() {
        res.redirect("/");
      });
    })
    .catch(function(error) {
      // Instead of displaying that annoying page we will redirect user to the homepage and flash a msg using the flash package
      req.flash("errors", error);
      //the session package manually saves to the database but by including .save we can use a callback function inside to make sure the saving was
      //performed before we redirect the user.
      req.session.save(function() {
        res.redirect("/");
      });
    });
};

exports.apiLogin = function(req, res) {
  let user = new User(req.body);
  user
    .login()
    .then(function(result) {
      res.json(
        jwt.sign({ _id: user.data._id }, process.env.JWTSECRET, {
          expiresIn: "7d"
        })
      );
    })
    .catch(function(error) {
      res.json("Sorry , your values are not correct.");
    });
};

exports.logout = function(req, res) {
  //since this is dealing with database we want and we want to add new procedure after this finish we will need to use a promise
  //we will use a callback function since the session package doesnt include promises (Wow we need to know all that)
  //the reason for this method is simple, because the homepage will render a different page if the use has been logged in or out.
  req.session.destroy(function() {
    res.redirect("/");
  });
};

exports.register = function(req, res) {
  //   console.log(req.body);
  // the console log upstairs show the data we can access through submitting form (keep that in mind)
  let user = new User(req.body);
  user
    .register()
    .then(() => {
      req.session.user = {
        username: user.data.username,
        avatar: user.avatar,
        _id: user.data._id
      };
      req.session.save(function() {
        res.redirect("/");
      });
    })
    .catch(regErrors => {
      regErrors.forEach(function(error) {
        req.flash("regErrors", error);
      });
      req.session.save(function() {
        res.redirect("/");
      });
    });
};

exports.home = async function(req, res) {
  if (req.session.user) {
    // fetch feed of posts for current user
    let posts = await Post.getFeed(req.session.user._id);

    res.render("home-dashboard", { posts: posts });
    // we can get rid of the SECOND ARGUMENT AFTER setting up app.use to pass the user data. PS: I had to add a second Parenthesis here
    // , {
    //   username: req.session.user.username,
    //   avatar: req.session.user.avatar
    // });
  } else {
    // this is where we are passing data into the template
    res.render("home-guest", {
      regErrors: req.flash("regErrors")
    });
  }
  //remember that this is the name of the file inside view folder which contains the MAIN PAGE
};

exports.ifUserExists = function(req, res, next) {
  User.findByUsername(req.params.username)
    .then(function(userDocument) {
      req.profileUser = userDocument;
      next();
    })
    .catch(function() {
      res.render("404");
    });
};

exports.profilePostsScreen = function(req, res) {
  // ask our post model for posts by a certain author id
  Post.findByAuthorId(req.profileUser._id)
    .then(function(posts) {
      res.render("profile", {
        title: `Profile For ${req.profileUser.username}`,
        currentPage: "posts",
        posts: posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {
          postCount: req.postCount,
          followerCount: req.followerCount,
          followingCount: req.followingCount
        }
      });
    })
    .catch(function() {
      res.render("404");
    });
};

exports.profileFollowersScreen = async function(req, res) {
  try {
    let followers = await Follow.getFollowersById(req.profileUser._id);
    res.render("profile-followers", {
      currentPage: "followers",
      followers: followers,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount
      }
    });
  } catch {
    res.render("404");
  }
};

exports.profileFollowingScreen = async function(req, res) {
  try {
    let following = await Follow.getFollowingById(req.profileUser._id);
    res.render("profile-following", {
      currentPage: "following",
      following: following,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postCount: req.postCount,
        followerCount: req.followerCount,
        followingCount: req.followingCount
      }
    });
  } catch {
    res.render("404");
  }
};
