const dotenv = require("dotenv");
dotenv.config();

const mongodb = require("mongodb");

//this is bad practice since if you push to a free git hub account than anyone can view this
//what if we want to connect to a different database?
//environent variables come to play to fix these issues.
// const connectionString =
//   "mongodb+srv://todoAppUser:Maricota339!@@cluster0-hnggr.mongodb.net/ComplexApp?retryWrites=true&w=majority";

//use environemnt variables to setup password and port numbers as BEST PRACTICE
//even if we post our source code to git repository, this data is not be share as you will not include the env file to commit.
// when push to heroku this it is easy to manage environment varibales, you can KEEP API keys and etc

mongodb.connect(
  process.env.CONNECTIONSTRING,
  { useNewUrlParser: true, useUnifiedTopology: true },
  function(err, client) {
    module.exports = client;
    const app = require("./app");
    app.listen(process.env.PORT);
  }
);
