//this will be a constructor functions
//reusable blueprint to create user objects

const usersCollection = require("../db")
  .db()
  .collection("users");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const md5 = require("md5");

let User = function(data, getAvatar) {
  this.data = data;
  this.errors = [];
  if (getAvatar == undefined) {
    getAvatar = false;
  }
  if (getAvatar) {
    this.getAvatar();
  }
  //the first dataname doesnt need to be the same
};

//the syntax below is the best to avoid duplication when working with many objects

User.prototype.validate = function() {
  return new Promise(async (resolve, reject) => {
    if (this.data.username == "") {
      this.errors.push("You must provide a username.");
    }
    if (
      this.data.username != "" &&
      !validator.isAlphanumeric(this.data.username)
    ) {
      this.errors.push("Username can only contain letters and numbers");
    }
    if (!validator.isEmail(this.data.email)) {
      this.errors.push("You must provide a valid email.");
    }
    if (this.data.password == "") {
      this.errors.push("You must provide a password.");
    }
    if (this.data.password.length > 0 && this.data.password.length < 12) {
      this.errors.push("Password must be at least 12 characters");
    }
    if (this.data.password.length > 50) {
      this.errors.push("Password cannot exceed 50 characters");
    }
    if (this.data.username.length > 0 && this.data.username.length < 3) {
      this.errors.push("Username must be at least 3 characters");
    }
    if (this.data.username.length > 30) {
      this.errors.push("Username cannot exceed 30 characters");
    }

    //only if username is valid then check to see if it's already taken
    if (
      this.data.username.length > 2 &&
      this.data.username.length < 31 &&
      validator.isAlphanumeric(this.data.username)
    ) {
      let usernameExists = await usersCollection.findOne({
        username: this.data.username
      });
      if (usernameExists) {
        this.errors.push("that username is already taken.");
      }
    }

    //only if email is valid then check to see if it's already taken
    if (validator.isEmail(this.data.email)) {
      let emailExists = await usersCollection.findOne({
        email: this.data.email
      });
      if (emailExists) {
        this.errors.push("This email is already being in use.");
      }
    }
    resolve();
  });
};

User.prototype.cleanUp = function() {
  if (typeof this.data.username != "string") {
    this.data.username = "";
  }
  if (typeof this.data.email != "string") {
    this.data.email = "";
  }
  if (typeof this.data.password != "string") {
    this.data.password = "";
  }

  // get rid of any bogus properties. if the client tries to enter anything else rather than username password and email
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    //.trim get rid of spaces
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password
  };
};

///////OLD CALLBACK Approach
// User.prototype.login = function(callback) {
//   //make sure the data we are passing is clean
//   //here we had to convert and use an arrow function since it doesnt manipulate or change the this keyword, whatever it was set it will still be equal
//   // since findOne method is not an object calling our function and JS would consider the global object instead of setting up to user case
//   // to convert to arrow function remove the word function and after the parenthesis we add the =>

//   this.cleanUp();
//   usersCollection.findOne(
//     { username: this.data.username },
//     (err, attemptedUser) => {
//       if (attemptedUser && attemptedUser.password == this.data.password) {
//         callback("Congrats");
//       } else {
//         callback("invalid username and password");
//       }
//     }
//   );
// };

//Using Promise to handle unknown timing situation
User.prototype.login = function() {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    usersCollection
      .findOne({ username: this.data.username })
      .then(attemptedUser => {
        //converting password to hash and comparing has been implemented using bcrypt
        if (
          attemptedUser &&
          bcrypt.compareSync(this.data.password, attemptedUser.password)
        ) {
          //since user doesnt type his email address we need to grab it otherwise gravatar cant identify it on the servers
          this.data = attemptedUser;
          this.getAvatar();
          resolve("Congrats");
        } else {
          reject("invalid username and password");
        }
      })
      .catch(function() {
        reject("Please try again later");
      });
  });
};

User.prototype.register = function() {
  return new Promise(async (resolve, reject) => {
    //here we enforce all of our business logic
    //Step #1 validate user data
    this.cleanUp();
    //NOW we've added async function inside validate so we need to make sure this complete before we can move
    await this.validate();

    //step #2 only if no validation errors, save the user data on the database
    if (!this.errors.length) {
      // hash user password
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(this.data.password, salt);

      await usersCollection.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors);
    }
  });
};
//setup gravatar for photo
User.prototype.getAvatar = function() {
  this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
};

User.findByUsername = function(username) {
  return new Promise(function(resolve, reject) {
    if (typeof username != "string") {
      reject();
      return;
    }
    usersCollection
      .findOne({ username: username })
      .then(function(userDoc) {
        if (userDoc) {
          userDoc = new User(userDoc, true);
          userDoc = {
            _id: userDoc.data._id,
            username: userDoc.data.username,
            avatar: userDoc.avatar
          };
          resolve(userDoc);
        } else {
          reject();
        }
      })
      .catch(function() {
        reject();
      });
  });
};

User.doesEmailExist = function(email) {
  return new Promise(async function(resolve, reject) {
    if (typeof email != "string") {
      resolve(false);
      return;
    }

    let user = await usersCollection.findOne({ email: email });
    if (user) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
};

module.exports = User;
