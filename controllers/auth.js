const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const User = require('../models/user');


exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message
    });
  };

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({email: email})
    .then(user => {
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }
        bcrypt.compare(password, user.password)
        .then(doMatch => {
            if (doMatch) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save((err) => {
                    console.log(err);
                    res.redirect('/');
                });
            }
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
    })
    .catch(err => console.log(err));
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message
    });
  };

exports.postSignup = (req, res, next) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match.')
        return res.redirect('/signup');
    }
    User.findOne({email: email})
        .then(userDoc => {
            if (userDoc) {
                req.flash('error', 'E-Mail exists already, please pick a different one.')
                return res.redirect('/signup');
            }
            return bcrypt.hash(password, 12)
            .then(hashedPassword => {
                const user = new User ({
                    email: email,
                    password: hashedPassword,
                    firstName: firstName,
                    lastName: lastName,
                    cart: { items: [] }
                });
                return user.save();
            })
            .then(result => {
                console.log("Sending email to: " + email);
                const msg = {
                    to: email, // Change to your recipient
                    from: "dra20011@byui.edu", // Change to your verified sender
                    subject: 'Signup succeeded',
                    html: '<h1>You successfully signed up!</h1>',
                  }
                res.redirect('/login');
                return sgMail.send(msg)
                .then(() => {
                    console.log('Email sent')
                  })
                  .catch((error) => {
                    console.error(error)
                  })
            })
            .catch(err => {
                console.log(err);
            });
        })
    .catch(err => {
        console.log(err);
    });
    
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};