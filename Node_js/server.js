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
var fs = require('fs');

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

var admins = [];
var active_runs = {};

// Handle GET requests (usually page connections)

// Start page
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

// Page for starting or finishing new runs
app.get('/start', function(request,response){

  var qr_data = active_runs[request.session.username];
  if (!qr_data)
    qr_data = [];

  // Prepopulate with today's date
  var d = new Date();
  var date_string = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
  response.render(__dirname + '/public/start.ejs', {qr_data: qr_data, current_date: date_string});
});

// Request finish run
app.get('/finish_run', function(request,response){
  var run_name = request.query.run_name;
  var findIndex = -1;
  var qr_data = active_runs[request.session.username];
  if (qr_data)
  {
    for (var i=0;i<qr_data.length;i++)
    {
      if (qr_data[i].name == run_name)
      {
        findIndex = i;
      }
    }
  }
  if (findIndex >= 0)
  {
    // Remove .png file and update page
    fs.unlink(__dirname + "/public/qr/" + qr_data[findIndex].hash + ".png",(err) =>
      {
        if (err) {
          console.log("Failed to delete image file");
        }
        else {
          console.log("Image file deleted successfully");
        };
      });
    qr_data.splice(findIndex,1);
    if (qr_data.length > 0)
    {
      active_runs[request.session.username] = qr_data;
    }
    else
    {
      delete active_runs[request.session.username];
    }
  }
  response.redirect('/start');
});


// Home screen
app.get('/home',function(request,response){
  if (request.session.loggedin){
    if (admins.indexOf(request.session.username) >= 0)
    {
      // Admin status
      var site_list = [];
      mysqlx.getSession({
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        host: MYSQL_HOST,
        port: MYSQL_PORT
      }).then(function(session){
        var myColl = session.getSchema('quick_mic').getCollection('users');
        return myColl.find().execute()
          .then(result => {
            var entries = result.fetchAll();
            entries.forEach(function(u) {
              site_list.push({name: u.site});
            })
            response.render(__dirname + '/public/home_admin.ejs', {username: request.session.username,
            site_list:site_list});
          });
      });
    }
    else
    {
      // Ordinary user
      var run_list = [{name: 'aaa_bbb_ccc_ddd'}, {name: 'eee_fff_ggg_hhh'}];
      response.render(__dirname + '/public/home.ejs', {username: request.session.username,
        runs: run_list});
    }
  }
  else
  {
    response.redirect('/');
  }
});

app.get('/strain_list', function(request,response){
  response.render(__dirname + '/public/strain_list.ejs', {data: "dummy"});
});

app.get('/loginerror', function(request,response){
  response.sendFile(path.join(__dirname + "/public/loginerror.html"));
});

// Handle POST requests

// Login with name and password
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
      /*var userTable = session.getSchema('quick_mic').getTable('users');
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
      }*/
      /*var userCollection = session.getSchema('quick_mic').getCollection('users');
      return userCollection.find('site == :site && password == :password')
        .bind('site',username).bind('password',password)
        .execute()
    })
    .then(myResult => {
      console.log("Result size: " + myResult.length);
      console.log(myResult.toString());
      response.redirect('/loginerror');*/

      var db = session.getSchema('quick_mic');
      var myColl = db.getCollection('users');
      return myColl
        .find('site like :site && password like :password')
        .limit(1)
        .bind('site', username)
        .bind('password', password)
        .execute()
        .then(result => {
          var entries = result.fetchAll();
          if (entries.length < 1)
          {
            response.redirect('/loginerror');
          }
          else
          {
            request.session.loggedin = true;
            request.session.username = username;
            // Check if user has admin status
            if (entries[0].admin && admins.indexOf(username) < 0)
            {
              admins.push(username);
            }
            // Check if any runs are active
            if (entries[0].runs)
            {
              active_runs[username] = entries[0].runs;
            }
            response.redirect('/home');
          }
        });
    });
  } else {
    response.send('Please enter Username and Password');
    response.end();
  }
});

app.post('/logout', function(request,response){
  // Remove admin status flag
  if (admins.indexOf(request.session.username) >= 0)
  {
    admins.splice(admins.indexOf(request.session.username),1);
  }
  request.session.loggedin = false;
  response.redirect('/');
});

// Start a new run and generate QR code .png file
app.post('/start_run', function(request,response){

  var title = request.body.date + '_' + request.body.number + '-' + request.body.strain +
    '_' + request.body.source + request.body.description + '_' + request.body.instrument.toUpperCase();
  var hashedTitle = hash('md5').update(title).digest('hex');
  QRCode.toFile(__dirname + "/public/qr/" + hashedTitle + ".png",
      title,
    {width:200, height: 200},
    err => {
      if (err) throw err
    });
  var qr_data = active_runs[request.session.username];
  if (!qr_data)
    qr_data = [];
  qr_data.push({name:title, hash:hashedTitle});
  active_runs[request.session.username] = qr_data;

  response.redirect('/start');
});

// Start listening for connections
app.listen(MY_PORT);
