const express = require('express');
const path = require('path');
const logger = require('morgan');
// const cv = require('./index');

var app = module.exports = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'), {extensions: ['html']}));

// app.use('/', indexRouter);

app.get('/hi', (req, res, next) => res.send('test'));