'use strict';

const express = require('express');
var session = require('express-session');
var http = require('http');
const mysqlx = require('@mysql/xdevapi');
var path = require('path');
var bodyParser = require('body-parser');

// Constants
const PORT = 8080;
const MYSQL_HOST = 'host.docker.internal'; // 'localhost'

// App
var app = express();






//app.get('/', (req, res) => {

http.createServer(function(req,res) {

  res.writeHead(200,{'Content-Type':'text/html'});
  
  mysqlx.getSession(
    {
      user: 'root',
      password: 'BAT32man',
      host: MYSQL_HOST,
      port: '33060'
    }
  )
  .then(function(session) {
    //var db = session.getSchema('gradientech_nosql');
    //var myColl = db.getCollection('runs');
    //return myColl
    //  .find('name like :param')
    //  .limit(1)
    //  .bind('param', '2020%')
    //  .execute(function(doc)
    //    {
    //      console.log(doc);
    //    }
    //  );
	var userTable = session.getSchema('gradientech_nosql').getTable('users');
	return userTable.select(['id','username','password'])
		.where('username = :name').bind('name','karl')
		.execute(function(row) {
			res.end('Got response: '+row.toString());
			
		});

  })
  .catch(function(err) {
    console.log(err);
    //res.write(err);
  });


//});

//app.listen(PORT, HOST);
//console.log(`Running on http://${HOST}:${PORT}`);

}).listen(PORT);
