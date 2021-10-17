const path = require('path');
const PORT = process.env.PORT || 3000; 

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://cse341:WebBackend123@cluster0.q8tvx.mongodb.net/testDatabase";

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URL,
  collection: 'sessions'
});

const csrfProtection = csrf();


const cors = require('cors') // Place this with other requires (like 'path' and 'express')

const corsOptions = {
    origin: "https://arcane-ravine-67307.herokuapp.com/",
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

const options = {
    family: 4
};                        

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(
  {
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req,res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
        req.user = user;
        next();
    })
    .catch(err => console.log(err));
})

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);

mongoose
  .connect(
    MONGODB_URL, options
  )
  .then(result => {
    app.listen(PORT);
  })
  .catch(err => {
    console.log(err);
  });
