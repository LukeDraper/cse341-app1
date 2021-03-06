const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const { validationResult } = require('express-validator');

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
        errorMessage: message,
        oldInput: {
            email: "",
            password: ""
        },
        validationErrors: []
    });
  };

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        });
    }

    User.findOne({email: email})
    .then(user => {
        if (!user) {
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: "Invalid email or password",
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
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
            return res.render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: "Invalid email or password",
                oldInput: {
                    email: email,
                    password: password
                },
                validationErrors: []
            });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/login');
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        next(error);
    });
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
        errorMessage: message,
        oldInput: {firstName: "", lastName: "", email: "", password: "", confirmPassword: ""},
        validationErrors: []
    });
  };

exports.postSignup = (req, res, next) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {firstName: firstName, lastName: lastName, email: email, password: password, confirmPassword: confirmPassword},
            validationErrors: errors.array()
        });
    }
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
                res.redirect('/');
                sgMail.send(msg);
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                next(error);
            });
        })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        next(error);
    });
    
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
}; 

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    })
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if ( err) {
            console.log(err);
            return res. redirect('/reset');
        }
        const token = buffer.toString('hex')
        const email = req.body.email;
        User.findOne({email: email})
        .then( user => {
            if (!user) {
                req.flash('error', 'No account with that email found.');
                return res.redirect('/reset');
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            return user.save();
        })
        .then(result => {
            console.log("Sending password reset email to: " + email);
            const msg = {
                to: email, // Change to your recipient
                from: "dra20011@byui.edu", // Change to your verified sender
                subject: 'Password Reset',
                html: `
                    <p>You Requested a password reset.</p>
                    <p>Click this <a href="https://cse-341-app1.herokuapp.com/reset/${token}">link</a> to set a new password.</p>
                `,
              }
              res.redirect('/login');
              sgMail.send(msg)
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            next(error);
        });
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
    .then(user => {
        let message = req.flash('error');
        if (message.length > 0) {
            message = message[0];
        } else {
            message = null;
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: message,
            userId: user._id.toString(),
            passwordToken: token
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        next(error);
    });
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId
    })
    .then(user => {
        resetUser = user;
        return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(result => {
        res.redirect('/login');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        next(error);
    })
}