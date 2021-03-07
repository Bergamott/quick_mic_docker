'use strict';

// Required modules and packages
const express = require('express');
var session = require('express-session');
var http = require('http');
const mysqlx = require('@mysql/xdevapi');
var path = require('path');
var bodyParser = require('body-parser');
var QRCode = require('qrcode');
var hash = require('crypto').createHash;

// Constants
const MY_PORT = 8080;
const MYSQL_HOST = 'host.docker.internal'; // 'localhost'; 
const MYSQL_PORT = '33060';
const MYSQL_USER = 'root';
const MYSQL_PASSWORD = 'password';

// App settings
var app = express();
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// Set up variables

var qr_data = [];

// Handle GET requests (usually page connections)
app.get('/', function(request,response){
  if (request.session.loggedin)
  {
    response.redirect('/home');
  }
  else
  {
    //response.sendFile(path.join(__dirname + "/public/login.html"));
    response.sendFile(__dirname + "/public/login.html");
  }
});

// QR test
app.get('/qr', function(request,response){
  var longString = 'There once was a man from Nantucket';
  var shortString = hash('md5').update(longString).digest('hex');
  console.log(shortString);
  QRCode.toFile(__dirname + "/public/qr/" + shortString + ".png",
    longString,
    {width:200, height: 200},
    err => {
      if (err) throw err
    });
  	response.sendFile(__dirname + "/public/qr.html");
});

// EJS test
app.get('/ejs', function(request,response){


  response.render(__dirname + '/public/generate.ejs', {qr_data: qr_data});
});

// Generate POST


app.get('/home',function(request,response){
  if (request.session.loggedin){
    response.sendFile(path.join(__dirname + "/public/home.html"));
  }
  else
  {
    response.redirect('/');
  }
});

app.get('/loginerror', function(request,response){
  response.sendFile(path.join(__dirname + "/public/loginerror.html"));
});

// Handle POST requests
app.post('/auth', function(request,response){
  var username = request.body.username;
  var password = request.body.password;
  if (username && password){
    mysqlx.getSession({
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      host: MYSQL_HOST,
      port: MYSQL_PORT
    }).then(function(session){
      var userTable = session.getSchema('quick_mic').getTable('users');
      return userTable.select(['id','username','password'])
      .where('username = :name AND password = :password').bind('name',username)
      .bind('password',password)
      .execute()
    })
    .then(myResult => {
      var row = myResult.fetchAll();
      if (row.length > 0)
      {
        request.session.loggedin = true;
        request.session.username = username;
        response.redirect('/home');
      }
      else
      {
        response.redirect('/loginerror');
      }
    });
  } else {
    response.send('Please enter Username and Password');
    response.end();
  }
});

app.post('/logout', function(request,response){
  request.session.loggedin = false;
  response.redirect('/');
});

// Generate new QR code from received parameters
app.post('/generate', function(request,response){

  var title = request.body.field_a + '_' + request.body.field_b + '_' + request.body.field_c;
  var hashedTitle = hash('md5').update(title).digest('hex');
  QRCode.toFile(__dirname + "/public/qr/" + hashedTitle + ".png",
      title,
    {width:200, height: 200},
    err => {
      if (err) throw err
    });

  qr_data.push({name:title, hash:hashedTitle});

  response.redirect('/ejs');
});

// Start listening for connections
app.listen(MY_PORT);
