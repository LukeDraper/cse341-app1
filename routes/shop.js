const path = require('path');

const express = require('express');

const rootDir = require('../util/path');
const adminData = require('./admin');

const router = express.Router();

router.get('/', (req, res, next) => {
    const products = adminData.products;
    products.sort((a, b) => (a.author > b.author) ? 1 : -1);
    console.log(products);
    res.render('shop', {
        prods: products,
        pageTitle: "Shop",
        path:'/',
        hasProducts: products.length > 0,
        activeShop: true,
        productCSS: true
        });
});

module.exports = router;